using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;

namespace Builderset.Api;

/// <summary>
/// What the shared routes need to know about one builder that its row does not
/// say itself: its address, its noun for messages, its statuses, how a new row
/// starts, and anything else a publish writes.
/// </summary>
public sealed record DocumentKind<TRow>(
    string Path,
    string Noun,
    IReadOnlyList<string> Statuses,
    Func<NewDocument, Actor, TRow> NewRow)
    where TRow : DocumentRow
{
    /// <summary>Written before the row is published, in the same transaction.</summary>
    public Func<AppDb, AuditTrail, TRow, Actor, CancellationToken, Task>? BeforePublish { get; init; }
}

/// <summary>The five builders. <c>/api/{Path}</c> is each one's set of routes.</summary>
public static class Kinds
{
    public static readonly DocumentKind<EmailTemplate> Emails =
        new("emails", "email template", EmailTemplate.Statuses, EmailTemplate.New)
        {
            BeforePublish = EmailTemplate.RetireActiveDesignAsync,
        };

    public static readonly DocumentKind<Article> Articles =
        new("articles", "article", Article.Statuses, Article.New);

    public static readonly DocumentKind<Form> Forms =
        new("forms", "form", Form.Statuses, Form.New);

    public static readonly DocumentKind<CardDesign> Cards =
        new("cards", "card design", CardDesign.Statuses, CardDesign.New);

    public static readonly DocumentKind<Popup> Popups =
        new("popups", "popup", Popup.Statuses, Popup.New);
}
