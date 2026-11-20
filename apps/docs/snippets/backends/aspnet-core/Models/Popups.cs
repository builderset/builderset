using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>A row of popup.</summary>
public sealed class Popup : DocumentRow
{
    public const string Table = "popup";

    public static readonly IReadOnlyList<string> Statuses =
        [DocumentStatus.Draft, DocumentStatus.Published, DocumentStatus.Paused];

    /// <summary>
    /// A submission's <c>ip</c> is kept only when your privacy rules allow it.
    /// Off here; the form builder decides per form instead.
    /// </summary>
    public static readonly bool StoreIp = false;

    /// <summary><c>modal</c>, <c>slidein</c>, <c>bartop</c>…: how it sits on the page.</summary>
    public string Type { get; set; } = "modal";

    // Copies of document.display, so the site asks one indexed question: which
    // popups may show today. The rest of the rules run in the browser.
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }

    /// <summary>When two popups match a page, the higher one shows.</summary>
    public short Priority { get; set; }

    public override string SubjectType => Table;
    public override Kit Kit => Kit.Popup;

    /// <summary>
    /// The display rules keep calendar days, <c>2026-11-30</c>, in the visitor's
    /// own time zone. A day begins and ends at different instants around the
    /// world, so the columns hold the widest window — from the first place the
    /// first day begins to the last place the last day ends — and the browser's
    /// <c>shouldShow</c> decides by the visitor's own day.
    /// </summary>
    public override void CopyFrom(JsonElement document)
    {
        var format = document.RootProps();
        Name = document.Text("meta", "name").Cut(120);
        Type = format.Text("type");
        StartsAt = DayOf(format.Text("display", "starts"))?.AddHours(-14);
        EndsAt = DayOf(format.Text("display", "ends"))?.AddDays(1).AddHours(12);
        Priority = (short)format.Number("display", "priority");
    }

    /// <summary>Paused is off the site too: unpublishing it takes it back to draft.</summary>
    public override bool CanUnpublish => base.CanUnpublish || Status == DocumentStatus.Paused;

    /// <summary>Takes it off the site, kept as it is, or puts it back. Returns what the log calls it.</summary>
    public string Pause(bool paused)
    {
        Status = paused ? DocumentStatus.Paused : DocumentStatus.Published;
        return paused ? Actions.Paused : Actions.Published;
    }

    /// <summary>Whether visitors may see it now, as far as the server can tell.</summary>
    public bool IsShowing(DateTime now) =>
        Status == DocumentStatus.Published && !(StartsAt > now) && !(EndsAt <= now);

    public override Dictionary<string, object?> OwnColumns(People people) => new()
    {
        ["type"] = Type,
        ["starts_at"] = StartsAt,
        ["ends_at"] = EndsAt,
        ["priority"] = Priority,
    };

    public static Popup New(NewDocument body, Actor actor) => new();

    private static DateTime? DayOf(string day) =>
        DateTime.TryParseExact(day, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var date)
            ? date
            : null;
}

public sealed class PopupRevision : DocumentRevision;

/// <summary>A row of popup_submission: what a visitor typed into a popup's inputs.</summary>
public sealed class PopupSubmission : Audited, IHasStatus
{
    public const string Table = "popup_submission";

    public long PopupId { get; set; }
    public int PopupVersion { get; set; }

    /// <summary>The popup's validateSubmission values only: its own inputs, trimmed.</summary>
    public JsonElement Answers { get; set; }

    /// <summary>The page it was sent from.</summary>
    public string? PagePath { get; set; }
    public string? Locale { get; set; }

    /// <summary>Your team's triage, as a form response's.</summary>
    public string Status { get; set; } = ResponseStatus.New;
    public IPAddress? Ip { get; set; }

    public override string SubjectType => Table;
}

/// <summary>
/// A row of popup_daily_stat: how one popup did on one day. Counters added to
/// with an upsert, never one row per view.
/// </summary>
public sealed class PopupDailyStat
{
    public long PopupId { get; set; }
    public DateOnly Day { get; set; }
    public int Shown { get; set; }
    public int Closed { get; set; }
    public int Clicked { get; set; }
    public int Submitted { get; set; }

    /// <summary>What <c>PopupView</c>'s <c>onEvent</c> reports.</summary>
    public static readonly IReadOnlyList<string> Events = ["shown", "closed", "clicked", "submitted"];

    /// <summary>
    /// Adds one to today's counter. One statement, so two visitors at the same
    /// moment both count; each counter is a parameter, so no name is ever built
    /// from the request.
    /// </summary>
    public static Task CountAsync(AppDb db, Popup popup, string @event, CancellationToken ct)
    {
        var day = DateOnly.FromDateTime(DateTime.UtcNow);
        int Is(string name) => @event == name ? 1 : 0;
        return db.Database.ExecuteSqlAsync($"""
            insert into popup_daily_stat (popup_id, day, shown, closed, clicked, submitted)
            values ({popup.Id}, {day}, {Is("shown")}, {Is("closed")}, {Is("clicked")}, {Is("submitted")})
            on conflict (popup_id, day) do update set
              shown     = popup_daily_stat.shown     + excluded.shown,
              closed    = popup_daily_stat.closed    + excluded.closed,
              clicked   = popup_daily_stat.clicked   + excluded.clicked,
              submitted = popup_daily_stat.submitted + excluded.submitted
            """, ct);
    }
}

/// <summary>
/// The page rules the server applies to <c>GET /api/public/popups</c>: the
/// pages and the language. They are the kit's <c>pathMatches</c> and
/// <c>languageMatches</c>; <c>shouldShow</c> checks them again in the browser,
/// with the rest.
/// </summary>
public static class PopupPages
{
    public static bool Allows(JsonElement document, string? path, string? locale)
    {
        var display = document.RootProps().At("display") ?? default;
        return PagesAllow(display, path) && LanguageAllows(display.Text("language"), locale);
    }

    private static bool PagesAllow(JsonElement display, string? path)
    {
        var mode = display.Text("pages");
        if (mode == "all" || path is null) return true;
        var rules = display.At("rules") is { ValueKind: JsonValueKind.Array } list
            ? list.EnumerateArray().Select(rule => rule.GetString() ?? "")
            : [];
        var listed = rules.Any(rule => rule.Trim().Length > 0 && PathMatches(rule, path));
        return mode == "only" ? listed : !listed;
    }

    /// <summary><c>*</c> stands for any part of a path, slashes included: <c>/blog/*</c>.</summary>
    private static bool PathMatches(string rule, string path)
    {
        var pattern = string.Join(".*", Normalise(rule.Trim()).Split('*').Select(Regex.Escape));
        return Regex.IsMatch(Normalise(path), $"^{pattern}$", RegexOptions.Singleline);
    }

    private static string Normalise(string path)
    {
        var clean = path.Split('?', '#')[0].TrimEnd('/');
        return clean.StartsWith('/') ? clean : "/" + clean;
    }

    /// <summary><c>sq</c> takes <c>sq-AL</c> too.</summary>
    private static bool LanguageAllows(string wanted, string? page)
    {
        if (wanted == "all") return true;
        if (string.IsNullOrEmpty(page)) return false;
        return page.Equals(wanted, StringComparison.OrdinalIgnoreCase)
            || page.StartsWith(wanted + "-", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class PopupMapping :
    IEntityTypeConfiguration<Popup>, IEntityTypeConfiguration<PopupRevision>,
    IEntityTypeConfiguration<PopupSubmission>, IEntityTypeConfiguration<PopupDailyStat>
{
    public void Configure(EntityTypeBuilder<Popup> popup) => popup.IsDocument(Popup.Table);

    public void Configure(EntityTypeBuilder<PopupRevision> revision) =>
        revision.IsRevision("popup_revision", "popup_id");

    public void Configure(EntityTypeBuilder<PopupSubmission> submission) =>
        submission.ToTable(PopupSubmission.Table).IsAudited();

    public void Configure(EntityTypeBuilder<PopupDailyStat> stat)
    {
        stat.ToTable("popup_daily_stat");
        stat.HasKey(s => new { s.PopupId, s.Day });
    }
}
