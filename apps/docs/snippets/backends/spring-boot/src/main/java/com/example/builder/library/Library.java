package com.example.builder.library;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.activity.SubjectType;
import com.example.builder.audit.CurrentUser;
import com.example.builder.audit.Trash;
import com.example.builder.checks.DocumentChecks;
import com.example.builder.checks.Kit;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.Lowercase;
import com.example.builder.web.ApiException;
import com.example.builder.web.Text;
import com.fasterxml.jackson.databind.JsonNode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The library every builder shares: saved sections, per builder, and uploaded files. */
@Service
public class Library {

  public interface Sections extends AuditedRepository<SavedSection> {
    List<SavedSection> findByKitAndDeletedAtIsNullOrderByName(Kit kit);

    Optional<SavedSection> findByKitAndUuidAndDeletedAtIsNull(Kit kit, UUID uuid);
  }

  public interface Uploads extends AuditedRepository<Media> {
    Optional<Media> findFirstBySha256AndDeletedAtIsNull(String sha256);
  }

  public record SectionRequest(String name, JsonNode fragment) {}

  /** A section as the editor reads it. */
  public record SectionAnswer(UUID id, String name, JsonNode fragment) {
    static SectionAnswer of(SavedSection row) {
      return new SectionAnswer(row.uuid(), row.name(), row.fragment());
    }
  }

  /** A file as the editor's upload reads it. */
  public record MediaAnswer(
      UUID id,
      String key,
      String url,
      Media.Kind kind,
      String mime,
      int size,
      Integer width,
      Integer height,
      String name,
      String alt) {}

  private final Sections sections;
  private final Uploads uploads;
  private final Storage storage;
  private final DocumentChecks checks;
  private final ActivityLog activity;
  private final Trash trash;
  private final CurrentUser currentUser;

  public Library(
      Sections sections,
      Uploads uploads,
      Storage storage,
      DocumentChecks checks,
      ActivityLog activity,
      Trash trash,
      CurrentUser currentUser) {
    this.sections = sections;
    this.uploads = uploads;
    this.storage = storage;
    this.checks = checks;
    this.activity = activity;
    this.trash = trash;
    this.currentUser = currentUser;
  }

  // ── Saved sections ──────────────────────────────────────────────────────────

  /** GET /api/{kind}/sections — the editor's loadSections. */
  @Transactional(readOnly = true)
  public List<SectionAnswer> sections(Kit kit) {
    return sections.findByKitAndDeletedAtIsNullOrderByName(libraryOf(kit)).stream()
        .map(SectionAnswer::of)
        .toList();
  }

  /** POST /api/{kind}/sections — the editor's saveSection: `{ name, fragment }`. */
  @Transactional
  public SectionAnswer saveSection(Kit kit, SectionRequest request) {
    currentUser.require();
    String name = Text.atMost(request.name() == null ? null : request.name().strip(), 120);
    if (name == null) throw ApiException.refused("name.missing", "name");
    JsonNode fragment = checks.section(libraryOf(kit), request.fragment());

    SavedSection section = sections.save(new SavedSection(kit, name, fragment));
    activity.record(SubjectType.SAVED_SECTION, section.id(), Action.CREATED, Map.of());
    return SectionAnswer.of(section);
  }

  /** DELETE /api/{kind}/sections/:sid — your library screen. */
  @Transactional
  public void deleteSection(Kit kit, UUID id) {
    SavedSection section =
        sections
            .findByKitAndUuidAndDeletedAtIsNull(libraryOf(kit), id)
            .orElseThrow(() -> ApiException.notFound("section"));
    trash.delete(SubjectType.SAVED_SECTION, section, null);
  }

  /** Cards and popups keep no library: their sections routes are 404. */
  private static Kit libraryOf(Kit kit) {
    if (!kit.hasLibrary()) throw ApiException.notFound("route");
    return kit;
  }

  // ── Uploads ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/uploads — multipart `file` and `kind`. The file is known by its
   * first bytes, and the same bytes uploaded twice are one media row.
   */
  @Transactional
  public MediaAnswer upload(byte[] bytes, String originalName, String kind) {
    currentUser.require();
    Media.Kind asked = Lowercase.parse(Media.Kind.class, kind);
    FileType type = FileType.of(bytes);
    // `file` takes any type we know; the others must be what they say.
    if (asked == null || type == null || (asked != Media.Kind.FILE && type.kind() != asked))
      throw new ApiException(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          "This is not a file of the kind the library takes.",
          Map.of());

    String sha256 = sha256Of(bytes);
    Media media =
        uploads
            .findFirstBySha256AndDeletedAtIsNull(sha256)
            .orElseGet(
                () -> {
                  String name =
                      originalName == null || originalName.isBlank() ? "upload" : originalName;
                  Media stored =
                      uploads.save(
                          new Media(
                              storage.store(bytes, type, sha256),
                              name.length() > 300 ? name.substring(0, 300) : name));
                  activity.record(SubjectType.MEDIA, stored.id(), Action.CREATED, Map.of());
                  return stored;
                });
    return new MediaAnswer(
        media.uuid(),
        media.key(),
        storage.urlOf(media.key()),
        media.kind(),
        media.mime(),
        media.size(),
        media.width(),
        media.height(),
        media.name(),
        media.alt());
  }

  private static String sha256Of(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException(impossible);
    }
  }
}
