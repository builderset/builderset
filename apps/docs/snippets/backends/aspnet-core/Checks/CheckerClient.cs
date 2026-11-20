using System.Text.Json;
using Builderset.Api.Http;

namespace Builderset.Api.Checks;

/// <summary>
/// The second layer of the checks: the kits' own rules — an unsafe link, a
/// variable the email type does not have, a form's answers — run by the
/// Builderset checker, a small Node service beside the app. A typed client,
/// registered with <c>AddHttpClient</c>, so its base address and timeout are
/// configuration and its connections are pooled.
/// </summary>
public sealed class CheckerClient(HttpClient http)
{
    /// <summary>The checker is Node: its JSON is camelCase, where this API's is snake_case.</summary>
    private static readonly JsonSerializerOptions Json = JsonSerializerOptions.Web;

    /// <summary><c>POST /check/{kit}</c>: the document as the kit reads it, or the issues that block it at this level.</summary>
    public Task<Verdict> CheckAsync(Kit kit, JsonElement document, Level level, string? type, CancellationToken ct) =>
        PostAsync<Verdict>($"check/{kit.Name()}", new { document, level = level.Name(), type }, ct);

    /// <summary><c>POST /answers/form</c>: a response, checked against the published form.</summary>
    public Task<Answers> CheckFormAnswersAsync(JsonElement form, JsonElement answers, CancellationToken ct) =>
        PostAsync<Answers>("answers/form", new { form, answers }, ct);

    /// <summary><c>POST /answers/popup</c>: what a visitor typed into a popup, checked against the popup.</summary>
    public Task<Answers> CheckPopupValuesAsync(JsonElement popup, JsonElement values, CancellationToken ct) =>
        PostAsync<Answers>("answers/popup", new { popup, values }, ct);

    /// <summary><c>POST /render/email</c>: the live design rendered with your data, for your mailer.</summary>
    public Task<RenderedEmail> RenderEmailAsync(
        JsonElement document, JsonElement data, string? locale, string assetBase, CancellationToken ct) =>
        PostAsync<RenderedEmail>("render/email", new { document, data, locale, assetBase }, ct);

    private async Task<T> PostAsync<T>(string route, object body, CancellationToken ct)
    {
        try
        {
            using var response = await http.PostAsJsonAsync(route, body, Json, ct);
            // Any answer but 200 is a checker that cannot check this: an older one
            // without the kit, or one in trouble. Either way nothing is stored.
            if (!response.IsSuccessStatusCode)
                throw new CheckerUnavailableException($"The checker answered {(int)response.StatusCode} to {route}.");
            return await response.Content.ReadFromJsonAsync<T>(Json, ct)
                ?? throw new CheckerUnavailableException($"The checker sent nothing back to {route}.");
        }
        catch (HttpRequestException failure)
        {
            throw new CheckerUnavailableException($"The checker could not be reached for {route}.", failure);
        }
        catch (TaskCanceledException failure) when (!ct.IsCancellationRequested)
        {
            throw new CheckerUnavailableException($"The checker took too long to answer {route}.", failure);
        }
    }
}

/// <summary>The checker's answer to a document: ok with the document as the kit reads it, or the issues.</summary>
public sealed record Verdict(bool Ok, JsonElement Document, IReadOnlyList<Issue>? Issues);

/// <summary>The checker's answer to a visitor's answers: the errors by field, and the values to keep.</summary>
public sealed record Answers(bool Ok, JsonElement Errors, JsonElement Values);

public sealed record RenderedEmail(string Subject, string Html, string Text);

/// <summary>The checker is down, slow, or too old for this kit. Answered 503; nothing is written.</summary>
public sealed class CheckerUnavailableException(string message, Exception? inner = null) : Exception(message, inner);
