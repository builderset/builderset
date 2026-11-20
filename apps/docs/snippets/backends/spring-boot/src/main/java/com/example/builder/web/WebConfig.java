package com.example.builder.web;

import com.example.builder.audit.SignInRequired;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final SignInRequired signInRequired;
  private final Path uploads;

  public WebConfig(
      SignInRequired signInRequired, @Value("${builderset.uploads.dir}") Path uploads) {
    this.signInRequired = signInRequired;
    this.uploads = uploads;
  }

  /**
   * Visitors' routes take no sign-in; everything else under /api is your
   * team's. The uploaded files are read by visitors too; uploading one is
   * your team's, and its route asks for the signed-in user itself.
   */
  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
        .addInterceptor(signInRequired)
        .addPathPatterns("/api/**")
        .excludePathPatterns("/api/public/**", "/api/uploads/**");
  }

  /** Uploaded files, by their key. A key never changes its bytes, so they are cached for a year. */
  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry
        .addResourceHandler("/api/uploads/**")
        .addResourceLocations(uploads.toAbsolutePath().toUri().toString())
        .setCachePeriod(365 * 24 * 3600);
  }
}
