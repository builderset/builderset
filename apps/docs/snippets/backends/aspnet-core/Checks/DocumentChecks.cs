using System.Text.Json;
using Builderset.Api.Http;
using Builderset.Api.Models;

namespace Builderset.Api.Checks;

/// <summary>
/// Every document is checked here before it is stored, in two layers: its
/// structure, here, against the kit's JSON Schema; then the kit's own rules,
/// in the checker. There is no Builderset package for C#, so the second layer
/// is the kits' JavaScript, run beside the app — the same code the editor runs.
/// </summary>
public sealed class DocumentChecks(KitSchemas schemas, CheckerClient checker)
{
    /// <summary>The document as the kit reads it, ready to store; or a 422 with the issues.</summary>
    public async Task<JsonElement> CheckAsync(DocumentRow row, JsonElement document, Level level, CancellationToken ct)
    {
        var malformed = schemas.Check(row.Kit, document);
        if (malformed.Count > 0) throw ApiException.Refused(malformed);

        // An email is checked against its type too: a reset email must use the reset link.
        var type = row is EmailTemplate email ? email.TypeKey : null;
        var verdict = await checker.CheckAsync(row.Kit, document, level, type, ct);
        if (!verdict.Ok) throw ApiException.Refused(verdict.Issues ?? [Issue.Error("document.malformed")]);
        // An article older than the kit comes back brought up to its version.
        return verdict.Document;
    }

    /// <summary>
    /// A saved section: the editor's <c>{ roots, nodes }</c>, each root one of the
    /// nodes. Its elements are checked again, by the document check, in every
    /// document it is pasted into.
    /// </summary>
    public static JsonElement CheckSection(JsonElement fragment)
    {
        var nodes = fragment.At("nodes");
        var roots = fragment.At("roots");
        var whole = nodes is { ValueKind: JsonValueKind.Object } tree
            && roots is { ValueKind: JsonValueKind.Array } list
            && list.GetArrayLength() > 0
            && list.EnumerateArray().All(root =>
                root.ValueKind == JsonValueKind.String
                && tree.At(root.GetString()!) is { ValueKind: JsonValueKind.Object });
        return whole ? fragment : throw ApiException.Refused("fragment.malformed", "fragment");
    }

    /// <summary>A form's response, checked against the published form, never the draft.</summary>
    public async Task<JsonElement> CheckAnswersAsync(Form form, JsonElement answers, CancellationToken ct)
    {
        var checkedAnswers = await checker.CheckFormAnswersAsync(form.Document, ObjectOrEmpty(answers), ct);
        return checkedAnswers.Ok ? checkedAnswers.Values : throw ApiException.Invalid(checkedAnswers.Errors);
    }

    /// <summary>A popup's submission, checked against the live popup.</summary>
    public async Task<JsonElement> CheckValuesAsync(Popup popup, JsonElement values, CancellationToken ct)
    {
        var checkedValues = await checker.CheckPopupValuesAsync(popup.Document, ObjectOrEmpty(values), ct);
        return checkedValues.Ok ? checkedValues.Values : throw ApiException.Invalid(checkedValues.Errors);
    }

    /// <summary>Anything but an object of answers is no answers: every required field is then missing.</summary>
    private static JsonElement ObjectOrEmpty(JsonElement answers) =>
        answers.ValueKind == JsonValueKind.Object ? answers : JsonSerializer.SerializeToElement(new { });
}
