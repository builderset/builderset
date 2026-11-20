using System.Text.Json;
using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

/// <summary><c>POST /api/cards/:id/issues</c>: who the card is for, what is printed on it, and how it reaches them.</summary>
public sealed record IssueRequest(string? MemberRef, JsonElement Data, string? Delivery, DateOnly? ValidUntil);

/// <summary><c>POST /api/cards/:id/issues/:iid/revoke</c>.</summary>
public sealed record RevokeRequest(string? Reason);

/// <summary><c>GET /api/cards/:id/issues</c>: <c>?status=&amp;member=&amp;limit=&amp;offset=</c>.</summary>
public sealed record IssueQuery(string? Status, string? Member, int? Limit, int? Offset)
{
    public int Take => Math.Clamp(Limit ?? 50, 1, 100);
    public int Skip => Math.Max(Offset ?? 0, 0);
}

public static class CardRoutes
{
    /// <summary>
    /// The cards made out from a design. Issuing freezes the design's version
    /// and the member's data; revoking cancels a card for good, and its number
    /// is never given out again.
    /// </summary>
    public static RouteGroupBuilder MapCardIssues(this RouteGroupBuilder api)
    {
        var routes = api.MapGroup("/cards/{id:guid}/issues");

        // POST /api/cards/:id/issues — 422 while the design is a draft, 409 when the member holds one.
        routes.MapPost("/", async (Guid id, IssueRequest body, Actor actor,
            Documents<CardDesign, CardDesignRevision> designs, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var design = await designs.FindAsync(id, ct);
            if (design.Status != DocumentStatus.Published)
                throw ApiException.Refused("design.notPublished");
            var issue = NewIssue(design, body);

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            db.CardIssues.Add(issue);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException failure) when (failure.IsUniqueViolation(CardIssue.OneValidIndex))
            {
                throw ApiException.Conflict("This member already holds a card of this design: revoke it first.");
            }
            trail.Record(issue, Actions.Issued, actor, to: issue.Status,
                details: new { Design = design.Uuid, issue.DesignVersion, issue.Number });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Replies.Created(await AnswerAsync(db, issue, design, ct));
        });

        // GET /api/cards/:id/issues — newest first.
        routes.MapGet("/", async (Guid id, [AsParameters] IssueQuery query,
            Documents<CardDesign, CardDesignRevision> designs, AppDb db, CancellationToken ct) =>
        {
            var design = await designs.FindAsync(id, ct);
            var issues = db.CardIssues.Where(i => i.CardDesignId == design.Id);
            if (query.Status is { } status && CardIssueStatus.All.Contains(status))
                issues = issues.Where(i => i.Status == status);
            if (!string.IsNullOrEmpty(query.Member))
                issues = issues.Where(i => i.MemberRef == query.Member);

            var total = await issues.CountAsync(ct);
            var page = await issues.OrderByDescending(i => i.CreatedAt).ThenByDescending(i => i.Id)
                .Skip(query.Skip).Take(query.Take).ToListAsync(ct);
            var people = await People.LoadAsync(db,
                page.SelectMany(i => new[] { i.CreatedById, i.UpdatedById, i.RevokedById }), ct);
            return new Page<CardIssueAnswer>(page.Select(i => CardIssueAnswer.Of(i, design, people)).ToList(), total);
        });

        // POST /api/cards/:id/issues/:iid/revoke — `{ reason }`.
        routes.MapPost("/{iid:guid}/revoke", async (Guid id, Guid iid, RevokeRequest body, Actor actor,
            Documents<CardDesign, CardDesignRevision> designs, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var design = await designs.FindAsync(id, ct);
            var issue = await db.CardIssues.FirstOrDefaultAsync(i => i.Uuid == iid && i.CardDesignId == design.Id, ct)
                ?? throw ApiException.NotFound("card");
            if (issue.Status == CardIssueStatus.Revoked) throw ApiException.Conflict("This card is already revoked.");

            var reason = body.Reason?.Trim().Cut(200);
            trail.Record(issue, Actions.Revoked, actor, from: issue.Status, to: CardIssueStatus.Revoked,
                details: new { Reason = reason });
            issue.Revoke(actor.Id, reason, Clock.Now());
            await db.SaveChangesAsync(ct);
            return await AnswerAsync(db, issue, design, ct);
        });

        return routes;
    }

    /// <summary>A card for one member, from the design's live version. Refuses what it cannot freeze into a card.</summary>
    private static CardIssue NewIssue(CardDesign design, IssueRequest body)
    {
        List<Issue> issues = [.. CardIssue.CheckData(body.Data)];
        var memberRef = body.MemberRef?.Trim() ?? "";
        if (memberRef.Length is 0 or > 120) issues.Add(Issue.Error("member_ref.invalid", "member_ref"));
        var delivery = body.Delivery ?? CardDelivery.Print;
        if (!CardDelivery.All.Contains(delivery)) issues.Add(Issue.Error("delivery.unknown", "delivery"));
        if (issues.Count > 0) throw ApiException.Refused(issues);

        return new CardIssue
        {
            CardDesignId = design.Id,
            DesignVersion = design.Version,
            MemberRef = memberRef,
            Number = CardIssue.NewNumber(),
            Data = body.Data,
            Delivery = delivery,
            ValidUntil = body.ValidUntil,
        };
    }

    private static async Task<CardIssueAnswer> AnswerAsync(AppDb db, CardIssue issue, CardDesign design, CancellationToken ct) =>
        CardIssueAnswer.Of(issue, design,
            await People.LoadAsync(db, [issue.CreatedById, issue.UpdatedById, issue.RevokedById], ct));
}
