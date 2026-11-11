/**
 * The editor's own words: their shape, and how a language is chosen.
 *
 * Each language is a file of its own (`src/locales/en.ts`, `sq.ts`, `de.ts`)
 * typed as `EditorMessages`, so the type checker reports a missing word.
 * English is built in; a project passes the others through `locales`, and
 * can replace any single word through `messages`.
 *
 * The words are the workspace's own. A kit's words — element names, the
 * article's settings, the email's — live in the kit's locale files.
 */

export interface ElementText {
  name: string;
  description: string;
}

export interface EditorMessages {
  back: string;
  untitled: string;
  undo: string;
  redo: string;
  nothingToUndo: string;
  nothingToRedo: string;
  desktop: string;
  tablet: string;
  mobile: string;
  zoom: string;
  zoomFit: string;
  preview: string;
  publish: string;
  update: string;
  schedule: string;
  saveDraft: string;
  unpublish: string;
  duplicateDocument: string;
  deleteDocument: string;
  status_draft: string;
  status_published: string;
  status_archived: string;
  status_scheduled: string;
  saveIdle: string;
  saveDirty: string;
  saveSaving: string;
  saveSaved: string;
  saveError: string;
  saveConflict: string;
  savedAgo: (when: string) => string;
  add: string;
  layers: string;
  templates: string;
  settings: string;
  searchElements: string;
  noElementsFound: string;
  recentlyUsed: string;
  categories: Record<string, string>;
  content: string;
  style: string;
  advanced: string;
  document: string;
  general: string;
  seo: string;
  multipleSelected: (count: number) => string;
  /** The document-settings switch: one document, every language. */
  multilingual: string;
  multilingualHelp: string;
  language: string;
  /** Language names by code; any not listed is named by `Intl.DisplayNames`. */
  languages: Record<string, string>;
  /** The notice while writing in a language other than the base. */
  writingIn: (language: string) => string;
  moveUp: string;
  moveDown: string;
  duplicate: string;
  delete: string;
  selectParent: string;
  insertHere: string;
  insertAfter: string;
  turnInto: string;
  hide: string;
  show: string;
  lock: string;
  unlock: string;
  rename: string;
  anchor: string;
  anchorHint: string;
  elementName: string;
  hidden: string;
  hiddenHint: string;
  locked: string;
  lockedHint: string;
  breakpoint: string;
  inherited: string;
  reset: string;
  spacing: string;
  layout: string;
  appearance: string;
  typography: string;
  visibility: string;
  hideAt: string;
  styleKeys: Record<string, string>;
  addItem: string;
  removeItem: string;
  clear: string;
  none: string;
  upload: string;
  replace: string;
  uploading: string;
  uploadFailed: string;
  chooseImage: string;
  emptyTitle: string;
  emptyBody: string;
  startWriting: string;
  words: (count: number) => string;
  readingTime: (minutes: number) => string;
  issues: (count: number) => string;
  noIssues: string;
  jumpTo: string;
  publishBlocked: string;
  shortcuts: string;
  shortcutList: [string, string][];
  title: string;
  cover: string;
  publishAt: string;
  scheduleHint: string;
  cancel: string;
  confirm: string;
  leaveTitle: string;
  leaveBody: string;
  leave: string;
  stay: string;
  conflictTitle: string;
  conflictBody: string;
  keepMine: string;
  loadTheirs: string;
  restoreTitle: string;
  restoreBody: string;
  restore: string;
  discard: string;
  revisions: string;
  noRevisions: string;
  revisionKinds: Record<string, string>;
  restoreRevision: string;
  saveVersion: string;
  savedSections: string;
  sectionName: string;
  saveSection: string;
  noSections: string;
  dragToMove: string;
  moreOptions: string;
  close: string;
  /** The UI kit's fallbacks: a confirm that failed, an empty list with no words of its own. */
  somethingWentWrong: string;
  noResults: string;
  noResultsHint: string;
  insertVariable: string;
  structures: string;
  inheritFont: string;
  font: string;
  searchFonts: string;
  decrease: string;
  increase: string;
  allSides: string;
  sides: { top: string; right: string; bottom: string; left: string };
  webFontHint: string;
  fontGroups: Record<string, string>;
  align: string;
  showEverywhere: string;
  hideOnMobile: string;
  hideOnDesktop: string;
  showWhen: string;
  variable: string;
  addCondition: string;
  ops: Record<string, string>;
  searchVariables: string;
  versionLabel: string;
  saved: string;
  published: string;
  scheduled: string;
  unpublished: string;
  deleteTitle: string;
  deleteBody: string;
  cannotPlace: string;
  elements: Record<string, ElementText>;
  issueText: Record<string, string>;
  fieldLabels: Record<string, string>;
}

/** Any part of a set of words, at any depth: what a host overrides. */
export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> | undefined }
      : T;

/**
 * The words for `locale`: English, with the chosen language laid over it key
 * by key, then `overrides` over that. A word a language leaves out stays
 * English. A code with a region (`sq-AL`) that has no file of its own falls
 * back to the language alone (`sq`).
 *
 * English is the only language built in: a project imports the others
 * (`@motors/engine/locales/sq`) and passes them as `locales`, so an app that
 * passes none ships no other language.
 */
export function resolveMessages<T extends object>(
  english: T,
  locale: string,
  locales?: Readonly<Record<string, DeepPartial<T> | undefined>>,
  overrides?: DeepPartial<T>,
): T {
  const chosen = pickLocale(locale, locales);
  return merge(merge(english, chosen), overrides);
}

/** `locales[locale]`, or `locales[language]` for a regional code; undefined when neither exists. */
export function pickLocale<L>(
  locale: string,
  locales?: Readonly<Record<string, L | undefined>>,
): L | undefined {
  if (!locales) return undefined;
  return locales[locale] ?? locales[locale.split('-')[0] ?? ''];
}

/** `base` with `over` laid on it: plain objects merge, everything else (words, lists, functions) replaces. */
function merge<T>(base: T, over: unknown): T {
  if (over === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(over)) return over as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    if (value === undefined) continue;
    out[key] = merge(out[key], value);
  }
  return out as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * A language's name, for the language switch and "Writing in …": the
 * catalogue's own word when it has one, otherwise the language's name for
 * itself as the platform knows it (`sq` → "Shqip", `fr` → "Français").
 */
export function languageName(code: string, names: Readonly<Record<string, string>>): string {
  const named = names[code];
  if (named) return named;
  try {
    const own = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    if (own) return own.charAt(0).toLocaleUpperCase(code) + own.slice(1);
  } catch {
    /* not a code the platform knows: show the code */
  }
  return code.toUpperCase();
}

/** A prop name as a label, when no translation names it: `dropCap` → "Drop cap". */
export function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
