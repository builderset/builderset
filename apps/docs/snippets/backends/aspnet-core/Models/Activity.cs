using System.Text.Json;
using Builderset.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>
/// Activity: what happened to a row, who did it, and when. One table for every
/// kind of row, appended in the same transaction as what it records and never
/// edited. It names its subject by table and id, with no foreign key, so it
/// outlives what it describes.
/// </summary>
public sealed class Activity
{
    public long Id { get; set; }
    public Guid Uuid { get; set; } = Guid.CreateVersion7();

    /// <summary>The subject's table: <see cref="Audited.SubjectType"/>.</summary>
    public string SubjectType { get; set; } = "";
    public long SubjectId { get; set; }

    /// <summary>One of <see cref="Actions"/>.</summary>
    public string Action { get; set; } = "";
    public string? FromStatus { get; set; }
    public string? ToStatus { get; set; }

    /// <summary>What else matters: the revision written, the old slug.</summary>
    public JsonElement Details { get; set; }

    /// <summary>Null for a job, or a visitor.</summary>
    public long? ActorId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public static class Actions
{
    /// <summary>A new row.</summary>
    public const string Created = "created";
    /// <summary>A manual save; autosaves are not logged.</summary>
    public const string Saved = "saved";
    /// <summary>Name, slug or title changed.</summary>
    public const string Renamed = "renamed";
    /// <summary>Went live, or went live again.</summary>
    public const string Published = "published";
    /// <summary>Set to go live later.</summary>
    public const string Scheduled = "scheduled";
    /// <summary>Back to draft.</summary>
    public const string Unpublished = "unpublished";
    /// <summary>A form stopped taking responses.</summary>
    public const string Closed = "closed";
    /// <summary>A popup taken off the site, kept as it is.</summary>
    public const string Paused = "paused";
    /// <summary>A card made out to a member.</summary>
    public const string Issued = "issued";
    /// <summary>A member's card cancelled.</summary>
    public const string Revoked = "revoked";
    /// <summary>A revision restored.</summary>
    public const string Reverted = "reverted";
    /// <summary>A response's or a submission's triage.</summary>
    public const string StatusChanged = "status_changed";
    /// <summary>Soft-deleted.</summary>
    public const string Deleted = "deleted";
    /// <summary>Undeleted.</summary>
    public const string Restored = "restored";
}

/// <summary>One line of a timeline, as the API shows it.</summary>
public sealed record TimelineEntry(
    Guid Id,
    string Action,
    string? FromStatus,
    string? ToStatus,
    JsonElement Details,
    PersonRef? Actor,
    DateTime CreatedAt);

public static class Timeline
{
    /// <summary>One row's activity, newest first, with the people's names.</summary>
    public static Task<List<TimelineEntry>> OfAsync(AppDb db, Audited subject, int limit, CancellationToken ct) =>
        (from line in db.Activity
         where line.SubjectType == subject.SubjectType && line.SubjectId == subject.Id
         join user in db.Users on line.ActorId equals user.Id into actors
         from actor in actors.DefaultIfEmpty()
         orderby line.CreatedAt descending, line.Id descending
         select new TimelineEntry(
             line.Uuid, line.Action, line.FromStatus, line.ToStatus, line.Details,
             actor == null ? null : new PersonRef(actor.Uuid, actor.Name),
             line.CreatedAt))
        .Take(limit)
        .ToListAsync(ct);
}

public sealed class ActivityMapping : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> activity)
    {
        activity.ToTable("activity");
        activity.HasOne<AppUser>().WithMany().HasForeignKey(a => a.ActorId).OnDelete(DeleteBehavior.SetNull);
    }
}
