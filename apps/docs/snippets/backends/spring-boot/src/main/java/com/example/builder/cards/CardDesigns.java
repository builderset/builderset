package com.example.builder.cards;

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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Card designs: the published one is what new cards are issued from. */
@Component
public class CardDesigns implements DocumentKind<CardDesign, CardDesignRevision> {

  public interface Rows extends AuditedRepository<CardDesign> {}

  public interface Revisions extends RevisionRepository<CardDesign, CardDesignRevision> {}

  public record Columns(
      String name, CardDesign.Format format, BigDecimal widthMm, BigDecimal heightMm, int sides) {}

  private final Rows rows;
  private final Revisions revisions;

  public CardDesigns(Rows rows, Revisions revisions) {
    this.rows = rows;
    this.revisions = revisions;
  }

  @Override
  public String path() {
    return "cards";
  }

  @Override
  public Kit kit() {
    return Kit.CARD;
  }

  @Override
  public SubjectType subject() {
    return SubjectType.CARD_DESIGN;
  }

  @Override
  public String noun() {
    return "card design";
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

  @Override
  public CardDesign newRow(DocumentRequests.Create request) {
    return new CardDesign();
  }

  @Override
  public CardDesignRevision newRevision(
      CardDesign parent, RevisionKind kind, JsonNode document, String label) {
    return new CardDesignRevision(parent, kind, document, label);
  }

  @Override
  public void copyMeta(CardDesign row, JsonNode document) {
    row.copyMeta(document);
  }

  @Override
  public Action publish(CardDesign row, JsonNode document, Instant scheduledAt, AppUser by) {
    row.publish(document, by);
    return Action.PUBLISHED;
  }

  /** Cards already issued keep their design version; new ones wait for the next publish. */
  @Override
  public Action unpublish(CardDesign row, AppUser by) {
    row.unpublish();
    return Action.UNPUBLISHED;
  }

  @Override
  public Map<String, String> names(CardDesign row) {
    return Map.of("name", row.name());
  }

  @Override
  public Columns columns(CardDesign row) {
    return new Columns(row.name(), row.format(), row.widthMm(), row.heightMm(), row.sides());
  }
}
