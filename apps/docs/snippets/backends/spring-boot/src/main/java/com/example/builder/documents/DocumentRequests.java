package com.example.builder.documents;

import com.example.builder.shared.RevisionKind;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

/** The bodies the editor and your screens send. Field names arrive snake_cased. */
public final class DocumentRequests {

  private DocumentRequests() {}

  /** POST /api/{kind}: an article also brings its address, an email its type. */
  public record Create(JsonNode document, String slug, String locale, String typeKey) {}

  /**
   * PUT /api/{kind}/:id/draft. `expectedSavedAt` is the saved_at the editor
   * last saw; `force` is its "keep mine".
   */
  public record Draft(
      JsonNode document, RevisionKind reason, Instant expectedSavedAt, boolean force) {}

  /** POST /api/{kind}/:id/publish. A future `scheduledAt` schedules an article. */
  public record Publish(JsonNode document, Instant scheduledAt) {}

  /** POST /api/{kind}/:id/revisions: a version someone named. */
  public record NewRevision(JsonNode document, String label) {}
}
