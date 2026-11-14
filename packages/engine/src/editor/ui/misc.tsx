'use client';

import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../cn';

/**
 * The small shared surfaces the editor uses: skeleton, progress, spinner.
 * The separator and the
 * avatar, which the editor does not use, are left out with their Radix
 * packages.
 */

/**
 * A loading placeholder, and a `shimmer` rather than a pulse.
 *
 * The band is a transform, so it composites instead of repainting the box it
 * crosses — which matters when twenty of these are on screen at once, the exact
 * case a skeleton exists for. Under `prefers-reduced-motion` the global rule in
 * the theme stylesheet flattens the animation and the plain surface remains.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'bg-muted rounded-control relative overflow-hidden',
        'after:absolute after:inset-y-0 after:left-0 after:w-1/3',
        'after:via-foreground/6 after:bg-gradient-to-r after:from-transparent after:to-transparent',
        'after:animate-[bst-shimmer_1.4s_ease-in-out_infinite] after:content-[""]',
        className,
      )}
      {...props}
    />
  );
}

export interface ProgressProps extends ComponentProps<'div'> {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number | undefined;
  /** Announced to assistive technology — "Importing", "Uploading". */
  label?: string;
}

/**
 * A determinate bar.
 *
 * The fill is a TRANSFORM of a full-width element rather than an animated
 * `width`, so a bar ticking up during an import composites instead of laying out
 * on every frame — which matters because the thing it is reporting on is already
 * competing for the main thread.
 *
 * `role="progressbar"` with the three `aria-value*` attributes is what makes the
 * number readable; the bar itself is decoration on top of that.
 */
export function Progress({ className, value, label, ...props }: ProgressProps) {
  const clamped = value === undefined ? undefined : Math.min(100, Math.max(0, value));

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('bg-secondary relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        className={cn(
          'bg-primary ease-both h-full w-full transition-transform duration-(--bst-dur-3)',
          // With no value there is nothing to point at, so the bar sweeps
          // instead of sitting at zero — which reads as "stuck", not "working".
          clamped === undefined && 'animate-[bst-shimmer_1.4s_ease-in-out_infinite]',
        )}
        style={
          clamped === undefined
            ? undefined
            : { transform: `translateX(-${String(100 - clamped)}%)` }
        }
      />
    </div>
  );
}

export interface SpinnerProps extends ComponentProps<'span'> {
  /** Announced to assistive technology. Omit only when a sibling says it. */
  label?: string;
}

export function Spinner({ className, label, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role={label ? 'status' : undefined}
      className={cn('text-muted-foreground inline-flex items-center justify-center', className)}
      {...props}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
