using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>A row of card_design: a card, designed once and issued to many members.</summary>
public sealed class CardDesign : DocumentRow
{
    public const string Table = "card_design";

    public static readonly IReadOnlyList<string> Statuses = [DocumentStatus.Draft, DocumentStatus.Published];

    /// <summary><c>membership</c>, <c>id</c>, <c>bank</c>…: its size, corners and print rules.</summary>
    public string Format { get; set; } = "membership";

    // Copies of the document's size, for lists and the print order.
    public decimal WidthMm { get; set; }
    public decimal HeightMm { get; set; }

    /// <summary>1, front only; 2, front and back.</summary>
    public short Sides { get; set; } = 2;

    public override string SubjectType => Table;
    public override Kit Kit => Kit.Card;

    /// <summary>The card keeps its format on the root node's props.</summary>
    public override void CopyFrom(JsonElement document)
    {
        var format = document.RootProps();
        Name = document.Text("meta", "name").Cut(120);
        Format = format.Text("format");
        WidthMm = format.Number("width");
        HeightMm = format.Number("height");
        Sides = (short)format.Number("sides");
    }

    public override Dictionary<string, object?> OwnColumns(People people) => new()
    {
        ["format"] = Format,
        ["width_mm"] = WidthMm,
        ["height_mm"] = HeightMm,
        ["sides"] = Sides,
    };

    public static CardDesign New(NewDocument body, Actor actor) => new();
}

public sealed class CardDesignRevision : DocumentRevision;

public static class CardIssueStatus
{
    public const string Issued = "issued";
    public const string Printed = "printed";
    public const string Revoked = "revoked";

    public static readonly IReadOnlyList<string> All = [Issued, Printed, Revoked];
}

public static class CardDelivery
{
    public const string Print = "print";
    public const string Wallet = "wallet";

    public static readonly IReadOnlyList<string> All = [Print, Wallet];
}

/// <summary>
/// A row of card_issue: one card made out to one member. The design's version
/// and the member's data are frozen when it is issued, so a reprint matches the
/// card in their hand.
/// </summary>
public sealed partial class CardIssue : Audited, IHasStatus
{
    public const string Table = "card_issue";

    /// <summary>The unique index that keeps one card that is not revoked per member and design.</summary>
    public const string OneValidIndex = "card_issue_one_valid";

    public long CardDesignId { get; set; }
    public int DesignVersion { get; set; }

    /// <summary>Your member's id, as your system knows it.</summary>
    public string MemberRef { get; set; } = "";

    /// <summary>Printed on the card. Never reused, not even after a revoke.</summary>
    public string Number { get; set; } = "";

    /// <summary>The fields filled in: <c>{ "member.name": "Arben Hoxha" }</c>.</summary>
    public JsonElement Data { get; set; }
    public string Status { get; set; } = CardIssueStatus.Issued;
    public string Delivery { get; set; } = CardDelivery.Print;
    public DateOnly? ValidUntil { get; set; }
    public DateTime? PrintedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public long? RevokedById { get; set; }
    public string? RevokeReason { get; set; }

    public override string SubjectType => Table;

    public void Revoke(long actorId, string? reason, DateTime now)
    {
        Status = CardIssueStatus.Revoked;
        RevokedAt = now;
        RevokedById = actorId;
        RevokeReason = reason;
    }

    /// <summary>
    /// Twelve random digits in groups of four, <c>0248 1173 5521</c>: nothing
    /// to guess a member's card from. The unique index refuses the rare repeat.
    /// </summary>
    public static string NewNumber()
    {
        var digits = string.Concat(Enumerable.Range(0, 12).Select(_ => RandomNumberGenerator.GetInt32(10)));
        return $"{digits[..4]} {digits[4..8]} {digits[8..]}";
    }

    /// <summary>
    /// What a card is filled in with: a flat map from a field's path to its text,
    /// as the card kit reads it. Anything else is refused before it is frozen
    /// into a card.
    /// </summary>
    public static IReadOnlyList<Issue> CheckData(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object) return [Issue.Error("data.invalid", "data")];
        return data.EnumerateObject()
            .Where(field => !FieldPath().IsMatch(field.Name)
                || field.Value.ValueKind != JsonValueKind.String
                || field.Value.GetString()!.Length > 500)
            .Select(field => Issue.Error("data.fieldInvalid", $"data.{field.Name}"))
            .ToList();
    }

    [GeneratedRegex("^[a-z_][a-z0-9_]*(?:\\.[a-z_][a-z0-9_]*){0,4}$")]
    private static partial Regex FieldPath();
}

/// <summary>A card as the API shows it.</summary>
public sealed record CardIssueAnswer(
    Guid Id, Guid Design, int DesignVersion, string MemberRef, string Number, JsonElement Data,
    string Status, string Delivery, DateOnly? ValidUntil, DateTime? PrintedAt,
    DateTime? RevokedAt, PersonRef? RevokedBy, string? RevokeReason,
    DateTime CreatedAt, PersonRef? CreatedBy, DateTime UpdatedAt, PersonRef? UpdatedBy)
{
    public static CardIssueAnswer Of(CardIssue row, CardDesign design, People people) => new(
        row.Uuid, design.Uuid, row.DesignVersion, row.MemberRef, row.Number, row.Data,
        row.Status, row.Delivery, row.ValidUntil, row.PrintedAt,
        row.RevokedAt, people[row.RevokedById], row.RevokeReason,
        row.CreatedAt, people[row.CreatedById], row.UpdatedAt, people[row.UpdatedById]);
}

public sealed class CardMapping :
    IEntityTypeConfiguration<CardDesign>, IEntityTypeConfiguration<CardDesignRevision>, IEntityTypeConfiguration<CardIssue>
{
    public void Configure(EntityTypeBuilder<CardDesign> design) => design.IsDocument(CardDesign.Table);

    public void Configure(EntityTypeBuilder<CardDesignRevision> revision) =>
        revision.IsRevision("card_design_revision", "card_design_id");

    public void Configure(EntityTypeBuilder<CardIssue> issue)
    {
        issue.ToTable(CardIssue.Table).IsAudited();
        issue.HasOne<AppUser>().WithMany().HasForeignKey(i => i.RevokedById).OnDelete(DeleteBehavior.SetNull);
    }
}
