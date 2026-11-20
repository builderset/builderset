package com.example.builder.activity;

import com.example.builder.shared.Lowercase;
import jakarta.persistence.Converter;

/** What happened. The activity table's check constraint holds the same list. */
public enum Action implements Lowercase {
  /** A new row. */
  CREATED,
  /** A manual save; autosaves are not logged. */
  SAVED,
  /** Name, slug or title changed. */
  RENAMED,
  /** Went live, or went live again. */
  PUBLISHED,
  /** Set to go live later. */
  SCHEDULED,
  /** Back to draft. */
  UNPUBLISHED,
  /** A form stopped taking responses. */
  CLOSED,
  /** A popup taken off the site, kept as it is. */
  PAUSED,
  /** A card made out to a member. */
  ISSUED,
  /** A member's card cancelled. */
  REVOKED,
  /** A revision restored. */
  REVERTED,
  /** A response's triage. */
  STATUS_CHANGED,
  DELETED,
  RESTORED;

  @Converter(autoApply = true)
  public static class Column extends Lowercase.Column<Action> {
    public Column() {
      super(Action.class);
    }
  }
}
