import type { RecordFacts } from '@builderset/engine/editor';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildForm, createFormRegistry, field, step, type FormDocument } from '../core';
import { createMemoryHost, type BuilderHost } from '../host';
import { FormEditor } from './editor';

const registry = createFormRegistry();
const record: RecordFacts = { status: 'draft', scheduledAt: null, publishedAt: null };

function host(): BuilderHost<FormDocument> {
  return createMemoryHost<FormDocument>({ toast: vi.fn() });
}

/** Two steps; the plate is a template's field, locked. */
const valuation = () =>
  buildForm(registry, { meta: { name: 'Valuation', title: 'Get an offer' } }, [
    step('Car', [
      field('text', {
        label: 'Plate',
        key: 'plate',
        required: true,
        lock: 'Valuation needs the plate',
      }),
      field('number', { label: 'Year', key: 'year' }),
    ]),
    step('Contact', [
      field('email', { label: 'Email', key: 'email' }),
      field('consent', { label: 'Consent', key: 'consent' }),
    ]),
  ]);

function mount(document = valuation()) {
  return render(
    <FormEditor
      document={document}
      registry={registry}
      host={host()}
      record={record}
      onBack={() => undefined}
    />,
  );
}

describe('<FormEditor>', () => {
  it('shows the form a step at a time, with its steps above it', () => {
    const { container } = mount();
    const steps = screen.getByRole('tablist', { name: 'Steps' });
    expect(within(steps).getAllByRole('tab')).toHaveLength(2);
    // The first step's fields are on the canvas, the second's are not.
    expect(container.querySelector('.bsf-label')).toHaveTextContent('Plate');
    expect(screen.queryByText('Consent', { selector: '.bsf-label span' })).toBeNull();
  });

  it("has the form's own settings when nothing is selected", () => {
    mount();
    expect(screen.getByRole('tab', { name: /Submit/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Rules/ })).toBeInTheDocument();
  });

  it('moves to the next step', async () => {
    const user = userEvent.setup();
    const { container } = mount();
    await user.click(screen.getByRole('tab', { name: /Contact/ }));
    expect(container.querySelector('.bsf-label')).toHaveTextContent('Email');
  });

  it("opens the field's own inspector on a field", async () => {
    const user = userEvent.setup();
    const { container } = mount();
    const plate = container.querySelector<HTMLElement>('.bsf-field[data-node]');
    if (!plate) throw new Error('no field');
    await user.click(plate);
    // The inspector swaps panels after the old one's exit animation.
    expect(await screen.findByRole('tab', { name: /Checks/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Logic/ })).toBeInTheDocument();
    // A template's field says why it stays.
    expect(screen.getByText('Valuation needs the plate', { exact: false })).toBeInTheDocument();
  });
});
