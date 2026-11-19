/**
 * The playground's settings: what the controls choose, kept in this browser
 * only, and turned into the code a developer pastes into their own project.
 */

export type Kit = 'email' | 'article';
export type Theme = 'light' | 'dark' | 'auto';
export type EditorLanguage = 'en' | 'sq' | 'de';

export const TEMPLATES = {
  email: [
    { id: 'starter', label: 'Starter' },
    { id: 'kitchen-sink', label: 'Every block' },
    { id: 'empty', label: 'Empty' },
  ],
  article: [
    { id: 'kitchen-sink', label: 'Every element' },
    { id: 'empty', label: 'Empty' },
  ],
} as const satisfies Record<Kit, readonly { id: string; label: string }[]>;

export type TemplateId = (typeof TEMPLATES)[Kit][number]['id'];

export const EDITOR_LANGUAGES: { code: EditorLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'sq', label: 'Shqip' },
  { code: 'de', label: 'Deutsch' },
];

/** The languages a document can be written in, when "several" is chosen. */
export const SEVERAL_CONTENT_LANGUAGES = ['en', 'de', 'fr'];

export const FONTS = [
  { label: 'The editor’s own', value: '' },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

export interface Settings {
  kit: Kit;
  template: Record<Kit, TemplateId>;
  theme: Theme;
  /** The page's own `dark` class, which `theme="auto"` follows. */
  pageDark: boolean;
  primary: string;
  radius: string;
  font: string;
  language: EditorLanguage;
  severalContentLanguages: boolean;
  output: 'json' | 'html' | 'text' | 'page';
  showOutput: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  kit: 'email',
  template: { email: 'starter', article: 'kitchen-sink' },
  theme: 'auto',
  pageDark: false,
  primary: '',
  radius: '',
  font: '',
  language: 'en',
  severalContentLanguages: false,
  output: 'json',
  showOutput: true,
};

const SETTINGS_KEY = 'builderset-playground:settings';
const documentKey = (kit: Kit, template: string) => `builderset-playground:${kit}:${template}`;

/** localStorage can be missing or refuse (a private window): the playground works without it. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      template: { ...DEFAULT_SETTINGS.template, ...saved.template },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings): void {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Full or refused: the settings simply do not survive a reload.
  }
}

export function readDocument(kit: Kit, template: string): unknown {
  try {
    const raw = storage()?.getItem(documentKey(kit, template));
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeDocument(kit: Kit, template: string, document: unknown): void {
  try {
    storage()?.setItem(documentKey(kit, template), JSON.stringify(document));
  } catch {
    // A document with large pasted pictures may not fit: it lives in memory only.
  }
}

export function forgetDocument(kit: Kit, template: string): void {
  try {
    storage()?.removeItem(documentKey(kit, template));
  } catch {
    // Nothing to forget.
  }
}

/** The theme variables the controls set, as `tokens` takes them. */
export function tokensOf(settings: Settings): Record<string, string> | undefined {
  const tokens: Record<string, string> = {};
  if (settings.primary) tokens.primary = settings.primary;
  if (settings.radius) tokens.radius = settings.radius;
  if (settings.font) tokens.font = settings.font;
  return Object.keys(tokens).length ? tokens : undefined;
}

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** The editor, with the current settings, as JSX to paste into a project. */
export function jsxFor(settings: Settings): string {
  const name = settings.kit === 'email' ? 'EmailEditor' : 'ArticleEditor';
  const lines = [
    `<${name}`,
    '  document={document}',
    ...(settings.kit === 'email' ? ['  registry={registry}'] : []),
    '  host={host}',
    ...(settings.kit === 'email' ? ['  type={null}', '  brand={DEFAULT_BRAND}'] : []),
    '  record={record}',
    '  onBack={() => history.back()}',
    `  theme=${JSON.stringify(settings.theme)}`,
  ];
  const tokens = tokensOf(settings);
  if (tokens) {
    const entries = Object.entries(tokens).map(([key, value]) => `${key}: ${quote(value)}`);
    lines.push(`  tokens={{ ${entries.join(', ')} }}`);
  }
  if (settings.language !== 'en') {
    lines.push(`  locale=${JSON.stringify(settings.language)}`, '  locales={{ sq, de }}');
  }
  if (settings.severalContentLanguages) {
    lines.push(`  contentLocales={[${SEVERAL_CONTENT_LANGUAGES.map(quote).join(', ')}]}`);
  }
  lines.push('/>');
  return lines.join('\n');
}

/** The same theme as CSS: a project that sets its colours in a stylesheet. */
export function cssFor(settings: Settings): string {
  const tokens = tokensOf(settings);
  if (!tokens) return '/* The editor’s own look: no variable is set. */';
  const lines = Object.entries(tokens).map(([key, value]) => `  --builderset-${key}: ${value};`);
  return `.builderset {\n${lines.join('\n')}\n}`;
}
