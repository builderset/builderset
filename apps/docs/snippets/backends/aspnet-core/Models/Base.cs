using Builderset.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>
/// Your users. The schema needs only <c>id</c>: map your own users table here,
/// and point the audit columns at it.
/// </summary>
public sealed class AppUser
{
    public long Id { get; set; }
    public Guid Uuid { get; set; }
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// What every table shares. <see cref="Id"/> is for joins and never leaves the
/// server; <see cref="Uuid"/> is the only id in URLs and answers, where it is
/// called <c>id</c>. Then who made the row, changed it and deleted it, and when.
/// The <see cref="AuditInterceptor"/> writes all six; no request ever does.
/// </summary>
public abstract class Audited
{
    public long Id { get; set; }

    /// <summary>Made here rather than by the database, so a new row's public id is known before it is saved.</summary>
    public Guid Uuid { get; set; } = Guid.CreateVersion7();

    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }

    /// <summary>Follows every change. The touch_updated_at trigger keeps it too, for writes from outside the app.</summary>
    public DateTime UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    /// <summary>Null while the row is live. A query filter hides the others everywhere but the trash.</summary>
    public DateTime? DeletedAt { get; set; }
    public long? DeletedById { get; set; }

    /// <summary>What the activity log calls this kind of row: its table.</summary>
    public abstract string SubjectType { get; }
}

/// <summary>A row with a status: the log records a change of it as from and to.</summary>
public interface IHasStatus
{
    string Status { get; }
}

/// <summary>A person in an answer: their public id and their name.</summary>
public sealed record PersonRef(Guid Id, string Name);

/// <summary>
/// The people one answer names, read in one query and looked up by
/// <c>app_user.id</c>. A person since removed reads as null.
/// </summary>
public sealed class People(IReadOnlyDictionary<long, PersonRef> byId)
{
    public PersonRef? this[long? id] =>
        id is { } key && byId.TryGetValue(key, out var person) ? person : null;

    public static async Task<People> LoadAsync(AppDb db, IEnumerable<long?> ids, CancellationToken ct)
    {
        var wanted = ids.Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToArray();
        if (wanted.Length == 0) return new People(new Dictionary<long, PersonRef>());
        var found = await db.Users
            .Where(user => wanted.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => new PersonRef(user.Uuid, user.Name), ct);
        return new People(found);
    }
}

/// <summary>The time the app writes: to the millisecond, as <c>timestamptz(3)</c> stores it.</summary>
public static class Clock
{
    /// <summary>
    /// Truncated here so the value an answer carries is the one stored: the
    /// editor sends <c>saved_at</c> back, and it must match to the millisecond.
    /// </summary>
    public static DateTime Now()
    {
        var now = DateTime.UtcNow;
        return now.AddTicks(-(now.Ticks % TimeSpan.TicksPerMillisecond));
    }
}

public static class AuditedMapping
{
    /// <summary>
    /// The audit columns of one table: the people they point at, removed with
    /// <c>on delete set null</c>, and the soft-delete filter every query gets.
    /// </summary>
    public static EntityTypeBuilder<T> IsAudited<T>(this EntityTypeBuilder<T> row) where T : Audited
    {
        row.HasOne<AppUser>().WithMany().HasForeignKey(r => r.CreatedById).OnDelete(DeleteBehavior.SetNull);
        row.HasOne<AppUser>().WithMany().HasForeignKey(r => r.UpdatedById).OnDelete(DeleteBehavior.SetNull);
        row.HasOne<AppUser>().WithMany().HasForeignKey(r => r.DeletedById).OnDelete(DeleteBehavior.SetNull);
        row.HasQueryFilter(r => r.DeletedAt == null);
        return row;
    }
}
