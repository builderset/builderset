package com.example.builder.popups;

import com.example.builder.activity.Action;
import com.example.builder.activity.SubjectType;
import com.example.builder.checks.Kit;
import com.example.builder.documents.DocumentKind;
import com.example.builder.documents.DocumentRequests;
import com.example.builder.shared.AppUser;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.RevisionRepository;
import com.example.builder.shared.Status;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Component;

/** Popups: published ones show on your site, paused ones are kept off it as they are. */
@Component
public class Popups implements DocumentKind<Popup, PopupRevision> {

  public interface Rows extends AuditedRepository<Popup> {
    /** The site's question on every page view, answered by the popup_live index. */
    @Query(
        """
        select p from Popup p
         where p.status = :published and p.deletedAt is null
           and (p.startsAt is null or p.startsAt <= :now)
           and (p.endsAt is null or p.endsAt > :now)
         order by p.priority desc, p.id desc""")
    List<Popup> findShowing(Status published, Instant now);

    /**
     * Add one to today's counter for an event: an upsert, so a day is one
     * row per popup however many people see it.
     */
    @Modifying
    @Query(
        nativeQuery = true,
        value =
            """
            insert into popup_daily_stat as s (popup_id, day, shown, closed, clicked, submitted)
            values (:popup, current_date, cast(:event = 'shown' as int), cast(:event = 'closed' as int),
                    cast(:event = 'clicked' as int), cast(:event = 'submitted' as int))
            on conflict (popup_id, day) do update
               set shown = s.shown + excluded.shown,
                   closed = s.closed + excluded.closed,
                   clicked = s.clicked + excluded.clicked,
                   submitted = s.submitted + excluded.submitted""")
    void countEvent(long popup, String event);
  }

  public interface Revisions extends RevisionRepository<Popup, PopupRevision> {}

  public record Columns(
      String name, Popup.Type type, Instant startsAt, Instant endsAt, int priority) {}

  private final Rows rows;
  private final Revisions revisions;

  public Popups(Rows rows, Revisions revisions) {
    this.rows = rows;
    this.revisions = revisions;
  }

  @Override
  public String path() {
    return "popups";
  }

  @Override
  public Kit kit() {
    return Kit.POPUP;
  }

  @Override
  public SubjectType subject() {
    return SubjectType.POPUP;
  }

  @Override
  public String noun() {
    return "popup";
  }

  @Override
  public Set<Status> statuses() {
    return Set.of(Status.DRAFT, Status.PUBLISHED, Status.PAUSED);
  }

  @Override
  public Rows rows() {
    return rows;
  }

  @Override
  public Revisions revisions() {
    return revisions;
  }

  @Override
  public String searchedField() {
    return "name";
  }

  @Override
  public Popup newRow(DocumentRequests.Create request) {
    return new Popup();
  }

  @Override
  public PopupRevision newRevision(
      Popup parent, RevisionKind kind, JsonNode document, String label) {
    return new PopupRevision(parent, kind, document, label);
  }

  @Override
  public void copyMeta(Popup row, JsonNode document) {
    row.copyMeta(document);
  }

  /** Publishing a paused popup puts it back on the site with the new document. */
  @Override
  public Action publish(Popup row, JsonNode document, Instant scheduledAt, AppUser by) {
    row.publish(document, by);
    return Action.PUBLISHED;
  }

  @Override
  public Action unpublish(Popup row, AppUser by) {
    row.unpublish();
    return Action.UNPUBLISHED;
  }

  @Override
  public Map<String, String> names(Popup row) {
    return Map.of("name", row.name());
  }

  @Override
  public Columns columns(Popup row) {
    return new Columns(row.name(), row.type(), row.startsAt(), row.endsAt(), row.priority());
  }
}
