import {
  applyChange,
  createFragment,
  insert,
  update,
  defineElement,
  rt,
  readingMinutes,
  hasErrors,
  structuralIssues,
} from '@builderset/engine';
import { checkArticle, articleSchema } from './check';
import { createArticleDocument, type ArticleDocument } from './document';
import { outline } from './outline';
import { parseArticle, serializeArticle } from './parse';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createArticleRegistry } from './elements';
import { kitchenSinkDocument } from './kitchen-sink';

const registry = createArticleRegistry();

function codes(doc: ArticleDocument) {
  return checkArticle(doc, registry).map((issue) => `${issue.severity}:${issue.code}`);
}

function withBlocks(...types: string[]): { doc: ArticleDocument; ids: string[] } {
  let doc = createArticleDocument({
    title: 'T',
    excerpt: 'An excerpt long enough to be a description here.',
  });
  const ids: string[] = [];
  for (const type of types) {
    const change = applyChange(doc, (draft) =>
      insert(draft, registry, draft.root, Infinity, createFragment(registry, type)),
    );
    doc = change.doc;
    ids.push(...change.result);
  }
  return { doc, ids };
}

describe('the kitchen sink', () => {
  const doc = kitchenSinkDocument(registry);

  it('holds every insertable standard element', () => {
    const types = new Set(Object.values(doc.nodes).map((node) => node.type));
    for (const definition of registry.all()) expect(types).toContain(definition.type);
  });

  it('passes the full schema and has no errors', () => {
    expect(articleSchema(registry).safeParse(doc).success).toBe(true);
    const errors = checkArticle(doc, registry).filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('survives a serialize → parse round trip unchanged', () => {
    const parsed = parseArticle(serializeArticle(doc), registry);
    expect(parsed.ok).toBe(true);
    expect(parsed.doc).toEqual(doc);
    expect(parsed.migrated).toBe(false);
  });
});

describe('structure', () => {
  it('finds an orphan node and a missing child', () => {
    const { doc } = withBlocks('paragraph');
    const broken = structuredClone(doc);
    broken.nodes.ghost = {
      id: 'ghost',
      type: 'paragraph',
      v: 1,
      props: { text: [], dropCap: false, lead: false },
    };
    broken.nodes.root?.children?.push('missing');
    const found = structuralIssues(broken, registry).map((issue) => issue.code);
    expect(found).toContain('document.orphan');
    expect(found).toContain('document.missingChild');
  });

  it('finds a child placed where it may not go', () => {
    const { doc, ids } = withBlocks('columns');
    const broken = structuredClone(doc);
    const column = broken.nodes[ids[0] ?? '']?.children?.[0] ?? '';
    broken.nodes.root?.children?.push(column);
    const found = structuralIssues(broken, registry).map((issue) => issue.code);
    expect(found).toContain('placement.notAllowed');
    expect(found).toContain('document.duplicateReference');
  });

  it('finds duplicate anchors', () => {
    const { doc, ids } = withBlocks('heading', 'heading');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { anchor: 'same' });
      update(draft, registry, ids[1] ?? '', { anchor: 'same' });
    }).doc;
    expect(codes(next)).toContain('error:anchor.duplicate');
  });
});

describe('editorial checks', () => {
  it('warns about a missing alt text and an empty paragraph', () => {
    const { doc, ids } = withBlocks('image', 'paragraph');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { props: { media: { key: 'articles/a.jpg' } } });
    }).doc;
    expect(codes(next)).toContain('warning:image.altMissing');
  });

  it('warns when a heading skips a level', () => {
    const { doc, ids } = withBlocks('heading', 'heading');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { props: { level: 2, text: rt('A') } });
      update(draft, registry, ids[1] ?? '', { props: { level: 4, text: rt('B') } });
    }).doc;
    expect(codes(next)).toContain('warning:heading.skipped');
  });

  it('errors on media that was never uploaded, and blocks publishing', () => {
    const { doc, ids } = withBlocks('image');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', {
        props: { pendingUrl: 'https://elsewhere.test/a.jpg', alt: 'x' },
      });
    }).doc;
    expect(codes(next)).toContain('error:media.external');
    expect(hasErrors(checkArticle(next, registry))).toBe(true);
  });

  it('errors on an embed from a provider that is not allowed', () => {
    const { doc, ids } = withBlocks('embed');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { props: { url: 'https://evil.test/video' } });
    }).doc;
    expect(codes(next)).toContain('error:embed.notAllowed');
  });

  it('errors on a footnote reference to nothing', () => {
    const { doc, ids } = withBlocks('paragraph');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', {
        props: { text: [{ text: '1', marks: [{ type: 'footnote', ref: 'nowhere' }] }] },
      });
    }).doc;
    expect(codes(next)).toContain('error:footnote.missing');
  });

  it('ignores hidden nodes', () => {
    const { doc, ids } = withBlocks('image');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { hidden: true });
    }).doc;
    expect(codes(next).filter((code) => code.includes('media'))).toEqual([]);
  });
});

describe('reading', () => {
  it('estimates minutes from the words, and honours an override', () => {
    const { doc, ids } = withBlocks('paragraph');
    const words = Array.from({ length: 660 }, () => 'word').join(' ');
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { props: { text: rt(words) } });
    }).doc;
    expect(readingMinutes(next, registry)).toBe(3);
    expect(readingMinutes({ ...next, meta: { ...next.meta, readingMinutes: 9 } }, registry)).toBe(
      9,
    );
  });

  it('gives every heading a unique anchor for the table of contents', () => {
    const { doc, ids } = withBlocks('heading', 'heading');
    const next = applyChange(doc, (draft) => {
      for (const id of ids) update(draft, registry, id, { props: { text: rt('Price') } });
    }).doc;
    expect(outline(next).map((entry) => entry.anchor)).toEqual(['price', 'price-2']);
  });
});

describe('parseArticle', () => {
  it('refuses a document from a newer version', () => {
    const doc = { ...createArticleDocument({ title: 'T' }), version: 99 };
    expect(parseArticle(doc, registry).issues[0]?.code).toBe('document.fromTheFuture');
  });

  it('refuses something that is not a document', () => {
    expect(parseArticle('not json', registry).ok).toBe(false);
    expect(parseArticle({ schema: 'other' }, registry).issues[0]?.code).toBe('document.malformed');
  });

  it('walks an old element forward through its own migrations', () => {
    const note = defineElement({
      type: 'note',
      version: 2,
      category: 'plugin',
      icon: 'sticky-note',
      schema: z.object({ body: z.string() }),
      defaults: () => ({ body: '' }),
      // Version 1 called the field `text`.
      migrate: (from, props) =>
        from === 1 ? { body: (props as { text?: string }).text ?? '' } : props,
    });
    const local = createArticleRegistry([note as never]);
    const doc = createArticleDocument({ title: 'T' });
    doc.nodes.root?.children?.push('old');
    doc.nodes.old = { id: 'old', type: 'note', v: 1, props: { text: 'kept' } };

    const parsed = parseArticle(doc, local);
    expect(parsed.migrated).toBe(true);
    expect(parsed.doc?.nodes.old).toMatchObject({ v: 2, props: { body: 'kept' } });
  });
});
