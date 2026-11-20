import {
  checkCard,
  createCardRegistry,
  fieldsUsed,
  fillCard,
  isDraftBlocking,
  isPrintBlocking,
  parseCard,
  type CardDocument,
  type CardRecord,
} from '@builderset/card';

import { MEMBER_FIELDS } from './card-fields';

const registry = createCardRegistry();

// #region check
/** Saving a draft and approving a design: the editor's checks, again, where they count. */
export function checkDesign(body: unknown, approve: boolean) {
  const card = parseCard(body, registry);
  if (!card) return { status: 422, errors: [{ code: 'document.malformed' }] } as const;
  const issues = checkCard(card, registry, { fields: MEMBER_FIELDS, locales: ['sq', 'en'] });
  // A draft may still name a field you have not added yet; a print run may not.
  const blocking = issues.filter(approve ? isPrintBlocking : isDraftBlocking);
  if (blocking.length) return { status: 422, errors: blocking } as const;
  // Warnings (outside the safe area, a QR code under 15 mm) never block: show them.
  return {
    status: 200,
    card,
    warnings: issues.filter((issue) => !isPrintBlocking(issue)),
  } as const;
}
// #endregion check

// #region issue
/**
 * Issuing one member's card: the data it needs, frozen into a copy of the
 * approved design. Store the copy with the issue, so a reprint next year shows
 * what this card said, not what the member's row says by then.
 */
export function issueCard(design: CardDocument, member: CardRecord) {
  const missing = fieldsUsed(design).filter((path) => !member[path]);
  if (missing.length) return { status: 422, missing } as const;
  return { status: 201, card: fillCard(design, member) } as const;
}
// #endregion issue
