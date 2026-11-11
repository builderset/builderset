import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateTimeField, fromLocalInput, toLocalInput } from './date-time';

describe('DateTimeField', () => {
  it('shows an instant in local time and reads it back unchanged', () => {
    const iso = new Date(2026, 5, 15, 9, 30).toISOString();
    expect(toLocalInput(iso)).toBe('2026-06-15T09:30');
    expect(fromLocalInput('2026-06-15T09:30')).toBe(iso);
  });

  it('treats an empty or broken value as no value', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('not a date')).toBe('');
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('2026-13-45T99:99')).toBeNull();
  });

  it('reports the chosen moment as ISO, and null when cleared', () => {
    const onChange = vi.fn();
    render(<DateTimeField aria-label="When" value={null} onChange={onChange} />);
    const field = screen.getByLabelText('When');
    expect(field).toHaveAttribute('type', 'datetime-local');
    fireEvent.change(field, { target: { value: '2026-06-15T09:30' } });
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 5, 15, 9, 30).toISOString());
  });
});
