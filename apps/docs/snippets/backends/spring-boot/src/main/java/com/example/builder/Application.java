package com.example.builder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
// Each builder's repositories are declared inside its own class: EmailTemplates.Rows.
@EnableJpaRepositories(considerNestedRepositories = true)
public class Application {

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}
