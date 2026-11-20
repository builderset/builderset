import {
  checkPopup,
  createPopupRegistry,
  formatOf,
  isDraftBlocking,
  isPublishBlocking,
  parsePopup,
  shouldShow,
  validateSubmission,
  type PopupDocument,
} from '@builderset/popup';

import { PAGE_FIELDS } from './popup-fields';

const registry = createPopupRegistry();

// #region check
/** Saving a draft and going live: the editor's checks, again, where they count. */
export function checkDesign(body: unknown, publish: boolean) {
  const popup = parsePopup(body, registry);
  if (!popup) return { status: 422, errors: [{ code: 'document.malformed' }] } as const;
  const issues = checkPopup(popup, registry, {
    locales: ['sq', 'en'],
    variables: PAGE_FIELDS.map((field) => field.path),
  });
  // A draft may be half done (no close button yet); a live popup may not.
  const blocking = issues.filter(publish ? isPublishBlocking : isDraftBlocking);
  if (blocking.length) return { status: 422, errors: blocking } as const;
  // Warnings — shown on every visit, a modal the moment the page opens — never block.
  return { status: 200, popup, warnings: issues.filter((i) => !isPublishBlocking(i)) } as const;
}
// #endregion check

// #region candidates
/**
 * GET /api/public/popups?path=&locale= — the live popups that may show on this
 * page, the highest priority first. The server knows the page, its language
 * and the date. The device, a returning visitor and how often it was seen are
 * the browser's to know: a popup stays in if it would show to any visitor.
 */
const VISITORS = [
  { device: 'desktop', returning: false },
  { device: 'desktop', returning: true },
  { device: 'mobile', returning: false },
  { device: 'mobile', returning: true },
] as const;

export function popupsFor(live: readonly PopupDocument[], path: string, locale: string) {
  const facts = { path, language: locale, now: Date.now() };
  return live
    .filter((popup) => VISITORS.some((visitor) => shouldShow(popup, { ...facts, ...visitor })))
    .sort((a, b) => formatOf(b).display.priority - formatOf(a).display.priority);
}
// #endregion candidates

// #region submission
/**
 * POST /api/public/popups/:id/submissions — never take the browser's word for
 * it: the same function the popup ran before it called onSubmit.
 */
export function receive(popup: PopupDocument, body: { values?: unknown }) {
  const { ok, errors, values } = validateSubmission(popup, body.values);
  if (!ok) return { status: 422, errors } as const;
  // `values` holds the popup's own inputs only, trimmed: store these, nothing else.
  return { status: 201, values } as const;
}
// #endregion submission
