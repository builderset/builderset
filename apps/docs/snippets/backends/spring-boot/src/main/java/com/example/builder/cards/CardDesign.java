package com.example.builder.cards;

import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Json;
import com.example.builder.shared.Lowercase;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Converter;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/** A row of card_design: a card's design, which members' cards are issued from. */
@Entity
@Table(name = "card_design")
public class CardDesign extends DocumentEntity {

  /** The card's kind: its size, corners and print rules. */
  public enum Format implements Lowercase {
    MEMBERSHIP,
    ID,
    BANK,
    BUSINESS,
    BADGE,
    WALLET,
    CUSTOM;

    @Converter(autoApply = true)
    public static class Column extends Lowercase.Column<Format> {
      public Column() {
        super(Format.class);
      }
    }
  }

  /** document.meta.name */
  @Column(nullable = false, length = 120)
  private String name = "";

  // Copies of the root's props, for lists and the print order.
  @Column(nullable = false, length = 20)
  private Format format = Format.MEMBERSHIP;

  @Column(nullable = false, precision = 6, scale = 2)
  private BigDecimal widthMm;

  @Column(nullable = false, precision = 6, scale = 2)
  private BigDecimal heightMm;

  /** 1: the front only. 2: front and back. */
  @Column(nullable = false)
  private short sides = 2;

  public void copyMeta(JsonNode document) {
    JsonNode format = Json.rootProps(document);
    name = Json.text(document, "/meta/name", 120);
    this.format = Lowercase.parse(Format.class, format.path("format").asText());
    widthMm = format.path("width").decimalValue();
    heightMm = format.path("height").decimalValue();
    sides = (short) format.path("sides").asInt(2);
  }

  public String name() {
    return name;
  }

  public Format format() {
    return format;
  }

  public BigDecimal widthMm() {
    return widthMm;
  }

  public BigDecimal heightMm() {
    return heightMm;
  }

  public short sides() {
    return sides;
  }
}
