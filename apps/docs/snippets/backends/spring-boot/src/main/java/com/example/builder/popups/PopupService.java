package com.example.builder.popups;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.activity.SubjectType;
import com.example.builder.audit.CurrentUser;
import com.example.builder.checks.CheckerClient;
import com.example.builder.checks.DocumentChecks;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.Json;
import com.example.builder.shared.Lowercase;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.example.builder.web.Text;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.InetAddress;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * A popup's life on your site: paused and resumed by your team; listed for a
 * page, counted and submitted to by visitors. A submission is checked against
 * the PUBLISHED document, and only what validateSubmission keeps is stored.
 */
@Service
public class PopupService {

  public interface Submissions extends AuditedRepository<PopupSubmission> {}

  /** What PopupView's onEvent reports. Each adds one to today's counter. */
  public enum Event implements Lowercase {
    SHOWN,
    CLOSED,
    CLICKED,
    SUBMITTED
  }

  public record PauseRequest(boolean paused) {}

  public record StatusAnswer(Status status) {}

  /** A popup that may show on the page: `shouldShow` decides the rest in the browser. */
  public record Showing(UUID id, int version, JsonNode document) {}

  public record EventRequest(String event) {}

  /** The body PopupView's onSubmit sends. */
  public record Submission(JsonNode values, String path, String locale) {}

  private static final Set<Status> ON_THE_SITE = Set.of(Status.PUBLISHED, Status.PAUSED);

  private final Popups.Rows popups;
  private final Submissions submissions;
  private final DocumentChecks checks;
  private final ActivityLog activity;
  private final CurrentUser currentUser;
  private final TransactionTemplate transaction;
  private final boolean storeIp;

  public PopupService(
      Popups.Rows popups,
      Submissions submissions,
      DocumentChecks checks,
      ActivityLog activity,
      CurrentUser currentUser,
      TransactionTemplate transaction,
      @Value("${builderset.popups.store-ip}") boolean storeIp) {
    this.popups = popups;
    this.submissions = submissions;
    this.checks = checks;
    this.activity = activity;
    this.currentUser = currentUser;
    this.transaction = transaction;
    this.storeIp = storeIp;
  }

  // ── Your team's side ────────────────────────────────────────────────────────

  /**
   * PATCH /api/popups/:id/pause — `{ paused }`: take a published popup off the
   * site as it is, or put a paused one back. A draft is neither: 409.
   */
  @Transactional
  public StatusAnswer pause(UUID id, PauseRequest request) {
    currentUser.publisher();
    Popup popup = popups.lockLive(id).orElseThrow(() -> ApiException.notFound("popup"));
    Status from = popup.status();
    if (!ON_THE_SITE.contains(from))
      throw ApiException.conflict("This popup is a draft: publish it first.");

    if (request.paused() && from == Status.PUBLISHED) {
      popup.pause();
      activity.record(SubjectType.POPUP, popup.id(), Action.PAUSED, from, popup.status(), Map.of());
    } else if (!request.paused() && from == Status.PAUSED) {
      popup.resume();
      activity.record(
          SubjectType.POPUP, popup.id(), Action.PUBLISHED, from, popup.status(), Map.of());
    }
    return new StatusAnswer(popup.status());
  }

  // ── The public side: no sign-in ────────────────────────────────────────────

  /** GET /api/public/popups?path=&locale= — highest priority first. */
  @Transactional(readOnly = true)
  public List<Showing> showing(String path, String locale) {
    return popups.findShowing(Status.PUBLISHED, Instant.now()).stream()
        .filter(popup -> PopupPages.allows(displayOf(popup), path == null ? "/" : path, locale))
        .map(popup -> new Showing(popup.uuid(), popup.version(), popup.document()))
        .toList();
  }

  /** POST /api/public/popups/:id/events — `{ event }`. An event for a popup not on the site is 404. */
  @Transactional
  public void count(UUID id, EventRequest request) {
    Event event = Lowercase.parse(Event.class, request.event());
    if (event == null) throw ApiException.refused("event.unknown", "event");
    Popup popup = findPublished(id);
    popups.countEvent(popup.id(), event.value());
  }

  /**
   * POST /api/public/popups/:id/submissions — 410 while paused or after its
   * last day, 422 with the inputs' errors. PopupView reports the `submitted`
   * event itself, so this route does not count it again. Put a rate limit in
   * front of it, answering 429.
   */
  public UUID submit(UUID id, Submission submission, InetAddress visitor) {
    Popup popup =
        popups
            .findLive(id)
            .filter(found -> ON_THE_SITE.contains(found.status()))
            .orElseThrow(() -> ApiException.notFound("popup"));
    if (popup.status() == Status.PAUSED || popup.hasEnded(Instant.now()))
      throw ApiException.gone("This popup takes no answers now.", Map.of());

    CheckerClient.Answers checked = checks.popupValues(popup.document(), submission.values());
    if (!checked.ok()) throw ApiException.invalidAnswers(checked.errors());

    PopupSubmission row =
        new PopupSubmission(
            popup,
            checked.values(),
            Text.atMost(submission.path(), 500),
            Text.atMost(submission.locale(), 10),
            storeIp ? visitor : null);
    return transaction.execute(
        tx -> {
          submissions.save(row);
          activity.record(
              SubjectType.POPUP_SUBMISSION,
              row.id(),
              Action.CREATED,
              null,
              row.status(),
              Map.of("popup", popup.uuid()));
          return row.uuid();
        });
  }

  private Popup findPublished(UUID id) {
    return popups
        .findLive(id)
        .filter(popup -> popup.status() == Status.PUBLISHED)
        .orElseThrow(() -> ApiException.notFound("popup"));
  }

  private static JsonNode displayOf(Popup popup) {
    return Json.rootProps(popup.document()).path("display");
  }
}
