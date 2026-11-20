package com.example.builder.emails;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.activity.SubjectType;
import com.example.builder.checks.Kit;
import com.example.builder.documents.DocumentKind;
import com.example.builder.documents.DocumentRequests;
import com.example.builder.shared.AppUser;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.RevisionRepository;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Email templates: at most one live published design per email type. */
@Component
public class EmailTemplates implements DocumentKind<EmailTemplate, EmailTemplateRevision> {

  /** The email types your project has: the keys of the checker's EMAIL_TYPES. */
  static final Set<String> EMAIL_TYPES = Set.of();

  public interface Rows extends AuditedRepository<EmailTemplate> {
    /** The live published design for a type, other than this one. */
    List<EmailTemplate> findByTypeKeyAndStatusAndDeletedAtIsNullAndIdNot(
        String typeKey, Status status, Long id);
  }

  public interface Revisions extends RevisionRepository<EmailTemplate, EmailTemplateRevision> {}

  /** The answer's own columns. */
  public record Columns(String name, String typeKey) {}

  private final Rows rows;
  private final Revisions revisions;
  private final ActivityLog activity;

  public EmailTemplates(Rows rows, Revisions revisions, ActivityLog activity) {
    this.rows = rows;
    this.revisions = revisions;
    this.activity = activity;
  }

  @Override
  public String path() {
    return "emails";
  }

  @Override
  public Kit kit() {
    return Kit.EMAIL;
  }

  @Override
  public SubjectType subject() {
    return SubjectType.EMAIL_TEMPLATE;
  }

  @Override
  public String noun() {
    return "email template";
  }

  @Override
  public Set<Status> statuses() {
    return Set.of(Status.DRAFT, Status.PUBLISHED);
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

  /** Only a type the project has: its key picks the variables checked. */
  @Override
  public EmailTemplate newRow(DocumentRequests.Create request) {
    String typeKey = request.typeKey();
    if (typeKey != null && !EMAIL_TYPES.contains(typeKey))
      throw ApiException.refused("type_key.unknown", "type_key");
    return new EmailTemplate(typeKey);
  }

  @Override
  public EmailTemplateRevision newRevision(
      EmailTemplate parent, RevisionKind kind, JsonNode document, String label) {
    return new EmailTemplateRevision(parent, kind, document, label);
  }

  /** The type's variables are checked too: a reset email must use the reset link. */
  @Override
  public String checkedType(EmailTemplate row) {
    return row.typeKey();
  }

  @Override
  public void copyMeta(EmailTemplate row, JsonNode document) {
    row.copyMeta(document);
  }

  @Override
  public Action publish(
      EmailTemplate row, JsonNode document, Instant scheduledAt, AppUser by) {
    row.publish(document, by);
    return Action.PUBLISHED;
  }

  @Override
  public Action unpublish(EmailTemplate row, AppUser by) {
    row.unpublish();
    return Action.UNPUBLISHED;
  }

  /**
   * One active design per email type: the one before it steps back to draft,
   * written first so the partial unique index never sees two.
   */
  @Override
  public void beforePublish(EmailTemplate row) {
    if (row.typeKey() == null) return;
    for (EmailTemplate replaced :
        rows.findByTypeKeyAndStatusAndDeletedAtIsNullAndIdNot(
            row.typeKey(), Status.PUBLISHED, row.id())) {
      replaced.unpublish();
      activity.record(
          SubjectType.EMAIL_TEMPLATE,
          replaced.id(),
          Action.UNPUBLISHED,
          Status.PUBLISHED,
          Status.DRAFT,
          Map.of("replaced_by", row.uuid()));
    }
    rows.flush();
  }

  @Override
  public Map<String, String> names(EmailTemplate row) {
    return Map.of("name", row.name());
  }

  @Override
  public Columns columns(EmailTemplate row) {
    return new Columns(row.name(), row.typeKey());
  }
}
