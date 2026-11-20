package com.example.builder.checks;

import com.example.builder.web.ApiException;
import com.example.builder.web.Issue;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Every document is checked here before it is stored, in two layers: its
 * shape, by the kit's JSON Schema, then the kit's own rules — an unsafe link,
 * a variable that does not exist — by the checker. Either refuses with the
 * editor's issue codes: 422. The checker down is 503: nothing unchecked is stored.
 */
@Component
public class DocumentChecks {

  private final DocumentSchemas schemas;
  private final CheckerClient checker;

  public DocumentChecks(DocumentSchemas schemas, CheckerClient checker) {
    this.schemas = schemas;
    this.checker = checker;
  }

  /** The document to store, as the checker gave it back; or 422. `type` is an email's type key. */
  public JsonNode passed(Kit kit, JsonNode raw, Level level, String type) {
    if (raw == null || !raw.isObject()) throw ApiException.refused("document.malformed", "document");
    List<Issue> shape = schemas.problems(kit, raw);
    if (!shape.isEmpty()) throw ApiException.refused(shape);

    CheckerClient.Verdict verdict = checker.check(kit, raw, level, type);
    if (!verdict.ok()) throw ApiException.refused(verdict.issues());
    return verdict.document();
  }

  /**
   * A saved section: `{ roots, nodes }`, its nodes held to the kit's element
   * rules, so an element the kit does not have never reaches the library.
   */
  public JsonNode section(Kit kit, JsonNode fragment) {
    JsonNode roots = fragment == null ? null : fragment.get("roots");
    JsonNode nodes = fragment == null ? null : fragment.get("nodes");
    boolean shaped =
        roots != null && roots.isArray() && !roots.isEmpty() && nodes != null && nodes.isObject();
    if (shaped) {
      for (JsonNode root : roots) shaped &= root.isTextual() && nodes.has(root.asText());
    }
    if (!shaped || !schemas.nodeProblems(kit, nodes).isEmpty())
      throw ApiException.refused("fragment.malformed", "fragment");
    return fragment;
  }

  /** A form response, checked against the published form. */
  public CheckerClient.Answers formAnswers(JsonNode publishedForm, JsonNode answers) {
    return checker.formAnswers(publishedForm, answers);
  }

  /** A popup submission, checked against the published popup. */
  public CheckerClient.Answers popupValues(JsonNode publishedPopup, JsonNode values) {
    return checker.popupValues(publishedPopup, values);
  }
}
