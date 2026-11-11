import type { BuilderHost, RecordFacts } from '@motors/engine/editor';
import {
  createEmailDocument,
  createEmailRegistry,
  starterEmail,
  type EmailDocument,
  type EmailType,
} from '../core';
import { DEFAULT_BRAND } from '../render';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmailEditor } from './editor';

const registry = createEmailRegistry();

const type: EmailType = {
  key: 'password_reset',
  label: { en: 'Password reset' },
  category: 'account',
  kind: 'transactional',
  variables: [{ name: 'reset_url', label: { en: 'Reset link' }, type: 'url', required: true }],
  mustUse: ['reset_url'],
  samples: { default: { reset_url: 'https://example.com/reset' } },
};

const record: RecordFacts = { status: 'draft', scheduledAt: null, publishedAt: null };

function host(): BuilderHost<EmailDocument> {
  return {
    locale: 'en',
    contentLocale: 'en',
    upload: vi.fn(),
    resolveMedia: (key) => `https://cdn.test/${key}`,
    save: vi.fn(() => Promise.resolve({ ok: true as const, savedAt: new Date().toISOString() })),
    publish: vi.fn(() => Promise.resolve({ ok: true as const, savedAt: new Date().toISOString() })),
    toast: vi.fn(),
  };
}

function mount(document = starterEmail(registry, { name: 'Reset design', subject: 'Reset' })) {
  return render(
    <EmailEditor
      document={document}
      registry={registry}
      host={host()}
      type={type}
      brand={DEFAULT_BRAND}
      record={record}
      onRecordChange={() => undefined}
      onBack={() => undefined}
    />,
  );
}

describe('<EmailEditor>', () => {
  it('draws the email and names the design', () => {
    const { container } = mount();
    expect(screen.getByText('Reset design')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-node]').length).toBeGreaterThan(5);
    // Email settings, not the article's, when nothing is selected.
    expect(screen.getByText('Email settings')).toBeInTheDocument();
  });

  it('adds a structure as a new section', async () => {
    const user = userEvent.setup();
    const { container } = mount(createEmailDocument({ name: 'Blank', subject: 'x' }));
    await user.click(screen.getByRole('button', { name: /2 columns · 50\/50/ }));
    await waitFor(() => {
      expect(container.querySelectorAll('[data-node]').length).toBe(4); // section, row, 2 columns
    });
  });

  it('refuses to activate a reset email without the reset link', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: /^Activate$/ }));
    expect(await screen.findByText(/Fix these before activating/)).toBeInTheDocument();
    expect(screen.getByText('A required variable is not used')).toBeInTheDocument();
  });
});
