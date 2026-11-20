package com.example.builder.documents;

import com.example.builder.activity.ActivityLog;
import com.example.builder.web.Paging;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A document's two histories: its revisions (what it said), for the editor's
 * version panel, and its activity (what happened to it), for a timeline of
 * yours. A deleted document has neither: 404, as everywhere.
 */
@RestController
@RequestMapping("/api/{kind}/{id}")
public class HistoryController {

  private final DocumentKinds kinds;
  private final DocumentService documents;

  public HistoryController(DocumentKinds kinds, DocumentService documents) {
    this.kinds = kinds;
    this.documents = documents;
  }

  @GetMapping("/revisions")
  List<DocumentAnswers.RevisionItem> revisions(@PathVariable String kind, @PathVariable UUID id) {
    return documents.revisions(kinds.get(kind), id);
  }

  @GetMapping("/revisions/{rid}")
  DocumentAnswers.RevisionDocument revision(
      @PathVariable String kind, @PathVariable UUID id, @PathVariable UUID rid) {
    return documents.revision(kinds.get(kind), id, rid);
  }

  @PostMapping("/revisions")
  @ResponseStatus(HttpStatus.CREATED)
  DocumentAnswers.Created saveRevision(
      @PathVariable String kind,
      @PathVariable UUID id,
      @RequestBody DocumentRequests.NewRevision request) {
    return documents.saveRevision(kinds.get(kind), id, request);
  }

  @GetMapping("/activity")
  List<ActivityLog.Entry> activity(
      @PathVariable String kind,
      @PathVariable UUID id,
      @RequestParam(required = false) Integer limit) {
    return documents.activity(kinds.get(kind), id, Paging.of(limit, 0, 50).limit());
  }
}
