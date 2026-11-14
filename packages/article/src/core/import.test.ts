import {
  copyNodes,
  CLIPBOARD_MIME,
  type Fragment,
  applyChange,
  createFragment,
  insert,
  update,
  rt,
} from '@builderset/engine';
import { readClipboard } from './paste';
import { createArticleDocument } from './document';
import { describe, expect, it } from 'vitest';

import { createArticleRegistry } from './elements';
import { importHTML } from './import-html';
import { importMarkdown, inlineMarkdown, looksLikeMarkdown } from './import-markdown';

const registry = createArticleRegistry();

/** The roots of a fragment as `type` → props, for compact assertions. */
function shapes(fragment: Fragment) {
  return fragment.roots.map((id) => {
    const node = fragment.nodes[id];
    return { type: node?.type, props: node?.props };
  });
}

describe('importHTML', () => {
  it('keeps structure and inline marks, drops everything else', () => {
    const fragment = importHTML(
      `<h1>Title</h1>
       <p style="color:red">Plain <strong>bold</strong> <a href="/x" target="_blank">link</a>
         <a href="javascript:alert(1)">bad</a></p>
       <script>alert(1)</script>
       <ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>
       <blockquote>Said</blockquote>
       <pre>code here\n</pre>
       <hr>`,
      registry,
    );
    const [heading, paragraph, list, quote, code, divider] = shapes(fragment);
    expect(heading).toMatchObject({ type: 'heading', props: { level: 2, text: rt('Title') } });
    expect(paragraph?.props?.text).toEqual([
      { text: 'Plain ' },
      { text: 'bold', marks: [{ type: 'bold' }] },
      { text: ' ' },
      { text: 'link', marks: [{ type: 'link', href: '/x', newTab: true }] },
      { text: ' bad' },
    ]);
    expect(list?.props?.items).toEqual([
      { text: rt('One') },
      { text: rt('Two'), children: [{ text: rt('Nested') }] },
    ]);
    expect(quote?.type).toBe('quote');
    expect(code).toMatchObject({ type: 'code', props: { code: 'code here' } });
    expect(divider?.type).toBe('divider');
    expect(fragment.roots).toHaveLength(6);
  });

  it("reads Google Docs' un-bold wrapper as not bold", () => {
    const fragment = importHTML(
      '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span style="font-weight:700">Hi</span> there</p></b>',
      registry,
    );
    expect(shapes(fragment)[0]?.props?.text).toEqual([
      { text: 'Hi', marks: [{ type: 'bold' }] },
      { text: ' there' },
    ]);
  });

  it("turns Word's bullet paragraphs into one list", () => {
    const fragment = importHTML(
      `<p class="MsoListParagraphCxSpFirst"><span style="mso-list:Ignore">·</span>First</p>
       <p class="MsoListParagraphCxSpLast"><span style="mso-list:Ignore">·</span>Second</p>`,
      registry,
    );
    expect(shapes(fragment)).toHaveLength(1);
    expect(shapes(fragment)[0]).toMatchObject({
      type: 'list',
      props: { items: [{ text: rt('First') }, { text: rt('Second') }] },
    });
  });

  it('keeps a pasted image as pending until it is uploaded', () => {
    const fragment = importHTML(
      '<figure><img src="https://x.test/a.jpg" alt="A"><figcaption>Cap</figcaption></figure>',
      registry,
    );
    expect(shapes(fragment)[0]).toMatchObject({
      type: 'image',
      props: { pendingUrl: 'https://x.test/a.jpg', alt: 'A', caption: rt('Cap') },
    });
  });

  it('reads a table, header row included', () => {
    const fragment = importHTML(
      '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td></tr></table>',
      registry,
    );
    expect(shapes(fragment)[0]).toMatchObject({
      type: 'table',
      props: {
        headerRow: true,
        rows: [
          [rt('A'), rt('B')],
          [rt('1'), []],
        ],
      },
    });
  });
});

describe('importMarkdown', () => {
  it('reads headings, lists, tasks, quotes, code and tables', () => {
    const fragment = importMarkdown(
      [
        '# Title',
        '',
        'Some **bold** and `code` and [a link](https://x.test).',
        '',
        '- one',
        '  - nested',
        '- two',
        '',
        '- [x] done',
        '- [ ] todo',
        '',
        '> quoted',
        '',
        '```ts',
        'const a = 1;',
        '```',
        '',
        '| A | B |',
        '|---|--:|',
        '| 1 | 2 |',
        '',
        '---',
      ].join('\n'),
      registry,
    );
    const types = shapes(fragment).map((shape) => shape.type);
    expect(types).toEqual([
      'heading',
      'paragraph',
      'list',
      'list',
      'quote',
      'code',
      'table',
      'divider',
    ]);
    const [, paragraph, bullets, tasks, , code, table] = shapes(fragment);
    expect(paragraph?.props?.text).toEqual([
      { text: 'Some ' },
      { text: 'bold', marks: [{ type: 'bold' }] },
      { text: ' and ' },
      { text: 'code', marks: [{ type: 'code' }] },
      { text: ' and ' },
      { text: 'a link', marks: [{ type: 'link', href: 'https://x.test' }] },
      { text: '.' },
    ]);
    expect(bullets?.props?.items).toEqual([
      { text: rt('one'), children: [{ text: rt('nested') }] },
      { text: rt('two') },
    ]);
    expect(tasks?.props).toMatchObject({
      style: 'check',
      items: [{ checked: true }, { checked: false }],
    });
    expect(code?.props).toMatchObject({ language: 'typescript', code: 'const a = 1;' });
    expect(table?.props).toMatchObject({ align: ['start', 'end'] });
  });

  it('nests marks', () => {
    expect(inlineMarkdown('**bold _both_**')).toEqual([
      { text: 'bold ', marks: [{ type: 'bold' }] },
      { text: 'both', marks: [{ type: 'bold' }, { type: 'italic' }] },
    ]);
  });

  it('tells Markdown from plain text', () => {
    expect(looksLikeMarkdown('# Heading')).toBe(true);
    expect(looksLikeMarkdown('Just a sentence.')).toBe(false);
  });
});

describe('clipboard', () => {
  it('round-trips nodes between builders with fresh ids', () => {
    let doc = createArticleDocument({ title: 'T' });
    const change = applyChange(doc, (draft) =>
      insert(draft, registry, draft.root, 0, createFragment(registry, 'section')),
    );
    doc = change.doc;
    const payload = copyNodes(doc, change.result, registry);
    const fragment = readClipboard({ json: payload[CLIPBOARD_MIME] }, registry);
    expect(fragment?.roots).toHaveLength(1);
    expect(fragment?.roots[0]).not.toBe(change.result[0]);
    expect(fragment?.nodes[fragment.roots[0] ?? '']?.type).toBe('section');
  });

  it('drops elements this builder does not know', () => {
    const json = JSON.stringify({
      schema: 'builder/fragment',
      version: 1,
      fragment: {
        roots: ['a', 'b'],
        nodes: {
          a: { id: 'a', type: 'alien', v: 1, props: {} },
          b: { id: 'b', type: 'divider', v: 1, props: { variant: 'line', width: 'full' } },
        },
      },
    });
    expect(
      shapes(readClipboard({ json }, registry) ?? { roots: [], nodes: {} }).map((s) => s.type),
    ).toEqual(['divider']);
  });

  it('escapes text in the HTML it offers other programs', () => {
    let doc = createArticleDocument({ title: 'T' });
    const change = applyChange(doc, (draft) =>
      insert(draft, registry, draft.root, 0, createFragment(registry, 'paragraph')),
    );
    doc = applyChange(change.doc, (draft) => {
      update(draft, registry, change.result[0] ?? '', {
        props: { text: rt('<script>x</script>') },
      });
    }).doc;
    const html = copyNodes(doc, change.result, registry)['text/html'];
    expect(html).not.toContain('<script>');
  });

  it('splits plain text into paragraphs', () => {
    const fragment = readClipboard({ text: 'One.\n\nTwo.' }, registry);
    expect(fragment?.roots).toHaveLength(2);
  });
});
