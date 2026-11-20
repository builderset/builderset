package com.example.builder.documents;

import com.example.builder.shared.AuditedEntity;
import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Status;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** The filters of a list, as Specifications the repositories combine. */
public final class Rows {

  private Rows() {}

  /** Everything but the trash. */
  public static <E extends AuditedEntity> Specification<E> live() {
    return (row, query, where) -> where.isNull(row.get("deletedAt"));
  }

  /** The trash: `?deleted=true`. */
  public static <E extends AuditedEntity> Specification<E> inTrash() {
    return (row, query, where) -> where.isNotNull(row.get("deletedAt"));
  }

  public static <E extends DocumentEntity> Specification<E> hasStatus(Status status) {
    return (row, query, where) -> where.equal(row.get("status"), status);
  }

  /** `?q=`: the text anywhere in one field, any case. `%` and `_` in it are only themselves. */
  public static <E> Specification<E> contains(String field, String text) {
    String escaped = text.toLowerCase(Locale.ROOT).replaceAll("[\\\\%_]", "\\\\$0");
    return (row, query, where) ->
        where.like(where.lower(row.get(field)), "%" + escaped + "%", '\\');
  }
}
