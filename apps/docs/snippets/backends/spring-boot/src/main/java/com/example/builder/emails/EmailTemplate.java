package com.example.builder.emails;

import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Json;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A row of email_template: one design for an email your app sends. */
@Entity
@Table(name = "email_template")
public class EmailTemplate extends DocumentEntity {

  /** document.meta.name */
  @Column(nullable = false, length = 120)
  private String name = "";

  /** The email type it is for: its variables and checks. Null for a design not tied to one. */
  @Column(length = 60, updatable = false)
  private String typeKey;

  protected EmailTemplate() {}

  public EmailTemplate(String typeKey) {
    this.typeKey = typeKey;
  }

  public void copyMeta(JsonNode document) {
    name = Json.text(document, "/meta/name", 120);
  }

  public String name() {
    return name;
  }

  public String typeKey() {
    return typeKey;
  }
}
