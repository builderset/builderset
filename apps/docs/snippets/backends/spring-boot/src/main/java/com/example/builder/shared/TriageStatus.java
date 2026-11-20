package com.example.builder.shared;

import jakarta.persistence.Converter;

/** Your team's own triage of a form response or a popup submission. Change the words to yours. */
public enum TriageStatus implements Lowercase {
  NEW,
  CALLED,
  DONE;

  @Converter(autoApply = true)
  public static class Column extends Lowercase.Column<TriageStatus> {
    public Column() {
      super(TriageStatus.class);
    }
  }
}
