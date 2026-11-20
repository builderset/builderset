import { fillText, variablesIn, type CardRecord } from './data';
import type { CardDocument } from './document';
import { elementsOf, printedFaces } from './validate';

/**
 * A card and one member's data, together: for a backend that issues a card
 * to a member with the data frozen at that moment, and for knowing which data
 * a design needs before it is printed. The renderer fills words the same way
 * (`fillText`), so a filled copy draws exactly what the live one does.
 */

/** The props that may hold `{{…}}`, by element type. */
export const VARIABLE_PROPS: Readonly<Record<string, string>> = {
  heading: 'text',
  text: 'text',
  label: 'text',
  field: 'text',
  qr: 'data',
  barcode: 'data',
};

/**
 * Every member field a design uses on its printed sides, in order of first
 * use: the variables in its words and codes, and each photo's field. Hidden
 * elements are not printed and do not count.
 */
export function fieldsUsed(doc: CardDocument): string[] {
  const used = new Set<string>();
  for (const face of printedFaces(doc)) {
    for (const node of elementsOf(doc, face)) {
      if (node.hidden) continue;
      const prop = VARIABLE_PROPS[node.type];
      const value = prop ? node.props[prop] : undefined;
      if (typeof value === 'string') for (const path of variablesIn(value)) used.add(path);
      if (node.type === 'photo' && typeof node.props.bind === 'string') used.add(node.props.bind);
    }
  }
  return [...used];
}

/**
 * A copy of the card with one member's data written in: every variable in
 * its words and codes replaced by the record's value (one the record lacks is
 * left as written, as the renderer leaves it). Photos keep their field: the
 * picture is the record's, by address, when the card is drawn.
 */
export function fillCard(doc: CardDocument, record: CardRecord): CardDocument {
  const filled = structuredClone(doc);
  for (const node of Object.values(filled.nodes)) {
    const prop = VARIABLE_PROPS[node.type];
    const value = prop ? node.props[prop] : undefined;
    if (prop && typeof value === 'string')
      node.props = { ...node.props, [prop]: fillText(value, record) };
  }
  return filled;
}
