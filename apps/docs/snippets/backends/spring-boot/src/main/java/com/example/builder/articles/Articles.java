package com.example.builder.articles;

import com.example.builder.activity.Action;
import com.example.builder.activity.SubjectType;
import com.example.builder.audit.CurrentUser;
import com.example.builder.checks.Kit;
import com.example.builder.documents.DocumentKind;
import com.example.builder.documents.DocumentRequests;
import com.example.builder.shared.AppUser;
import com.example.builder.shared.AuditedRepository;
import com.example.builder.shared.PersonRef;
import com.example.builder.shared.RevisionKind;
import com.example.builder.shared.RevisionRepository;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.example.builder.web.Issue;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Component;

/** Articles: an address per language, chosen when one is made; a future publish waits for a job. */
@Component
public class Articles implements DocumentKind<Article, ArticleRevision> {

  private static final Pattern SLUG = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");
  private static final Pattern LOCALE = Pattern.compile("[a-z]{2}(?:-[A-Z]{2})?");

  public interface Rows extends AuditedRepository<Article> {
    boolean existsBySlugAndLocaleAndDeletedAtIsNull(String slug, String locale);

    /** Your site's article: published and live, with its byline. */
    @EntityGraph(attributePaths = "author")
    Optional<Article> findBySlugAndLocaleAndStatusAndDeletedAtIsNull(
        String slug, String locale, Status status);
  }

  public interface Revisions extends RevisionRepository<Article, ArticleRevision> {}

  public record Columns(
      String slug,
      String locale,
      String title,
      String excerpt,
      String coverKey,
      String coverAlt,
      Instant scheduledAt,
      PersonRef author) {}

  private final Rows rows;
  private final Revisions revisions;
  private final CurrentUser currentUser;

  public Articles(Rows rows, Revisions revisions, CurrentUser currentUser) {
    this.rows = rows;
    this.revisions = revisions;
    this.currentUser = currentUser;
  }

  @Override
  public String path() {
    return "articles";
  }

  @Override
  public Kit kit() {
    return Kit.ARTICLE;
  }

  @Override
  public SubjectType subject() {
    return SubjectType.ARTICLE;
  }

  @Override
  public String noun() {
    return "article";
  }

  @Override
  public Set<Status> statuses() {
    return Set.of(Status.DRAFT, Status.SCHEDULED, Status.PUBLISHED, Status.ARCHIVED);
  }

  @Override
  public Rows rows() {
    return rows;
  }

  @Override
  public Revisions revisions() {
    return revisions;
  }

  @Override
  public String searchedField() {
    return "title";
  }

  /**
   * The address is the article's, not the document's. One taken by another live
   * article is refused here; two requests at once meet the unique index: 409.
   */
  @Override
  public Article newRow(DocumentRequests.Create request) {
    String slug = request.slug();
    String locale = request.locale();
    List<Issue> issues = new ArrayList<>();
    if (slug == null || slug.length() > 200 || !SLUG.matcher(slug).matches())
      issues.add(Issue.error("slug.invalid", "slug"));
    if (locale == null || !LOCALE.matcher(locale).matches())
      issues.add(Issue.error("locale.invalid", "locale"));
    if (!issues.isEmpty()) throw ApiException.refused(issues);
    if (rows.existsBySlugAndLocaleAndDeletedAtIsNull(slug, locale))
      throw ApiException.refused("slug.taken", "slug");
    return new Article(slug, locale, currentUser.actor());
  }

  @Override
  public ArticleRevision newRevision(
      Article parent, RevisionKind kind, JsonNode document, String label) {
    return new ArticleRevision(parent, kind, document, label);
  }

  @Override
  public void copyMeta(Article row, JsonNode document) {
    row.copyMeta(document);
  }

  /** A future `scheduledAt` waits for your job; publishing now keeps the first published_at. */
  @Override
  public Action publish(Article row, JsonNode document, Instant scheduledAt, AppUser by) {
    if (scheduledAt != null) {
      row.schedule(document, by, scheduledAt);
      return Action.SCHEDULED;
    }
    row.publish(document, by);
    return Action.PUBLISHED;
  }

  @Override
  public Action unpublish(Article row, AppUser by) {
    row.unpublish();
    return Action.UNPUBLISHED;
  }

  @Override
  public Map<String, String> names(Article row) {
    return Map.of("title", row.title());
  }

  @Override
  public Columns columns(Article row) {
    return new Columns(
        row.slug(),
        row.locale(),
        row.title(),
        row.excerpt(),
        row.coverKey(),
        row.coverAlt(),
        row.scheduledAt(),
        PersonRef.of(row.author()));
  }
}
