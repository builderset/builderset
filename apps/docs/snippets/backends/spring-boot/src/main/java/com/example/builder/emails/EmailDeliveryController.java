package com.example.builder.emails;

import com.example.builder.checks.CheckerClient;
import com.example.builder.shared.Status;
import com.example.builder.web.ApiException;
import com.example.builder.web.Text;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * What your mailer sends: the live document, rendered with the data by the
 * checker's renderEmail. The browser never sends HTML; the server renders what
 * it stored and checked. A test send of the draft is your mailer's too: render
 * `draft_document` the same way and send it to one address.
 */
@RestController
public class EmailDeliveryController {

  /** `{ data, locale }`: the values for the email's variables. */
  public record SendRequest(JsonNode data, String locale) {}

  private final EmailTemplates.Rows templates;
  private final CheckerClient checker;
  private final String assetBase;

  public EmailDeliveryController(
      EmailTemplates.Rows templates,
      CheckerClient checker,
      @Value("${builderset.public-origin}") String publicOrigin) {
    this.templates = templates;
    this.checker = checker;
    this.assetBase = publicOrigin + "/api/uploads/";
  }

  /** POST /api/emails/:id/send — 409 while the template is a draft. */
  @PostMapping("/api/emails/{id}/send")
  CheckerClient.Rendered send(@PathVariable UUID id, @RequestBody SendRequest request) {
    EmailTemplate template =
        templates.findLive(id).orElseThrow(() -> ApiException.notFound("email template"));
    if (template.status() != Status.PUBLISHED)
      throw ApiException.conflict("This email template is a draft: publish it before sending it.");
    return checker.renderEmail(
        template.document(), request.data(), Text.atMost(request.locale(), 10), assetBase);
  }
}
