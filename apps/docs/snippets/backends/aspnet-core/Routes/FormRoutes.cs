using System.Text.Json;
using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

/// <summary><c>FormView</c>'s <c>onSubmit</c>: the answers, the page's language, and the hidden trap field.</summary>
public sealed record ResponseSubmission(JsonElement Answers, string? Locale, string? Trap);

/// <summary>Your team's triage of a response. A field left out stays as it is.</summary>
public sealed record ResponseTriage(string? Status, string? Note);

public static class FormRoutes
{
    // ── The public side: no sign-in ──────────────────────────────────────────

    /// <summary>
    /// The form a visitor sees, by its address: published, or closed and still
    /// showing its closed message. Responses are checked against this
    /// PUBLISHED document, never the draft.
    /// </summary>
    private static async Task<Form> FindPublicFormAsync(AppDb db, string slug, CancellationToken ct) =>
        await db.Forms.FirstOrDefaultAsync(f => f.Slug == slug
            && (f.Status == DocumentStatus.Published || f.Status == DocumentStatus.Closed), ct)
        ?? throw ApiException.NotFound("form");

    public static RouteGroupBuilder MapPublicForms(this RouteGroupBuilder visitors)
    {
        var routes = visitors.MapGroup("/forms");

        // GET /api/public/forms/:slug — closed, the page still gets the document:
        // <FormView closed> shows the closed message in the form's own look.
        routes.MapGet("/{slug}", async (string slug, AppDb db, CancellationToken ct) =>
        {
            var form = await FindPublicFormAsync(db, slug, ct);
            var closed = FormLimits.Of(form.Document).Refuses(form, DateTime.UtcNow);
            return TypedResults.Json(new { form.Document, closed }, statusCode: closed ? 410 : 200);
        });

        // POST /api/public/forms/:slug/responses — limited per address: 429 past it.
        routes.MapPost("/{slug}/responses", async (string slug, ResponseSubmission body, Actor? visitor,
            HttpContext http, AppDb db, DocumentChecks checks, AuditTrail trail, CancellationToken ct) =>
        {
            var form = await FindPublicFormAsync(db, slug, ct);
            var limits = FormLimits.Of(form.Document);
            if (limits.Refuses(form, DateTime.UtcNow)) throw ApiException.Gone(limits.ClosedMessage);

            // The hidden trap field is filled only by bots. They are told it worked
            // and nothing is stored, so they learn nothing to work around.
            if (!string.IsNullOrEmpty(body.Trap)) return Replies.Created(new { id = (Guid?)null });

            // Only what validateAnswers keeps is stored: shown fields, numbers as numbers.
            var answers = await checks.CheckAnswersAsync(form, body.Answers, ct);

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            // Counted and limited in one statement: two last responses at once cannot both get in.
            var counted = await db.Forms
                .Where(f => f.Id == form.Id && f.Status == DocumentStatus.Published
                    && (limits.MaxResponses == null || f.ResponseCount < limits.MaxResponses))
                .ExecuteUpdateAsync(set => set.SetProperty(f => f.ResponseCount, f => f.ResponseCount + 1), ct);
            if (counted == 0) throw ApiException.Gone(limits.ClosedMessage);

            // A signed-in visitor is the response's creator; the interceptor stamps them.
            var response = new FormResponse
            {
                FormId = form.Id,
                FormVersion = form.Version,
                Answers = answers,
                Locale = body.Locale?.Cut(10),
                Ip = limits.StoreIp ? http.Connection.RemoteIpAddress : null,
            };
            db.FormResponses.Add(response);
            await db.SaveChangesAsync(ct);
            trail.Record(response, Actions.Created, visitor, to: response.Status, details: new { Form = form.Uuid });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Replies.Created(new { id = (Guid?)response.Uuid });
        })
        .RequireRateLimiting(RateLimits.Visitors);

        return routes;
    }

    // ── Your team's side: the inbox ──────────────────────────────────────────

    public static RouteGroupBuilder MapFormResponses(this RouteGroupBuilder api)
    {
        var routes = api.MapGroup("/forms/{id:guid}/responses");

        // GET /api/forms/:id/responses — the editor's loadResponses, and your inbox.
        routes.MapGet("/", async (Guid id, Documents<Form, FormRevision> forms, AppDb db, CancellationToken ct) =>
        {
            var form = await forms.FindAsync(id, ct);
            var responses = db.FormResponses.Where(r => r.FormId == form.Id);
            var weekAgo = DateTime.UtcNow.AddDays(-7);
            var latest = await responses.OrderByDescending(r => r.CreatedAt).Take(20).ToListAsync(ct);
            return new
            {
                total = await responses.CountAsync(ct),
                this_week = await responses.CountAsync(r => r.CreatedAt > weekAgo, ct),
                latest = latest.Select(r => new
                {
                    id = r.Uuid,
                    title = TitleOf(r.Answers) ?? $"Response {r.Uuid.ToString()[..8]}",
                    when = r.CreatedAt,
                    status = r.Status,
                }),
            };
        });

        // PATCH /api/forms/:id/responses/:rid — your team's triage: { status, note }.
        routes.MapPatch("/{rid:guid}", async (Guid id, Guid rid, ResponseTriage body, Actor actor,
            Documents<Form, FormRevision> forms, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var response = await FindResponseAsync(db, await forms.FindAsync(id, ct), rid, ct);
            var status = body.Status ?? response.Status;
            var note = body.Note ?? response.Note;
            if (!ResponseStatus.All.Contains(status)) throw ApiException.Refused("status.unknown", "status");
            if (note.Length > 4000) throw ApiException.Refused("note.invalid", "note");

            if (status != response.Status || note != response.Note)
            {
                // The log's word for any triage; a note alone says so in its details.
                trail.Record(response, Actions.StatusChanged, actor, from: response.Status, to: status,
                    details: note == response.Note ? null : new { Note = true });
                response.Status = status;
                response.Note = note;
                await db.SaveChangesAsync(ct);
            }
            return ResponseAnswer.Of(response, await People.LoadAsync(db, [response.CreatedById, response.UpdatedById], ct));
        });

        // DELETE /api/forms/:id/responses/:rid — into the trash; your retention job deletes for good.
        routes.MapDelete("/{rid:guid}", async (Guid id, Guid rid, Actor actor,
            Documents<Form, FormRevision> forms, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var response = await FindResponseAsync(db, await forms.FindAsync(id, ct), rid, ct);
            trail.SoftDelete(response, actor);
            await db.SaveChangesAsync(ct);
            return TypedResults.NoContent();
        });

        return routes;
    }

    private static async Task<FormResponse> FindResponseAsync(AppDb db, Form form, Guid rid, CancellationToken ct) =>
        await db.FormResponses.FirstOrDefaultAsync(r => r.Uuid == rid && r.FormId == form.Id, ct)
        ?? throw ApiException.NotFound("response");

    /// <summary>A line for the Responses tab: the first text answer, as the editor lists it.</summary>
    private static string? TitleOf(JsonElement answers) =>
        answers.ValueKind != JsonValueKind.Object
            ? null
            : answers.EnumerateObject()
                .Select(answer => answer.Value)
                .Where(value => value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString()))
                .Select(value => value.GetString()!.Cut(80))
                .FirstOrDefault();

    /// <summary>
    /// For your retention job: responses older than the form's
    /// <c>settings.privacy.keepMonths</c>, deleted for good — the one place a row
    /// is removed instead of soft-deleted. <c>ExecuteDelete</c> bypasses the
    /// interceptor, which would make it a soft delete.
    /// </summary>
    public static Task<int> DeleteExpiredResponsesAsync(AppDb db, Form form, int keepMonths, CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow.AddMonths(-keepMonths);
        return db.FormResponses.IgnoreQueryFilters()
            .Where(r => r.FormId == form.Id && r.CreatedAt < cutoff)
            .ExecuteDeleteAsync(ct);
    }
}
