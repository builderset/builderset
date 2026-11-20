package com.example.builder.shared;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * A version of a document: one table per builder, so each has a real foreign
 * key. Written once and never changed, so it has no updated or deleted columns;
 * restoring one writes a new one. Each table names its parent's column with
 * {@code @AssociationOverride(name = "parent", …)}.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class Revision<P extends DocumentEntity> {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, updatable = false)
  private UUID uuid = UUID.randomUUID();

  /** The document it is a version of. Deleted with it, by the foreign key. */
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private P parent;

  @Column(nullable = false, length = 16, updatable = false)
  private RevisionKind kind;

  /** A name someone gave it: "Before the legal review". */
  @Column(length = 120, updatable = false)
  private String label;

  /** The document's version then: a form response finds the form it answered by it. */
  @Column(nullable = false, updatable = false)
  private int version;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, updatable = false)
  private JsonNode document;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  /** Whose work it is. */
  @CreatedBy
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_id", updatable = false)
  private AppUser createdBy;

  protected Revision() {}

  protected Revision(P parent, RevisionKind kind, JsonNode document, String label) {
    this.parent = parent;
    this.kind = kind;
    this.document = document;
    this.label = label;
    this.version = parent.version();
  }

  public UUID uuid() {
    return uuid;
  }

  public RevisionKind kind() {
    return kind;
  }

  public String label() {
    return label;
  }

  public int version() {
    return version;
  }

  public JsonNode document() {
    return document;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public AppUser createdBy() {
    return createdBy;
  }
}
