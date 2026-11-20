using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

public static class DocumentRoutes
{
    /// <summary>
    /// The routes every builder shares, written once and mapped for each:
    /// <c>/api/emails</c>, <c>/api/articles</c>… differ only in their row type.
    /// Handlers read the request and answer; the work is in <see cref="Documents{TRow, TRevision}"/>.
    /// </summary>
    public static RouteGroupBuilder MapDocuments<TRow, TRevision>(this RouteGroupBuilder api, DocumentKind<TRow> kind)
        where TRow : DocumentRow
        where TRevision : DocumentRevision, new()
    {
        var routes = api.MapGroup(kind.Path);

        routes.MapGet("/", ([AsParameters] ListQuery query, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            documents.ListAsync(query, ct));

        routes.MapPost("/", async (NewDocument body, Actor actor, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            Replies.Created(await documents.CreateAsync(body, actor, ct)));

        routes.MapGet("/{id:guid}", (Guid id, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            documents.GetAsync(id, ct));

        routes.MapPut("/{id:guid}/draft", (Guid id, DraftSave body, Actor actor, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            documents.SaveDraftAsync(id, body, actor, ct));

        routes.MapPost("/{id:guid}/publish", (Guid id, PublishRequest body, Actor actor, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            documents.PublishAsync(id, body, actor, ct))
            .RequireAuthorization(Policies.Publish);

        routes.MapPost("/{id:guid}/unpublish", (Guid id, Actor actor, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            documents.UnpublishAsync(id, actor, ct))
            .RequireAuthorization(Policies.Publish);

        routes.MapDelete("/{id:guid}", async (Guid id, Actor actor, Documents<TRow, TRevision> documents, CancellationToken ct) =>
        {
            await documents.DeleteAsync(id, actor, ct);
            return TypedResults.NoContent();
        });

        routes.MapPost("/{id:guid}/restore", (Guid id, Actor actor, Documents<TRow, TRevision> documents, CancellationToken ct) =>
            documents.RestoreAsync(id, actor, ct));

        return routes;
    }
}

/// <summary>What publishing answers. <c>scheduled_at</c> is an article's, when it waits for its time.</summary>
public sealed record PublishAnswer(DateTime SavedAt, string Status, DateTime? PublishedAt, DateTime? ScheduledAt);

/// <summary>What a draft save and an unpublish answer.</summary>
public sealed record SaveAnswer(DateTime SavedAt, string? Status = null);

/// <summary>
/// What each write to a document does, in the data model's order: check the
/// document, write the row, keep a revision on a manual save or a publish, and
/// log the activity — one transaction. Who and when are stamped by the
/// interceptor as the row is saved.
/// </summary>
public sealed class Documents<TRow, TRevision>(
    DocumentKind<TRow> kind, AppDb db, AuditTrail trail, DocumentChecks checks)
    where TRow : DocumentRow
    where TRevision : DocumentRevision, new()
{
    /// <summary>A live row by its public id, or 404. A deleted row answers 404 everywhere but restore.</summary>
    public async Task<TRow> FindAsync(Guid id, CancellationToken ct) =>
        await db.Set<TRow>().FirstOrDefaultAsync(row => row.Uuid == id, ct)
        ?? throw ApiException.NotFound(kind.Noun);

    /// <summary>A row as the API shows it, with its people as <c>{ id, name }</c>.</summary>
    public async Task<DocumentAnswer> AnswerAsync(TRow row, CancellationToken ct) =>
        DocumentAnswer.Of(row, await People.LoadAsync(db, row.PersonIds(), ct));

    public async Task<DocumentAnswer> GetAsync(Guid id, CancellationToken ct) =>
        await AnswerAsync(await FindAsync(id, ct), ct);

    /// <summary>GET / — <c>?status=&amp;q=&amp;deleted=true&amp;limit=&amp;offset=</c>, newest change first.</summary>
    public async Task<Page<DocumentListItem>> ListAsync(ListQuery query, CancellationToken ct)
    {
        var rows = query.Trash
            ? db.Set<TRow>().IgnoreQueryFilters().Where(row => row.DeletedAt != null)
            : db.Set<TRow>();
        if (query.Status is { } status && kind.Statuses.Contains(status))
            rows = rows.Where(row => row.Status == status);
        if (query.Pattern is { } pattern)
            rows = rows.Where(row => EF.Functions.ILike(row.Name, pattern, @"\"));

        var total = await rows.CountAsync(ct);
        // Only the list's columns: a list never reads the documents.
        var page = await rows
            .OrderByDescending(row => row.UpdatedAt).ThenByDescending(row => row.Id)
            .Skip(query.Skip).Take(query.Take)
            .Select(row => new { row.Uuid, row.Name, row.Status, row.SavedAt, row.UpdatedAt, row.UpdatedById, row.DeletedAt, row.DeletedById })
            .ToListAsync(ct);
        var people = await People.LoadAsync(db, page.SelectMany(row => new[] { row.UpdatedById, row.DeletedById }), ct);
        var items = page.Select(row => new DocumentListItem(
            row.Uuid, row.Name, row.Status, row.SavedAt, row.UpdatedAt, people[row.UpdatedById],
            row.DeletedAt, people[row.DeletedById])).ToList();
        return new Page<DocumentListItem>(items, total);
    }

    /// <summary>POST / — a new document, as a draft.</summary>
    public async Task<DocumentAnswer> CreateAsync(NewDocument body, Actor actor, CancellationToken ct)
    {
        var row = kind.NewRow(body, actor);
        var document = await checks.CheckAsync(row, body.Document, Level.Draft, ct);
        row.Document = document;
        row.CopyFrom(document);
        row.SavedAt = Clock.Now();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        db.Add(row);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException failure) when (failure.IsUniqueViolation("article_slug_locale"))
        {
            // Only an article chooses its address when it is made: another live one has it.
            throw ApiException.Refused("slug.taken", "slug");
        }
        // The new row's id is known now, for its first line in the log.
        trail.Record(row, Actions.Created, actor, to: row.Status);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await AnswerAsync(row, ct);
    }

    #region draft
    /// <summary>
    /// PUT /:id/draft — an autosave or a manual save; readers still get the live
    /// document. <c>saved_at</c> is the row's concurrency token: the update
    /// matches only the <c>saved_at</c> the editor last saw, so a save over
    /// someone else's is refused, and two saves at the same moment cannot both win.
    /// </summary>
    public async Task<SaveAnswer> SaveDraftAsync(Guid id, DraftSave body, Actor actor, CancellationToken ct)
    {
        var row = await FindAsync(id, ct);
        // Without the saved_at it last saw, a save could overwrite work it never
        // saw. Only "keep mine" (force) saves over whatever is there.
        if (!body.Force && body.ExpectedSavedAt is null) throw Stale();
        var document = await checks.CheckAsync(row, body.Document, Level.Draft, ct);

        if (!body.Force)
            db.Entry(row).Property(r => r.SavedAt).OriginalValue = body.ExpectedSavedAt!.Value.UtcDateTime;
        row.DraftDocument = document;
        row.SavedAt = Clock.Now();

        if (body.IsManual)
        {
            var revision = trail.Revision<TRevision>(row, RevisionKind.Manual, document);
            trail.Record(row, Actions.Saved, actor, details: new { Revision = revision.Uuid });
        }
        else
        {
            // Autosaves are not logged: a revision now and then is enough.
            await trail.AutosaveAsync<TRevision>(row, document, ct);
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Stale();
        }
        return new SaveAnswer(row.SavedAt);
    }

    private ApiException Stale() =>
        ApiException.Conflict($"Someone else saved this {kind.Noun} since you opened it.");
    #endregion

    #region publish
    /// <summary>
    /// POST /:id/publish — the strict check, then the document goes live with its
    /// meta copied to the columns, a publish revision and its log lines, in one
    /// transaction. A form's address taken by another is refused on meta.slug,
    /// where the editor shows it.
    /// </summary>
    public async Task<PublishAnswer> PublishAsync(Guid id, PublishRequest body, Actor actor, CancellationToken ct)
    {
        var row = await FindAsync(id, ct);
        var document = await checks.CheckAsync(row, body.Document, Level.Publish, ct);
        var later = body.ScheduledAt > DateTimeOffset.UtcNow ? body.ScheduledAt.Value.UtcDateTime : (DateTime?)null;
        var (fromStatus, names) = (row.Status, row.Names());

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (kind.BeforePublish is { } beforePublish) await beforePublish(db, trail, row, actor, ct);

        var now = Clock.Now();
        row.CopyFrom(document);
        row.Document = document;
        row.DraftDocument = null;
        row.Version += 1;
        row.SavedAt = now;
        row.PublishedById = actor.Id;
        var action = row.Publish(document, now, later);

        var revision = trail.Revision<TRevision>(row, RevisionKind.Publish, document);
        trail.Record(row, action, actor, from: fromStatus, to: row.Status,
            details: new { Revision = revision.Uuid, row.Version });
        trail.RecordRenames(row, names, actor);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException failure) when (failure.IsUniqueViolation("form_slug"))
        {
            throw ApiException.Refused("meta.slugTaken", "meta.slug");
        }
        await transaction.CommitAsync(ct);
        return new PublishAnswer(row.SavedAt, row.Status, row.PublishedAt, (row as Article)?.ScheduledAt);
    }
    #endregion

    /// <summary>POST /:id/unpublish — readers no longer get it; the document is kept.</summary>
    public async Task<SaveAnswer> UnpublishAsync(Guid id, Actor actor, CancellationToken ct)
    {
        var row = await FindAsync(id, ct);
        if (!row.CanUnpublish) return new SaveAnswer(row.SavedAt, row.Status);
        var fromStatus = row.Status;
        // Only the status changes: saved_at moves only when the document is written.
        var action = row.Unpublish(actor.Id, Clock.Now());
        trail.Record(row, action, actor, from: fromStatus, to: row.Status);
        await db.SaveChangesAsync(ct);
        return new SaveAnswer(row.SavedAt, row.Status);
    }

    #region delete
    /// <summary>DELETE /:id — a soft delete. A published document is refused: unpublish it first.</summary>
    public async Task DeleteAsync(Guid id, Actor actor, CancellationToken ct)
    {
        var row = await FindAsync(id, ct);
        if (row.Status == DocumentStatus.Published)
            throw ApiException.Conflict($"This {kind.Noun} is live: unpublish it before deleting it.");
        trail.SoftDelete(row, actor);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>POST /:id/restore — out of the trash. 409 when its address was taken meanwhile.</summary>
    public async Task<DocumentAnswer> RestoreAsync(Guid id, Actor actor, CancellationToken ct)
    {
        var row = await db.Set<TRow>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Uuid == id && r.DeletedAt != null, ct)
            ?? throw ApiException.NotFound(kind.Noun);
        trail.Restore(row, actor);
        await db.SaveChangesAsync(ct);
        return await AnswerAsync(row, ct);
    }
    #endregion
}
