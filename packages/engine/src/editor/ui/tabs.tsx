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
        'bst:flex bst:items-center bst:gap-1 bst:overflow-x-auto bst:border-b bst:border-border',
        // The scrollbar under a 40px tab strip is most of the strip.
        'bst:[scrollbar-width:none] bst:[&::-webkit-scrollbar]:hidden',
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
        'bld-focus bst:relative bst:shrink-0 bst:cursor-pointer bst:whitespace-nowrap',
        'bst:px-3 bst:py-2 bst:text-sm bst:font-medium bst:text-muted-foreground',
        'bst:transition-colors bst:duration-(--bst-dur-1) bst:hover:text-foreground',
        'bst:data-[state=active]:text-foreground',
        // The indicator is a pseudo-element on the trigger rather than a
        // measured, animated bar: a bar positioned in JavaScript is one resize
        // away from pointing at the wrong tab, and this cannot be.
        'bst:after:absolute bst:after:inset-x-0 bst:after:-bottom-px bst:after:h-0.5 bst:after:rounded-full',
        'bst:after:scale-x-0 bst:after:bg-primary bst:after:transition-transform bst:after:duration-(--bst-dur-2)',
        'bst:after:content-[""] bst:data-[state=active]:after:scale-x-100',
        'bst:disabled:cursor-not-allowed',
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
        'bld-focus bst:mt-4 bst:outline-none',
        'bst:data-[state=active]:animate-[bst-fade-in_var(--bst-dur-2)_var(--bst-ease-enter)]',
        className,
      )}
      {...props}
    />
  );
}
