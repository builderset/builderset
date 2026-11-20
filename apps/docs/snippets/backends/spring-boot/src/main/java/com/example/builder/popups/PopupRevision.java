package com.example.builder.popups;

import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.AssociationOverride;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "popup_revision")
@AssociationOverride(name = "parent", joinColumns = @JoinColumn(name = "popup_id"))
public class PopupRevision extends Revision<Popup> {

  protected PopupRevision() {}

  public PopupRevision(Popup parent, RevisionKind kind, JsonNode document, String label) {
    super(parent, kind, document, label);
  }
}
