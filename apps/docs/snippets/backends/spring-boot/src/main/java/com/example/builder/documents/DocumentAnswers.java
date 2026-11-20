package com.example.builder.documents;

import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.PersonRef;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.Status;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What the document routes answer. A row's public id is its uuid, called
 * `id`; people are `{ id, name }`; the builder's own columns sit beside the
 * shared ones, unwrapped.
 */
public final class DocumentAnswers {

  private DocumentAnswers() {}

  /** GET /api/{kind}/:id — the editor's reload, and the answer to every write of the row. */
  public record Row(
      UUID id,
      @JsonUnwrapped Record columns,
      Status status,
      JsonNode document,
      JsonNode draftDocument,
      Instant savedAt,
      int version,
      Instant publishedAt,
      PersonRef publishedBy,
      Instant createdAt,
      PersonRef createdBy,
      Instant updatedAt,
      PersonRef updatedBy,
      Instant deletedAt,
      PersonRef deletedBy) {

    public static Row of(DocumentEntity row, Record columns) {
      return new Row(
          row.uuid(),
          columns,
          row.status(),
          row.document(),
          row.draftDocument(),
          row.savedAt(),
          row.version(),
          row.publishedAt(),
          PersonRef.of(row.publishedBy()),
          row.createdAt(),
          PersonRef.of(row.createdBy()),
          row.updatedAt(),
          PersonRef.of(row.updatedBy()),
          row.deletedAt(),
          PersonRef.of(row.deletedBy()));
    }
  }

  /** One line of GET /api/{kind}: no documents, which can be large. */
  public record Item(
      UUID id,
      @JsonUnwrapped Record columns,
      Status status,
      Instant savedAt,
      Instant updatedAt,
      PersonRef updatedBy,
      Instant deletedAt,
      PersonRef deletedBy) {

    public static Item of(DocumentEntity row, Record columns) {
      return new Item(
          row.uuid(),
          columns,
          row.status(),
          row.savedAt(),
          row.updatedAt(),
          PersonRef.of(row.updatedBy()),
          row.deletedAt(),
          PersonRef.of(row.deletedBy()));
    }
  }

  public record Page(List<Item> items, long total) {}

  /** PUT …/draft. */
  public record Saved(Instant savedAt) {}

  /** POST …/publish. A scheduled article also says when it goes live. */
  public record Published(
      Instant savedAt,
      Status status,
      Instant publishedAt,
      @JsonInclude(JsonInclude.Include.NON_NULL) Instant scheduledAt) {}

  /** POST …/unpublish. */
  public record Unpublished(Instant savedAt, Status status) {}

  /** A revision in the editor's list. `author` is a name: the editor shows it as is. */
  public record RevisionItem(
      UUID id, RevisionKind kind, String label, int version, Instant createdAt, String author) {}

  public record RevisionDocument(JsonNode document) {}

  public record Created(UUID id) {}
}
