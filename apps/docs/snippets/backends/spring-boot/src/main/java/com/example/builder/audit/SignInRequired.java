package com.example.builder.audit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** In front of every route of your team's: visitors stop here with a 401. */
@Component
public class SignInRequired implements HandlerInterceptor {

  private final CurrentUser currentUser;

  public SignInRequired(CurrentUser currentUser) {
    this.currentUser = currentUser;
  }

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    currentUser.require();
    return true;
  }
}
