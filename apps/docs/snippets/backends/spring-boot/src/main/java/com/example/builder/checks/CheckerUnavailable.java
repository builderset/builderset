package com.example.builder.checks;

/** The checker did not answer in time, or not with an answer. ApiErrors answers 503. */
public class CheckerUnavailable extends RuntimeException {

  public CheckerUnavailable(String route, Throwable cause) {
    super("The Builderset checker did not answer " + route, cause);
  }
}
