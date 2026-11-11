'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** The tabs of the Document settings panel. */
export type SettingsTab = 'general' | 'seo' | 'publishing';

/**
 * The built-in fields, by tab, in the order they are shown — what a section's
 * `before` can name.
 */
export const SETTINGS_FIELDS = {
  general: ['languages', 'title', 'slug', 'excerpt', 'cover', 'coverAlt'],
  seo: [
    'preview',
    'seoTitle',
    'seoDescription',
    'focusKeyword',
    'canonical',
    'socialImage',
    'noindex',
  ],
  publishing: ['readingMinutes', 'publishAt'],
} as const satisfies Record<SettingsTab, readonly string[]>;

export type SettingsField = (typeof SETTINGS_FIELDS)[SettingsTab][number];

/**
 * A project's own fields in Document settings — the columns its article table
 * has beyond the document: a category, a "featured" flag, an author.
 *
 * `render` runs inside the editor: read and change the row's facts with
 * `useRecord()` from `@motors/engine/editor` (a change marks the work unsaved),
 * and use `SettingsFieldRow` for the label so the field looks like the others.
 */
export interface SettingsSection {
  id: string;
  /** Which tab it is shown in. */
  tab: SettingsTab;
  /** Shown just above this built-in field; omit to show it at the end of the tab. */
  before?: SettingsField | undefined;
  render: () => ReactNode;
}

export interface ArticleSettingsOptions {
  /**
   * Where articles are published, shown in the slug field and the search
   * preview: `https://example.com/blog`. Omit it and they show the slug alone.
   */
  siteUrl?: string | undefined;
  settingsSections?: readonly SettingsSection[] | undefined;
}

const ArticleSettingsContext = createContext<ArticleSettingsOptions>({});
export const ArticleSettingsProvider = ArticleSettingsContext.Provider;

export function useArticleSettings(): ArticleSettingsOptions {
  return useContext(ArticleSettingsContext);
}

/** `https://example.com/blog` → `example.com › blog`; nothing without an address. */
export function breadcrumbOf(siteUrl: string | undefined): string[] {
  if (!siteUrl) return [];
  return siteUrl
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .split(/[/?#]/)
    .filter(Boolean);
}

/** `https://example.com/blog` → `/blog`. */
export function pathOf(siteUrl: string | undefined): string {
  return breadcrumbOf(siteUrl)
    .slice(1)
    .map((part) => `/${part}`)
    .join('');
}
