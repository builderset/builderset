import type { EmailEditor } from '@builderset/email/editor';
import type { ComponentProps } from 'react';

type ThemeMode = NonNullable<ComponentProps<typeof EmailEditor>['theme']>;

/** What the bar sets, kept in the address so a test can open any case directly. */
export interface Settings {
  theme: ThemeMode;
  /** The page's own `dark` class on <html>, which theme="auto" follows. */
  pageDark: boolean;
  /** A brand colour passed as `tokens.primary`. */
  primary: string;
  /** A brand colour set on the page's root as --builderset-primary, in CSS. */
  rootPrimary: string;
  /** The editor's language. */
  lang: 'en' | 'sq' | 'de';
}

export function readSettings(): Settings {
  const q = new URLSearchParams(location.search);
  const theme = q.get('theme');
  return {
    theme: theme === 'dark' || theme === 'auto' ? theme : 'light',
    pageDark: q.get('pageDark') === '1',
    primary: q.get('primary') ?? '',
    rootPrimary: q.get('rootPrimary') ?? '',
    lang: q.get('lang') === 'sq' || q.get('lang') === 'de' ? (q.get('lang') as 'sq' | 'de') : 'en',
  };
}

export function writeSettings(s: Settings): void {
  const q = new URLSearchParams();
  if (s.theme !== 'light') q.set('theme', s.theme);
  if (s.pageDark) q.set('pageDark', '1');
  if (s.primary) q.set('primary', s.primary);
  if (s.rootPrimary) q.set('rootPrimary', s.rootPrimary);
  if (s.lang !== 'en') q.set('lang', s.lang);
  const search = q.toString();
  history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}`);
}

/** The page-level effects: the `dark` class and the root variable. */
export function applyToPage(s: Settings): void {
  document.documentElement.classList.toggle('dark', s.pageDark);
  if (s.rootPrimary)
    document.documentElement.style.setProperty('--builderset-primary', s.rootPrimary);
  else document.documentElement.style.removeProperty('--builderset-primary');
}
