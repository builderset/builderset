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
    'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border',
    'px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
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
        dense: 'px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase',
      },
      tone: {
        neutral: 'border-border bg-muted text-muted-foreground',
        brand: 'border-primary/20 bg-primary/10 text-primary',
        ok: 'border-ok/20 bg-ok/10 text-ok',
        warn: 'border-warn/20 bg-warn/10 text-warn',
        danger: 'border-no/20 bg-no/10 text-no',
        pending: 'border-status-pending/25 bg-status-pending/12 text-status-pending',
        valuated: 'border-status-valuated/25 bg-status-valuated/12 text-status-valuated',
        scheduled: 'border-status-scheduled/25 bg-status-scheduled/12 text-status-scheduled',
        finalized: 'border-status-finalized/25 bg-status-finalized/12 text-status-finalized',
        refused: 'border-status-refused/25 bg-status-refused/12 text-status-refused',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'default' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>;

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badge>;

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badge({ tone, size }), className)} {...props} />;
}
