import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  applyChange,
  createDocument,
  createFragment,
  createStandardRegistry,
  insert,
  kitchenSinkDocument,
  rt,
  update,
  type BuilderDocument,
} from '../core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { embedSource } from './embed-source';
import { styleClasses } from './node-style';
import { ArticleRenderer } from './render';
import { jsonLdString, structuredData } from './structured-data';

const registry = createStandardRegistry();
const resolveMedia = (key: string) => `https://cdn.test/${key}`;

function show(document: BuilderDocument, extra: Record<string, unknown> = {}) {
  return render(
    <ArticleRenderer
      document={document}
      registry={registry}
      resolveMedia={resolveMedia}
      locale="en"
      {...extra}
    />,
  );
}

function withNodes(build: (doc: BuilderDocument) => BuilderDocument): BuilderDocument {
  return build(createDocument({ title: 'T' }));
}

function add(doc: BuilderDocument, type: string, props: Record<string, unknown> = {}) {
  const change = applyChange(doc, (draft) =>
    insert(draft, registry, draft.root, Infinity, createFragment(registry, type, props)),
  );
  return { doc: change.doc, id: change.result[0] ?? '' };
}

describe('the kitchen sink', () => {
  it('renders every element’s content', () => {
    show(kitchenSinkDocument(registry));
    for (const text of [
      'Why buy a used car now',
      'Lower depreciation',
      'Especially diesels',
      'Before you go',
      'Average prices',
      'Key points',
      'Is a diesel worth it?',
      'Walk around',
      'First registered',
      'Cheap to run',
      'Average price',
      'Our verdict',
      'Arben Hoxha',
      'Get a valuation',
      'Contact us',
      'Stay in the loop',
      'Warranty',
      'Petrol',
      'Prices are indicative.',
      'Left column',
      'Inspection checklist',
    ]) {
      expect(screen.getAllByText(text, { exact: false }).length, text).toBeGreaterThan(0);
    }
  });

  it('links the table of contents to the headings it lists', () => {
    const { container } = show(kitchenSinkDocument(registry));
    const toc = screen.getByRole('navigation', { name: 'In this article' });
    for (const link of within(toc).getAllByRole('link')) {
      const target = link.getAttribute('href')?.slice(1) ?? '';
      expect(container.querySelector(`[id="${target}"]`), target).not.toBeNull();
    }
  });

  it('collects footnotes into numbered notes at the end', () => {
    show(kitchenSinkDocument(registry));
    const notes = screen.getByRole('heading', { name: 'Notes' }).closest('section');
    expect(notes).toHaveTextContent('1.Source: our 2026 valuation data.');
  });
});

describe('safety', () => {
  it('never puts an unsafe URL in an href, even from an unchecked document', () => {
    const added = add(createDocument({ title: 'T' }), 'paragraph');
    const id = added.id;
    // Written straight into the node, the way a stale row could arrive.
    const doc = structuredClone(added.doc);
    const node = doc.nodes[id];
    if (node)
      node.props.text = [{ text: 'click', marks: [{ type: 'link', href: 'javascript:alert(1)' }] }];
    const { container } = show(doc);
    // The props fail their schema, so the node is not rendered at all.
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(screen.queryByText('click')).toBeNull();
  });

  it('marks external links noopener', () => {
    const doc = withNodes((base) => {
      const { doc: next, id } = add(base, 'paragraph');
      return applyChange(next, (draft) => {
        update(draft, registry, id, {
          props: {
            text: [{ text: 'out', marks: [{ type: 'link', href: 'https://elsewhere.test' }] }],
          },
        });
      }).doc;
    });
    show(doc);
    const link = screen.getByRole('link', { name: 'out' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not load a pasted picture that was never uploaded', () => {
    const doc = withNodes(
      (base) => add(base, 'image', { pendingUrl: 'https://elsewhere.test/a.jpg', alt: 'A' }).doc,
    );
    const { container } = show(doc);
    expect(container.querySelector('img')).toBeNull();
  });

  it('contacts an embed provider only after the reader asks', async () => {
    const doc = withNodes(
      (base) =>
        add(base, 'embed', {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          provider: 'youtube',
          title: 'Clip',
        }).doc,
    );
    const { container } = show(doc);
    expect(container.querySelector('iframe')).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: /YouTube/ }));
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('uses no dangerouslySetInnerHTML anywhere in the package', () => {
    // Vitest runs from the package root.
    const src = join(process.cwd(), 'src');
    const files: string[] = [];
    const visit = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) visit(path);
        else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.tsx')) files.push(path);
      }
    };
    visit(src);
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('dangerouslySetInnerHTML');
    }
  });
});

describe('visibility', () => {
  it('leaves hidden nodes out of the page', () => {
    const added = add(createDocument({ title: 'T' }), 'paragraph', { text: rt('secret') });
    const doc = applyChange(added.doc, (draft) => {
      update(draft, registry, added.id, { hidden: true });
    }).doc;
    show(doc);
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('turns per-breakpoint styles into range classes', () => {
    expect(styleClasses({ desktop: { paddingY: 'lg' } })).toBe('py-10');
    expect(
      styleClasses({ desktop: { hidden: true }, mobile: { hidden: false } })
        .split(' ')
        .sort(),
    ).toEqual(['lg:hidden', 'sm:max-lg:hidden']);
  });
});

describe('interactive pieces', () => {
  it('moves between tabs with the arrow keys', async () => {
    show(kitchenSinkDocument(registry));
    const user = userEvent.setup();
    const petrol = screen.getByRole('tab', { name: 'Petrol' });
    petrol.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Diesel' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Thriftier.')).toBeVisible();
  });
});

describe('embedSource', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    ['https://vimeo.com/123456', 'https://player.vimeo.com/video/123456?dnt=1'],
    [
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    ],
  ])('%s', (url, src) => {
    expect(embedSource(url)?.src).toBe(src);
  });

  it('refuses what is not on the list', () => {
    expect(embedSource('https://evil.test/embed')).toBeNull();
  });
});

describe('structured data', () => {
  it('adds FAQPage, HowTo and Review when the document holds them', () => {
    const data = structuredData(kitchenSinkDocument(registry), registry, {
      url: 'https://site.test/a',
      resolveMedia,
    });
    expect(data.map((item) => item['@type'])).toEqual(['Article', 'FAQPage', 'HowTo', 'Review']);
  });

  it('escapes script-ending sequences', () => {
    expect(jsonLdString({ name: '</script><b>' })).not.toContain('</script>');
  });
});
