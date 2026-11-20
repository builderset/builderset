package com.example.builder.shared;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/**
 * Your users, as the audit columns point at them. Map your own table here
 * instead; the schema only needs its `id`, and answers its `uuid` and `name`.
 */
@Entity
@Table(name = "app_user")
@Immutable
public class AppUser {

  @Id
  private Long id;

  @Column(nullable = false, unique = true)
  private UUID uuid;

  @Column(nullable = false, unique = true, length = 254)
  private String email;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false)
  private Instant createdAt;

  protected AppUser() {}

  public Long id() {
    return id;
  }

  public UUID uuid() {
    return uuid;
  }

  public String name() {
    return name;
  }
}
