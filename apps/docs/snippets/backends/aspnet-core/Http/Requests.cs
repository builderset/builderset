using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Builderset.Api.Http;

// What the editor and your screens send. Every name is the JSON's, in
// snake_case: `expected_saved_at` binds to ExpectedSavedAt. The document stays
// a JsonElement until it is checked: it is never trusted before.

/// <summary><c>POST /api/{kind}</c>: a new document, and an article's address or an email's type.</summary>
public sealed record NewDocument(JsonElement Document, string? Slug, string? Locale, string? TypeKey);

/// <summary><c>PUT /api/{kind}/:id/draft</c>: the editor's save.</summary>
public sealed record DraftSave(JsonElement Document, string? Reason, DateTimeOffset? ExpectedSavedAt, bool Force)
{
    /// <summary>A save someone asked for; anything else is an autosave.</summary>
    public bool IsManual => Reason == "manual";
}

/// <summary><c>POST /api/{kind}/:id/publish</c>: the document, and an article's time to go live.</summary>
public sealed record PublishRequest(JsonElement Document, DateTimeOffset? ScheduledAt);

/// <summary><c>POST /api/{kind}/:id/revisions</c>: a version someone named.</summary>
public sealed record NamedRevision(JsonElement Document, string? Label);

/// <summary><c>?status=&amp;q=&amp;deleted=true&amp;limit=&amp;offset=</c> on a list.</summary>
public sealed record ListQuery(string? Status, string? Q, bool? Deleted, int? Limit, int? Offset)
{
    /// <summary>A page of at most 100 rows, 50 when the request does not say.</summary>
    public int Take => Math.Clamp(Limit ?? 50, 1, 100);
    public int Skip => Math.Max(Offset ?? 0, 0);
    public bool Trash => Deleted == true;

    /// <summary><c>?q=</c> as an ILIKE pattern, its own <c>%</c> and <c>_</c> taken literally.</summary>
    public string? Pattern => string.IsNullOrWhiteSpace(Q)
        ? null
        : "%" + Q.Trim().Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
}

/// <summary>A page of a list: what <c>?limit=&amp;offset=</c> picked, and how many there are in all.</summary>
public sealed record Page<T>(IReadOnlyList<T> Items, int Total);

public static class Replies
{
    /// <summary>201 with what was made. Its id is in the body, where the editor reads it.</summary>
    public static Created<T> Created<T>(T value) => TypedResults.Created((string?)null, value);
}
