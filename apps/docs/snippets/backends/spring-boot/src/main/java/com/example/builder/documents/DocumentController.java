package com.example.builder.documents;

import com.example.builder.shared.Lowercase;
import com.example.builder.shared.Status;
import com.example.builder.web.Paging;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The routes every builder shares: /api/emails, /api/articles, /api/forms,
 * /api/cards and /api/popups differ only in their DocumentKind. Each handler
 * reads the request and answers; the work is in DocumentService.
 */
@RestController
@RequestMapping("/api/{kind}")
public class DocumentController {

  private final DocumentKinds kinds;
  private final DocumentService documents;

  public DocumentController(DocumentKinds kinds, DocumentService documents) {
    this.kinds = kinds;
    this.documents = documents;
  }

  @GetMapping
  DocumentAnswers.Page list(
      @PathVariable String kind,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "false") boolean deleted,
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false) Integer offset) {
    Status wanted = Lowercase.parse(Status.class, status);
    return documents.list(kinds.get(kind), wanted, q, deleted, Paging.of(limit, offset, 50));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  DocumentAnswers.Row create(
      @PathVariable String kind, @RequestBody DocumentRequests.Create request) {
    return documents.create(kinds.get(kind), request);
  }

  @GetMapping("/{id}")
  DocumentAnswers.Row get(@PathVariable String kind, @PathVariable UUID id) {
    return documents.get(kinds.get(kind), id);
  }

  @PutMapping("/{id}/draft")
  DocumentAnswers.Saved saveDraft(
      @PathVariable String kind,
      @PathVariable UUID id,
      @RequestBody DocumentRequests.Draft request) {
    return documents.saveDraft(kinds.get(kind), id, request);
  }

  @PostMapping("/{id}/publish")
  DocumentAnswers.Published publish(
      @PathVariable String kind,
      @PathVariable UUID id,
      @RequestBody DocumentRequests.Publish request) {
    return documents.publish(kinds.get(kind), id, request);
  }

  @PostMapping("/{id}/unpublish")
  DocumentAnswers.Unpublished unpublish(@PathVariable String kind, @PathVariable UUID id) {
    return documents.unpublish(kinds.get(kind), id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable String kind, @PathVariable UUID id) {
    documents.delete(kinds.get(kind), id);
  }

  @PostMapping("/{id}/restore")
  DocumentAnswers.Row restore(@PathVariable String kind, @PathVariable UUID id) {
    return documents.restore(kinds.get(kind), id);
  }
}
