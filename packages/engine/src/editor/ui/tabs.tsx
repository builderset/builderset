'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

import { cn } from '../cn';

/**
 * Tabs — an underline, not a pill row.
 *
 * The segmented control is the pill row, and it means "pick one of these
 * values". Tabs mean "the same thing, seen another way", and drawing them
 * identically leaves the reader guessing which of the two they are looking at.
 *
 * The list scrolls horizontally rather than wrapping: a second row of tabs moves
 * the content down by 40px when the reader resizes, and on a phone six tabs
 * would take a third of the screen before anything is read.
 */

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'border-border flex items-center gap-1 overflow-x-auto border-b',
        // The scrollbar under a 40px tab strip is most of the strip.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'bld-focus relative shrink-0 cursor-pointer whitespace-nowrap',
        'text-muted-foreground px-3 py-2 text-sm font-medium',
        'hover:text-foreground transition-colors duration-(--bst-dur-1)',
        'data-[state=active]:text-foreground',
        // The indicator is a pseudo-element on the trigger rather than a
        // measured, animated bar: a bar positioned in JavaScript is one resize
        // away from pointing at the wrong tab, and this cannot be.
        'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
        'after:bg-primary after:scale-x-0 after:transition-transform after:duration-(--bst-dur-2)',
        'after:content-[""] data-[state=active]:after:scale-x-100',
        'disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'bld-focus mt-4 outline-none',
        'data-[state=active]:animate-[bst-fade-in_var(--bst-dur-2)_var(--bst-ease-enter)]',
        className,
      )}
      {...props}
    />
  );
}
