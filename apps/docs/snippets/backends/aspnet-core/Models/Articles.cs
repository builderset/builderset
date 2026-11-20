using System.Text.Json;
using System.Text.RegularExpressions;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>A row of article: one page of your blog or help centre, in one language.</summary>
public sealed partial class Article : DocumentRow
{
    public const string Table = "article";

    public static readonly IReadOnlyList<string> Statuses =
        [DocumentStatus.Draft, DocumentStatus.Scheduled, DocumentStatus.Published, DocumentStatus.Archived];

    /// <summary>The address, unique with <see cref="Locale"/> among live articles.</summary>
    public string Slug { get; set; } = "";
    public string Locale { get; set; } = "";

    /// <summary>A job of yours publishes a scheduled article then.</summary>
    public DateTime? ScheduledAt { get; set; }

    // Copies of document.meta, for lists, search and cards. The title is Name,
    // so lists and search treat every document alike.
    public string Excerpt { get; set; } = "";
    public string? CoverKey { get; set; }
    public string? CoverAlt { get; set; }

    /// <summary>The byline: not always who created the row.</summary>
    public long? AuthorId { get; set; }

    public override string SubjectType => Table;
    public override Kit Kit => Kit.Article;

    public override void CopyFrom(JsonElement document)
    {
        Name = document.Text("meta", "title").Cut(300);
        Excerpt = document.Text("meta", "excerpt").Cut(600);
        CoverKey = document.TextOrNull("meta", "cover", "media", "key");
        CoverAlt = document.TextOrNull("meta", "cover", "alt");
    }

    /// <summary>
    /// A future <paramref name="scheduledAt"/> waits for your job. Publishing now
    /// keeps the first published_at, which the site's list sorts by.
    /// </summary>
    public override string Publish(JsonElement document, DateTime now, DateTime? scheduledAt)
    {
        if (scheduledAt is not null)
        {
            Status = DocumentStatus.Scheduled;
            ScheduledAt = scheduledAt;
            return Actions.Scheduled;
        }
        Status = DocumentStatus.Published;
        ScheduledAt = null;
        PublishedAt ??= now;
        return Actions.Published;
    }

    public override string Unpublish(long actorId, DateTime now)
    {
        ScheduledAt = null;
        return base.Unpublish(actorId, now);
    }

    public override IReadOnlyDictionary<string, string> Names() =>
        new Dictionary<string, string> { ["title"] = Name, ["slug"] = Slug };

    public override IEnumerable<long?> PersonIds() => [.. base.PersonIds(), AuthorId];

    public override Dictionary<string, object?> OwnColumns(People people) => new()
    {
        ["title"] = Name,
        ["slug"] = Slug,
        ["locale"] = Locale,
        ["scheduled_at"] = ScheduledAt,
        ["excerpt"] = Excerpt,
        ["cover_key"] = CoverKey,
        ["cover_alt"] = CoverAlt,
        ["author"] = people[AuthorId],
    };

    /// <summary>A new article. Its address is the article's, not the document's: chosen when it is made.</summary>
    public static Article New(NewDocument body, Actor actor)
    {
        List<Issue> issues = [];
        if (body.Slug is not { Length: <= 200 } slug || !SlugPattern().IsMatch(slug))
            issues.Add(Issue.Error("slug.invalid", "slug"));
        if (body.Locale is not { Length: <= 10 } locale || !LocalePattern().IsMatch(locale))
            issues.Add(Issue.Error("locale.invalid", "locale"));
        if (issues.Count > 0) throw ApiException.Refused(issues);
        return new Article { Slug = body.Slug!, Locale = body.Locale!, AuthorId = actor.Id };
    }

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    [GeneratedRegex("^[a-z]{2}(?:-[A-Z]{2})?$")]
    private static partial Regex LocalePattern();
}

public sealed class ArticleRevision : DocumentRevision;

public sealed class ArticleMapping : IEntityTypeConfiguration<Article>, IEntityTypeConfiguration<ArticleRevision>
{
    public void Configure(EntityTypeBuilder<Article> article)
    {
        article.IsDocument(Article.Table);
        article.Property(a => a.Name).HasColumnName("title");
        article.HasOne<AppUser>().WithMany().HasForeignKey(a => a.AuthorId).OnDelete(DeleteBehavior.SetNull);
    }

    public void Configure(EntityTypeBuilder<ArticleRevision> revision) =>
        revision.IsRevision("article_revision", "article_id");
}
