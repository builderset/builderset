package com.example.builder.library;

import com.example.builder.checks.Kit;
import com.example.builder.shared.AuditedEntity;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A row of saved_section: a piece of a document saved to reuse. Deleting one
 * hides it from the editor's list; the documents that used it keep their copy.
 */
@Entity
@Table(name = "saved_section")
public class SavedSection extends AuditedEntity {

  /** Which builder's library it belongs to. */
  @Column(nullable = false, length = 16, updatable = false)
  private Kit kit;

  /** What the editor lists it as. */
  @Column(nullable = false, length = 120)
  private String name;

  /** The editor's `{ roots, nodes }`. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false)
  private JsonNode fragment;

  /** An email section kept in step everywhere it is used. */
  @Column(nullable = false)
  private boolean synced;

  protected SavedSection() {}

  public SavedSection(Kit kit, String name, JsonNode fragment) {
    this.kit = kit;
    this.name = name;
    this.fragment = fragment;
  }

  public String name() {
    return name;
  }

  public JsonNode fragment() {
    return fragment;
  }
}
