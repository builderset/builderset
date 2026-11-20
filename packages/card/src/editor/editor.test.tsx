import type { RecordFacts } from '@builderset/engine/editor';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createCardRegistry, type CardDocument } from '../core';
import { createMemoryHost, type BuilderHost } from '../host';
import { sq } from '../locales/sq';
import { buildTemplateCard, CARD_TEMPLATES } from '../templates';
import { CardEditor } from './editor';

const registry = createCardRegistry();
const record: RecordFacts = { status: 'draft', scheduledAt: null, publishedAt: null };
function goldCard(): CardDocument {
  const gold = CARD_TEMPLATES.find((template) => template.id === 'gold-membership');
  if (!gold) throw new Error('no gold template');
  return buildTemplateCard(registry, gold, { stable: true });
}

function host(): BuilderHost<CardDocument> {
  return createMemoryHost<CardDocument>({ toast: vi.fn() });
}

function mount(document = goldCard(), locale?: string) {
  return render(
    <CardEditor
      document={document}
      registry={registry}
      host={host()}
      record={record}
      onBack={() => undefined}
      locale={locale}
      locales={{ sq }}
      fontPreviews={false}
    />,
  );
}

describe('<CardEditor>', () => {
  it('draws the front on the free canvas, its elements listed for keyboards', () => {
    mount();
    expect(screen.getByText('Front · working view, not to scale')).toBeInTheDocument();
    const list = screen.getByRole('listbox');
    // The gold card's front: twelve elements, each focusable.
    expect(within(list).getAllByRole('option')).toHaveLength(12);
    // Under the card and in the dock.
    expect(screen.getAllByRole('button', { name: 'Flip to back' })).toHaveLength(2);
  });

  it('has the card’s own settings when nothing is selected, and is ready to print', () => {
    mount();
    expect(screen.getByRole('tab', { name: /Format/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Print/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Data/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Membership card/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('flips to the back with the button and with F', async () => {
    const user = userEvent.setup();
    mount();
    const [flip] = screen.getAllByRole('button', { name: 'Flip to back' });
    if (!flip) throw new Error('no flip');
    await user.click(flip);
    expect(screen.getByText('Back · working view, not to scale')).toBeInTheDocument();
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(8);
    await user.keyboard('f');
    expect(screen.getByText('Front · working view, not to scale')).toBeInTheDocument();
  });

  it('opens the element’s own inspector: Style, Layout and Data', async () => {
    const user = userEvent.setup();
    mount();
    const name = within(screen.getByRole('listbox')).getByRole('option', { name: 'Member name' });
    await user.click(name);
    expect(await screen.findByRole('tab', { name: /Style/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Layout/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Data/ }));
    expect(screen.getByText('Fill from member data')).toBeInTheDocument();
  });

  it('fills the card in from the example member', async () => {
    const user = userEvent.setup();
    const { container } = mount();
    const marked = () =>
      [...container.querySelectorAll('.bsc-var')].map((node) => node.textContent);
    expect(marked()).toContain('member.name');
    await user.click(screen.getByRole('button', { name: 'Example data' }));
    expect(screen.getAllByText('Arben Hoxha').length).toBeGreaterThan(0);
    await act(async () => {
      await user.keyboard('{Control>}{Shift>}e{/Shift}{/Control}');
    });
    expect(marked()).toContain('member.name');
  });

  it('lists the members and the fields in their own tab', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('tab', { name: 'Members' }));
    expect(screen.getByRole('button', { name: /Elira Daci/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Valid until/ })).toHaveTextContent(
      'member.valid_until',
    );
  });

  it('speaks Albanian', () => {
    mount(undefined, 'sq');
    expect(screen.getByText('Përpara · pamje pune, jo në shkallë')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Shtypi/ })).toBeInTheDocument();
  });
});
