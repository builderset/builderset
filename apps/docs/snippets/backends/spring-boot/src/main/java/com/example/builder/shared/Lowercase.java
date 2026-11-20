package com.example.builder.shared;

import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import java.util.Arrays;
import java.util.Locale;

/**
 * An enum the database and the API spell in lowercase — 'draft',
 * 'status_changed' — while Java names its constants in capitals. Jackson reads
 * and writes `value()`; a {@link Column} subclass does the same for a column.
 */
public interface Lowercase {

  String name();

  @JsonValue
  default String value() {
    return name().toLowerCase(Locale.ROOT);
  }

  /** The constant a request names, or null when it names none of them. */
  static <E extends Enum<E> & Lowercase> E parse(Class<E> type, String value) {
    return Arrays.stream(type.getEnumConstants())
        .filter(constant -> constant.value().equals(value))
        .findFirst()
        .orElse(null);
  }

  /** The converter for one enum: `public static class Column extends Lowercase.Column<Status>`. */
  abstract class Column<E extends Enum<E> & Lowercase> implements AttributeConverter<E, String> {
    private final Class<E> type;

    protected Column(Class<E> type) {
      this.type = type;
    }

    @Override
    public String convertToDatabaseColumn(E value) {
      return value == null ? null : value.value();
    }

    @Override
    public E convertToEntityAttribute(String column) {
      return column == null ? null : Enum.valueOf(type, column.toUpperCase(Locale.ROOT));
    }
  }
}
