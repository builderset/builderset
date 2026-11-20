using System.Text.Json;
using System.Text.Json.Serialization;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Http;

/// <summary>
/// A problem the kits report, as the editor reads it: a code, and where —
/// <c>nodeId</c> for the block, <c>path</c> for the field.
/// </summary>
public sealed record Issue(
    string Severity,
    string Code,
    [property: JsonPropertyName("nodeId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? NodeId = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? Path = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    Dictionary<string, JsonElement>? Params = null)
{
    public static Issue Error(string code, string? path = null) => new("error", code, Path: path);
}

/// <summary>
/// What a handler throws when it cannot answer 2xx. <see cref="ProblemsHandler"/>
/// turns it into problem details (RFC 9457): the message is <c>detail</c>, which
/// the editor shows, and <c>issues</c> or <c>errors</c> ride along beside it.
/// </summary>
public sealed class ApiException(int status, string detail) : Exception(detail)
{
    public int Status { get; } = status;
    public Dictionary<string, object?> Extensions { get; } = [];

    public static ApiException NotFound(string noun) => new(404, $"There is no such {noun}.");
    public static ApiException Conflict(string detail) => new(409, detail);
    public static ApiException Gone(string detail) => new(410, detail);
    public static ApiException Unsupported(string detail) => new(415, detail);

    /// <summary>422 with the issue codes, so the editor shows each problem on its block.</summary>
    public static ApiException Refused(IReadOnlyList<Issue> issues) =>
        new(422, "Refused: see the issues.") { Extensions = { ["issues"] = issues } };

    public static ApiException Refused(string code, string? path = null) => Refused([Issue.Error(code, path)]);

    /// <summary>422 with a visitor's errors by field, as FormView and PopupView show them.</summary>
    public static ApiException Invalid(JsonElement errors) =>
        new(422, "Some answers need another look.") { Extensions = { ["errors"] = errors } };
}

/// <summary>The one place a failure becomes an answer. Handlers stay thin: they throw.</summary>
public sealed class ProblemsHandler(IProblemDetailsService problems, ILogger<ProblemsHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception failure, CancellationToken ct)
    {
        var (status, detail, extensions) = failure switch
        {
            ApiException api => (api.Status, api.Message, api.Extensions),
            // Someone else wrote the row between this request's read and its write.
            DbUpdateConcurrencyException => (409, "Someone else changed this since you opened it.", null),
            // A restore whose address another live row took meanwhile.
            DbUpdateException unique when unique.IsUniqueViolation() =>
                (409, "Another live row has its address now.", null),
            // Nothing is stored unchecked: no checker, no write.
            CheckerUnavailableException => (503, "The document could not be checked just now. Try again.", null),
            // A body too large (413), or not the JSON the route reads (400).
            BadHttpRequestException bad => (bad.StatusCode, bad.Message, null),
            _ => (500, "Something went wrong.", (Dictionary<string, object?>?)null),
        };
        if (status >= 500) log.LogError(failure, "{Method} {Path} failed", http.Request.Method, http.Request.Path);

        http.Response.StatusCode = status;
        var context = new ProblemDetailsContext { HttpContext = http, Exception = failure };
        context.ProblemDetails.Status = status;
        context.ProblemDetails.Detail = detail;
        foreach (var (name, value) in extensions ?? []) context.ProblemDetails.Extensions[name] = value;
        return await problems.TryWriteAsync(context);
    }
}
