package com.example.builder.activity;

import com.example.builder.shared.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * One line of what happened to a row, who did it, and when. One table for
 * every kind of row, appended in the same transaction as what it records and
 * never edited. It names its subject by table and id, with no foreign key, so
 * it outlives what it describes.
 */
@Entity
@Table(name = "activity")
@Immutable
@EntityListeners(AuditingEntityListener.class)
public class Activity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private UUID uuid = UUID.randomUUID();

  @Column(nullable = false, length = 30)
  private SubjectType subjectType;

  @Column(nullable = false)
  private long subjectId;

  @Column(nullable = false, length = 30)
  private Action action;

  /** For a change of status: `draft` → `published`. */
  @Column(length = 30)
  private String fromStatus;

  @Column(length = 30)
  private String toStatus;

  /** What else matters: the revision written, the old slug, the reason. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false)
  private Map<String, Object> details;

  /** Who did it. Null for a job, or a visitor. */
  @CreatedBy
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "actor_id")
  private AppUser actor;

  @CreatedDate
  @Column(nullable = false)
  private Instant createdAt;

  protected Activity() {}

  public Activity(
      SubjectType subjectType,
      long subjectId,
      Action action,
      String fromStatus,
      String toStatus,
      Map<String, Object> details) {
    this.subjectType = subjectType;
    this.subjectId = subjectId;
    this.action = action;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.details = details;
  }

  public UUID uuid() {
    return uuid;
  }

  public Action action() {
    return action;
  }

  public String fromStatus() {
    return fromStatus;
  }

  public String toStatus() {
    return toStatus;
  }

  public Map<String, Object> details() {
    return details;
  }

  public AppUser actor() {
    return actor;
  }

  public Instant createdAt() {
    return createdAt;
  }
}
