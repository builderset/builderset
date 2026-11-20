package com.example.builder.checks;

import com.example.builder.shared.Lowercase;

/** How strict a check is: a draft may be unfinished but never unsafe; publishing refuses every error. */
public enum Level implements Lowercase {
  DRAFT,
  PUBLISH
}
