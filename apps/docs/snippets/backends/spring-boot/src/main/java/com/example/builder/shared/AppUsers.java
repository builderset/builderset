package com.example.builder.shared;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUsers extends JpaRepository<AppUser, Long> {

  Optional<AppUser> findByEmail(String email);
}
