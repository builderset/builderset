package com.example.builder.audit;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.activity.SubjectType;
import com.example.builder.shared.AuditedEntity;
import com.example.builder.shared.Lowercase;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * The soft delete and its undoing, with their lines in the log. Called inside
 * the caller's transaction, on a row it locked.
 */
@Component
public class Trash {

  private final CurrentUser currentUser;
  private final ActivityLog activity;
  private final EntityManager entityManager;

  public Trash(CurrentUser currentUser, ActivityLog activity, EntityManager entityManager) {
    this.currentUser = currentUser;
    this.activity = activity;
    this.entityManager = entityManager;
  }

  /** Stamp who deleted the row and when. `status` is the row's, for the log; null if it has none. */
  public void delete(SubjectType subject, AuditedEntity row, Lowercase status) {
    row.markDeleted(currentUser.actor());
    activity.record(subject, row.id(), Action.DELETED, status, null, Map.of());
  }

  /**
   * Bring a deleted row back. Flushed at once: when another live row took its
   * address meanwhile, the partial unique index refuses it here, and ApiErrors
   * answers 409.
   */
  public void restore(SubjectType subject, AuditedEntity row, Lowercase status) {
    row.markRestored();
    entityManager.flush();
    activity.record(subject, row.id(), Action.RESTORED, null, status, Map.of());
  }
}
