package com.example.builder.web;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * What a handler throws when the answer is not a success. {@link ApiErrors}
 * turns it into the answer: the status, a message, and anything else the
 * route promises, such as the issues of a 422.
 */
public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final Map<String, Object> body;

  public ApiException(HttpStatus status, String message, Map<String, Object> body) {
    super(message);
    this.status = status;
    this.body = body;
  }

  public static ApiException notFound(String noun) {
    return new ApiException(HttpStatus.NOT_FOUND, "There is no such " + noun + ".", Map.of());
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message, Map.of());
  }

  public static ApiException unauthorized() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Sign in to edit.", Map.of());
  }

  public static ApiException forbidden(String message) {
    return new ApiException(HttpStatus.FORBIDDEN, message, Map.of());
  }

  /** 422 with the issue codes, so the editor shows each problem on its block. */
  public static ApiException refused(List<Issue> issues) {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, "Refused: see the issues.", Map.of("issues", issues));
  }

  public static ApiException refused(String code, String path) {
    return refused(List.of(Issue.error(code, path)));
  }

  /** 422 with what a visitor sent wrong, by field, as FormView and PopupView show it. */
  public static ApiException invalidAnswers(Object errors) {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, "Some answers are not valid.", Map.of("errors", errors));
  }

  /** 410: a form or popup that takes nothing now. */
  public static ApiException gone(String message, Map<String, Object> body) {
    return new ApiException(HttpStatus.GONE, message, body);
  }

  public HttpStatus status() {
    return status;
  }

  public Map<String, Object> body() {
    return body;
  }
}
