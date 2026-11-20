using System.Text.Json;
using Builderset.Api.Auth;
using Builderset.Api.Data;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Audit;

/// <summary>
/// The history every write shares: the activity line, the revision, and the
/// soft delete and its undoing. Each adds rows to the same unit of work as the
/// write itself, so one <c>SaveChanges</c> stores the row and its history
/// together, or neither. Who and when are the <see cref="AuditInterceptor"/>'s.
/// </summary>
public sealed class AuditTrail(AppDb db)
{
    /// <summary>The log's details in the API's own casing: <c>{ "replaced_by": … }</c>.</summary>
    private static readonly JsonSerializerOptions Details = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    /// <summary>Appends one line to the activity log. <paramref name="actor"/> is null for a job, or a visitor.</summary>
    public void Record(Audited subject, string action, Actor? actor,
        string? from = null, string? to = null, object? details = null)
    {
        db.Activity.Add(new Activity
        {
            SubjectType = subject.SubjectType,
            SubjectId = subject.Id,
            Action = action,
            FromStatus = from,
            ToStatus = to,
            Details = JsonSerializer.SerializeToElement(details ?? new { }, Details),
            ActorId = actor?.Id,
        });
    }

    /// <summary>Keeps a version of a document. Its public id is known before it is saved.</summary>
    public TRevision Revision<TRevision>(DocumentRow row, string kind, JsonElement document, string? label = null)
        where TRevision : DocumentRevision, new()
    {
        var revision = new TRevision
        {
            DocumentId = row.Id,
            Kind = kind,
            Label = label,
            Version = row.Version,
            Document = document,
        };
        db.Add(revision);
        return revision;
    }

    /// <summary>
    /// An autosave becomes a revision at most every ten minutes: enough to go
    /// back to, without a whole document every few seconds of typing. Never logged.
    /// </summary>
    public async Task AutosaveAsync<TRevision>(DocumentRow row, JsonElement document, CancellationToken ct)
        where TRevision : DocumentRevision, new()
    {
        var since = DateTime.UtcNow.AddMinutes(-10);
        var recent = await db.Set<TRevision>()
            .AnyAsync(r => r.DocumentId == row.Id && r.Kind == RevisionKind.Autosave && r.CreatedAt > since, ct);
        if (!recent) Revision<TRevision>(row, RevisionKind.Autosave, document);
    }

    /// <summary>
    /// Logs the names a write changed — a title, a slug — with what they were.
    /// <paramref name="before"/> is <see cref="DocumentRow.Names"/> read before the write.
    /// </summary>
    public void RecordRenames(DocumentRow row, IReadOnlyDictionary<string, string> before, Actor actor)
    {
        var changed = row.Names()
            .Where(name => before[name.Key] != name.Value)
            .ToDictionary(name => name.Key, name => new { From = before[name.Key], To = name.Value });
        if (changed.Count > 0) Record(row, Actions.Renamed, actor, details: changed);
    }

    /// <summary>Deletes softly: the interceptor stamps who and when, and the row stays.</summary>
    public void SoftDelete(Audited row, Actor actor)
    {
        db.Remove(row);
        Record(row, Actions.Deleted, actor, from: (row as IHasStatus)?.Status);
    }

    /// <summary>
    /// Brings a deleted row back. A partial unique index refuses it when another
    /// live row took its address meanwhile; that is answered 409.
    /// </summary>
    public void Restore(Audited row, Actor actor)
    {
        row.DeletedAt = null;
        row.DeletedById = null;
        Record(row, Actions.Restored, actor, to: (row as IHasStatus)?.Status);
    }
}
