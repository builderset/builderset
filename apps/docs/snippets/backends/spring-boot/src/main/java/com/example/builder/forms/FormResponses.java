package com.example.builder.forms;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.activity.SubjectType;
import com.example.builder.audit.Trash;
import com.example.builder.checks.CheckerClient;
import com.example.builder.checks.DocumentChecks;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.Lowercase;
import com.example.builder.shared.PersonRef;
import com.example.builder.shared.Status;
import com.example.builder.shared.TriageStatus;
import com.example.builder.web.ApiException;
import com.example.builder.web.Text;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.InetAddress;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * A form's responses: the public side takes them, your team's side reads,
 * triages and deletes them. A response is checked against the PUBLISHED
 * document, never the draft, and only what validateAnswers keeps is stored.
 */
@Service
public class FormResponses {

  public interface Responses extends AuditedRepository<FormResponse> {
    long countByFormAndDeletedAtIsNull(Form form);

    long countByFormAndDeletedAtIsNullAndCreatedAtAfter(Form form, Instant since);

    List<FormResponse> findTop20ByFormAndDeletedAtIsNullOrderByCreatedAtDesc(Form form);

    Optional<FormResponse> findByFormAndUuidAndDeletedAtIsNull(Form form, UUID uuid);
  }

  /** GET /api/public/forms/:slug. Closed, the page still gets the document, to show its closed message. */
  public record PublicForm(JsonNode document, boolean closed) {}

  /** The body FormView's onSubmit sends. `trap` is the hidden field only bots fill. */
  public record Submission(JsonNode answers, String locale, String trap) {}

  /** The Responses tab: the counts, and the latest few. */
  public record Inbox(long total, long thisWeek, List<InboxLine> latest) {}

  public record InboxLine(UUID id, String title, Instant when, TriageStatus status) {}

  public record Triage(String status, String note) {}

  public record ResponseAnswer(
      UUID id,
      int formVersion,
      JsonNode answers,
      String locale,
      TriageStatus status,
      String note,
      Instant createdAt,
      PersonRef createdBy,
      Instant updatedAt,
      PersonRef updatedBy) {

    static ResponseAnswer of(FormResponse row) {
      return new ResponseAnswer(
          row.uuid(),
          row.formVersion(),
          row.answers(),
          row.locale(),
          row.status(),
          row.note(),
          row.createdAt(),
          PersonRef.of(row.createdBy()),
          row.updatedAt(),
          PersonRef.of(row.updatedBy()));
    }
  }

  private static final Set<Status> SHOWN = Set.of(Status.PUBLISHED, Status.CLOSED);

  private final Forms.Rows forms;
  private final Responses responses;
  private final DocumentChecks checks;
  private final ActivityLog activity;
  private final Trash trash;
  private final TransactionTemplate transaction;

  public FormResponses(
      Forms.Rows forms,
      Responses responses,
      DocumentChecks checks,
      ActivityLog activity,
      Trash trash,
      TransactionTemplate transaction) {
    this.forms = forms;
    this.responses = responses;
    this.checks = checks;
    this.activity = activity;
    this.trash = trash;
    this.transaction = transaction;
  }

  // ── The public side: no sign-in ────────────────────────────────────────────

  public PublicForm publicForm(String slug) {
    Form form = findPublic(slug);
    return new PublicForm(form.document(), isClosed(form));
  }

  /**
   * POST /api/public/forms/:slug/responses. The public id of the response, or
   * null when the trap was filled: a bot is told it worked and nothing is
   * stored, so it learns nothing to work around. The checker is asked before
   * the transaction opens.
   */
  public UUID respond(String slug, Submission submission, InetAddress visitor) {
    Form form = findPublic(slug);
    if (isClosed(form)) throw closed(form);
    if (submission.trap() != null && !submission.trap().isEmpty()) return null;

    CheckerClient.Answers checked = checks.formAnswers(form.document(), submission.answers());
    if (!checked.ok()) throw ApiException.invalidAnswers(checked.errors());

    JsonNode settings = form.document().path("settings");
    JsonNode most = settings.at("/limits/maxResponses");
    boolean keepIp = settings.at("/privacy/storeIp").asBoolean(false);
    String locale = Text.atMost(submission.locale(), 10);

    return transaction.execute(
        tx -> {
          // Counted and limited in one statement: two last responses cannot both get in.
          int counted =
              forms.countResponse(
                  form.id(), Status.PUBLISHED, most.isInt() ? most.asInt() : Integer.MAX_VALUE);
          if (counted == 0) throw closed(form);

          FormResponse response =
              responses.save(
                  new FormResponse(form, checked.values(), locale, keepIp ? visitor : null));
          activity.record(
              SubjectType.FORM_RESPONSE,
              response.id(),
              Action.CREATED,
              null,
              response.status(),
              Map.of("form", form.uuid()));
          return response.uuid();
        });
  }


  private Form findPublic(String slug) {
    return forms
        .findBySlugAndStatusInAndDeletedAtIsNull(slug, SHOWN)
        .orElseThrow(() -> ApiException.notFound("form"));
  }

  /** Whether the form takes no responses now: closed by hand, full, or outside its dates. */
  private static boolean isClosed(Form form) {
    JsonNode limits = form.document().at("/settings/limits");
    Instant now = Instant.now();
    Instant opensAt = instantOf(limits.path("opensAt"));
    Instant closesAt = instantOf(limits.path("closesAt"));
    JsonNode most = limits.path("maxResponses");
    return form.status() == Status.CLOSED
        || (most.isInt() && form.responseCount() >= most.asInt())
        || (opensAt != null && opensAt.isAfter(now))
        || (closesAt != null && !closesAt.isAfter(now));
  }

  /** 410, with the form's own closed message for the visitor. */
  private static ApiException closed(Form form) {
    String message = form.document().at("/settings/limits/closedMessage").asText("");
    return ApiException.gone(message, Map.of("closed", true));
  }

  /** A date the form's settings hold: with an offset, or without one, read as UTC. */
  private static Instant instantOf(JsonNode value) {
    if (!value.isTextual()) return null;
    try {
      return OffsetDateTime.parse(value.asText()).toInstant();
    } catch (DateTimeParseException withoutOffset) {
      try {
        return LocalDateTime.parse(value.asText()).toInstant(ZoneOffset.UTC);
      } catch (DateTimeParseException notADate) {
        return null;
      }
    }
  }

  // ── Your team's side: the inbox ─────────────────────────────────────────────

  /** GET /api/forms/:id/responses — the editor's loadResponses, and your inbox. */
  @Transactional(readOnly = true)
  public Inbox inbox(UUID formId) {
    Form form = findForm(formId);
    Instant weekAgo = Instant.now().minus(Duration.ofDays(7));
    List<InboxLine> latest =
        responses.findTop20ByFormAndDeletedAtIsNullOrderByCreatedAtDesc(form).stream()
            .map(row -> new InboxLine(row.uuid(), titleOf(row), row.createdAt(), row.status()))
            .toList();
    return new Inbox(
        responses.countByFormAndDeletedAtIsNull(form),
        responses.countByFormAndDeletedAtIsNullAndCreatedAtAfter(form, weekAgo),
        latest);
  }

  /** PATCH /api/forms/:id/responses/:rid — your team's triage: `{ status, note }`. */
  @Transactional
  public ResponseAnswer triage(UUID formId, UUID responseId, Triage request) {
    FormResponse row = findResponse(formId, responseId);
    TriageStatus status =
        request.status() == null
            ? row.status()
            : Lowercase.parse(TriageStatus.class, request.status());
    String note = request.note() == null ? row.note() : request.note();
    if (status == null) throw ApiException.refused("status.unknown", "status");
    if (note.length() > 4000) throw ApiException.refused("note.tooLong", "note");

    TriageStatus from = row.status();
    boolean noteChanged = !note.equals(row.note());
    if (status != from || noteChanged) {
      row.triage(status, note);
      // The log's word for any triage; a note alone says so in its details.
      activity.record(
          SubjectType.FORM_RESPONSE,
          row.id(),
          Action.STATUS_CHANGED,
          from,
          status,
          noteChanged ? Map.of("note", true) : Map.of());
    }
    responses.flush();
    return ResponseAnswer.of(row);
  }

  /** DELETE /api/forms/:id/responses/:rid — into the trash; your retention job deletes for good. */
  @Transactional
  public void delete(UUID formId, UUID responseId) {
    FormResponse row = findResponse(formId, responseId);
    trash.delete(SubjectType.FORM_RESPONSE, row, row.status());
  }

  private Form findForm(UUID id) {
    return forms.findLive(id).orElseThrow(() -> ApiException.notFound("form"));
  }

  private FormResponse findResponse(UUID formId, UUID responseId) {
    return responses
        .findByFormAndUuidAndDeletedAtIsNull(findForm(formId), responseId)
        .orElseThrow(() -> ApiException.notFound("response"));
  }

  /** A line for the Responses tab: the first text answer, as the editor lists it. */
  private static String titleOf(FormResponse row) {
    return StreamSupport.stream(row.answers().spliterator(), false)
        .filter(value -> value.isTextual() && !value.asText().isBlank())
        .map(JsonNode::asText)
        .map(text -> text.length() > 80 ? text.substring(0, 80) : text)
        .findFirst()
        .orElse("Response " + row.uuid().toString().substring(0, 8));
  }
}
