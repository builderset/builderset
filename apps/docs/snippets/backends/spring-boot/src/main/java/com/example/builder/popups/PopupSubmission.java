package com.example.builder.popups;

import com.example.builder.shared.AuditedEntity;
import com.example.builder.shared.TriageStatus;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.net.InetAddress;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A row of popup_submission: what a visitor typed into a popup's inputs, as the checker kept it. */
@Entity
@Table(name = "popup_submission")
public class PopupSubmission extends AuditedEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "popup_id", updatable = false)
  private Popup popup;

  @Column(nullable = false, updatable = false)
  private int popupVersion;

  /** validateSubmission's values only: the popup's own inputs, trimmed. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, updatable = false)
  private JsonNode answers;

  /** The page it was sent from. */
  @Column(length = 500, updatable = false)
  private String pagePath;

  @Column(length = 10, updatable = false)
  private String locale;

  @Column(nullable = false, length = 30)
  private TriageStatus status = TriageStatus.NEW;

  /** Only if your privacy rules allow it: `builderset.popups.store-ip`. */
  @JdbcTypeCode(SqlTypes.INET)
  @Column(updatable = false)
  private InetAddress ip;

  protected PopupSubmission() {}

  public PopupSubmission(
      Popup popup, JsonNode answers, String pagePath, String locale, InetAddress ip) {
    this.popup = popup;
    this.popupVersion = popup.version();
    this.answers = answers;
    this.pagePath = pagePath;
    this.locale = locale;
    this.ip = ip;
  }

  public TriageStatus status() {
    return status;
  }
}
