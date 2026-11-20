using System.Security.Cryptography;
using System.Text.Json;
using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Builderset.Api.Storage;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Builderset.Api.Routes;

/// <summary><c>POST /api/{kind}/sections</c>: the editor's saveSection.</summary>
public sealed record NewSection(string? Name, JsonElement Fragment);

public static class LibraryRoutes
{
    // ── Saved sections: /api/{kind}/sections ─────────────────────────────────

    /// <summary>One builder's library. Deleting a section hides it; documents that used it keep their copy.</summary>
    public static RouteGroupBuilder MapSections(this RouteGroupBuilder api, string path, Kit kit)
    {
        var routes = api.MapGroup($"/{path}/sections");
        var name = kit.Name();

        // GET — the editor's loadSections.
        routes.MapGet("/", async (AppDb db, CancellationToken ct) =>
            (await db.SavedSections.Where(s => s.Kit == name).OrderBy(s => s.Name).ToListAsync(ct))
                .Select(SectionAnswer.Of));

        // POST — the editor's saveSection: { name, fragment }.
        routes.MapPost("/", async (NewSection body, Actor actor, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var title = body.Name?.Trim() ?? "";
            if (title.Length is 0 or > 120) throw ApiException.Refused("name.missing", "name");
            var section = new SavedSection { Kit = name, Name = title, Fragment = DocumentChecks.CheckSection(body.Fragment) };

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            db.SavedSections.Add(section);
            await db.SaveChangesAsync(ct);
            trail.Record(section, Actions.Created, actor);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Replies.Created(SectionAnswer.Of(section));
        });

        // DELETE /:sid — your library screen.
        routes.MapDelete("/{sid:guid}", async (Guid sid, Actor actor, AppDb db, AuditTrail trail, CancellationToken ct) =>
        {
            var section = await db.SavedSections.FirstOrDefaultAsync(s => s.Uuid == sid && s.Kit == name, ct)
                ?? throw ApiException.NotFound("section");
            trail.SoftDelete(section, actor);
            await db.SaveChangesAsync(ct);
            return TypedResults.NoContent();
        });

        return routes;
    }

    // ── Uploads: /api/uploads ────────────────────────────────────────────────

    /// <summary>
    /// The editor's upload: multipart <c>file</c> and <c>kind</c>. A file is known
    /// by its first bytes, never by its name, and the same bytes uploaded twice
    /// are one <c>media</c> row. Past the size limit Kestrel answers 413.
    /// </summary>
    public static RouteGroupBuilder MapUploads(this RouteGroupBuilder api)
    {
        api.MapPost("/uploads", async (HttpRequest request, Actor actor,
            AppDb db, AuditTrail trail, FileStore files, CancellationToken ct) =>
        {
            if (!request.HasFormContentType) throw ApiException.Unsupported("Send the file as multipart form data.");
            var form = await request.ReadFormAsync(ct);
            var file = form.Files["file"];
            var asked = form["kind"].ToString();
            if (file is null || !Media.Kinds.Contains(asked))
                throw ApiException.Unsupported("Send one file, as `file`, and its `kind`.");

            var bytes = new byte[file.Length];
            await using (var stream = file.OpenReadStream()) await stream.ReadExactlyAsync(bytes, ct);
            // `file` takes any type the library knows; the others must be what they say.
            var type = FileStore.TypeOf(bytes);
            if (type is null || (asked != "file" && type.Kind != asked))
                throw ApiException.Unsupported($"This is not a file of the kind \"{asked}\" the library takes.");

            // The same bytes twice are one file: hand back the one already stored.
            var sha256 = Convert.ToHexStringLower(SHA256.HashData(bytes));
            var media = await db.Media.FirstOrDefaultAsync(m => m.Sha256 == sha256, ct);
            if (media is null)
            {
                var (width, height) = FileStore.DimensionsOf(bytes, type.Mime);
                media = new Media
                {
                    Key = await files.StoreAsync(bytes, type.Extension, ct),
                    Kind = type.Kind,
                    Mime = type.Mime,
                    Size = bytes.Length,
                    Width = width,
                    Height = height,
                    Name = Path.GetFileName(file.FileName).Cut(300),
                    Sha256 = sha256,
                };
                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                db.Media.Add(media);
                await db.SaveChangesAsync(ct);
                trail.Record(media, Actions.Created, actor);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            return Replies.Created(MediaAnswer.Of(media, FileStore.UrlOf(media.Key)));
        })
        .WithMetadata(new RequestSizeLimitAttribute(FileStore.MaxBytes + 64 * 1024));

        return api;
    }
}
