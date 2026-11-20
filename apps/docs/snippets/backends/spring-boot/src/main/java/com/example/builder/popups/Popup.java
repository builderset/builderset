package com.example.builder.popups;

import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Json;
import com.example.builder.shared.Lowercase;
import com.example.builder.shared.Status;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Converter;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

/** A row of popup. */
@Entity
@Table(name = "popup")
public class Popup extends DocumentEntity {

  /** How it sits on the page. */
  public enum Type implements Lowercase {
    MODAL,
    SLIDEIN,
    BARTOP,
    BARBOTTOM,
    FULLSCREEN,
    DRAWER,
    INLINE;

    @Converter(autoApply = true)
    public static class Column extends Lowercase.Column<Type> {
      public Column() {
        super(Type.class);
      }
    }
  }

  /** document.meta.name */
  @Column(nullable = false, length = 120)
  private String name = "";

  @Column(nullable = false, length = 16)
  private Type type = Type.MODAL;

  // Copies of the root's display rules, so the site asks one indexed question:
  // which popups may show today. The rest run in the browser with shouldShow.
  private Instant startsAt;

  private Instant endsAt;

  /** When two popups match a page, the higher one shows. */
  @Column(nullable = false)
  private short priority;

  /**
   * The display's days are whole days in the visitor's time zone, which the
   * server does not know. So the copies are widened to every zone on Earth:
   * from the first day's midnight at UTC+14 to the last day's end at UTC-12.
   * shouldShow narrows it to the visitor's own day in the browser.
   */
  public void copyMeta(JsonNode document) {
    JsonNode format = Json.rootProps(document);
    JsonNode display = format.path("display");
    name = Json.text(document, "/meta/name", 120);
    type = Lowercase.parse(Type.class, format.path("type").asText());
    startsAt = midnightUtc(display.path("starts").asText(""), Duration.ofHours(-14));
    endsAt = midnightUtc(display.path("ends").asText(""), Duration.ofDays(1).plusHours(12));
    priority = (short) display.path("priority").asInt(0);
    // A draft may hold its days the wrong way round, which publishing refuses
    // (display.datesInvalid). Until then it shows nowhere, so no dates are copied.
    if (startsAt != null && endsAt != null && !endsAt.isAfter(startsAt)) {
      startsAt = null;
      endsAt = null;
    }
  }

  /** Take it off the site, as it is. */
  public void pause() {
    moveTo(Status.PAUSED);
  }

  /** Back on the site. */
  public void resume() {
    moveTo(Status.PUBLISHED);
  }

  /** Whether its last day is over. */
  public boolean hasEnded(Instant now) {
    return endsAt != null && !endsAt.isAfter(now);
  }

  /** `day`'s midnight in UTC, moved by `shift`; null for no day, or one that is not a date. */
  private static Instant midnightUtc(String day, Duration shift) {
    try {
      return LocalDate.parse(day).atStartOfDay(ZoneOffset.UTC).toInstant().plus(shift);
    } catch (DateTimeParseException noDay) {
      return null;
    }
  }

  public String name() {
    return name;
  }

  public Type type() {
    return type;
  }

  public Instant startsAt() {
    return startsAt;
  }

  public Instant endsAt() {
    return endsAt;
  }

  public short priority() {
    return priority;
  }
}
