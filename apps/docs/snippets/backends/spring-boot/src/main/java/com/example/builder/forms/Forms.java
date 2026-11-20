package com.example.builder.forms;

import com.example.builder.activity.Action;
import com.example.builder.activity.SubjectType;
import com.example.builder.checks.Kit;
import com.example.builder.documents.DocumentKind;
import com.example.builder.documents.DocumentRequests;
import com.example.builder.shared.AppUser;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.PersonRef;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.RevisionRepository;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Component;

/** Forms: a public address copied from the document on publish; unpublishing closes one. */
@Component
public class Forms implements DocumentKind<Form, FormRevision> {

  public interface Rows extends AuditedRepository<Form> {
    boolean existsBySlugAndDeletedAtIsNullAndIdNot(String slug, Long id);

    /** The form a visitor sees at its address: published or closed, and live. */
    Optional<Form> findBySlugAndStatusInAndDeletedAtIsNull(String slug, Collection<Status> statuses);

    /**
     * One more response, if the form takes it: counted and limited in one
     * statement, so two last responses at once cannot both get in. 0 when full.
     */
    @Modifying
    @Query(
        """
        update Form f set f.responseCount = f.responseCount + 1
         where f.id = :id and f.status = :published and f.responseCount < :most""")
    int countResponse(Long id, Status published, int most);
  }

  public interface Revisions extends RevisionRepository<Form, FormRevision> {}

  public record Columns(
      String slug, String name, int responseCount, Instant closedAt, PersonRef closedBy) {}

  private final Rows rows;
  private final Revisions revisions;

  public Forms(Rows rows, Revisions revisions) {
    this.rows = rows;
    this.revisions = revisions;
  }

  @Override
  public String path() {
    return "forms";
  }

  @Override
  public Kit kit() {
    return Kit.FORM;
  }

  @Override
  public SubjectType subject() {
    return SubjectType.FORM;
  }

  @Override
  public String noun() {
    return "form";
  }

  @Override
  public Set<Status> statuses() {
    return Set.of(Status.DRAFT, Status.PUBLISHED, Status.CLOSED);
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

  /** The address is required and unique, and a new form has none yet: `draft-<uuid>`. */
  @Override
  public Form newRow(DocumentRequests.Create request) {
    return new Form();
  }

  @Override
  public FormRevision newRevision(Form parent, RevisionKind kind, JsonNode document, String label) {
    return new FormRevision(parent, kind, document, label);
  }

  @Override
  public void copyMeta(Form row, JsonNode document) {
    row.copyMeta(document);
  }

  /**
   * A live form needs its address, free among live forms. Both are refused on
   * `meta.slug`, where the editor shows them.
   */
  @Override
  public Action publish(Form row, JsonNode document, Instant scheduledAt, AppUser by) {
    String slug = document.at("/meta/slug").asText("");
    if (slug.isBlank()) throw ApiException.refused("meta.slugMissing", "meta.slug");
    if (rows.existsBySlugAndDeletedAtIsNullAndIdNot(slug, row.id()))
      throw ApiException.refused("meta.slugTaken", "meta.slug");
    row.publish(document, by, slug);
    return Action.PUBLISHED;
  }

  @Override
  public Action unpublish(Form row, AppUser by) {
    row.close(by);
    return Action.CLOSED;
  }

  @Override
  public Map<String, String> names(Form row) {
    return Map.of("name", row.name(), "slug", row.slug());
  }

  @Override
  public Columns columns(Form row) {
    return new Columns(
        row.slug(), row.name(), row.responseCount(), row.closedAt(), PersonRef.of(row.closedBy()));
  }
}
