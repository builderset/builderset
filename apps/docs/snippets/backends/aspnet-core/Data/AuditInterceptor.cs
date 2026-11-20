using Builderset.Api.Auth;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Builderset.Api.Data;

/// <summary>
/// Stamps who and when on every row a save writes, from the signed-in user —
/// never from the request body. And it turns a delete into a soft delete: the
/// row stays, stamped with who deleted it, so it can be restored and its
/// history still makes sense. Routes never set these columns themselves.
/// </summary>
public sealed class AuditInterceptor(ICurrentUser currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData data, InterceptionResult<int> result)
    {
        Stamp(data.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData data, InterceptionResult<int> result, CancellationToken ct = default)
    {
        Stamp(data.Context);
        return ValueTask.FromResult(result);
    }

    private void Stamp(DbContext? db)
    {
        if (db is null) return;
        // Null for a job, or a visitor who is not signed in.
        var actorId = currentUser.Actor?.Id;
        var now = Clock.Now();

        foreach (var row in db.ChangeTracker.Entries<Audited>())
        {
            switch (row.State)
            {
                case EntityState.Added:
                    Set(row, r => r.CreatedAt, now);
                    Set(row, r => r.CreatedById, actorId);
                    Set(row, r => r.UpdatedAt, now);
                    Set(row, r => r.UpdatedById, actorId);
                    break;
                case EntityState.Modified:
                    Set(row, r => r.UpdatedAt, now);
                    Set(row, r => r.UpdatedById, actorId);
                    break;
                case EntityState.Deleted:
                    // Only the columns set here are written: the rest of the row is untouched.
                    row.State = EntityState.Unchanged;
                    Set(row, r => r.DeletedAt, now);
                    Set(row, r => r.DeletedById, actorId);
                    Set(row, r => r.UpdatedAt, now);
                    Set(row, r => r.UpdatedById, actorId);
                    break;
            }
        }

        // Revisions and activity lines are written once: they only have a creation.
        foreach (var revision in db.ChangeTracker.Entries<DocumentRevision>().Where(r => r.State == EntityState.Added))
        {
            revision.Entity.CreatedAt = now;
            revision.Entity.CreatedById = actorId;
        }
        foreach (var line in db.ChangeTracker.Entries<Activity>().Where(a => a.State == EntityState.Added))
            line.Entity.CreatedAt = now;
    }

    /// <summary>Through the change tracker, so the column is written even when the row came in unchanged.</summary>
    private static void Set<T>(EntityEntry<Audited> row, System.Linq.Expressions.Expression<Func<Audited, T>> column, T value) =>
        row.Property(column).CurrentValue = value;
}
