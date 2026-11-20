package com.example.builder.documents;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.audit.CurrentUser;
import com.example.builder.audit.Trash;
import com.example.builder.checks.DocumentChecks;
import com.example.builder.checks.Level;
import com.example.builder.shared.AppUser;
import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.example.builder.web.Paging;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The document routes' work, written once for the five builders. Each write
 * does the same four things: check the document, write the row, record a
 * revision on a manual save or a publish, and append an activity line.
 *
 * The checker is asked before the transaction opens, so a network call never
 * holds a row lock; the rest runs in one transaction — the row, its revision
 * and its activity are written together or not at all.
 */
@Service
public class DocumentService {

  /** What unpublishing takes back: live now, set to go live, or paused. */
  private static final Set<Status> UNPUBLISHABLE =
      Set.of(Status.PUBLISHED, Status.SCHEDULED, Status.PAUSED);

  /** Lists show the newest change first. */
  private static final Sort NEWEST_CHANGE =
      Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"));

  /** An autosave becomes a revision at most this often. */
  private static final Duration AUTOSAVE_EVERY = Duration.ofMinutes(10);

  private final DocumentChecks checks;
  private final ActivityLog activity;
  private final Trash trash;
  private final CurrentUser currentUser;
  private final TransactionTemplate transaction;

  public DocumentService(
      DocumentChecks checks,
      ActivityLog activity,
      Trash trash,
      CurrentUser currentUser,
      TransactionTemplate transaction) {
    this.checks = checks;
    this.activity = activity;
    this.trash = trash;
    this.currentUser = currentUser;
    this.transaction = transaction;
  }

  /** GET /api/{kind} — `?status=&q=&deleted=true&limit=&offset=`, newest change first. */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Page list(
      DocumentKind<E, R> kind, Status status, String q, boolean deleted, Paging paging) {
    List<Specification<E>> filters = new ArrayList<>();
    filters.add(deleted ? Rows.inTrash() : Rows.live());
    if (status != null && kind.statuses().contains(status)) filters.add(Rows.hasStatus(status));
    if (q != null && !q.isBlank()) filters.add(Rows.contains(kind.searchedField(), q.trim()));
    Specification<E> filter = Specification.allOf(filters);

    return transaction.execute(
        tx -> {
          Page<E> page = kind.rows().findAll(filter, paging.sortedBy(NEWEST_CHANGE));
          List<DocumentAnswers.Item> items =
              page.map(row -> DocumentAnswers.Item.of(row, kind.columns(row))).getContent();
          return new DocumentAnswers.Page(items, page.getTotalElements());
        });
  }

  /** GET /api/{kind}/:id — the editor's reload. */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Row get(
      DocumentKind<E, R> kind, UUID id) {
    return transaction.execute(tx -> answer(kind, find(kind, id)));
  }

  /** POST /api/{kind} — a new document, as a draft. */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Row create(
      DocumentKind<E, R> kind, DocumentRequests.Create request) {
    currentUser.require();
    E row = kind.newRow(request);
    JsonNode document =
        checks.passed(kind.kit(), request.document(), Level.DRAFT, kind.checkedType(row));
    return transaction.execute(
        tx -> {
          row.writeFirst(document);
          kind.copyMeta(row, document);
          kind.rows().saveAndFlush(row);
          activity.record(kind.subject(), row.id(), Action.CREATED, null, row.status(), Map.of());
          return answer(kind, row);
        });
  }

  // #region draft
  /**
   * PUT /api/{kind}/:id/draft — an autosave or a manual save. Readers still get
   * the live document. The row is locked first, so the saved_at compared is the
   * one overwritten: two saves at the same moment cannot both win.
   */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Saved saveDraft(
      DocumentKind<E, R> kind, UUID id, DocumentRequests.Draft request) {
    currentUser.require();
    JsonNode document =
        checks.passed(
            kind.kit(), request.document(), Level.DRAFT, kind.checkedType(find(kind, id)));
    return transaction.execute(
        tx -> {
          E row = lock(kind, id);
          // The editor sends back the saved_at it last saw; "keep mine" sends force.
          if (!request.force() && !row.savedAt().equals(request.expectedSavedAt()))
            throw ApiException.conflict(
                "Someone else saved this " + kind.noun() + " since you opened it.");

          row.writeDraft(document);
          if (request.reason() == RevisionKind.MANUAL) {
            R revision =
                kind.revisions().save(kind.newRevision(row, RevisionKind.MANUAL, document, null));
            activity.record(
                kind.subject(), row.id(), Action.SAVED, Map.of("revision", revision.uuid()));
          } else {
            // Autosaves are not logged: a revision now and then is enough to go back to.
            keepAutosave(kind, row, document);
          }
          return new DocumentAnswers.Saved(row.savedAt());
        });
  }

  private <E extends DocumentEntity, R extends Revision<E>> void keepAutosave(
      DocumentKind<E, R> kind, E row, JsonNode document) {
    Instant since = Instant.now().minus(AUTOSAVE_EVERY);
    if (!kind.revisions().existsByParentAndKindAndCreatedAtAfter(row, RevisionKind.AUTOSAVE, since))
      kind.revisions().save(kind.newRevision(row, RevisionKind.AUTOSAVE, document, null));
  }
  // #endregion

  // #region publish
  /**
   * POST /api/{kind}/:id/publish — the strict check, then the document goes
   * live with its meta copied to the columns, a `publish` revision and an
   * activity line, in one transaction.
   */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Published publish(
      DocumentKind<E, R> kind, UUID id, DocumentRequests.Publish request) {
    AppUser publisher = currentUser.publisher();
    JsonNode document =
        checks.passed(
            kind.kit(), request.document(), Level.PUBLISH, kind.checkedType(find(kind, id)));
    Instant requested = request.scheduledAt();
    Instant scheduledAt = requested != null && requested.isAfter(Instant.now()) ? requested : null;

    return transaction.execute(
        tx -> {
          E row = lock(kind, id);
          Status from = row.status();
          Map<String, String> namesBefore = kind.names(row);

          kind.beforePublish(row);
          kind.copyMeta(row, document);
          Action action = kind.publish(row, document, scheduledAt, publisher);
          R revision =
              kind.revisions().save(kind.newRevision(row, RevisionKind.PUBLISH, document, null));

          activity.record(
              kind.subject(),
              row.id(),
              action,
              from,
              row.status(),
              Map.of("revision", revision.uuid(), "version", row.version()));
          recordRenames(kind, row, namesBefore);
          return new DocumentAnswers.Published(
              row.savedAt(), row.status(), row.publishedAt(), scheduledAt);
        });
  }

  /** A name, title or slug that publishing changed, logged with what it was. */
  private <E extends DocumentEntity, R extends Revision<E>> void recordRenames(
      DocumentKind<E, R> kind, E row, Map<String, String> before) {
    Map<String, Object> changed = new LinkedHashMap<>();
    kind.names(row)
        .forEach(
            (field, now) -> {
              String was = before.get(field);
              if (!now.equals(was)) changed.put(field, Map.of("from", was, "to", now));
            });
    if (!changed.isEmpty()) activity.record(kind.subject(), row.id(), Action.RENAMED, changed);
  }
  // #endregion

  /** POST /api/{kind}/:id/unpublish — readers no longer get it; the document is kept. */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Unpublished unpublish(
      DocumentKind<E, R> kind, UUID id) {
    AppUser publisher = currentUser.publisher();
    return transaction.execute(
        tx -> {
          E row = lock(kind, id);
          Status from = row.status();
          if (UNPUBLISHABLE.contains(from)) {
            Action action = kind.unpublish(row, publisher);
            activity.record(kind.subject(), row.id(), action, from, row.status(), Map.of());
          }
          return new DocumentAnswers.Unpublished(row.savedAt(), row.status());
        });
  }

  // #region delete
  /** DELETE /api/{kind}/:id — a soft delete. A published document is refused: unpublish it first. */
  public <E extends DocumentEntity, R extends Revision<E>> void delete(
      DocumentKind<E, R> kind, UUID id) {
    currentUser.require();
    transaction.executeWithoutResult(
        tx -> {
          E row = lock(kind, id);
          if (row.status() == Status.PUBLISHED)
            throw ApiException.conflict(
                "This " + kind.noun() + " is live: unpublish it before deleting it.");
          trash.delete(kind.subject(), row, row.status());
        });
  }

  /** POST /api/{kind}/:id/restore — out of the trash. 409 when its address was taken meanwhile. */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Row restore(
      DocumentKind<E, R> kind, UUID id) {
    currentUser.require();
    return transaction.execute(
        tx -> {
          E row = kind.rows().lockDeleted(id).orElseThrow(() -> ApiException.notFound(kind.noun()));
          trash.restore(kind.subject(), row, row.status());
          return answer(kind, row);
        });
  }
  // #endregion

  // ── History: what it said, and what happened to it ──────────────────────────

  /** GET /api/{kind}/:id/revisions — the editor's loadRevisions, newest first. */
  public <E extends DocumentEntity, R extends Revision<E>>
      List<DocumentAnswers.RevisionItem> revisions(
      DocumentKind<E, R> kind, UUID id) {
    return transaction.execute(
        tx ->
            kind.revisions()
                .findByParentOrderByCreatedAtDescIdDesc(find(kind, id), Limit.of(100))
                .stream()
                .map(
                    revision ->
                        new DocumentAnswers.RevisionItem(
                            revision.uuid(),
                            revision.kind(),
                            revision.label(),
                            revision.version(),
                            revision.createdAt(),
                            revision.createdBy() == null ? null : revision.createdBy().name()))
                .toList());
  }

  /** GET /api/{kind}/:id/revisions/:rid — the editor's loadRevision. */
  public <E extends DocumentEntity, R extends Revision<E>>
      DocumentAnswers.RevisionDocument revision(
      DocumentKind<E, R> kind, UUID id, UUID revisionId) {
    return transaction.execute(
        tx ->
            kind.revisions()
                .findByParentAndUuid(find(kind, id), revisionId)
                .map(revision -> new DocumentAnswers.RevisionDocument(revision.document()))
                .orElseThrow(() -> ApiException.notFound("revision")));
  }

  /** POST /api/{kind}/:id/revisions — the editor's saveRevision: a version someone named. */
  public <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Created saveRevision(
      DocumentKind<E, R> kind, UUID id, DocumentRequests.NewRevision request) {
    currentUser.require();
    E found = find(kind, id);
    JsonNode document =
        checks.passed(kind.kit(), request.document(), Level.DRAFT, kind.checkedType(found));
    String label = request.label() == null ? null : request.label().strip();
    if (label != null && label.length() > 120) throw ApiException.refused("label.tooLong", "label");
    return transaction.execute(
        tx -> {
          E row = lock(kind, id);
          R revision =
              kind.revisions().save(kind.newRevision(row, RevisionKind.MANUAL, document, label));
          Map<String, Object> details = new LinkedHashMap<>();
          details.put("revision", revision.uuid());
          if (label != null) details.put("label", label);
          activity.record(kind.subject(), row.id(), Action.SAVED, details);
          return new DocumentAnswers.Created(revision.uuid());
        });
  }

  /** GET /api/{kind}/:id/activity — the document's timeline, for a History panel. */
  public <E extends DocumentEntity, R extends Revision<E>> List<ActivityLog.Entry> activity(
      DocumentKind<E, R> kind, UUID id, int limit) {
    return transaction.execute(tx -> activity.timeline(kind.subject(), find(kind, id).id(), limit));
  }

  // ── Finding a row ───────────────────────────────────────────────────────────

  private static <E extends DocumentEntity, R extends Revision<E>> E find(
      DocumentKind<E, R> kind, UUID id) {
    return kind.rows().findLive(id).orElseThrow(() -> ApiException.notFound(kind.noun()));
  }

  private static <E extends DocumentEntity, R extends Revision<E>> E lock(
      DocumentKind<E, R> kind, UUID id) {
    return kind.rows().lockLive(id).orElseThrow(() -> ApiException.notFound(kind.noun()));
  }

  private static <E extends DocumentEntity, R extends Revision<E>> DocumentAnswers.Row answer(
      DocumentKind<E, R> kind, E row) {
    return DocumentAnswers.Row.of(row, kind.columns(row));
  }
}
