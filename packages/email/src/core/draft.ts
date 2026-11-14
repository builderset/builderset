import type { Issue } from '@builderset/engine';

/**
 * What a saved email design may still contain before it is activated: no
 * subject yet, a variable its type does not have yet, a missing unsubscribe
 * link. None of them reaches an inbox — only the active design is sent. What
 * a draft may NEVER contain is anything unsafe to store: a malformed tree, an
 * unsafe link, media from outside the email's folders.
 *
 * Every backend applies the same list (`fixtures/draft.json` is it as a file),
 * so all of them are lenient in exactly the same way. Activating checks
 * strictly: every error blocks it, warnings never do.
 */
export const EMAIL_DRAFT_TOLERATES: readonly string[] = [
  'meta.subjectMissing',
  'variable.unknown',
  'variable.mustUse',
  'compliance.unsubscribeMissing',
  'i18n.locale.unknown',
];

/** Whether this issue stops an email's draft from being saved. */
export function isDraftBlocking(issue: Issue): boolean {
  return issue.severity === 'error' && !EMAIL_DRAFT_TOLERATES.includes(issue.code);
}

/** Whether this issue stops an email from being activated (published). */
export function isPublishBlocking(issue: Issue): boolean {
  return issue.severity === 'error';
}
