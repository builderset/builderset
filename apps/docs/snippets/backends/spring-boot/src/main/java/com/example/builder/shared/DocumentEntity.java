package com.example.builder.shared;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * What the five document tables add: the live document, the draft since, and
 * the two clocks. `updatedAt` follows any change to the row; `savedAt` only a
 * write of the document, and is what the editor sends back to catch a stale save.
 */
@MappedSuperclass
public abstract class DocumentEntity extends AuditedEntity {

  @Column(nullable = false, length = 16)
  private Status status = Status.DRAFT;

  /** The live document: what readers get. Stored as checked, never as sent. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false)
  private JsonNode document;

  /** Work in progress since the last publish; null when there is none. */
  @JdbcTypeCode(SqlTypes.JSON)
  private JsonNode draftDocument;

  @Column(nullable = false)
  private Instant savedAt;

  /** Counts publishes: a revision, a response and a card record the one they belong to. */
  @Column(nullable = false)
  private int version;

  private Instant publishedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "published_by_id")
  private AppUser publishedBy;

  /**
   * The column keeps milliseconds, so the clock is cut to them here: the
   * saved_at an answer gives is exactly the one the next save is compared with.
   */
  private static Instant now() {
    return Instant.now().truncatedTo(ChronoUnit.MILLIS);
  }

  /** A new row's document, checked as a draft. It is live until the first publish replaces it. */
  public void writeFirst(JsonNode checked) {
    document = checked;
    savedAt = now();
  }

  /** A draft save. Readers still get the live document. */
  public void writeDraft(JsonNode checked) {
    draftDocument = checked;
    savedAt = now();
  }

  /** The document goes live: the draft is folded in and the version counts one more. */
  public void publish(JsonNode checked, AppUser by) {
    writeLive(checked, by);
    status = Status.PUBLISHED;
    publishedAt = publishedAtOn(Instant.now());
  }

  /** Readers no longer get it. Only the status changes: saved_at follows the document only. */
  public void unpublish() {
    status = Status.DRAFT;
  }

  /** What every publish writes, now or scheduled. */
  protected void writeLive(JsonNode checked, AppUser by) {
    document = checked;
    draftDocument = null;
    version++;
    savedAt = now();
    publishedBy = by;
  }

  /** When a publish says it went live. An article keeps its first: its list sorts by it. */
  protected Instant publishedAtOn(Instant now) {
    return now;
  }

  protected void moveTo(Status next) {
    status = next;
  }

  public Status status() {
    return status;
  }

  public JsonNode document() {
    return document;
  }

  public JsonNode draftDocument() {
    return draftDocument;
  }

  public Instant savedAt() {
    return savedAt;
  }

  public int version() {
    return version;
  }

  public Instant publishedAt() {
    return publishedAt;
  }

  public AppUser publishedBy() {
    return publishedBy;
  }
}
