'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../cn';

/**
 * The boolean and single-choice controls the editor uses: the switch and the
 * segmented control. The
 * checkbox and the radio group, which the editor does not use, are left out.
 *
 * They are Radix rather than native inputs, for the same reason the select
 * is: a native checkbox and radio are painted by the operating system and cannot
 * be given the product's focus ring, its radius or its disabled surface. What
 * Radix keeps is the part that matters — each renders a real hidden input inside
 * a form, so an uncontrolled `<form>` still serialises them and `FormData` reads
 * them exactly as it would a native control.
 */

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'ui-focus peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center',
        'rounded-full border border-transparent transition-colors duration-(--dur-2)',
        // The OFF track is `--input`, the same grey as a field: a switch that is
        // off is a control waiting for input, not a disabled one.
        'bg-input data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'bg-background shadow-pop pointer-events-none block size-4 rounded-full ring-0',
          'transition-transform duration-(--dur-2) ease-(--ease-both)',
          'translate-x-0.5 data-[state=checked]:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Needed when `label` is an icon: the button would otherwise be unnamed. */
  ariaLabel?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  /** The selected option's value. */
  value: T;
  /** Called with the option the reader picks; pressing the selected one again does not call it. */
  onValueChange: (value: T) => void;
  /** The choices, in order. */
  options: readonly SegmentedOption<T>[];
  /** Applied to the group. */
  className?: string;
  /** The accessible name, when there is no visible label. */
  'aria-label'?: string;
}

/**
 * Two to four mutually exclusive choices, shown all at once.
 *
 * A select hides its options behind a click and is right when there are ten; a
 * segmented control is right when there are three and the reader is comparing
 * them — a theme switch, a report's grouping, a status tab.
 *
 * `type="single"` with no `onValueChange` on an empty string is deliberate:
 * Radix reports `''` when the reader clicks the already-selected segment, and
 * committing that would leave the group with nothing selected. There is no
 * "none" here, so that event is dropped.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      data-slot="segmented-control"
      className={cn(
        'inline-flex h-9 items-center gap-0.5 rounded-[var(--radius-control)]',
        'border-border bg-input border p-0.5',
        className,
      )}
      {...aria}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={option.ariaLabel}
          className={cn(
            'ui-focus inline-flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5',
            'rounded-[calc(var(--radius-control)-2px)] px-3 text-[13px] font-medium whitespace-nowrap',
            'text-muted-foreground transition-colors duration-(--dur-1)',
            'hover:text-foreground',
            'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-pop',
            'disabled:cursor-not-allowed',
            "[&_svg:not([class*='size-'])]:size-4",
          )}
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
