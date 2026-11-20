package com.example.builder.documents;

import com.example.builder.web.ApiException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** The five builders by their URL's {kind}. A {kind} that is none of them is 404. */
@Component
public class DocumentKinds {

  private final Map<String, DocumentKind<?, ?>> byPath;

  public DocumentKinds(List<DocumentKind<?, ?>> kinds) {
    this.byPath = kinds.stream().collect(Collectors.toMap(DocumentKind::path, Function.identity()));
  }

  public DocumentKind<?, ?> get(String path) {
    DocumentKind<?, ?> kind = byPath.get(path);
    if (kind == null) throw ApiException.notFound("route");
    return kind;
  }
}
