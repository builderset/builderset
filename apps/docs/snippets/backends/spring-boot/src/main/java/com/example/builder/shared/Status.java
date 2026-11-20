package com.example.builder.shared;

import jakarta.persistence.Converter;

/**
 * Where a document is. Each builder uses some of these, and its table's check
 * constraint holds it to them: an article is never `paused`, a popup never `closed`.
 */
public enum Status implements Lowercase {
  DRAFT,
  SCHEDULED,
  PUBLISHED,
  ARCHIVED,
  /** A form that stopped taking responses: its link shows the closed message. */
  CLOSED,
  /** A popup taken off the site, kept as it is. */
  PAUSED;

  @Converter(autoApply = true)
  public static class Column extends Lowercase.Column<Status> {
    public Column() {
      super(Status.class);
    }
  }
}
