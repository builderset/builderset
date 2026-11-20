package com.example.builder.shared;

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
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * What every table shares. `id` is for joins and never leaves the server;
 * `uuid` is the only id in URLs and answers, where it is called `id`. Then who
 * made the row, changed it and deleted it, and when.
 *
 * Spring Data's auditing stamps the created and updated columns from the
 * signed-in user ({@code AuditConfig}), never from a request body. Deleting is
 * a soft delete: {@link #markDeleted} stamps the row and it stays.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, updatable = false)
  private UUID uuid = UUID.randomUUID();

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  /** Null for a visitor's response, or a row a job made. */
  @CreatedBy
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_id", updatable = false)
  private AppUser createdBy;

  /** The touch_updated_at trigger keeps it too, for writes that are not the app's. */
  @LastModifiedDate
  @Column(nullable = false)
  private Instant updatedAt;

  @LastModifiedBy
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "updated_by_id")
  private AppUser updatedBy;

  /** Null while the row is live. Every query on live rows says `deletedAt is null`. */
  private Instant deletedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "deleted_by_id")
  private AppUser deletedBy;

  /** Into the trash. The row stays, and so does its history. */
  public void markDeleted(AppUser by) {
    deletedAt = Instant.now();
    deletedBy = by;
  }

  /** Out of the trash. */
  public void markRestored() {
    deletedAt = null;
    deletedBy = null;
  }

  public Long id() {
    return id;
  }

  public UUID uuid() {
    return uuid;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public AppUser createdBy() {
    return createdBy;
  }

  public Instant updatedAt() {
    return updatedAt;
  }

  public AppUser updatedBy() {
    return updatedBy;
  }

  public Instant deletedAt() {
    return deletedAt;
  }

  public AppUser deletedBy() {
    return deletedBy;
  }
}
