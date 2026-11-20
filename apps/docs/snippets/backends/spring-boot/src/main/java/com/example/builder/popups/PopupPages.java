package com.example.builder.popups;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The two display rules the server can answer from the page's address and
 * language, written as the popup kit's pathMatches and languageMatches are.
 * The rest — trigger, audience, how often, device — need the visitor's
 * browser, and shouldShow decides them there.
 */
final class PopupPages {

  private PopupPages() {}

  /** Whether `display` lets the popup show on `path`, in `language`. */
  static boolean allows(JsonNode display, String path, String language) {
    return pagesAllow(display, path)
        && languageMatches(display.path("language").asText("all"), language);
  }

  private static boolean pagesAllow(JsonNode display, String path) {
    String mode = display.path("pages").asText("all");
    if (mode.equals("all")) return true;
    boolean listed = false;
    for (JsonNode rule : display.path("rules")) {
      String text = rule.asText("").strip();
      listed |= !text.isEmpty() && pathMatches(text, path);
    }
    return mode.equals("only") == listed;
  }

  /** `*` stands for any part of a path, slashes included: `/blog/*`. */
  static boolean pathMatches(String rule, String path) {
    StringBuilder pattern = new StringBuilder();
    for (String part : normalise(rule).split("\\*", -1)) {
      if (!pattern.isEmpty()) pattern.append(".*");
      pattern.append(Pattern.quote(part));
    }
    return Pattern.compile(pattern.toString(), Pattern.DOTALL).matcher(normalise(path)).matches();
  }

  /** `sq` takes `sq-AL` too; `all` takes any. */
  static boolean languageMatches(String wanted, String page) {
    if (wanted.equals("all")) return true;
    if (page == null || page.isEmpty()) return false;
    String want = wanted.toLowerCase(Locale.ROOT);
    String have = page.toLowerCase(Locale.ROOT);
    return have.equals(want) || have.startsWith(want + "-");
  }

  /** As rules compare paths: no query or hash, no trailing slash but the root's. */
  private static String normalise(String path) {
    String clean = path.split("[?#]", 2)[0];
    if (!clean.startsWith("/")) clean = "/" + clean;
    while (clean.length() > 1 && clean.endsWith("/")) clean = clean.substring(0, clean.length() - 1);
    return clean;
  }
}
