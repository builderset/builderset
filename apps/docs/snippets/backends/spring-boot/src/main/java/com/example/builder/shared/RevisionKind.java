package com.example.builder.shared;

import jakarta.persistence.Converter;

/** Why a revision was written. Also the editor's `reason` for a draft save. */
public enum RevisionKind implements Lowercase {
  AUTOSAVE,
  MANUAL,
  PUBLISH;

  @Converter(autoApply = true)
  public static class Column extends Lowercase.Column<RevisionKind> {
    public Column() {
      super(RevisionKind.class);
    }
  }
}
