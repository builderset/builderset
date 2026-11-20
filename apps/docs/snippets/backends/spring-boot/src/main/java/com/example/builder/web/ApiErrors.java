package com.example.builder.web;

import com.example.builder.checks.CheckerUnavailable;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** The one place an error becomes an answer. Handlers throw; none of them catches. */
@RestControllerAdvice
public class ApiErrors {

  private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

  /** Postgres's code for a row a unique index refused. */
  private static final String UNIQUE_VIOLATION = "23505";

  @ExceptionHandler
  ResponseEntity<Map<String, Object>> refused(ApiException failure) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("message", failure.getMessage());
    body.putAll(failure.body());
    return ResponseEntity.status(failure.status()).body(body);
  }

  /** The checker is down or slow: nothing unchecked is stored, so nothing is stored. */
  @ExceptionHandler
  ResponseEntity<Map<String, Object>> checkerDown(CheckerUnavailable failure) {
    log.error("The Builderset checker did not answer", failure);
    return answer(HttpStatus.SERVICE_UNAVAILABLE, "The document cannot be checked now. Try again.");
  }

  /** A restore, or two requests at once, that a partial unique index refused. */
  @ExceptionHandler
  ResponseEntity<Map<String, Object>> duplicate(DataIntegrityViolationException failure) {
    if (failure.getMostSpecificCause() instanceof SQLException sql
        && UNIQUE_VIOLATION.equals(sql.getSQLState())) {
      return answer(HttpStatus.CONFLICT, "Another live row has its address now.");
    }
    throw failure;
  }

  /** An id in the URL that is not a uuid finds nothing; any other bad parameter is 400. */
  @ExceptionHandler
  ResponseEntity<Map<String, Object>> badParameter(MethodArgumentTypeMismatchException failure) {
    if (failure.getRequiredType() == UUID.class)
      return answer(HttpStatus.NOT_FOUND, "There is no such row.");
    return answer(HttpStatus.BAD_REQUEST, "`" + failure.getName() + "` is not valid.");
  }

  @ExceptionHandler
  ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException failure) {
    return answer(HttpStatus.BAD_REQUEST, "The body is not JSON of the expected shape.");
  }

  @ExceptionHandler
  ResponseEntity<Map<String, Object>> tooLarge(MaxUploadSizeExceededException failure) {
    return answer(HttpStatus.PAYLOAD_TOO_LARGE, "The file is larger than the library takes.");
  }

  @ExceptionHandler
  ResponseEntity<Map<String, Object>> noRoute(NoResourceFoundException failure) {
    return answer(HttpStatus.NOT_FOUND, "There is no such route.");
  }

  private static ResponseEntity<Map<String, Object>> answer(HttpStatus status, String message) {
    return ResponseEntity.status(status).body(Map.of("message", message));
  }
}
