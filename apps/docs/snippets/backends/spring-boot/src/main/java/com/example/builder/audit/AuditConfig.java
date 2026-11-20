package com.example.builder.audit;

import com.example.builder.shared.AppUser;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Spring Data fills @CreatedBy and @LastModifiedBy with the signed-in user, and
 * @CreatedDate and @LastModifiedDate with the time, on every insert and update.
 * A visitor or a job is nobody: the columns stay null.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditor")
public class AuditConfig {

  @Bean
  AuditorAware<AppUser> auditor(CurrentUser currentUser) {
    return currentUser::reference;
  }
}
