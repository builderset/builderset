'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps } from 'react';

import { cn } from '../cn';

/**
 * Radix rather than a bare element: it forwards a click on the label text to the
 * control even when the two are not nested, which is the arrangement every
 * `Field` in the product uses.
 *
 * The state classes read from the `group/field` wrapper `Field` puts around
 * them, so a label dims with its disabled control and turns destructive when the
 * field is invalid — without either state being passed down as a prop.
 *
 * There is no focus brightening any more: the label is already at full strength,
 * so there was nothing left to brighten to.
 */
export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-1.5 text-[13px] leading-none font-semibold select-none',
        // Full-strength ink, not `foreground/80`. The dimmed version was there
        // to keep the label quieter than the value the reader types — but every
        // field now carries a muted hint underneath as well, and a label sitting
        // between two greys stopped reading as the heading of its own group.
        // The contrast it needs is against the HINT, not against the input.
        'text-foreground transition-colors duration-(--dur-1)',
        'group-has-disabled/field:text-muted-foreground',
        'group-data-[invalid=true]/field:text-destructive',
        className,
      )}
      {...props}
    />
  );
}
