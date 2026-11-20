package com.example.builder.emails;

import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.AssociationOverride;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "email_template_revision")
@AssociationOverride(name = "parent", joinColumns = @JoinColumn(name = "email_template_id"))
public class EmailTemplateRevision extends Revision<EmailTemplate> {

  protected EmailTemplateRevision() {}

  public EmailTemplateRevision(
      EmailTemplate parent, RevisionKind kind, JsonNode document, String label) {
    super(parent, kind, document, label);
  }
}
