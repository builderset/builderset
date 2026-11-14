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
        'bld-focus bst:peer bst:inline-flex bst:h-5 bst:w-9 bst:shrink-0 bst:cursor-pointer bst:items-center',
        'bst:rounded-full bst:border bst:border-transparent bst:transition-colors bst:duration-(--bst-dur-2)',
        // The OFF track is `--input`, the same grey as a field: a switch that is
        // off is a control waiting for input, not a disabled one.
        'bst:bg-input bst:data-[state=checked]:bg-primary',
        'bst:disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'bst:pointer-events-none bst:block bst:size-4 bst:rounded-full bst:bg-background bst:shadow-pop bst:ring-0',
          'bst:transition-transform bst:duration-(--bst-dur-2) bst:ease-both',
          'bst:translate-x-0.5 bst:data-[state=checked]:translate-x-4',
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
        'bst:inline-flex bst:h-9 bst:items-center bst:gap-0.5 bst:rounded-control',
        'bst:border bst:border-border bst:bg-input bst:p-0.5',
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
            'bld-focus bst:inline-flex bst:h-full bst:flex-1 bst:cursor-pointer bst:items-center bst:justify-center bst:gap-1.5',
            'bst:rounded-[calc(var(--builderset-radius,0.625rem)*0.7-2px)] bst:px-3 bst:text-[13px] bst:font-medium bst:whitespace-nowrap',
            'bst:text-muted-foreground bst:transition-colors bst:duration-(--bst-dur-1)',
            'bst:hover:text-foreground',
            'bst:data-[state=on]:bg-card bst:data-[state=on]:text-foreground bst:data-[state=on]:shadow-pop',
            'bst:disabled:cursor-not-allowed',
            "bst:[&_svg:not([class*='size-'])]:size-4",
          )}
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
