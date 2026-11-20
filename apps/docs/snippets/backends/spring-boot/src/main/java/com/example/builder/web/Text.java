package com.example.builder.web;

/** Reading text a request sent. */
public final class Text {

  private Text() {}

  /** The text, when there is some and it fits in `max` characters; null otherwise. */
  public static String atMost(String value, int max) {
    return value == null || value.isBlank() || value.length() > max ? null : value;
  }
}
