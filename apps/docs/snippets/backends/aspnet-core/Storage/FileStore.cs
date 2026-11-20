using System.Buffers.Binary;

namespace Builderset.Api.Storage;

/// <summary>What a file is, known by its first bytes. <c>null</c> in a signature matches any byte.</summary>
public sealed record FileType(string Mime, string Kind, string Extension, byte?[] Signature)
{
    public bool Matches(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < Signature.Length) return false;
        for (var index = 0; index < Signature.Length; index++)
            if (Signature[index] is { } expected && bytes[index] != expected) return false;
        return true;
    }
}

/// <summary>
/// Uploaded files on the local disk. A real project keeps them in S3 or
/// similar; only this class changes, because a document holds a file's key,
/// never its URL.
/// </summary>
public sealed class FileStore(IConfiguration configuration)
{
    public const long MaxBytes = 10 * 1024 * 1024;

    /// <summary>Where the browser gets a key's bytes: the app serves this folder there.</summary>
    public const string UrlPath = "/api/uploads";

    public string Directory { get; } = Path.GetFullPath(configuration["Uploads:Directory"] ?? "uploads");

    /// <summary>The same, absolute: for an email, which is read far from your site.</summary>
    public Uri PublicBase { get; } = new(new Uri(configuration["PublicOrigin"] ?? "http://localhost:5000"), UrlPath + "/");

    /// <summary>The files the library takes.</summary>
    private static readonly FileType[] Types =
    [
        new("image/png", "image", "png", [0x89, 0x50, 0x4e, 0x47]),
        new("image/jpeg", "image", "jpg", [0xff, 0xd8, 0xff]),
        new("image/gif", "image", "gif", [0x47, 0x49, 0x46, 0x38]),
        new("image/webp", "image", "webp", [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]),
        new("video/mp4", "video", "mp4", [null, null, null, null, 0x66, 0x74, 0x79, 0x70]),
        new("video/webm", "video", "webm", [0x1a, 0x45, 0xdf, 0xa3]),
        new("audio/mpeg", "audio", "mp3", [0x49, 0x44, 0x33]),
        new("application/pdf", "file", "pdf", [0x25, 0x50, 0x44, 0x46]),
    ];

    public static FileType? TypeOf(ReadOnlySpan<byte> bytes)
    {
        foreach (var type in Types)
            if (type.Matches(bytes)) return type;
        return null;
    }

    /// <summary>
    /// An image's size, from its header, so the editor can hold its space before
    /// it loads. PNG and GIF say it in fixed places; for the rest read it with an
    /// image library such as ImageSharp.
    /// </summary>
    public static (int? Width, int? Height) DimensionsOf(ReadOnlySpan<byte> bytes, string mime) => mime switch
    {
        "image/png" when bytes.Length >= 24 =>
            ((int)BinaryPrimitives.ReadUInt32BigEndian(bytes[16..]), (int)BinaryPrimitives.ReadUInt32BigEndian(bytes[20..])),
        "image/gif" when bytes.Length >= 10 =>
            (BinaryPrimitives.ReadUInt16LittleEndian(bytes[6..]), BinaryPrimitives.ReadUInt16LittleEndian(bytes[8..])),
        _ => (null, null),
    };

    /// <summary>Stores the bytes under a key of ours: a client's file name never becomes a path.</summary>
    public async Task<string> StoreAsync(byte[] bytes, string extension, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var key = $"{now:yyyy}/{now:MM}/{Guid.NewGuid()}.{extension}";
        var path = Path.Combine(Directory, key);
        System.IO.Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, bytes, ct);
        return key;
    }

    public static string UrlOf(string key) => $"{UrlPath}/{key}";
}
