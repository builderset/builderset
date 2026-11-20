package com.example.builder.activity;

import com.example.builder.shared.Lowercase;
import com.example.builder.shared.PersonRef;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

/**
 * Appends to the activity log, inside the caller's transaction, so the write
 * and its line are kept together or not at all. The actor is the signed-in
 * user, stamped like any @CreatedBy.
 */
@Component
public class ActivityLog {

  public interface Lines extends JpaRepository<Activity, Long> {
    List<Activity> findBySubjectTypeAndSubjectIdOrderByCreatedAtDescIdDesc(
        SubjectType subjectType, long subjectId, Limit limit);
  }

  /** One line of a timeline, as the API shows it. */
  public record Entry(
      UUID id,
      Action action,
      String fromStatus,
      String toStatus,
      Map<String, Object> details,
      PersonRef actor,
      Instant createdAt) {}

  private final Lines lines;

  public ActivityLog(Lines lines) {
    this.lines = lines;
  }

  /** A change of status: `published` from `draft`. Either status may be null. */
  public void record(
      SubjectType subject,
      long subjectId,
      Action action,
      Lowercase from,
      Lowercase to,
      Map<String, Object> details) {
    lines.save(
        new Activity(subject, subjectId, action, valueOf(from), valueOf(to), details));
  }

  /** Anything else: a save, a rename. */
  public void record(
      SubjectType subject, long subjectId, Action action, Map<String, Object> details) {
    record(subject, subjectId, action, null, null, details);
  }

  /** One row's activity, newest first. */
  public List<Entry> timeline(SubjectType subject, long subjectId, int limit) {
    return lines
        .findBySubjectTypeAndSubjectIdOrderByCreatedAtDescIdDesc(
            subject, subjectId, Limit.of(limit))
        .stream()
        .map(
            line ->
                new Entry(
                    line.uuid(),
                    line.action(),
                    line.fromStatus(),
                    line.toStatus(),
                    line.details(),
                    PersonRef.of(line.actor()),
                    line.createdAt()))
        .toList();
  }

  private static String valueOf(Lowercase status) {
    return status == null ? null : status.value();
  }
}
