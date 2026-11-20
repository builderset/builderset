package com.example.builder.cards;

import com.example.builder.shared.Revision;
import com.example.builder.shared.RevisionKind;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.AssociationOverride;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/** A version of a card design. An issued card finds the design it was printed from by it. */
@Entity
@Table(name = "card_design_revision")
@AssociationOverride(name = "parent", joinColumns = @JoinColumn(name = "card_design_id"))
public class CardDesignRevision extends Revision<CardDesign> {

  protected CardDesignRevision() {}

  public CardDesignRevision(
      CardDesign parent, RevisionKind kind, JsonNode document, String label) {
    super(parent, kind, document, label);
  }
}
