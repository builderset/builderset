import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../cn';

/**
 * A chip that names a STATE or a KIND.
 *
 * The five application statuses get tones of their own because they are business
 * data — `application_status.code` — and an operator scanning a table has to
 * tell them apart at a glance. They are drawn as ink on their own faint wash
 * rather than as solid fills: a table with forty solid chips in five colours is
 * a screen nobody can read past.
 */
const badge = cva(
  cn(
    'bst:inline-flex bst:w-fit bst:shrink-0 bst:items-center bst:gap-1.5 bst:rounded-full bst:border',
    'bst:px-2.5 bst:py-0.5 bst:text-xs bst:font-medium bst:whitespace-nowrap',
    "bst:[&_svg]:pointer-events-none bst:[&_svg:not([class*='size-'])]:size-3",
  ),
  {
    variants: {
      /**
       * `dense` is the TABLE chip, and it is bold on purpose.
       *
       * A status is the one thing in a row a reader scans FOR, and the default
       * chip — 12px, medium, sentence case — reads as prose at the density a
       * table is actually looked at. Nine-pixel bold caps reads as a label.
       * It stays a variant rather than becoming the default because the same
       * component names a status on a detail page, where the row is a sentence
       * and caps would be shouting.
       */
      size: {
        default: '',
        dense: 'bst:px-2 bst:py-0.5 bst:text-[9px] bst:font-bold bst:tracking-wider bst:uppercase',
      },
      tone: {
        neutral: 'bst:border-border bst:bg-muted bst:text-muted-foreground',
        brand: 'bst:border-primary/20 bst:bg-primary/10 bst:text-primary',
        ok: 'bst:border-ok/20 bst:bg-ok/10 bst:text-ok',
        warn: 'bst:border-warn/20 bst:bg-warn/10 bst:text-warn',
        danger: 'bst:border-no/20 bst:bg-no/10 bst:text-no',
        // A document's state, on the top bar's status chip.
        draft: 'bst:border-state-draft/25 bst:bg-state-draft/12 bst:text-state-draft',
        scheduled:
          'bst:border-state-scheduled/25 bst:bg-state-scheduled/12 bst:text-state-scheduled',
        published:
          'bst:border-state-published/25 bst:bg-state-published/12 bst:text-state-published',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'default' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>;

export interface BadgeProps extends ComponentProps<'span'> {
  /**
   * The colour: `neutral`, `brand`, `ok`, `warn`, `danger`, or a document's
   * state: `draft`, `scheduled`, `published`. Default: `'neutral'`.
   */
  tone?: VariantProps<typeof badge>['tone'];
  /** `dense`: 9px bold capitals, for a status in a table row. Default: `'default'`. */
  size?: VariantProps<typeof badge>['size'];
}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badge({ tone, size }), className)} {...props} />;
}
