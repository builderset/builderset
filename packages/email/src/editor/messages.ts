import type { DeepPartial, EditorMessages, ElementText } from '@builderset/engine/editor';

/**
 * The email editor's words: its blocks and categories, and the article
 * editor's words that mean something else for an email ("Publish" is
 * "Activate" — an email is not published, it becomes the one that is sent).
 */

/** The email editor's own words, as its panels read them. */
export interface EmailWords {
  email: EmailSettingsWords;
  importHtml: ImportHtmlWords;
}

/**
 * Everything the email kit says in one language — what a locale file
 * (`@builderset/email/locales/sq`) exports and `locales` takes.
 */
export interface EmailLocale {
  code: string;
  /** The workspace's words (`@builderset/engine/locales/…`). */
  engine: EditorMessages;
  /** Workspace words an email says its own way: "Activate", not "Publish". */
  workspace: Partial<EditorMessages>;
  /** The blocks' names and descriptions, by type. */
  elements: Record<string, ElementText>;
  /** The insert panel's groups, by category. */
  categories: Record<string, string>;
  email: EmailSettingsWords;
  importHtml: ImportHtmlWords;
}

/** What a host may replace, in whatever language is active. */
export type EmailMessages = DeepPartial<Omit<EmailLocale, 'code'>>;

export interface ImportHtmlWords {
  open: string;
  title: string;
  body: string;
  mode: string;
  replace: string;
  append: string;
  hint: string;
  chooseFile: string;
  import: string;
  cancel: string;
  nothingFound: string;
  done: (blocks: number) => string;
  imagesDone: (count: number) => string;
  imagesFailed: (count: number) => string;
}

export interface EmailSettingsWords {
  settings: string;
  general: string;
  style: string;
  darkMode: string;
  tracking: string;
  name: string;
  subject: string;
  subjectHint: string;
  preheader: string;
  preheaderHint: string;
  inboxPreview: string;
  width: string;
  backdrop: string;
  background: string;
  font: string;
  fontSize: string;
  lineHeight: string;
  textColor: string;
  headingColor: string;
  linkColor: string;
  darkModeMode: string;
  darkAuto: string;
  darkCustom: string;
  darkHint: string;
  utmEnabled: string;
  utmHint: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  insertVariable: string;
  modules: string;
  noModules: string;
  moduleName: string;
  saveModule: string;
  columns: (count: number) => string;
  type: string;
  variables: string;
  /** The dock's switch: the canvas filled with the email type's sample. */
  exampleData: string;
  /** Over the canvas while it shows example data. */
  showingExampleData: string;
  /** The inbox preview's two ways: variables as chips, or filled in. */
  showVariables: string;
  darkPreview: string;
  darkPreviewHint: string;
  /** "to {{recipient.email}}" in the inbox header. */
  to: string;
  sendTest: string;
  sendTestTitle: string;
  sendTestHint: string;
  send: string;
  testSent: (address: string) => string;
  searchVariables: string;
  variablesHint: string;
  clickTextFirst: string;
  allVariables: (count: number) => string;
  /** The group of variables of the email's own type. */
  thisEmail: string;
  /** "With example data: 48 characters." */
  characters: (count: number) => string;
  fromThisEmail: string;
  fromThisEmailHint: string;
  sectionNumber: (index: number) => string;
  importHint: string;
  startFrom: string;
  linksInEmail: string;
  noLinks: string;
}
