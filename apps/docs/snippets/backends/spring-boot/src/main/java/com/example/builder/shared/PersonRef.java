package com.example.builder.shared;

import java.util.UUID;

/** A person in an answer: their public id and their name. Null once the person is removed. */
public record PersonRef(UUID id, String name) {

  public static PersonRef of(AppUser user) {
    return user == null ? null : new PersonRef(user.uuid(), user.name());
  }
}
