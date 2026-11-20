package com.example.builder.articles;

import com.example.builder.shared.AppUser;
import com.example.builder.shared.DocumentEntity;
import com.example.builder.shared.Json;
import com.example.builder.shared.Status;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** A row of article: one page of your blog or help centre, in one language. */
@Entity
@Table(name = "article")
public class Article extends DocumentEntity {

  /** The address, unique with `locale` among live articles. Chosen when it is made. */
  @Column(nullable = false, length = 200, updatable = false)
  private String slug;

  @Column(nullable = false, length = 10, updatable = false)
  private String locale;

  /** A job of yours publishes a scheduled article then. */
  private Instant scheduledAt;

  // Copies of document.meta, for lists, search and cards: the site never reads inside the JSON.
  @Column(nullable = false, length = 300)
  private String title = "";

  @Column(nullable = false, length = 600)
  private String excerpt = "";

  @Column(length = 300)
  private String coverKey;

  @Column(length = 300)
  private String coverAlt;

  /** The byline: not always who created the row. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "author_id")
  private AppUser author;

  protected Article() {}

  public Article(String slug, String locale, AppUser author) {
    this.slug = slug;
    this.locale = locale;
    this.author = author;
  }

  public void copyMeta(JsonNode document) {
    title = Json.text(document, "/meta/title", 300);
    excerpt = Json.text(document, "/meta/excerpt", 600);
    coverKey = Json.textOrNull(document, "/meta/cover/media/key", 300);
    coverAlt = Json.textOrNull(document, "/meta/cover/alt", 300);
  }

  @Override
  public void publish(JsonNode checked, AppUser by) {
    super.publish(checked, by);
    scheduledAt = null;
  }

  /** Set to go live at `at`: the document is written now, and a job of yours publishes it then. */
  public void schedule(JsonNode checked, AppUser by, Instant at) {
    writeLive(checked, by);
    moveTo(Status.SCHEDULED);
    scheduledAt = at;
  }

  @Override
  public void unpublish() {
    super.unpublish();
    scheduledAt = null;
  }

  /** The first publish stays: the site's list sorts by it. */
  @Override
  protected Instant publishedAtOn(Instant now) {
    return publishedAt() != null ? publishedAt() : now;
  }

  public String slug() {
    return slug;
  }

  public String locale() {
    return locale;
  }

  public Instant scheduledAt() {
    return scheduledAt;
  }

  public String title() {
    return title;
  }

  public String excerpt() {
    return excerpt;
  }

  public String coverKey() {
    return coverKey;
  }

  public String coverAlt() {
    return coverAlt;
  }

  public AppUser author() {
    return author;
  }
}
