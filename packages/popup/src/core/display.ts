import { formatOf, type PopupDisplay, type PopupDocument } from './document';

/**
 * Whether a popup shows to this visitor on this page, today — the display
 * rules as one pure function. `PopupView` asks it in the browser; a server
 * that decides which popups to send with a page asks the same function (or
 * `should_show` in Python) and gets the same answer.
 *
 * The trigger is not part of it: the rules say WHETHER, the trigger WHEN.
 */

/** What this browser remembers about one popup. Times are milliseconds since 1970. */
export interface SeenRecord {
  /** The last time it was shown. */
  shownAt?: number | undefined;
  /** The session it was last shown in. */
  session?: string | undefined;
  closedAt?: number | undefined;
  submittedAt?: number | undefined;
}

export interface ShowContext {
  /** The page's path: `/blog/new-cars`. A query or a `#hash` is ignored. */
  path: string;
  device: 'desktop' | 'mobile';
  /** The page's language (`sq`, `en-GB`). Needed only when the popup is for one language. */
  language?: string | undefined;
  /** The visitor has been on the site in an earlier session. */
  returning?: boolean | undefined;
  /** Now, in milliseconds since 1970. */
  now: number;
  /** The visitor's date, `2026-11-30`. Default: `now`'s date in this runtime's time zone. */
  today?: string | undefined;
  /** What the browser remembers about this popup; none: never shown. */
  seen?: SeenRecord | null | undefined;
  /** This session's id, for `session` frequency. */
  session?: string | undefined;
}

/** The rule that hides a popup, checked in this order. */
export const HIDE_REASONS = [
  'device',
  'dates',
  'pages',
  'audience',
  'language',
  'frequency',
] as const;
export type HideReason = (typeof HIDE_REASONS)[number];

const DAY_MS = 86_400_000;

/** A path as rules compare it: no query or hash, no trailing slash but the root's. */
export function normalisePath(path: string): string {
  let clean = path.split(/[?#]/, 1)[0] ?? '';
  if (!clean.startsWith('/')) clean = `/${clean}`;
  while (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean;
}

/** Whether a path matches a rule. `*` stands for any part, slashes included: `/blog/*`. */
export function pathMatches(rule: string, path: string): boolean {
  const pattern = normalisePath(rule.trim())
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}$`, 's').test(normalisePath(path));
}

/** Whether the page's language is the one the popup is for: `sq` takes `sq-AL` too. */
export function languageMatches(wanted: string, page: string | undefined): boolean {
  if (wanted === 'all') return true;
  if (!page) return false;
  const want = wanted.toLowerCase();
  const have = page.toLowerCase();
  return have === want || have.startsWith(`${want}-`);
}

/** `now`'s date in this runtime's time zone, `2026-11-30`. */
export function localDay(now: number): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function frequencyHides(display: PopupDisplay, context: ShowContext): boolean {
  const seen = context.seen;
  if (!seen || display.frequency === 'every') return false;
  // Someone who filled it in has answered it; asking again is nagging.
  if (seen.submittedAt !== undefined) return true;
  switch (display.frequency) {
    case 'session':
      return seen.session !== undefined && seen.session === context.session;
    case 'days':
      return seen.shownAt !== undefined && context.now - seen.shownAt < display.days * DAY_MS;
    case 'until':
      return seen.closedAt !== undefined;
  }
}

/** The display rules on their own: why they hide the popup, or null when it shows. */
export function displayHides(display: PopupDisplay, context: ShowContext): HideReason | null {
  if (context.device === 'desktop' ? !display.desktop : !display.mobile) return 'device';
  const today = context.today ?? localDay(context.now);
  if ((display.starts && today < display.starts) || (display.ends && today > display.ends)) {
    return 'dates';
  }
  if (display.pages !== 'all') {
    const listed = display.rules.some((rule) => rule.trim() && pathMatches(rule, context.path));
    if (display.pages === 'only' ? !listed : listed) return 'pages';
  }
  if (
    display.audience !== 'all' &&
    (display.audience === 'returning') !== Boolean(context.returning)
  ) {
    return 'audience';
  }
  if (!languageMatches(display.language, context.language)) return 'language';
  if (frequencyHides(display, context)) return 'frequency';
  return null;
}

/** Why this popup does not show here and now, or null when it does. */
export function whyHidden(popup: PopupDocument, context: ShowContext): HideReason | null {
  return displayHides(formatOf(popup).display, context);
}

/** Whether this popup shows here and now. Its trigger then decides when. */
export function shouldShow(popup: PopupDocument, context: ShowContext): boolean {
  return whyHidden(popup, context) === null;
}

/**
 * Of several popups that could show on one page, the one that does: the
 * highest `display.priority` among those the rules let through, the first
 * listed on a tie. Null when none shows.
 */
export function pickPopup<P extends PopupDocument>(
  popups: readonly P[],
  context: ShowContext | ((popup: P) => ShowContext),
): P | null {
  let best: P | null = null;
  for (const popup of popups) {
    if (!shouldShow(popup, typeof context === 'function' ? context(popup) : context)) continue;
    if (!best || formatOf(popup).display.priority > formatOf(best).display.priority) best = popup;
  }
  return best;
}
