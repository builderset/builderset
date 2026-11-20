import type { RecordFacts } from '@builderset/engine/editor';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createPopupRegistry, type PopupDocument } from '../core';
import { createMemoryHost, type BuilderHost } from '../host';
import { buildTemplatePopup, POPUP_TEMPLATES } from '../templates';
import { PopupEditor } from './editor';
import { changeType } from './settings-panel';

const registry = createPopupRegistry();
const record: RecordFacts = { status: 'draft', scheduledAt: null, publishedAt: null };

function host(): BuilderHost<PopupDocument> {
  return createMemoryHost<PopupDocument>({ toast: vi.fn() });
}

function template(id: string): PopupDocument {
  const found = POPUP_TEMPLATES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no template ${id}`);
  return buildTemplatePopup(registry, found);
}

function mount(document = template('valuation-modal')) {
  return render(
    <PopupEditor
      document={document}
      registry={registry}
      host={host()}
      record={record}
      onBack={() => undefined}
    />,
  );
}

describe('<PopupEditor>', () => {
  it('draws the popup on the free canvas, with its type above it', () => {
    mount();
    expect(screen.getByText('Modal · working view, not to scale')).toBeInTheDocument();
    expect(screen.getByText('Sa vlen makina juaj?')).toBeInTheDocument();
    // Under the popup, and in the dock.
    expect(screen.getAllByRole('button', { name: /Replay how it appears/ })).toHaveLength(2);
  });

  it("has the popup's own settings when nothing is selected", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole('tab', { name: /Format/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Modal/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('tab', { name: /Display/ }));
    expect(screen.getByText('After 6 seconds on the page.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/llogaria/*')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Motion/ }));
    expect(screen.getByRole('switch', { name: /The Esc key closes it/ })).toBeChecked();
  });

  it('changes the type, scaling the elements to fit', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('radio', { name: /Slide-in/ }));
    expect(await screen.findByText('Slide-in · working view, not to scale')).toBeInTheDocument();
  });

  it('lists the variables and the inputs in Fields', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('tab', { name: /Fields/ }));
    expect(await screen.findByText('visitor.first_name')).toBeInTheDocument();
    const inputs = screen.getByText('Form fields').nextElementSibling as HTMLElement;
    expect(within(inputs).getByText('plate')).toBeInTheDocument();
  });

  it('starts over from a template, in one step', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('tab', { name: /Templates/ }));
    await user.click(await screen.findByRole('button', { name: 'Use: Cookie bar' }));
    expect(await screen.findByText('Bottom bar · working view, not to scale')).toBeInTheDocument();
    expect(screen.getAllByText('Pranoj të gjitha').length).toBeGreaterThan(0);
  });
});

describe('changing the type', () => {
  it('scales every frame to the new size and keeps a light surface light', () => {
    const doc = template('valuation-modal');
    changeType(doc, 'drawer');
    const root = doc.nodes[doc.root];
    expect(root?.props).toMatchObject({
      type: 'drawer',
      width: 380,
      height: 640,
      position: 'right',
    });
    expect(root?.props.background).toBe('#ffffff');
    const image = doc.nodes[root?.children?.[0] ?? ''];
    expect(image?.props.frame).toMatchObject({ x: 0, y: 0, w: 146, h: 640 });
  });
});
