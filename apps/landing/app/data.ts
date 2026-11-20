import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { de } from '@builderset/email/locales/de';
import { en } from '@builderset/email/locales/en';
import { sq } from '@builderset/email/locales/sq';

import type { HeroBlock } from '@/components/hero-build';

/*
 * Everything this page says about the kits is read from the kits, at build
 * time: the version, the starter email, the editor's words, the issue texts.
 */

const read = (path: string) =>
  readFileSync(
    /*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ process.cwd(), path),
    'utf8',
  );

export const VERSION = (
  JSON.parse(read('../../packages/email/package.json')) as { version: string }
).version;

interface Node {
  type: string;
  props: Record<string, unknown>;
}

/** The props the hero shows for each block of the starter: a few, in the fixture's words. */
const SHOWN: Record<string, string[]> = {
  logo: ['width', 'align', 'href'],
  heading: ['weight', 'text'],
  text: ['text'],
  button: ['label', 'href', 'background'],
  divider: ['color', 'thickness', 'style'],
  footer: ['text'],
};

const print = (value: unknown): string => {
  const json = JSON.stringify(value);
  return json.length > 30 ? `${json.slice(0, 26)}…${json.startsWith('[') ? ']' : ''}` : json;
};

/** The starter email's blocks, top to bottom, as the hero draws them. */
export function heroBlocks(): HeroBlock[] {
  const starter = JSON.parse(read('../../packages/email/fixtures/valid/starter.json')) as {
    nodes: Record<string, Node>;
  };
  return Object.entries(starter.nodes)
    .filter(([, node]) => node.type in SHOWN)
    .map(([id, node]) => ({
      id,
      type: node.type,
      props: (SHOWN[node.type] ?? []).map((key): [string, string] => [key, print(node.props[key])]),
    }));
}

type Words = Record<string, unknown>;
const word = (locale: typeof en, key: string): string => {
  const own = (locale.workspace as Words)[key];
  const value = own ?? (locale.engine as unknown as Words)[key];
  return typeof value === 'string' ? value : '';
};

/** A few of the editor's words in each language it ships. */
export function editorWords() {
  const languages = [
    { code: 'en', name: 'English', locale: en },
    { code: 'sq', name: 'Shqip', locale: sq },
    { code: 'de', name: 'Deutsch', locale: de },
  ];
  const rows = [
    { key: 'publish', note: 'publish' },
    { key: 'saveDraft', note: 'saveDraft' },
    { key: 'preview', note: 'preview' },
    { key: 'undo', note: 'undo' },
    { key: 'saveIdle', note: 'saveIdle' },
  ];
  return {
    languages: languages.map(({ code, name }) => ({ code, name })),
    rows: [
      ...rows.map((row) => ({
        key: row.note,
        words: languages.map(({ locale }) => word(locale, row.key)),
      })),
      {
        key: 'elements.button',
        words: languages.map(({ locale }) => locale.elements.button.name),
      },
    ],
  };
}

/** Issue codes a save can be refused with, and the editor's English for them. */
export function issues() {
  const text = (en.workspace as { issueText?: Record<string, string> }).issueText ?? {};
  return [
    'meta.subjectMissing',
    'compliance.unsubscribeMissing',
    'variable.unknown',
    'url.unsafe',
    'image.altMissing',
  ].map((code) => ({ code, text: text[code] ?? code }));
}
