package com.example.builder.cards;

import com.example.builder.activity.Action;
import com.example.builder.activity.ActivityLog;
import com.example.builder.activity.SubjectType;
import com.example.builder.audit.CurrentUser;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.Lowercase;
import com.example.builder.shared.PersonRef;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.example.builder.web.Issue;
import com.example.builder.web.Paging;
import com.example.builder.web.Text;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The cards made out to members from a design: issued, listed, revoked. */
@Service
public class CardIssues {

  public interface Issues extends AuditedRepository<CardIssue> {
    /** The member's card of this design that is not revoked: at most one, by a partial unique index. */
    boolean existsByDesignAndMemberRefAndStatusNotAndDeletedAtIsNull(
        CardDesign design, String memberRef, CardIssue.IssueStatus status);

    boolean existsByNumber(String number);

    Page<CardIssue> findByDesignAndDeletedAtIsNull(CardDesign design, Pageable page);

    Optional<CardIssue> findByDesignAndUuidAndDeletedAtIsNull(CardDesign design, UUID uuid);
  }

  /** POST /api/cards/:id/issues. `data` is the fields the design prints: `{ "member.name": … }`. */
  public record IssueRequest(
      String memberRef, Map<String, String> data, String delivery, LocalDate validUntil) {}

  public record RevokeRequest(String reason) {}

  public record IssueAnswer(
      UUID id,
      int designVersion,
      String memberRef,
      String number,
      JsonNode data,
      CardIssue.IssueStatus status,
      CardIssue.Delivery delivery,
      LocalDate validUntil,
      Instant printedAt,
      Instant revokedAt,
      PersonRef revokedBy,
      String revokeReason,
      Instant createdAt,
      PersonRef createdBy) {

    static IssueAnswer of(CardIssue row) {
      return new IssueAnswer(
          row.uuid(),
          row.designVersion(),
          row.memberRef(),
          row.number(),
          row.data(),
          row.status(),
          row.delivery(),
          row.validUntil(),
          row.printedAt(),
          row.revokedAt(),
          PersonRef.of(row.revokedBy()),
          row.revokeReason(),
          row.createdAt(),
          PersonRef.of(row.createdBy()));
    }
  }

  public record IssuePage(List<IssueAnswer> items, long total) {}

  /** A data field's name: `member.name`, `member.photo`. */
  private static final Pattern FIELD = Pattern.compile("[a-z_][a-z0-9_]*(\\.[a-z_][a-z0-9_]*){0,4}");

  private static final int MOST_FIELDS = 50;
  private static final SecureRandom RANDOM = new SecureRandom();

  private final CardDesigns.Rows designs;
  private final Issues issues;
  private final ActivityLog activity;
  private final CurrentUser currentUser;
  private final ObjectMapper json;

  public CardIssues(
      CardDesigns.Rows designs,
      Issues issues,
      ActivityLog activity,
      CurrentUser currentUser,
      ObjectMapper json) {
    this.designs = designs;
    this.issues = issues;
    this.activity = activity;
    this.currentUser = currentUser;
    this.json = json;
  }

  /**
   * POST /api/cards/:id/issues — a card for a member, from the design's
   * published version. 422 while the design is a draft; 409 when the member
   * already holds a card of it that is not revoked.
   */
  @Transactional
  public IssueAnswer issue(UUID designId, IssueRequest request) {
    currentUser.require();
    CardDesign design =
        designs.lockLive(designId).orElseThrow(() -> ApiException.notFound("card design"));
    if (design.status() != Status.PUBLISHED)
      throw ApiException.refused("design.notPublished", "design");

    String memberRef = Text.atMost(request.memberRef(), 120);
    CardIssue.Delivery delivery =
        request.delivery() == null
            ? CardIssue.Delivery.PRINT
            : Lowercase.parse(CardIssue.Delivery.class, request.delivery());
    List<Issue> problems = new ArrayList<>();
    if (memberRef == null) problems.add(Issue.error("member_ref.invalid", "member_ref"));
    if (delivery == null) problems.add(Issue.error("delivery.unknown", "delivery"));
    if (!isData(request.data())) problems.add(Issue.error("data.invalid", "data"));
    if (!problems.isEmpty()) throw ApiException.refused(problems);

    if (issues.existsByDesignAndMemberRefAndStatusNotAndDeletedAtIsNull(
        design, memberRef, CardIssue.IssueStatus.REVOKED))
      throw ApiException.conflict(
          "This member already holds a card of this design: revoke it first.");

    CardIssue card =
        issues.save(
            new CardIssue(
                design,
                memberRef,
                newNumber(),
                json.valueToTree(request.data()),
                delivery,
                request.validUntil()));
    activity.record(
        SubjectType.CARD_ISSUE,
        card.id(),
        Action.ISSUED,
        null,
        card.status(),
        Map.of("design", design.uuid(), "version", design.version()));
    return IssueAnswer.of(card);
  }

  /** GET /api/cards/:id/issues — newest first, `?limit=&offset=`. */
  @Transactional(readOnly = true)
  public IssuePage list(UUID designId, Paging paging) {
    Page<CardIssue> page =
        issues.findByDesignAndDeletedAtIsNull(
            findDesign(designId),
            paging.sortedBy(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
    return new IssuePage(page.map(IssueAnswer::of).getContent(), page.getTotalElements());
  }

  /** POST /api/cards/:id/issues/:iid/revoke — `{ reason }`. A revoked card stays revoked. */
  @Transactional
  public IssueAnswer revoke(UUID designId, UUID issueId, RevokeRequest request) {
    CardIssue card =
        issues
            .findByDesignAndUuidAndDeletedAtIsNull(findDesign(designId), issueId)
            .orElseThrow(() -> ApiException.notFound("card"));
    String reason = request.reason() == null ? null : request.reason().strip();
    if (reason != null && reason.length() > 200)
      throw ApiException.refused("reason.tooLong", "reason");

    if (card.status() != CardIssue.IssueStatus.REVOKED) {
      CardIssue.IssueStatus from = card.status();
      card.revoke(currentUser.actor(), reason);
      activity.record(
          SubjectType.CARD_ISSUE,
          card.id(),
          Action.REVOKED,
          from,
          card.status(),
          reason == null ? Map.of() : Map.of("reason", reason));
      issues.flush();
    }
    return IssueAnswer.of(card);
  }

  private CardDesign findDesign(UUID id) {
    return designs.findLive(id).orElseThrow(() -> ApiException.notFound("card design"));
  }

  /** Field names the design could print, each with a short text: never a whole document. */
  private static boolean isData(Map<String, String> data) {
    return data != null
        && data.size() <= MOST_FIELDS
        && data.entrySet().stream()
            .allMatch(
                field ->
                    FIELD.matcher(field.getKey()).matches()
                        && field.getValue() != null
                        && field.getValue().length() <= 500);
  }

  /**
   * A number for the card, `0248 1173 5530`: random, so it says nothing about
   * how many cards there are, and never one already given. Your own scheme —
   * a prefix, a check digit — goes here.
   */
  private String newNumber() {
    String number;
    do {
      number = "%04d %04d %04d".formatted(digits(), digits(), digits());
    } while (issues.existsByNumber(number));
    return number;
  }

  private static int digits() {
    return RANDOM.nextInt(10_000);
  }
}
