package com.example.builder.checks;

import com.example.builder.shared.Lowercase;
import jakarta.persistence.Converter;

/** The five builders, as the checker and the schema files name them. */
public enum Kit implements Lowercase {
  EMAIL,
  ARTICLE,
  FORM,
  CARD,
  POPUP;

  /** Saved sections are kept for these three; saved_section's check constraint says so. */
  public boolean hasLibrary() {
    return this == EMAIL || this == ARTICLE || this == FORM;
  }

  @Converter(autoApply = true)
  public static class Column extends Lowercase.Column<Kit> {
    public Column() {
      super(Kit.class);
    }
  }
}
