package com.example.builder.articles;

import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.AssociationOverride;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "article_revision")
@AssociationOverride(name = "parent", joinColumns = @JoinColumn(name = "article_id"))
public class ArticleRevision extends Revision<Article> {

  protected ArticleRevision() {}

  public ArticleRevision(Article parent, RevisionKind kind, JsonNode document, String label) {
    super(parent, kind, document, label);
  }
}
