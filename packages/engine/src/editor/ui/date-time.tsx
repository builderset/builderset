'use client';

import { Input, type InputProps } from './input';

/**
 * A date and a time in one native field. The browser draws the picker, in the
 * reader's own language and calendar, so it has no words to translate and is
 * accessible as it comes.
 *
 * It replaces `@motors/ui`'s `DatePicker` and `TimePicker` (Builderset plan,
 * step 04, part d): those are the heaviest components the editor used and the
 * most tied to the admin's translations, for one field in two places.
 *
 * `value` and `min` are ISO instants; the field shows and edits them in the
 * reader's local time. An empty or unfinished field reports `null`.
 */
export interface DateTimeFieldProps extends Omit<
  InputProps,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min'
> {
  value: string | null;
  onChange: (iso: string | null) => void;
  min?: string | null | undefined;
}

export function DateTimeField({ value, onChange, min, ...rest }: DateTimeFieldProps) {
  return (
    <Input
      type="datetime-local"
      value={toLocalInput(value)}
      min={min ? toLocalInput(min) : undefined}
      onChange={(event) => {
        onChange(fromLocalInput(event.target.value));
      }}
      {...rest}
    />
  );
}

/** An ISO instant as `YYYY-MM-DDTHH:MM` in local time, the field's own format. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The field's local `YYYY-MM-DDTHH:MM` as an ISO instant; null when empty or invalid. */
export function fromLocalInput(local: string): string | null {
  if (!local) return null;
  // Without a zone, `Date` reads this format as local time — which is what the field shows.
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
