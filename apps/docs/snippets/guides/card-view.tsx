import '@builderset/card/card.css';

import {
  createCardRegistry,
  formatOf,
  parseCard,
  type CardDocument,
  type CardRecord,
} from '@builderset/card';
import { CardPrintSheet, CardView } from '@builderset/card/render';

const registry = createCardRegistry();
const media = (key: string) => `https://cdn.example.com/${key}`;

/** Your storage: the published design, and the members of its list. */
declare function loadDesign(id: string): Promise<unknown>;
declare function loadMembers(list: string): Promise<CardRecord[]>;

// #region member
/** A member's own card, on their account page: both sides, filled in for them. */
export function MemberCard({ card, member }: { card: CardDocument; member: CardRecord }) {
  return (
    <figure style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {/* No scale: actual size on a screen. A number is pixels per millimetre. */}
      <CardView document={card} face="front" record={member} assetUrl={media} />
      <CardView document={card} face="back" record={member} assetUrl={media} scale={4} />
    </figure>
  );
}
// #endregion member

// #region sheet
/**
 * app/cards/[id]/print/page.tsx — every printed side of every member's card at
 * real size, with bleed and crop marks, one page each. Print it with margins
 * off, or save it as a PDF for the print shop.
 */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = parseCard(await loadDesign(id), registry);
  if (!card) throw new Error('Not a card design');
  // The member list the designer chose in the editor ("source"), as your host names it.
  const members = await loadMembers(formatOf(card).source);
  return <CardPrintSheet document={card} records={members} assetUrl={media} />;
}
// #endregion sheet
