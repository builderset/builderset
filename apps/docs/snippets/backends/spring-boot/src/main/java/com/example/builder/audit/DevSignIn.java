package com.example.builder.audit;

import com.example.builder.shared.AppUsers;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// ── Your auth here ───────────────────────────────────────────────────────────
/**
 * A stand-in so the example runs: it signs your team's requests in as the user
 * whose email is in `builderset.dev-user-email`, and leaves the public routes
 * to visitors, who are signed out. Replace it with your sign-in — Spring
 * Security, a session, a JWT check — calling {@link CurrentUser#signIn} the
 * same way, with your own rule for who may publish.
 */
@Component
public class DevSignIn extends OncePerRequestFilter {

  private final AppUsers users;
  private final String email;

  public DevSignIn(AppUsers users, @Value("${builderset.dev-user-email:}") String email) {
    this.users = users;
    this.email = email;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (!email.isBlank() && !request.getRequestURI().startsWith("/api/public/")) {
      users
          .findByEmail(email)
          .ifPresent(
              user ->
                  CurrentUser.signIn(
                      request,
                      new CurrentUser.SignedIn(user.id(), user.uuid(), user.name(), true)));
    }
    chain.doFilter(request, response);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
