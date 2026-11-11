import { checkArticle } from './check';
import { createArticleDocument, type ArticleDocument } from './document';
import { ARTICLE_DRAFT_TOLERATES, isDraftBlocking, isPublishBlocking } from './draft';
import { toArticleJSONSchema } from './schema';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createArticleRegistry } from './elements';
import { kitchenSinkDocument } from './kitchen-sink';

/**
 * The CONTRACT with the server, as files.
 *
 * `schema/article.schema.json` and `fixtures/` are committed, and this
 * package's alone: a backend copies them (MotorsAL's API by `scripts/sync-builder-contract.mjs`).
 * Its contract test reads them: every valid fixture must be accepted, every
 * invalid one refused with the code the manifest names, and a draft lenient
 * on exactly the codes in `draft.json`. This test
 * keeps the files honest — it regenerates them in memory and fails when the
 * committed copy differs. Run with `UPDATE_FIXTURES=1` to rewrite them after
 * an intentional change, and commit the result alongside the change.
 */

const registry = createArticleRegistry();
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const update = process.env.UPDATE_FIXTURES === '1';

function stable(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function expectFile(relative: string, content: string) {
  const path = join(root, relative);
  if (update) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return;
  }
  let committed = '';
  try {
    committed = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    throw new Error(`${relative} is missing — run the tests with UPDATE_FIXTURES=1 and commit it.`);
  }
  expect(committed, `${relative} is stale — run with UPDATE_FIXTURES=1`).toBe(content);
}

function expectFixture(relative: string, content: string) {
  expectFile(`fixtures/${relative}`, content);
}

/** A small valid document to break in one specific way per invalid fixture. */
function base(): ArticleDocument {
  const doc = createArticleDocument({ title: 'Broken on purpose' });
  doc.nodes.root = { id: 'root', type: 'root', v: 1, props: {}, children: ['n1'] };
  doc.nodes.n1 = {
    id: 'n1',
    type: 'paragraph',
    v: 1,
    props: { text: [{ text: 'Hello' }], dropCap: false, lead: false },
  };
  return doc;
}

const INVALID: Record<string, { code: string; build: () => ArticleDocument }> = {
  'unsafe-link': {
    code: 'url.unsafe',
    build: () => {
      const doc = base();
      if (doc.nodes.n1) {
        doc.nodes.n1.props.text = [
          { text: 'x', marks: [{ type: 'link', href: 'javascript:alert(1)' }] },
        ];
      }
      return doc;
    },
  },
  orphan: {
    code: 'document.orphan',
    build: () => {
      const doc = base();
      doc.nodes.n2 = { id: 'n2', type: 'divider', v: 1, props: { variant: 'line', width: 'full' } };
      return doc;
    },
  },
  'column-in-root': {
    code: 'placement.notAllowed',
    build: () => {
      const doc = base();
      doc.nodes.root?.children?.push('n2');
      doc.nodes.n2 = { id: 'n2', type: 'column', v: 1, props: { span: 6 }, children: [] };
      return doc;
    },
  },
  'unknown-element': {
    code: 'element.unknown',
    build: () => {
      const doc = base();
      doc.nodes.root?.children?.push('n2');
      doc.nodes.n2 = { id: 'n2', type: 'marquee', v: 1, props: {} };
      return doc;
    },
  },
  'duplicate-anchor': {
    code: 'anchor.duplicate',
    build: () => {
      const doc = base();
      doc.nodes.root?.children?.push('n2');
      const first = doc.nodes.n1;
      if (!first) throw new Error('base() lost its paragraph');
      first.anchor = 'same';
      doc.nodes.n2 = { ...structuredClone(first), id: 'n2' };
      return doc;
    },
  },
  'external-media': {
    code: 'media.external',
    build: () => {
      const doc = base();
      doc.nodes.root?.children?.push('n2');
      doc.nodes.n2 = {
        id: 'n2',
        type: 'image',
        v: 1,
        props: {
          ...registry.require('image').defaults(),
          pendingUrl: 'https://elsewhere.test/a.jpg',
          alt: 'A',
        },
      };
      return doc;
    },
  },
  'embed-not-allowed': {
    code: 'embed.notAllowed',
    build: () => {
      const doc = base();
      doc.nodes.root?.children?.push('n2');
      doc.nodes.n2 = {
        id: 'n2',
        type: 'embed',
        v: 1,
        props: { url: 'https://evil.test/v', provider: null, title: '', caption: '' },
      };
      return doc;
    },
  },
  'missing-title': {
    code: 'meta.titleMissing',
    build: () => ({ ...base(), meta: { title: '' } }),
  },
};

describe('the server contract', () => {
  it('commits the JSON Schema of the standard document', () => {
    const schema = stable(toArticleJSONSchema(registry));
    expectFile('schema/article.schema.json', schema);
  });

  it('commits the codes a draft may still carry', () => {
    // An unfinished article saves; an unsafe one never does.
    const missingTitle = checkArticle(INVALID['missing-title']?.build() ?? base(), registry);
    expect(missingTitle.some(isDraftBlocking)).toBe(false);
    expect(missingTitle.some(isPublishBlocking)).toBe(true);
    const unsafe = checkArticle(INVALID['unsafe-link']?.build() ?? base(), registry);
    expect(unsafe.some(isDraftBlocking)).toBe(true);
    expectFixture('draft.json', stable({ tolerates: ARTICLE_DRAFT_TOLERATES }));
  });

  it('commits valid fixtures the checker accepts', () => {
    const valid: Record<string, ArticleDocument> = {
      'kitchen-sink': kitchenSinkDocument(registry),
      empty: createArticleDocument({ title: 'Empty' }),
    };
    for (const [name, doc] of Object.entries(valid)) {
      const errors = checkArticle(doc, registry).filter((issue) => issue.severity === 'error');
      expect(errors, name).toEqual([]);
      expectFixture(`valid/${name}.json`, stable(doc));
    }
  });

  it('commits invalid fixtures, each refused with its named code', () => {
    const manifest: Record<string, string> = {};
    for (const [name, { code, build }] of Object.entries(INVALID)) {
      const doc = build();
      const found = checkArticle(doc, registry)
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.code);
      expect(found, name).toContain(code);
      manifest[`${name}.json`] = code;
      expectFixture(`invalid/${name}.json`, stable(doc));
    }
    expectFixture('invalid/manifest.json', stable(manifest));
  });
});
