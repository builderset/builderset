using System.Text.Json;
using System.Text.Json.Serialization;
using Builderset.Api.Checks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

public static class DocumentStatus
{
    public const string Draft = "draft";
    /// <summary>In front of readers. Deleting a published document is refused: unpublish it first.</summary>
    public const string Published = "published";
    public const string Scheduled = "scheduled";
    public const string Archived = "archived";
    public const string Closed = "closed";
    public const string Paused = "paused";
}

/// <summary>
/// What the five document tables share: the live document, the draft since,
/// and the two clocks. <c>updated_at</c> follows any change to the row;
/// <c>saved_at</c> only a write of the document, and is what the editor sends
/// back to catch a stale save.
/// </summary>
public abstract class DocumentRow : Audited, IHasStatus
{
    /// <summary><c>document.meta.name</c>, for lists and search. An article's is its title.</summary>
    public string Name { get; set; } = "";
    public string Status { get; set; } = DocumentStatus.Draft;

    /// <summary>The live document: what readers get, what is sent, what the form shows.</summary>
    public JsonElement Document { get; set; }

    /// <summary>Work in progress since the last publish; null when there is none.</summary>
    public JsonElement? DraftDocument { get; set; }

    /// <summary>The row's concurrency token: an update matches only the saved_at it read.</summary>
    public DateTime SavedAt { get; set; }

    /// <summary>Counts publishes: a revision, a response and a card record the one they belong to.</summary>
    public int Version { get; set; }
    public DateTime? PublishedAt { get; set; }
    public long? PublishedById { get; set; }

    public abstract Kit Kit { get; }

    /// <summary>Copies of the document's meta, written in the same save as the document.</summary>
    public abstract void CopyFrom(JsonElement document);

    /// <summary>Puts it live, or later. Returns what the activity log calls it.</summary>
    public virtual string Publish(JsonElement document, DateTime now, DateTime? scheduledAt)
    {
        Status = DocumentStatus.Published;
        PublishedAt = now;
        return Actions.Published;
    }

    /// <summary>Whether unpublishing changes anything.</summary>
    public virtual bool CanUnpublish => Status is DocumentStatus.Published or DocumentStatus.Scheduled;

    /// <summary>Takes it off; the document is kept. Returns what the activity log calls it.</summary>
    public virtual string Unpublish(long actorId, DateTime now)
    {
        Status = DocumentStatus.Draft;
        return Actions.Unpublished;
    }

    /// <summary>The columns that name the row: a change of one is logged as <c>renamed</c>.</summary>
    public virtual IReadOnlyDictionary<string, string> Names() =>
        new Dictionary<string, string> { ["name"] = Name };

    /// <summary>Every person column, for <see cref="People.LoadAsync"/>.</summary>
    public virtual IEnumerable<long?> PersonIds() =>
        [CreatedById, UpdatedById, DeletedById, PublishedById];

    /// <summary>This table's own columns, as an answer shows them.</summary>
    public abstract Dictionary<string, object?> OwnColumns(People people);
}

/// <summary>
/// A version of a document. Written once and never changed, so it has no
/// <c>updated_*</c> or <c>deleted_*</c>; restoring one writes a new one.
/// </summary>
public abstract class DocumentRevision
{
    public long Id { get; set; }
    public Guid Uuid { get; set; } = Guid.CreateVersion7();

    /// <summary>The document it belongs to: <c>article_id</c>, <c>form_id</c>… in its table.</summary>
    public long DocumentId { get; set; }
    public string Kind { get; set; } = RevisionKind.Manual;

    /// <summary>A name someone gave it: "Before the legal review".</summary>
    public string? Label { get; set; }

    /// <summary>The document's version then.</summary>
    public int Version { get; set; }
    public JsonElement Document { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
}

public static class RevisionKind
{
    public const string Autosave = "autosave";
    public const string Manual = "manual";
    public const string Publish = "publish";
}

public static class DocumentMapping
{
    /// <summary>A document table: its audit columns, and saved_at as the concurrency token.</summary>
    public static EntityTypeBuilder<T> IsDocument<T>(this EntityTypeBuilder<T> row, string table) where T : DocumentRow
    {
        row.ToTable(table).IsAudited();
        row.Property(r => r.SavedAt).IsConcurrencyToken();
        row.HasOne<AppUser>().WithMany().HasForeignKey(r => r.PublishedById).OnDelete(DeleteBehavior.SetNull);
        return row;
    }

    /// <summary>A revision table, whose key to its document is named after it: <c>article_id</c>.</summary>
    public static EntityTypeBuilder<R> IsRevision<R>(this EntityTypeBuilder<R> revision, string table, string documentColumn)
        where R : DocumentRevision
    {
        revision.ToTable(table);
        revision.Property(r => r.DocumentId).HasColumnName(documentColumn);
        revision.HasOne<AppUser>().WithMany().HasForeignKey(r => r.CreatedById).OnDelete(DeleteBehavior.SetNull);
        return revision;
    }
}

// ── Answers ──────────────────────────────────────────────────────────────────

/// <summary>A document as the API shows it: <c>uuid</c> as <c>id</c>, people as <c>{ id, name }</c>, no internal ids.</summary>
public sealed record DocumentAnswer(
    Guid Id,
    string Name,
    string Status,
    JsonElement Document,
    JsonElement? DraftDocument,
    DateTime SavedAt,
    int Version,
    DateTime? PublishedAt,
    PersonRef? PublishedBy,
    DateTime CreatedAt,
    PersonRef? CreatedBy,
    DateTime UpdatedAt,
    PersonRef? UpdatedBy,
    DateTime? DeletedAt,
    PersonRef? DeletedBy)
{
    /// <summary>The table's own columns, written beside the shared ones.</summary>
    [JsonExtensionData]
    public Dictionary<string, object?> Own { get; init; } = [];

    public static DocumentAnswer Of(DocumentRow row, People people) => new(
        row.Uuid, row.Name, row.Status, row.Document, row.DraftDocument, row.SavedAt, row.Version,
        row.PublishedAt, people[row.PublishedById],
        row.CreatedAt, people[row.CreatedById],
        row.UpdatedAt, people[row.UpdatedById],
        row.DeletedAt, people[row.DeletedById])
    {
        Own = row.OwnColumns(people),
    };
}

/// <summary>A line of a list. <c>deleted_*</c> are set in the trash only.</summary>
public sealed record DocumentListItem(
    Guid Id,
    string Name,
    string Status,
    DateTime SavedAt,
    DateTime UpdatedAt,
    PersonRef? UpdatedBy,
    DateTime? DeletedAt,
    PersonRef? DeletedBy);

// ── Reading a document ───────────────────────────────────────────────────────

/// <summary>
/// The few values the server reads inside a document, to copy them to columns.
/// The document was checked before any of these run, so a value that is
/// missing reads as empty rather than failing.
/// </summary>
public static class DocumentJson
{
    /// <summary>The value at a path of property names, or null.</summary>
    public static JsonElement? At(this JsonElement json, params ReadOnlySpan<string> path)
    {
        var current = json;
        foreach (var name in path)
        {
            if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(name, out current))
                return null;
        }
        return current;
    }

    public static string Text(this JsonElement json, params ReadOnlySpan<string> path) =>
        json.At(path) is { ValueKind: JsonValueKind.String } value ? value.GetString()! : "";

    public static string? TextOrNull(this JsonElement json, params ReadOnlySpan<string> path) =>
        json.At(path) is { ValueKind: JsonValueKind.String } value ? value.GetString() : null;

    public static decimal Number(this JsonElement json, params ReadOnlySpan<string> path) =>
        json.At(path) is { ValueKind: JsonValueKind.Number } value ? value.GetDecimal() : 0;

    /// <summary>The root node's props: where a card keeps its format and a popup its type and display rules.</summary>
    public static JsonElement RootProps(this JsonElement document) =>
        document.At("nodes", document.Text("root"), "props") ?? default;

    /// <summary>A text cut to its column's length.</summary>
    public static string Cut(this string text, int max) => text.Length <= max ? text : text[..max];
}
