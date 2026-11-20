package com.example.builder.audit;

import com.example.builder.shared.AppUser;
import com.example.builder.web.ApiException;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * Who is signed in, for the audit columns and the activity log. Your sign-in
 * puts the person on the request with {@link #signIn}; with Spring Security,
 * read them from the SecurityContext here instead. Outside a request — a job —
 * there is nobody, and the columns are left null.
 */
@Component
public class CurrentUser {

  /** The signed-in person, as the routes need them. `id` is app_user.id, for the audit columns. */
  public record SignedIn(long id, UUID uuid, String name, boolean canPublish) {}

  private static final String ATTRIBUTE = CurrentUser.class.getName();

  private final EntityManager entityManager;

  public CurrentUser(EntityManager entityManager) {
    this.entityManager = entityManager;
  }

  public static void signIn(HttpServletRequest request, SignedIn person) {
    request.setAttribute(ATTRIBUTE, person);
  }

  public Optional<SignedIn> get() {
    RequestAttributes request = RequestContextHolder.getRequestAttributes();
    if (request == null) return Optional.empty();
    return Optional.ofNullable(
        (SignedIn) request.getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST));
  }

  /** The signed-in person; 401 when there is none. */
  public SignedIn require() {
    return get().orElseThrow(ApiException::unauthorized);
  }

  /** The signed-in person as a row to point a column at, without loading it. */
  public Optional<AppUser> reference() {
    return get().map(person -> entityManager.getReference(AppUser.class, person.id()));
  }

  /**
   * The same, required and loaded: the person who deletes, closes or revokes.
   * Loaded, so their name can still be answered after the transaction ends.
   */
  public AppUser actor() {
    return entityManager.find(AppUser.class, require().id());
  }

  /**
   * The person who publishes, who must be allowed to: a draft and a page in
   * front of readers are different trust.
   */
  public AppUser publisher() {
    SignedIn person = require();
    if (!person.canPublish()) throw ApiException.forbidden("You may not publish.");
    return entityManager.find(AppUser.class, person.id());
  }
}
