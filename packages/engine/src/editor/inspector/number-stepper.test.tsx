import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { NumberStepper, type NumberStepperProps } from './number-stepper';

function Harness(props: Partial<NumberStepperProps> & { initial: number | null }) {
  const { initial, ...rest } = props;
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <NumberStepper aria-label="Amount" {...rest} value={value} onChange={setValue} />
      <output data-testid="value">{value === null ? 'null' : String(value)}</output>
    </>
  );
}

const shown = () => screen.getByTestId('value').textContent;

describe('<NumberStepper>', () => {
  it('steps up and down with the buttons, and stops at the bounds', () => {
    render(<Harness initial={9} min={0} max={10} integer />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase' }), { button: 0 });
    expect(shown()).toBe('10');
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Decrease' }), { button: 0 });
    expect(shown()).toBe('9');
  });

  it('steps decimals without float noise', () => {
    render(<Harness initial={1.2} min={1.1} max={2.2} step={0.1} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase' }), { button: 0 });
    expect(shown()).toBe('1.3');
    expect(screen.getByRole('spinbutton')).toHaveValue('1.3');
  });

  it('accepts only numbers while typing, and clamps on blur', async () => {
    const user = userEvent.setup();
    render(<Harness initial={5} min={0} max={100} />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '1a2,5-');
    expect(input).toHaveValue('12,5');
    expect(shown()).toBe('12.5');
    await user.clear(input);
    await user.type(input, '400');
    await user.tab();
    expect(shown()).toBe('100');
  });

  it('refuses a decimal point for whole numbers, and steps with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness initial={3} min={0} integer />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '4.5');
    expect(input).toHaveValue('45');
    await user.keyboard('{ArrowUp}');
    expect(shown()).toBe('46');
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(shown()).toBe('36');
  });

  it('keeps what was typed before the select-on-focus frame lands', async () => {
    const user = userEvent.setup();
    render(<Harness initial={3} min={0} integer />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.keyboard('4');
    // The frame the focus handler waits for, arriving mid-typing — what a slow
    // CI runner (or a fast typist) gets. Selecting then would type over the 4.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await user.keyboard('5');
    expect(input).toHaveValue('45');
  });

  it('clears to null when nullable', async () => {
    const user = userEvent.setup();
    render(<Harness initial={7} min={1} nullable />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.tab();
    expect(shown()).toBe('null');
  });
});
