package com.example.builder.forms;

import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.AssociationOverride;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/** A version of a form. A response's form_version finds the form the visitor saw. */
@Entity
@Table(name = "form_revision")
@AssociationOverride(name = "parent", joinColumns = @JoinColumn(name = "form_id"))
public class FormRevision extends Revision<Form> {

  protected FormRevision() {}

  public FormRevision(Form parent, RevisionKind kind, JsonNode document, String label) {
    super(parent, kind, document, label);
  }
}
