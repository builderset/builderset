package com.example.builder.checks;

import com.example.builder.web.Issue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * The Builderset checker: the kits' own checks, run by a small Node service
 * beside the app. Every route answers 200 with a verdict; anything else —
 * refused, slow, down — is {@link CheckerUnavailable}, and nothing is stored.
 */
@Component
public class CheckerClient {

  /** `ok` with the document to store, or the issues that refused it. */
  public record Verdict(boolean ok, JsonNode document, List<Issue> issues) {}

  /** What a form's answers or a popup's values came to. Store `values` only. */
  public record Answers(boolean ok, JsonNode errors, JsonNode values) {}

  /** An email rendered for your mailer. */
  public record Rendered(String subject, String html, String text) {}

  private record CheckRequest(JsonNode document, Level level, String type) {}

  private record FormAnswersRequest(JsonNode form, JsonNode answers) {}

  private record PopupValuesRequest(JsonNode popup, JsonNode values) {}

  @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class) // the checker reads `assetBase`
  private record RenderRequest(JsonNode document, JsonNode data, String locale, String assetBase) {}

  private final RestClient http;

  public CheckerClient(RestClient.Builder builder, @Value("${builderset.checker.url}") String url) {
    // Two seconds is plenty for a document; a visitor's request never waits longer.
    SimpleClientHttpRequestFactory timeouts = new SimpleClientHttpRequestFactory();
    timeouts.setConnectTimeout(Duration.ofSeconds(1));
    timeouts.setReadTimeout(Duration.ofSeconds(2));
    this.http = builder.baseUrl(url).requestFactory(timeouts).build();
  }

  /** POST /check/{kit}. `type` is an email's type key, or null. */
  public Verdict check(Kit kit, JsonNode document, Level level, String type) {
    return post("/check/" + kit.value(), new CheckRequest(document, level, type), Verdict.class);
  }

  /** POST /answers/form, against the published form. */
  public Answers formAnswers(JsonNode form, JsonNode answers) {
    return post("/answers/form", new FormAnswersRequest(form, answers), Answers.class);
  }

  /** POST /answers/popup, against the published popup. */
  public Answers popupValues(JsonNode popup, JsonNode values) {
    return post("/answers/popup", new PopupValuesRequest(popup, values), Answers.class);
  }

  /**
   * POST /render/email: the stored document with the data filled in. `assetBase`
   * is where uploaded files are read from, absolute: an email is read far from your site.
   */
  public Rendered renderEmail(JsonNode document, JsonNode data, String locale, String assetBase) {
    return post(
        "/render/email", new RenderRequest(document, data, locale, assetBase), Rendered.class);
  }

  private <T> T post(String route, Object body, Class<T> answer) {
    try {
      T verdict = http.post().uri(route).body(body).retrieve().body(answer);
      if (verdict == null) throw new CheckerUnavailable(route, null);
      return verdict;
    } catch (RestClientException failure) {
      throw new CheckerUnavailable(route, failure);
    }
  }
}
