using System.Text.Json;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Builderset.Api.Storage;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

/// <summary><c>POST /api/emails/:id/send</c>: the data its variables are filled from, and the language.</summary>
public sealed record SendRequest(JsonElement Data, string? Locale);

/// <summary>
/// What leaves the server: the article your site shows and the email your
/// mailer sends. Both read the live <c>document</c>, never the draft, and the
/// browser never sends HTML: the server renders what it stored and checked.
/// </summary>
public static class DeliveryRoutes
{
    /// <summary>GET /api/public/articles/:locale/:slug — the published article, for your site.</summary>
    public static RouteGroupBuilder MapPublicArticles(this RouteGroupBuilder visitors)
    {
        visitors.MapGet("/articles/{locale}/{slug}", async (string locale, string slug, AppDb db, CancellationToken ct) =>
        {
            var article = await db.Articles.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Locale == locale && a.Slug == slug && a.Status == DocumentStatus.Published, ct)
                ?? throw ApiException.NotFound("article");
            var people = await People.LoadAsync(db, [article.AuthorId], ct);
            return new
            {
                id = article.Uuid,
                article.Document,
                title = article.Name,
                article.Excerpt,
                article.CoverKey,
                article.CoverAlt,
                article.PublishedAt,
                author = people[article.AuthorId],
            };
        });
        return visitors;
    }

    /// <summary>
    /// POST /api/emails/:id/send — the live design rendered with your data, for
    /// your mailer to send. Rendering is the email kit's, in the checker, so the
    /// HTML is the one the editor previewed. A test send of the draft is your
    /// mailer's: render the draft the same way and send it to one address.
    /// </summary>
    public static RouteGroupBuilder MapEmailDelivery(this RouteGroupBuilder api)
    {
        api.MapPost("/emails/{id:guid}/send", async (Guid id, SendRequest body,
            Documents<EmailTemplate, EmailTemplateRevision> emails, CheckerClient checker, FileStore files, CancellationToken ct) =>
        {
            var template = await emails.FindAsync(id, ct);
            if (template.Status != DocumentStatus.Published)
                throw ApiException.Conflict("This email template is a draft: publish it before sending it.");
            var data = body.Data.ValueKind == JsonValueKind.Object ? body.Data : JsonSerializer.SerializeToElement(new { });
            return await checker.RenderEmailAsync(template.Document, data, body.Locale?.Cut(10), files.PublicBase.ToString(), ct);
        });
        return api;
    }
}
