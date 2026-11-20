using System.Text.Json;
using Builderset.Api.Http;
using Json.Schema;

namespace Builderset.Api.Checks;

/// <summary>The five builders, as the checker's routes and the schema files name them.</summary>
public enum Kit { Email, Article, Form, Card, Popup }

/// <summary>A draft may be unfinished but never unsafe; publishing refuses every error.</summary>
public enum Level { Draft, Publish }

public static class KitNames
{
    public static string Name(this Kit kit) => kit.ToString().ToLowerInvariant();
    public static string Name(this Level level) => level.ToString().ToLowerInvariant();
}

/// <summary>
/// The first layer of the checks, in-process: is it the kit's document at all?
/// Each kit ships its JSON Schema, <c>@builderset/&lt;kit&gt;/schema.json</c>,
/// and the build copies the five into <c>schemas/</c> beside the app (see the
/// .csproj). A document that fails here never reaches the checker.
/// </summary>
public sealed class KitSchemas
{
    private static readonly EvaluationOptions Evaluation = new() { OutputFormat = OutputFormat.List };

    private readonly Dictionary<Kit, JsonSchema> schemas;

    public KitSchemas()
    {
        // A registry of their own, so the five files' $defs never meet.
        schemas = Enum.GetValues<Kit>().ToDictionary(kit => kit, kit => JsonSchema.FromFile(
            Path.Combine(AppContext.BaseDirectory, "schemas", $"{kit.Name()}.schema.json"),
            new BuildOptions { SchemaRegistry = new SchemaRegistry() }));
    }

    /// <summary>Where the document is not the kit's shape, at most ten places; none when it is.</summary>
    public IReadOnlyList<Issue> Check(Kit kit, JsonElement document)
    {
        if (document.ValueKind != JsonValueKind.Object) return [Issue.Error("document.malformed")];
        var result = schemas[kit].Evaluate(document, Evaluation);
        if (result.IsValid) return [];
        return (result.Details ?? [])
            .Where(detail => detail.Errors is { Count: > 0 })
            .Select(detail => Issue.Error("document.malformed", DottedPath(detail.InstanceLocation.ToString())))
            .DistinctBy(issue => issue.Path)
            .Take(10)
            .ToList();
    }

    /// <summary>A JSON Pointer, <c>/nodes/hero/props</c>, as the editor's paths are written: <c>nodes.hero.props</c>.</summary>
    private static string DottedPath(string pointer) =>
        string.Join('.', pointer.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Replace("~1", "/").Replace("~0", "~")));
}
