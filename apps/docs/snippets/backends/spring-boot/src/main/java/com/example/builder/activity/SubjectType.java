package com.example.builder.activity;

import com.example.builder.shared.Lowercase;
import jakarta.persistence.Converter;

/** Which table a line of activity is about: a subject is named by its table and id. */
public enum SubjectType implements Lowercase {
  EMAIL_TEMPLATE,
  ARTICLE,
  FORM,
  FORM_RESPONSE,
  CARD_DESIGN,
  CARD_ISSUE,
  POPUP,
  POPUP_SUBMISSION,
  SAVED_SECTION,
  MEDIA;

  @Converter(autoApply = true)
  public static class Column extends Lowercase.Column<SubjectType> {
    public Column() {
      super(SubjectType.class);
    }
  }
}
