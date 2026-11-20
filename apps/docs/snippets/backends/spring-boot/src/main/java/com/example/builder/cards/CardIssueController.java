package com.example.builder.cards;

import com.example.builder.web.Paging;
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

/** The cards issued from one design. */
@RestController
@RequestMapping("/api/cards/{id}/issues")
public class CardIssueController {

  private final CardIssues issues;

  public CardIssueController(CardIssues issues) {
    this.issues = issues;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  CardIssues.IssueAnswer issue(
      @PathVariable UUID id, @RequestBody CardIssues.IssueRequest request) {
    return issues.issue(id, request);
  }

  @GetMapping
  CardIssues.IssuePage list(
      @PathVariable UUID id,
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false) Integer offset) {
    return issues.list(id, Paging.of(limit, offset, 50));
  }

  @PostMapping("/{iid}/revoke")
  CardIssues.IssueAnswer revoke(
      @PathVariable UUID id,
      @PathVariable UUID iid,
      @RequestBody CardIssues.RevokeRequest request) {
    return issues.revoke(id, iid, request);
  }
}
