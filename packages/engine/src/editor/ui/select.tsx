'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../cn';
import { usePortalContainer } from './portal';

import { controlClass } from './input';

/**
 * The select.
 *
 * ── Why Radix and not a native `<select>` ────────────────────────────────────
 * A native select cannot be styled on the inside — the option list is drawn by
 * the operating system, in the OS's own theme — so on a dark page it opens a
 * white menu, and it is the one control that never matched anything. Radix draws
 * the list in the document, which is also what makes it work INSIDE A DRAWER:
 * it portals to the body and Radix's own layering keeps it above the panel's
 * focus trap rather than being clipped by the panel's `overflow: hidden`.
 *
 * ── The empty value ──────────────────────────────────────────────────────────
 * Radix reserves the empty string: an item with `value=""` throws, because that
 * is how it represents "nothing selected" internally. A filter's "All" option is
 * exactly that value, so it is carried as a sentinel and converted at the two
 * edges. Callers see and set `''`, and never learn about this.
 */

const EMPTY = '__empty__';

const toRadix = (value: string) => (value === '' ? EMPTY : value);
const fromRadix = (value: string) => (value === EMPTY ? '' : value);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** The selected value, for a controlled select. `''` is a value like any other (an "All" option). */
  value?: string | undefined;
  /** The value it starts with, for an uncontrolled select; ignored when `value` is set. */
  defaultValue?: string | undefined;
  /** Called with the value of the option the reader picks. */
  onValueChange?: ((value: string) => void) | undefined;
  /** The choices, in order; a `disabled` one is shown but cannot be picked. */
  options: readonly SelectOption[];
  /** Shown while nothing is selected. */
  placeholder?: string | undefined;
  /** The trigger's id, so a label can point at it. */
  id?: string | undefined;
  /** The form field the value is submitted under. */
  name?: string | undefined;
  /** Marks the form field as required. */
  required?: boolean | undefined;
  /** Stops the select being opened. */
  disabled?: boolean | undefined;
  /** Sets `aria-invalid` and the error look on the trigger together. */
  invalid?: boolean | undefined;
  /** Applied to the trigger. */
  className?: string | undefined;
  /** The id of the hint or error message that describes the field. */
  'aria-describedby'?: string | undefined;
  /** The accessible name, when there is no visible label. */
  'aria-label'?: string | undefined;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  id,
  name,
  required,
  disabled,
  invalid,
  className,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      // Controlled and uncontrolled are genuinely different modes to Radix, and
      // passing both — even with one undefined — makes it warn and then pick.
      {...(value !== undefined
        ? { value: toRadix(value) }
        : defaultValue !== undefined
          ? { defaultValue: toRadix(defaultValue) }
          : {})}
      onValueChange={(next) => onValueChange?.(fromRadix(next))}
      // Spread conditionally rather than passed: under
      // `exactOptionalPropertyTypes` an explicit `undefined` is not the same as
      // an absent prop, and Radix's own types say absent.
      {...(name !== undefined ? { name } : {})}
      {...(required !== undefined ? { required } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
    >
      <SelectPrimitive.Trigger
        id={id}
        data-slot="select-trigger"
        aria-invalid={invalid ? true : undefined}
        className={cn(
          controlClass,
          'bst:justify-between bst:gap-2 bst:text-left',
          // The placeholder is rendered by Radix inside the value slot, so it
          // cannot be reached with `placeholder:` — this is the hook it exposes.
          'bst:data-[placeholder]:text-muted-foreground/60',
          'bst:[&>span]:min-w-0 bst:[&>span]:truncate',
          invalid && 'bld-invalid',
          className,
        )}
        {...aria}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
            aria-hidden="true"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal container={usePortalContainer()}>
        <SelectPrimitive.Content
          // `popper` rather than `item-aligned`: item-aligned positions the menu
          // over the trigger, which inside a drawer puts it half off-screen.
          position="popper"
          sideOffset={4}
          className={cn(
            'bst:z-50 bst:max-h-72 bst:min-w-(--radix-select-trigger-width) bst:overflow-hidden',
            'bst:rounded-control bst:border bst:border-border bst:bg-popover bst:text-popover-foreground bst:shadow-pop',
            'bst:data-[state=open]:animate-[bst-zoom-in_var(--bst-dur-2)_var(--bst-ease-enter)]',
            'bst:data-[state=closed]:animate-[bst-zoom-out_var(--bst-dur-1)_var(--bst-ease-exit)]',
          )}
        >
          <SelectPrimitive.ScrollUpButton className="bst:flex bst:h-6 bst:items-center bst:justify-center bst:text-muted-foreground">
            <ChevronUp className="bst:size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="bst:p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || EMPTY}
                value={toRadix(option.value)}
                {...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
                className={cn(
                  'bst:relative bst:flex bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-control',
                  'bst:py-1.5 bst:pr-8 bst:pl-2.5 bst:text-sm bst:outline-none bst:select-none',
                  // `highlighted` covers both the pointer and the keyboard, so
                  // arrowing through the list looks like hovering it.
                  'bst:data-highlighted:bg-accent bst:data-highlighted:text-accent-foreground',
                  'bst:data-[state=checked]:font-medium',
                  'bst:data-disabled:pointer-events-none bst:data-disabled:text-muted-foreground',
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="bst:absolute bst:right-2 bst:flex bst:items-center">
                  <Check className="bst:size-4 bst:text-primary" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="bst:flex bst:h-6 bst:items-center bst:justify-center bst:text-muted-foreground">
            <ChevronDown className="bst:size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
