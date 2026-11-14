import type { Issue } from '@builderset/engine';

/**
 * What an autosaved draft may still contain. A draft is work in progress: a
 * pasted picture not yet uploaded, an embed address half typed, a title not
 * yet written are normal on the way to an article, and none of them reaches a
 * reader — the site shows the published document, never the draft. What a
 * draft may NEVER contain is anything unsafe to store: a malformed tree, an
 * unsafe link, media from outside the article's folders.
 *
 * Every backend applies the same list (`fixtures/draft.json` is it as a file),
 * so all of them are lenient in exactly the same way. Publishing checks
 * strictly: every error blocks it, warnings never do.
 */
export const ARTICLE_DRAFT_TOLERATES: readonly string[] = [
  'media.external',
  'meta.titleMissing',
  'embed.notAllowed',
  'embed.providerMismatch',
  'footnote.missing',
  'i18n.locale.unknown',
];

/** Whether this issue stops an article's draft from being saved. */
export function isDraftBlocking(issue: Issue): boolean {
  return issue.severity === 'error' && !ARTICLE_DRAFT_TOLERATES.includes(issue.code);
}

/** Whether this issue stops an article from being published. */
export function isPublishBlocking(issue: Issue): boolean {
  return issue.severity === 'error';
}
