package com.example.builder.cards;

import com.example.builder.shared.AppUser;
import com.example.builder.shared.AuditedEntity;
import com.example.builder.shared.Lowercase;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Converter;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A row of card_issue: one card made out to one member, the record a printed
 * or wallet card points back to. The design's version and the member's data
 * are frozen when it is issued, so a reprint matches the card in their hand.
 * created_at is when it was issued.
 */
@Entity
@Table(name = "card_issue")
public class CardIssue extends AuditedEntity {

  public enum IssueStatus implements Lowercase {
    ISSUED,
    PRINTED,
    REVOKED;

    @Converter(autoApply = true)
    public static class Column extends Lowercase.Column<IssueStatus> {
      public Column() {
        super(IssueStatus.class);
      }
    }
  }

  /** On plastic, or a wallet pass. */
  public enum Delivery implements Lowercase {
    PRINT,
    WALLET;

    @Converter(autoApply = true)
    public static class Column extends Lowercase.Column<Delivery> {
      public Column() {
        super(Delivery.class);
      }
    }
  }

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "card_design_id", updatable = false)
  private CardDesign design;

  @Column(nullable = false, updatable = false)
  private int designVersion;

  /** Your member's id, as your system knows it. */
  @Column(nullable = false, length = 120, updatable = false)
  private String memberRef;

  /** Printed on the card. Never reused, not even after a revoke. */
  @Column(nullable = false, length = 40, unique = true, updatable = false)
  private String number;

  /** The fields filled in: `{ "member.name": "Arben Hoxha" }`. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, updatable = false)
  private JsonNode data;

  @Column(nullable = false, length = 16)
  private IssueStatus status = IssueStatus.ISSUED;

  @Column(nullable = false, length = 16, updatable = false)
  private Delivery delivery;

  /** Printed on the card. */
  @Column(updatable = false)
  private LocalDate validUntil;

  private Instant printedAt;

  private Instant revokedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "revoked_by_id")
  private AppUser revokedBy;

  @Column(length = 200)
  private String revokeReason;

  protected CardIssue() {}

  public CardIssue(
      CardDesign design,
      String memberRef,
      String number,
      JsonNode data,
      Delivery delivery,
      LocalDate validUntil) {
    this.design = design;
    this.designVersion = design.version();
    this.memberRef = memberRef;
    this.number = number;
    this.data = data;
    this.delivery = delivery;
    this.validUntil = validUntil;
  }

  /** Cancel the card: the member may be issued a new one, under a new number. */
  public void revoke(AppUser by, String reason) {
    status = IssueStatus.REVOKED;
    revokedAt = Instant.now();
    revokedBy = by;
    revokeReason = reason;
  }

  public int designVersion() {
    return designVersion;
  }

  public String memberRef() {
    return memberRef;
  }

  public String number() {
    return number;
  }

  public JsonNode data() {
    return data;
  }

  public IssueStatus status() {
    return status;
  }

  public Delivery delivery() {
    return delivery;
  }

  public LocalDate validUntil() {
    return validUntil;
  }

  public Instant printedAt() {
    return printedAt;
  }

  public Instant revokedAt() {
    return revokedAt;
  }

  public AppUser revokedBy() {
    return revokedBy;
  }

  public String revokeReason() {
    return revokeReason;
  }
}
