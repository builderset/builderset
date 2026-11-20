using System.Net;
using System.Text.Json;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>A row of form.</summary>
public sealed class Form : DocumentRow
{
    public const string Table = "form";

    public static readonly IReadOnlyList<string> Statuses =
        [DocumentStatus.Draft, DocumentStatus.Published, DocumentStatus.Closed];

    /// <summary><c>example.com/f/&lt;slug&gt;</c>. <c>draft-&lt;uuid&gt;</c> until the first publish copies <c>document.meta.slug</c>.</summary>
    public string Slug { get; set; } = "";

    /// <summary>Kept by the response route, for the list and <c>maxResponses</c>.</summary>
    public int ResponseCount { get; set; }
    public DateTime? ClosedAt { get; set; }
    public long? ClosedById { get; set; }

    public override string SubjectType => Table;
    public override Kit Kit => Kit.Form;

    public override void CopyFrom(JsonElement document) => Name = document.Text("meta", "name").Cut(120);

    /// <summary>
    /// A live form needs its address; a draft may not have one yet. The unique
    /// index makes sure no other live form has it.
    /// </summary>
    public override string Publish(JsonElement document, DateTime now, DateTime? scheduledAt)
    {
        var slug = document.Text("meta", "slug");
        if (slug.Length == 0) throw ApiException.Refused("meta.slugMissing", "meta.slug");
        Slug = slug;
        ClosedAt = null;
        ClosedById = null;
        return base.Publish(document, now, scheduledAt);
    }

    /// <summary>A closed form keeps its link and shows its closed message.</summary>
    public override string Unpublish(long actorId, DateTime now)
    {
        Status = DocumentStatus.Closed;
        ClosedAt = now;
        ClosedById = actorId;
        return Actions.Closed;
    }

    public override IReadOnlyDictionary<string, string> Names() =>
        new Dictionary<string, string> { ["name"] = Name, ["slug"] = Slug };

    public override IEnumerable<long?> PersonIds() => [.. base.PersonIds(), ClosedById];

    public override Dictionary<string, object?> OwnColumns(People people) => new()
    {
        ["slug"] = Slug,
        ["response_count"] = ResponseCount,
        ["closed_at"] = ClosedAt,
        ["closed_by"] = people[ClosedById],
    };

    /// <summary>A new form. The slug is unique and required, and a new form has none yet.</summary>
    public static Form New(NewDocument body, Actor actor) => new() { Slug = $"draft-{Guid.NewGuid()}" };
}

public sealed class FormRevision : DocumentRevision;

/// <summary>Your team's own triage of a response. Change the words to your team's.</summary>
public static class ResponseStatus
{
    public const string New = "new";
    public const string Called = "called";
    public const string Done = "done";

    public static readonly IReadOnlyList<string> All = [New, Called, Done];
}

/// <summary>A row of form_response: one submission.</summary>
public sealed class FormResponse : Audited, IHasStatus
{
    public const string Table = "form_response";

    public long FormId { get; set; }

    /// <summary>The version answered: its publish revision is the form the visitor saw.</summary>
    public int FormVersion { get; set; }

    /// <summary>What the form's validateAnswers kept: shown fields only, never the raw body.</summary>
    public JsonElement Answers { get; set; }
    public string? Locale { get; set; }
    public string Status { get; set; } = ResponseStatus.New;
    public string Note { get; set; } = "";

    /// <summary>Only when the form's <c>settings.privacy.storeIp</c> is on.</summary>
    public IPAddress? Ip { get; set; }

    public override string SubjectType => Table;
}

/// <summary>A response as your inbox shows it.</summary>
public sealed record ResponseAnswer(
    Guid Id, JsonElement Answers, string? Locale, string Status, string Note, int FormVersion,
    DateTime CreatedAt, PersonRef? CreatedBy, DateTime UpdatedAt, PersonRef? UpdatedBy)
{
    public static ResponseAnswer Of(FormResponse row, People people) => new(
        row.Uuid, row.Answers, row.Locale, row.Status, row.Note, row.FormVersion,
        row.CreatedAt, people[row.CreatedById], row.UpdatedAt, people[row.UpdatedById]);
}

/// <summary>What the response route reads in a form's settings.</summary>
public sealed record FormLimits(
    int? MaxResponses, DateTime? OpensAt, DateTime? ClosesAt, string ClosedMessage, bool StoreIp)
{
    public static FormLimits Of(JsonElement document)
    {
        var limits = document.At("settings", "limits") ?? default;
        return new(
            limits.At("maxResponses") is { ValueKind: JsonValueKind.Number } max ? max.GetInt32() : null,
            InstantOf(limits.TextOrNull("opensAt")),
            InstantOf(limits.TextOrNull("closesAt")),
            limits.Text("closedMessage"),
            document.At("settings", "privacy", "storeIp") is { ValueKind: JsonValueKind.True });
    }

    /// <summary>
    /// Whether the form takes no responses now: closed by hand, full, or outside
    /// its dates. A limit the form does not set compares as false.
    /// </summary>
    public bool Refuses(Form form, DateTime now) =>
        form.Status == DocumentStatus.Closed
        || form.ResponseCount >= MaxResponses
        || OpensAt > now
        || ClosesAt <= now;

    private static DateTime? InstantOf(string? text) =>
        DateTimeOffset.TryParse(text, out var instant) ? instant.UtcDateTime : null;
}

public sealed class FormMapping :
    IEntityTypeConfiguration<Form>, IEntityTypeConfiguration<FormRevision>, IEntityTypeConfiguration<FormResponse>
{
    public void Configure(EntityTypeBuilder<Form> form)
    {
        form.IsDocument(Form.Table);
        form.HasOne<AppUser>().WithMany().HasForeignKey(f => f.ClosedById).OnDelete(DeleteBehavior.SetNull);
    }

    public void Configure(EntityTypeBuilder<FormRevision> revision) =>
        revision.IsRevision("form_revision", "form_id");

    public void Configure(EntityTypeBuilder<FormResponse> response) =>
        response.ToTable(FormResponse.Table).IsAudited();
}
