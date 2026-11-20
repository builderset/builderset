package com.example.builder.articles;

import com.example.builder.shared.PersonRef;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** What your site shows: the live document of a published article, never the draft. */
@RestController
public class PublicArticleController {

  public record PublicArticle(
      UUID id,
      JsonNode document,
      String title,
      String excerpt,
      String coverKey,
      String coverAlt,
      Instant publishedAt,
      PersonRef author) {}

  private final Articles.Rows rows;

  public PublicArticleController(Articles.Rows rows) {
    this.rows = rows;
  }

  @GetMapping("/api/public/articles/{locale}/{slug}")
  PublicArticle article(@PathVariable String locale, @PathVariable String slug) {
    return rows.findBySlugAndLocaleAndStatusAndDeletedAtIsNull(slug, locale, Status.PUBLISHED)
        .map(
            article ->
                new PublicArticle(
                    article.uuid(),
                    article.document(),
                    article.title(),
                    article.excerpt(),
                    article.coverKey(),
                    article.coverAlt(),
                    article.publishedAt(),
                    PersonRef.of(article.author())))
        .orElseThrow(() -> ApiException.notFound("article"));
  }
}
