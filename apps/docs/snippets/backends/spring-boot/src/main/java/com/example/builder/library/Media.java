package com.example.builder.library;

import com.example.builder.shared.AuditedEntity;
import com.example.builder.shared.Lowercase;
import jakarta.persistence.Column;
import jakarta.persistence.Converter;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A row of media: every uploaded file, by the key the documents store. A
 * document holds the key, never a URL. created_by is who uploaded it.
 */
@Entity
@Table(name = "media")
public class Media extends AuditedEntity {

  /** What the editor offers it for. */
  public enum Kind implements Lowercase {
    IMAGE,
    VIDEO,
    AUDIO,
    FILE;

    @Converter(autoApply = true)
    public static class Column extends Lowercase.Column<Kind> {
      public Column() {
        super(Kind.class);
      }
    }
  }

  /** Where the bytes are: `2026/11/3f9c….png`. */
  @Column(nullable = false, length = 300, unique = true, updatable = false)
  private String key;

  @Column(nullable = false, length = 8, updatable = false)
  private Kind kind;

  /** Known by the file's first bytes, not by its name. */
  @Column(nullable = false, length = 100, updatable = false)
  private String mime;

  @Column(nullable = false, updatable = false)
  private int size;

  private Integer width;

  private Integer height;

  /** The name it was uploaded with. */
  @Column(nullable = false, length = 300)
  private String name;

  /** The default alt text. */
  @Column(nullable = false, length = 300)
  private String alt = "";

  /** The same file uploaded twice becomes one row. */
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 64, updatable = false)
  private String sha256;

  protected Media() {}

  public Media(StoredFile file, String name) {
    this.key = file.key();
    this.kind = file.type().kind();
    this.mime = file.type().mime();
    this.size = file.size();
    this.width = file.width();
    this.height = file.height();
    this.sha256 = file.sha256();
    this.name = name;
  }

  public String key() {
    return key;
  }

  public Kind kind() {
    return kind;
  }

  public String mime() {
    return mime;
  }

  public int size() {
    return size;
  }

  public Integer width() {
    return width;
  }

  public Integer height() {
    return height;
  }

  public String name() {
    return name;
  }

  public String alt() {
    return alt;
  }
}
