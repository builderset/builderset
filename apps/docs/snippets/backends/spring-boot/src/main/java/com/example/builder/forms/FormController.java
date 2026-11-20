package com.example.builder.forms;

import com.example.builder.documents.DocumentAnswers;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A form's two sides. Visitors: the form at its address, and its responses —
 * put a rate limit in front of that route (your proxy, or a servlet filter),
 * answering 429. Your team: the Responses tab and the inbox.
 */
@RestController
public class FormController {

  private final FormResponses responses;

  public FormController(FormResponses responses) {
    this.responses = responses;
  }

  @GetMapping("/api/public/forms/{slug}")
  ResponseEntity<FormResponses.PublicForm> form(@PathVariable String slug) {
    FormResponses.PublicForm form = responses.publicForm(slug);
    return ResponseEntity.status(form.closed() ? HttpStatus.GONE : HttpStatus.OK).body(form);
  }

  @PostMapping("/api/public/forms/{slug}/responses")
  @ResponseStatus(HttpStatus.CREATED)
  DocumentAnswers.Created respond(
      @PathVariable String slug,
      @RequestBody FormResponses.Submission submission,
      HttpServletRequest request)
      throws UnknownHostException {
    // Behind a proxy, set server.forward-headers-strategy so this is the visitor's address.
    InetAddress visitor = InetAddress.getByName(request.getRemoteAddr());
    return new DocumentAnswers.Created(responses.respond(slug, submission, visitor));
  }

  @GetMapping("/api/forms/{id}/responses")
  FormResponses.Inbox inbox(@PathVariable UUID id) {
    return responses.inbox(id);
  }

  @PatchMapping("/api/forms/{id}/responses/{rid}")
  FormResponses.ResponseAnswer triage(
      @PathVariable UUID id, @PathVariable UUID rid, @RequestBody FormResponses.Triage request) {
    return responses.triage(id, rid, request);
  }

  @DeleteMapping("/api/forms/{id}/responses/{rid}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable UUID id, @PathVariable UUID rid) {
    responses.delete(id, rid);
  }
}
