using System.Text.Json;
using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

/// <summary>A popup as your site gets it: <c>PopupView</c> draws the document, <c>shouldShow</c> decides.</summary>
public sealed record PublicPopup(Guid Id, int Version, JsonElement Document);

/// <summary><c>PopupView</c>'s <c>onEvent</c>: <c>shown</c>, <c>closed</c>, <c>clicked</c> or <c>submitted</c>.</summary>
public sealed record PopupEvent(string? Event);

/// <summary><c>PopupView</c>'s <c>onSubmit</c>: what the visitor typed, and the page they were on.</summary>
public sealed record PopupValues(JsonElement Values, string? Path, string? Locale);

/// <summary><c>PATCH /api/popups/:id/pause</c>: off the site, or back on.</summary>
public sealed record PauseRequest(bool Paused);

public static class PopupRoutes
{
    // ── The public side: no sign-in ──────────────────────────────────────────

    public static RouteGroupBuilder MapPublicPopups(this RouteGroupBuilder visitors)
    {
        var routes = visitors.MapGroup("/popups");

        // GET /api/public/popups?path=&locale= — the popups that may show on this
        // page, highest priority first. One indexed question for the dates; the
        // browser's shouldShow decides the rest: audience, frequency, device.
        routes.MapGet("/", async (string? path, string? locale, AppDb db, CancellationToken ct) =>
        {
            var now = DateTime.UtcNow;
            var live = await db.Popups.AsNoTracking()
                .Where(p => p.Status == DocumentStatus.Published
                    && (p.StartsAt == null || p.StartsAt <= now)
                    && (p.EndsAt == null || p.EndsAt > now))
                .OrderByDescending(p => p.Priority).ThenBy(p => p.Id)
                .Select(p => new PublicPopup(p.Uuid, p.Version, p.Document))
                .ToListAsync(ct);
            return live.Where(p => PopupPages.Allows(p.Document, path, locale)).ToList();
        });

        // POST /api/public/popups/:id/events — adds to today's counters.
        routes.MapPost("/{id:guid}/events", async (Guid id, PopupEvent body, AppDb db, CancellationToken ct) =>
        {
            if (body.Event is not { } name || !PopupDailyStat.Events.Contains(name))
                throw ApiException.Refused("event.unknown", "event");
            var popup = await FindLiveAsync(db, id, ct);
            await PopupDailyStat.CountAsync(db, popup, name, ct);
            return TypedResults.NoContent();
        });

        // POST /api/public/popups/:id/submissions — limited per address: 429 past it.
        routes.MapPost("/{id:guid}/submissions", async (Guid id, PopupValues body, Actor? visitor,
            HttpContext http, AppDb db, DocumentChecks checks, AuditTrail trail, CancellationToken ct) =>
        {
            var popup = await FindLiveAsync(db, id, ct);
            if (!popup.IsShowing(DateTime.UtcNow)) throw ApiException.Gone("This popup is no longer on the site.");

            // Only what validateSubmission keeps: the popup's own inputs, trimmed.
            var values = await checks.CheckValuesAsync(popup, body.Values, ct);

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var submission = new PopupSubmission
            {
                PopupId = popup.Id,
                PopupVersion = popup.Version,
                Answers = values,
                PagePath = body.Path?.Cut(500),
                Locale = body.Locale?.Cut(10),
                Ip = Popup.StoreIp ? http.Connection.RemoteIpAddress : null,
            };
            db.PopupSubmissions.Add(submission);
            await db.SaveChangesAsync(ct);
            trail.Record(submission, Actions.Created, visitor, to: submission.Status,
                details: new { Popup = popup.Uuid });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Replies.Created(new { id = submission.Uuid });
        })
        .RequireRateLimiting(RateLimits.Visitors);

        return routes;
    }

    /// <summary>A popup that is published or paused: one in a draft has never been on the site.</summary>
    private static async Task<Popup> FindLiveAsync(AppDb db, Guid id, CancellationToken ct) =>
        await db.Popups.FirstOrDefaultAsync(p => p.Uuid == id
            && (p.Status == DocumentStatus.Published || p.Status == DocumentStatus.Paused), ct)
        ?? throw ApiException.NotFound("popup");

    // ── Your team's side ─────────────────────────────────────────────────────

    public static RouteGroupBuilder MapPopupPause(this RouteGroupBuilder api)
    {
        // PATCH /api/popups/:id/pause — `{ paused }`. Only the status changes: the
        // document and saved_at stay as they are.
        api.MapPatch("/popups/{id:guid}/pause", async (Guid id, PauseRequest body, Actor actor,
            Documents<Popup, PopupRevision> popups, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var popup = await popups.FindAsync(id, ct);
            if (popup.Status == DocumentStatus.Draft)
                throw ApiException.Conflict("This popup has never been published: publish it first.");
            var wanted = body.Paused ? DocumentStatus.Paused : DocumentStatus.Published;
            if (popup.Status != wanted)
            {
                var fromStatus = popup.Status;
                var action = popup.Pause(body.Paused);
                trail.Record(popup, action, actor, from: fromStatus, to: popup.Status);
                await db.SaveChangesAsync(ct);
            }
            return new { popup.Status };
        })
        .RequireAuthorization(Policies.Publish);

        return api;
    }
}
