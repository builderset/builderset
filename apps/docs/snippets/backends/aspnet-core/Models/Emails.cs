using System.Text.Json;
using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>A row of email_template: one design for an email your app sends.</summary>
public sealed class EmailTemplate : DocumentRow
{
    public const string Table = "email_template";

    public static readonly IReadOnlyList<string> Statuses = [DocumentStatus.Draft, DocumentStatus.Published];

    /// <summary>The email type it is for: its variables and checks. Null for a design not tied to one.</summary>
    public string? TypeKey { get; set; }

    public override string SubjectType => Table;
    public override Kit Kit => Kit.Email;

    public override void CopyFrom(JsonElement document) => Name = document.Text("meta", "name").Cut(120);

    public override Dictionary<string, object?> OwnColumns(People people) => new() { ["type_key"] = TypeKey };

    /// <summary>A new design. Only a type the project has: its key picks the variables checked.</summary>
    public static EmailTemplate New(NewDocument body, Actor actor)
    {
        if (body.TypeKey is { } key && !EmailTypes.Known.Contains(key))
            throw ApiException.Refused("type_key.unknown", "type_key");
        return new EmailTemplate { TypeKey = body.TypeKey };
    }

    /// <summary>
    /// One active design per email type: publishing this one moves the one before
    /// it back to draft, saved before this row so the unique index never sees two.
    /// </summary>
    public static async Task RetireActiveDesignAsync(AppDb db, AuditTrail trail, EmailTemplate row, Actor actor, CancellationToken ct)
    {
        if (row.TypeKey is null) return;
        var active = await db.EmailTemplates
            .Where(t => t.TypeKey == row.TypeKey && t.Status == DocumentStatus.Published && t.Id != row.Id)
            .ToListAsync(ct);
        foreach (var replaced in active)
        {
            replaced.Status = DocumentStatus.Draft;
            trail.Record(replaced, Actions.Unpublished, actor,
                from: DocumentStatus.Published, to: DocumentStatus.Draft, details: new { ReplacedBy = row.Uuid });
        }
        await db.SaveChangesAsync(ct);
    }
}

public sealed class EmailTemplateRevision : DocumentRevision;

/// <summary>Your email types, by key: the variables a template for each may use. The checker has the same list.</summary>
public static class EmailTypes
{
    public static readonly IReadOnlySet<string> Known = new HashSet<string>();
}

public sealed class EmailMapping : IEntityTypeConfiguration<EmailTemplate>, IEntityTypeConfiguration<EmailTemplateRevision>
{
    public void Configure(EntityTypeBuilder<EmailTemplate> email) => email.IsDocument(EmailTemplate.Table);

    public void Configure(EntityTypeBuilder<EmailTemplateRevision> revision) =>
        revision.IsRevision("email_template_revision", "email_template_id");
}
