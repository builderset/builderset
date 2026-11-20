package com.example.builder.shared;

import com.fasterxml.jackson.databind.JsonNode;

/** Reading the copies a row keeps of its document: `meta.name`, the root's props. */
public final class Json {

  private Json() {}

  /** The text at a JSON pointer, cut to the column's length; empty when there is none. */
  public static String text(JsonNode document, String pointer, int max) {
    String text = document.at(pointer).asText("");
    return text.length() > max ? text.substring(0, max) : text;
  }

  /** The same, or null when there is none. */
  public static String textOrNull(JsonNode document, String pointer, int max) {
    String text = text(document, pointer, max);
    return text.isEmpty() ? null : text;
  }

  /** The props of the tree's root: a card's size, a popup's type and display rules. */
  public static JsonNode rootProps(JsonNode document) {
    return document.path("nodes").path(document.path("root").asText()).path("props");
  }
}
