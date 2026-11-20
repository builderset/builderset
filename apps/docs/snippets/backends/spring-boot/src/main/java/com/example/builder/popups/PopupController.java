package com.example.builder.popups;

import com.example.builder.documents.DocumentAnswers;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** A popup's routes besides the shared ones: pausing it, and what your site's visitors call. */
@RestController
public class PopupController {

  private final PopupService popups;

  public PopupController(PopupService popups) {
    this.popups = popups;
  }

  @PatchMapping("/api/popups/{id}/pause")
  PopupService.StatusAnswer pause(
      @PathVariable UUID id, @RequestBody PopupService.PauseRequest request) {
    return popups.pause(id, request);
  }

  @GetMapping("/api/public/popups")
  List<PopupService.Showing> showing(
      @RequestParam(required = false) String path, @RequestParam(required = false) String locale) {
    return popups.showing(path, locale);
  }

  @PostMapping("/api/public/popups/{id}/events")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void event(@PathVariable UUID id, @RequestBody PopupService.EventRequest request) {
    popups.count(id, request);
  }

  @PostMapping("/api/public/popups/{id}/submissions")
  @ResponseStatus(HttpStatus.CREATED)
  DocumentAnswers.Created submit(
      @PathVariable UUID id,
      @RequestBody PopupService.Submission submission,
      HttpServletRequest request)
      throws UnknownHostException {
    InetAddress visitor = InetAddress.getByName(request.getRemoteAddr());
    return new DocumentAnswers.Created(popups.submit(id, submission, visitor));
  }
}
