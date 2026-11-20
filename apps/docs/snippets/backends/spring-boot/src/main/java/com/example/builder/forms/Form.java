package com.example.builder.forms;

import com.example.builder.shared.AppUser;
import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Json;
import com.example.builder.shared.Status;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A row of form. */
@Entity
@Table(name = "form")
public class Form extends DocumentEntity {

  /** example.com/f/<slug>. `draft-<uuid>` until the first publish copies document.meta.slug. */
  @Column(nullable = false, length = 80)
  private String slug = "draft-" + UUID.randomUUID();

  /** document.meta.name */
  @Column(nullable = false, length = 120)
  private String name = "";

  /** Kept by the response route, for the list and maxResponses. */
  @Column(nullable = false)
  private int responseCount;

  private Instant closedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "closed_by_id")
  private AppUser closedBy;

  public void copyMeta(JsonNode document) {
    name = Json.text(document, "/meta/name", 120);
  }

  /** Live at its address, open again if it was closed. */
  public void publish(JsonNode checked, AppUser by, String address) {
    publish(checked, by);
    slug = address;
    closedAt = null;
    closedBy = null;
  }

  /** A closed form keeps its link and shows its closed message. */
  public void close(AppUser by) {
    moveTo(Status.CLOSED);
    closedAt = Instant.now();
    closedBy = by;
  }

  public String slug() {
    return slug;
  }

  public String name() {
    return name;
  }

  public int responseCount() {
    return responseCount;
  }

  public Instant closedAt() {
    return closedAt;
  }

  public AppUser closedBy() {
    return closedBy;
  }
}
