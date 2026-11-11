import { rt } from '@motors/engine';
import type { BuilderHost } from '@motors/engine/editor';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createArticleDocument, createArticleRegistry, type ArticleDocument } from '../core';
import { sq } from '../locales/sq';
import { ArticleEditor } from './editor';
import type { ArticleFacts } from './hooks';

const registry = createArticleRegistry();

function host(overrides: Partial<BuilderHost<ArticleDocument>> = {}): BuilderHost<ArticleDocument> {
  return {
    upload: vi.fn(),
    resolveMedia: (key) => `https://cdn.test/${key}`,
    save: vi.fn(() => Promise.resolve({ ok: true as const, savedAt: new Date().toISOString() })),
    publish: vi.fn(() => Promise.resolve({ ok: true as const, savedAt: new Date().toISOString() })),
    toast: vi.fn(),
    ...overrides,
  };
}

const facts: ArticleFacts = {
  slug: 'test',
  status: 'draft',
  category: 'News',
  categories: ['News'],
  featured: false,
  scheduledAt: null,
  publishedAt: null,
  locale: 'en',
};

function mount(adapter = host(), document = createArticleDocument({ title: 'An article' })) {
  return render(
    <ArticleEditor
      document={document}
      registry={registry}
      host={adapter}
      record={facts}
      onRecordChange={() => undefined}
      onBack={() => undefined}
    />,
  );
}

describe('<ArticleEditor>', () => {
  it('opens on an empty article with its title and the element library', () => {
    mount();
    expect(screen.getByLabelText('Title', { selector: 'textarea' })).toHaveValue('An article');
    expect(screen.getByText('An empty page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paragraph/ })).toBeInTheDocument();
  });

  it('inserts a block from the library and undoes it', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: /^Heading/ }));
    await waitFor(() => {
      expect(document.querySelector('[data-node] h2, h2[data-node]')).not.toBeNull();
    });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      expect(screen.getByText('An empty page')).toBeInTheDocument();
    });
  });

  it('refuses to publish a document with errors and says why', async () => {
    const user = userEvent.setup();
    const publish = vi.fn(() =>
      Promise.resolve({ ok: true as const, savedAt: new Date().toISOString() }),
    );
    const adapter = host({ publish });
    const doc = createArticleDocument({ title: '' });
    doc.nodes.p1 = {
      id: 'p1',
      type: 'paragraph',
      v: 1,
      props: {
        text: [{ text: 'x', marks: [{ type: 'link', href: 'https://ok.test' }] }, ...rt(' words')],
        dropCap: false,
        lead: false,
      },
    };
    doc.nodes[doc.root]?.children?.push('p1');
    mount(adapter, doc);
    await user.click(screen.getByRole('button', { name: /^Publish$/ }));
    expect(publish).not.toHaveBeenCalled();
    expect(await screen.findByText(/Fix these before publishing/)).toBeInTheDocument();
  });

  it('speaks English unless it is given another language', () => {
    const { unmount } = mount();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Heading/ })).toBeInTheDocument();
    unmount();
    render(
      <ArticleEditor
        document={createArticleDocument({ title: 'Një artikull' })}
        registry={registry}
        host={host()}
        locale="sq-AL"
        locales={{ sq }}
        record={facts}
        onRecordChange={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: sq.engine.undo })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${sq.elements.heading?.name ?? ''}`) }),
    ).toBeInTheDocument();
  });
});
