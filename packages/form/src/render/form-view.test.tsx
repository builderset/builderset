import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildForm, createFormRegistry, field, step } from '../core';
import { FormView } from './form-view';

const registry = createFormRegistry();

/** What do you need, then — only for a broken car — what broke, then who to call. */
const form = () =>
  buildForm(
    registry,
    { meta: { title: 'Repair' }, settings: { after: { title: 'Thanks, {{name.first}}!' } } },
    [
      step('Car', [
        field('yes-no', { label: 'Is it broken?', key: 'broken', required: true }),
        field('textarea', {
          label: 'What broke?',
          key: 'what',
          required: true,
          logic: {
            enabled: true,
            match: 'all',
            rules: [{ key: 'broken', op: 'is', value: 'yes' }],
          },
        }),
      ]),
      step('You', [field('name', { label: 'Name', key: 'name', required: true })]),
    ],
  );

describe('<FormView>', () => {
  it('stops on a required answer, shows a question once its rule holds, and sends the answers', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => true);
    render(<FormView document={form()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please fill this in.');

    expect(screen.queryByLabelText(/What broke/)).toBeNull();
    await user.click(screen.getByLabelText('Yes'));
    await user.type(screen.getByLabelText(/What broke/), 'The clutch');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(screen.getByLabelText('First name'), 'Arben');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).toHaveBeenCalledWith({
      values: { broken: 'yes', what: 'The clutch', name: { first: 'Arben' } },
      files: {},
      trap: '',
    });
    expect(await screen.findByText('Thanks, Arben!')).toBeInTheDocument();
  });
});
