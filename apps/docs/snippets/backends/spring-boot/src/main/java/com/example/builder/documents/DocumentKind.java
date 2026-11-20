package com.example.builder.documents;

import com.example.builder.activity.Action;
import com.example.builder.activity.SubjectType;
import com.example.builder.checks.Kit;
import com.example.builder.shared.AppUser;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.RevisionRepository;
import com.example.builder.shared.Status;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

/**
 * Everything the shared routes need to know about one builder. The five
 * builders differ only here: DocumentService, DocumentController and
 * HistoryController are written once, for any of them.
 *
 * @param <E> the document table's entity
 * @param <R> its revision table's entity
 */
public interface DocumentKind<E extends DocumentEntity, R extends Revision<E>> {

  /** The URL's {kind}: `emails`, `articles`, `forms`, `cards`, `popups`. */
  String path();

  Kit kit();

  /** How the activity log names its rows. */
  SubjectType subject();

  /** How a message names one: "There is no such email template." */
  String noun();

  /** The statuses its table allows: `?status=` filters by one of them. */
  Set<Status> statuses();

  AuditedRepository<E> rows();

  RevisionRepository<E, R> revisions();

  /** What `?q=` searches: one of the entity's text fields. */
  String searchedField();

  /** A new row from `POST /api/{kind}`, before its document: the request's own fields, or 422. */
  E newRow(DocumentRequests.Create request);

  R newRevision(E parent, RevisionKind kind, JsonNode document, String label);

  /** The email type whose variables the check reads; null for the other builders. */
  default String checkedType(E row) {
    return null;
  }

  /** Copies of the document's meta into the row's columns, for lists and search. */
  void copyMeta(E row, JsonNode document);

  /**
   * Publish the checked document, now or at `scheduledAt` (a future instant,
   * or null). Answers what the log calls it.
   */
  Action publish(E row, JsonNode document, Instant scheduledAt, AppUser by);

  /** Take it from readers. Answers what the log calls it. */
  Action unpublish(E row, AppUser by);

  /** Anything else a publish changes, in its transaction, before the row is written. */
  default void beforePublish(E row) {}

  /** The names a rename is logged for: `name`, `title`, `slug`. */
  Map<String, String> names(E row);

  /** The builder's own columns, for its answers: `{ name, type_key }`. */
  Record columns(E row);
}
