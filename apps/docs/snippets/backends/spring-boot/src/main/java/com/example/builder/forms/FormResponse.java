package com.example.builder.forms;

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

/**
 * A row of form_response: one submission. created_by is the visitor when
 * signed in; updated_by is whoever on your team last triaged it. Your
 * retention job deletes old ones for good: the one row that is not soft-deleted.
 */
@Entity
@Table(name = "form_response")
public class FormResponse extends AuditedEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "form_id", updatable = false)
  private Form form;

  /** The version answered: its publish revision is the form the visitor saw. */
  @Column(nullable = false, updatable = false)
  private int formVersion;

  /** What the checker's validateAnswers kept: shown fields only, never the raw body. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, updatable = false)
  private JsonNode answers;

  @Column(length = 10, updatable = false)
  private String locale;

  @Column(nullable = false, length = 30)
  private TriageStatus status = TriageStatus.NEW;

  @Column(nullable = false)
  private String note = "";

  /** Only when the form's settings.privacy.storeIp is on. */
  @JdbcTypeCode(SqlTypes.INET)
  @Column(updatable = false)
  private InetAddress ip;

  protected FormResponse() {}

  public FormResponse(Form form, JsonNode answers, String locale, InetAddress ip) {
    this.form = form;
    this.formVersion = form.version();
    this.answers = answers;
    this.locale = locale;
    this.ip = ip;
  }

  /** Your team's triage. */
  public void triage(TriageStatus status, String note) {
    this.status = status;
    this.note = note;
  }

  public int formVersion() {
    return formVersion;
  }

  public JsonNode answers() {
    return answers;
  }

  public String locale() {
    return locale;
  }

  public TriageStatus status() {
    return status;
  }

  public String note() {
    return note;
  }
}
