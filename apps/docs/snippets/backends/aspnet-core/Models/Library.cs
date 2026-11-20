using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Builderset.Api.Models;

/// <summary>A row of saved_section: a piece of a document saved to reuse.</summary>
public sealed class SavedSection : Audited
{
    public const string Table = "saved_section";

    /// <summary>The builders with a library: <c>email</c>, <c>article</c>, <c>form</c>.</summary>
    public static readonly IReadOnlyList<string> Kits = ["email", "article", "form"];

    /// <summary>Which builder's library it belongs to.</summary>
    public string Kit { get; set; } = "";

    /// <summary>What the editor lists it as.</summary>
    public string Name { get; set; } = "";

    /// <summary>The editor's <c>{ roots, nodes }</c>.</summary>
    public JsonElement Fragment { get; set; }

    /// <summary>An email section kept in step everywhere it is used.</summary>
    public bool Synced { get; set; }

    public override string SubjectType => Table;
}

/// <summary>A section as the editor reads it.</summary>
public sealed record SectionAnswer(Guid Id, string Name, JsonElement Fragment)
{
    public static SectionAnswer Of(SavedSection row) => new(row.Uuid, row.Name, row.Fragment);
}

/// <summary>A row of media: every uploaded file, by the key the documents store.</summary>
public sealed class Media : Audited
{
    public const string Table = "media";

    /// <summary>What the editor offers a file for.</summary>
    public static readonly IReadOnlyList<string> Kinds = ["image", "video", "audio", "file"];

    /// <summary>Where the bytes are. A document holds the key, never a URL.</summary>
    public string Key { get; set; } = "";
    public string Kind { get; set; } = "";

    /// <summary>Known by the file's first bytes, not by its name.</summary>
    public string Mime { get; set; } = "";
    public int Size { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }

    /// <summary>The name it was uploaded with.</summary>
    public string Name { get; set; } = "";
    public string Alt { get; set; } = "";

    /// <summary>The same file uploaded twice becomes one row.</summary>
    public string Sha256 { get; set; } = "";

    public override string SubjectType => Table;
}

/// <summary>A file as the editor's upload reads it.</summary>
public sealed record MediaAnswer(
    Guid Id, string Key, string Url, string Kind, string Mime, int Size, int? Width, int? Height, string Name, string Alt)
{
    public static MediaAnswer Of(Media row, string url) =>
        new(row.Uuid, row.Key, url, row.Kind, row.Mime, row.Size, row.Width, row.Height, row.Name, row.Alt);
}

public sealed class LibraryMapping : IEntityTypeConfiguration<SavedSection>, IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<SavedSection> section) => section.ToTable(SavedSection.Table).IsAudited();

    public void Configure(EntityTypeBuilder<Media> media) => media.ToTable(Media.Table).IsAudited();
}
