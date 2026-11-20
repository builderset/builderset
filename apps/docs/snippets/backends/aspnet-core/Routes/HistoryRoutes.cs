using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

/// <summary>A revision in the editor's list. <c>author</c> is a name: the editor shows it as it is.</summary>
public sealed record RevisionSummary(Guid Id, string Kind, string? Label, int Version, DateTime CreatedAt, string? Author);

public static class HistoryRoutes
{
    /// <summary>
    /// A document's two histories: its revisions (what it said), for the
    /// editor's version panel, and its activity (what happened to it), for a
    /// timeline of yours. A deleted document has neither: 404, as everywhere.
    /// </summary>
    public static RouteGroupBuilder MapHistory<TRow, TRevision>(this RouteGroupBuilder api, DocumentKind<TRow> kind)
        where TRow : DocumentRow
        where TRevision : DocumentRevision, new()
    {
        var routes = api.MapGroup(kind.Path);

        // GET /:id/revisions — the editor's loadRevisions, newest first.
        routes.MapGet("/{id:guid}/revisions", async (Guid id, Documents<TRow, TRevision> documents, AppDb db, CancellationToken ct) =>
        {
            var row = await documents.FindAsync(id, ct);
            return await (
                from revision in db.Set<TRevision>()
                where revision.DocumentId == row.Id
                join user in db.Users on revision.CreatedById equals user.Id into authors
                from author in authors.DefaultIfEmpty()
                orderby revision.CreatedAt descending, revision.Id descending
                select new RevisionSummary(
                    revision.Uuid, revision.Kind, revision.Label, revision.Version, revision.CreatedAt,
                    author == null ? null : author.Name))
                .Take(100)
                .ToListAsync(ct);
        });

        // GET /:id/revisions/:rid — the editor's loadRevision.
        routes.MapGet("/{id:guid}/revisions/{rid:guid}", async (Guid id, Guid rid, Documents<TRow, TRevision> documents, AppDb db, CancellationToken ct) =>
        {
            var row = await documents.FindAsync(id, ct);
            var revision = await db.Set<TRevision>()
                .FirstOrDefaultAsync(r => r.Uuid == rid && r.DocumentId == row.Id, ct)
                ?? throw ApiException.NotFound("revision");
            return new { revision.Document };
        });

        // POST /:id/revisions — the editor's saveRevision: a version someone named.
        routes.MapPost("/{id:guid}/revisions", async (Guid id, NamedRevision body, Actor actor,
            Documents<TRow, TRevision> documents, DocumentChecks checks, AuditTrail trail, AppDb db, CancellationToken ct) =>
        {
            var row = await documents.FindAsync(id, ct);
            var document = await checks.CheckAsync(row, body.Document, Level.Draft, ct);
            var label = body.Label?.Trim().Cut(120);
            var revision = trail.Revision<TRevision>(row, RevisionKind.Manual, document, label);
            trail.Record(row, Actions.Saved, actor, details: new { Revision = revision.Uuid, Label = label });
            await db.SaveChangesAsync(ct);
            return Replies.Created(new { id = revision.Uuid });
        });

        // GET /:id/activity — the document's timeline, for a History panel of yours.
        routes.MapGet("/{id:guid}/activity", async (Guid id, int? limit, Documents<TRow, TRevision> documents, AppDb db, CancellationToken ct) =>
        {
            var row = await documents.FindAsync(id, ct);
            return await Timeline.OfAsync(db, row, Math.Clamp(limit ?? 50, 1, 100), ct);
        });

        return routes;
    }
}
