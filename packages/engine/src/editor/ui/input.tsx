import type { ComponentProps } from 'react';

import { cn } from '../cn';

/**
 * The base control geometry, shared by every field in the product.
 *
 * Exported because a select trigger, a date input and a file dropzone are all
 * the same object visually and differ only in what they do. Six components
 * restating this string is six components that drift apart one class at a time.
 *
 * `bld-focus` is the shared glow from the theme stylesheet; `bld-invalid` is the error
 * treatment, and it is UNLAYERED there so it beats the glow when a field is both
 * focused and invalid — which is the state a reader is in immediately after a
 * failed submit, and the one that must read as invalid first.
 */
export const controlClass = cn(
  // `--field-h`, not a literal: 40px by default, because a field is typed into
  // rather than pressed and in a drawer it sits between a label and a hint,
  // where the 36px a BUTTON is read as the smallest part of its own group. A
  // container that wants them denser — the filter toolbar — sets the token once
  // and every control inside comes down together, still equal to each other.
  'bld-focus bst:flex bst:h-(--bst-field-h) bst:w-full bst:min-w-0 bst:items-center bst:rounded-control',
  'bst:border bst:border-border bst:bg-input bst:px-3 bst:text-sm bst:text-foreground',
  'bst:placeholder:text-muted-foreground/60',
  'bst:disabled:cursor-not-allowed',
  // A control reddens when the FIELD around it is invalid, not only when it was
  // handed `invalid` itself. A drawer validates the whole submission at once and
  // the errors reach `Field`, which is the wrapper — without this the message
  // appeared under a control that still looked perfectly fine.
  'bst:group-data-[invalid=true]/field:border-destructive/55',
  'bst:group-data-[invalid=true]/field:bg-[color-mix(in_oklab,var(--builderset-danger,var(--bst-d-danger))_4%,var(--builderset-surface,var(--bst-d-surface)))]',
);

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  /**
   * Sets `aria-invalid` AND the error treatment together.
   *
   * One prop rather than two because they were never independently useful: a
   * field that looks wrong and does not say so to a screen reader is a bug, and
   * so is the reverse.
   */
  invalid?: boolean | undefined;
}

export function Input({ className, invalid, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      aria-invalid={invalid ? true : undefined}
      className={cn(
        controlClass,
        // The spinners on a number input are 20px of unlabelled control that
        // change a value on a stray scroll. Every numeric field here has a
        // keyboard and a validation rule instead.
        'bst:[&::-webkit-inner-spin-button]:appearance-none bst:[&::-webkit-outer-spin-button]:appearance-none',
        'bst:[-moz-appearance:textfield]',
        invalid && 'bld-invalid',
        className,
      )}
      {...props}
    />
  );
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Sets `aria-invalid` and the error look together, as on `Input`. */
  invalid?: boolean | undefined;
}

/**
 * Every textarea shows at least this many lines. A box of two or three lines
 * reads as a single-line field that happens to wrap, and the reader writes to
 * fit it; five says "write as much as you need" before a word is typed.
 */
export const TEXTAREA_MIN_ROWS = 5;

export function Textarea({ className, invalid, rows, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      // A caller may ask for MORE lines — a code field, a long reply — but not
      // fewer: the five-line floor is the product's, not each form's.
      rows={Math.max(rows ?? TEXTAREA_MIN_ROWS, TEXTAREA_MIN_ROWS)}
      aria-invalid={invalid ? true : undefined}
      className={cn(
        controlClass,
        // `h-auto` undoes the shared single-line height, and the padding
        // restores what a one-line control gets from centring. The minimum
        // height is the same five lines in `lh` (plus the padding and the
        // border), so dragging the resize handle cannot shrink it below them.
        'bst:h-auto bst:min-h-[calc(5lh+1rem+2px)] bst:py-2 bst:leading-relaxed',
        invalid && 'bld-invalid',
        className,
      )}
      {...props}
    />
  );
}
