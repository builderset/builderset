'use client';

import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { useMessages } from '../context';
import { cn } from '../cn';

/**
 * The empty state, copied from `@motors/ui` (feedback/states.tsx). The error
 * and loading states in the same file are not used by the editor and are left
 * out; their notes below still describe the shared shape.
 *
 * Empty, error and loading — the three states every list has and most screens
 * forget two of.
 *
 * They share a shape on purpose: a disc, a sentence, an optional second line,
 * an optional action. A reader who has learnt where to look on one of them has
 * learnt it for all three, and the difference between "nothing here" and
 * "something broke" is carried by the icon and the colour rather than by a
 * different layout.
 */

export interface EmptyStateProps {
  title?: string | undefined;
  description?: string | undefined;
  icon?: ReactNode;
  /** The way out of the empty state — "Add the first line", "Create". */
  action?: ReactNode;
  /**
   * `default` holds the same floor as the loading and error states, so a table
   * does not change height between them. `compact` is for an empty SECTION
   * inside a form or a card, where that floor would push everything below it
   * off the screen.
   */
  size?: 'default' | 'compact' | undefined;
  /**
   * A dashed card around it — for an empty state standing on its own in a form,
   * where there is no table or panel edge to frame it. Off inside a table,
   * which already has one.
   */
  bordered?: boolean | undefined;
  className?: string | undefined;
}

/**
 * The particles around the icon: where each sits (as a share of the art box),
 * how big it is, when its twinkle starts, and whether it wears the primary.
 * Placed by hand rather than at random, so the field is balanced on both sides
 * and does not reshuffle on every render.
 */
const PARTICLES = [
  { x: 8, y: 30, size: 4, delay: 0, primary: false },
  { x: 18, y: 78, size: 3, delay: 900, primary: true },
  { x: 30, y: 6, size: 3, delay: 1600, primary: false },
  { x: 88, y: 22, size: 4, delay: 400, primary: true },
  { x: 94, y: 62, size: 3, delay: 1200, primary: false },
  { x: 74, y: 92, size: 4, delay: 2000, primary: false },
  { x: 50, y: 98, size: 2, delay: 600, primary: true },
  { x: 2, y: 56, size: 2, delay: 1400, primary: true },
] as const;

/** Four-point sparkles, a size up from the dots, for the brighter moments. */
const SPARKLES = [
  { x: 82, y: 6, size: 9, delay: 300 },
  { x: 10, y: 92, size: 7, delay: 1500 },
] as const;

/**
 * The icon, staged: a raised tile on a soft glow, inside a dashed orbit with a
 * dot travelling round it, and a field of particles twinkling out of step.
 * All of it is decoration and `aria-hidden` — the title says what is missing.
 */
function EmptyArt({ icon, compact }: { icon: ReactNode; compact: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center',
        compact ? 'mb-4 size-28' : 'mb-6 size-36',
      )}
    >
      {/* The glow, under everything: what lifts the tile off the surface. */}
      <span className="bg-primary/10 absolute inset-6 rounded-full blur-2xl" />

      {/* The orbit — dashed, and turning slowly with one dot riding it. */}
      <span className="border-border absolute inset-2 rounded-full border border-dashed" />
      <span className="absolute inset-2 animate-[ui-spin_14s_linear_infinite] rounded-full">
        <span className="bg-primary ring-card absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2" />
      </span>
      <span
        className={cn(
          'border-border/70 bg-muted/30 absolute rounded-full border',
          compact ? 'inset-6' : 'inset-7',
        )}
      />

      {PARTICLES.map((dot) => (
        <span
          key={`${String(dot.x)}-${String(dot.y)}`}
          className={cn(
            'absolute animate-[ui-particle_3.2s_ease-in-out_infinite] rounded-full',
            dot.primary ? 'bg-primary/70' : 'bg-muted-foreground/50',
          )}
          style={{
            left: `${String(dot.x)}%`,
            top: `${String(dot.y)}%`,
            width: dot.size,
            height: dot.size,
            animationDelay: `${String(dot.delay)}ms`,
          }}
        />
      ))}
      {SPARKLES.map((star) => (
        <svg
          key={`${String(star.x)}-${String(star.y)}`}
          viewBox="0 0 10 10"
          className="text-primary/80 absolute animate-[ui-particle_3.6s_ease-in-out_infinite]"
          style={{
            left: `${String(star.x)}%`,
            top: `${String(star.y)}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${String(star.delay)}ms`,
          }}
        >
          <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="currentColor" />
        </svg>
      ))}

      {/* The tile: a faint top-lit gradient, a hairline inner highlight and a
          long soft shadow, so it reads as an object sitting in the rings. */}
      <span
        className={cn(
          'text-foreground border-border relative grid place-items-center border',
          'from-card to-muted bg-gradient-to-b',
          'shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(0_0_0/0.08),0_12px_28px_-12px_rgb(0_0_0/0.35)]',
          '[&_svg]:shrink-0',
          compact
            ? 'size-12 rounded-[0.9rem] [&_svg]:size-5'
            : 'size-15 rounded-2xl [&_svg]:size-6',
        )}
      >
        {icon}
      </span>
    </div>
  );
}

/**
 * Nothing here yet — said the way a mobile app says it.
 *
 * The icon is staged rather than dropped in a grey disc (see `EmptyArt`), then
 * a title that names what is missing, one sentence on what would go here, and
 * the action that fills it. The whole block rises in once, so an empty state
 * arriving after a filter reads as the answer to that filter rather than as
 * the screen failing to load.
 *
 * ── Centred in whatever it is given ─────────────────────────────────────────
 * `flex-1` with centred content, so in a column that has room — a drawer tab,
 * a card body — it takes the room and sits in the middle of it, rather than
 * hugging the top with the space left empty below it.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'default',
  bordered = false,
  className,
}: EmptyStateProps) {
  const messages = useMessages();
  const compact = size === 'compact';

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center text-center',
        'animate-[ui-rise_var(--dur-4)_var(--ease-enter)]',
        // The same floor the other two states hold, so a table does not change
        // height as it moves between loading, empty and broken.
        compact ? 'min-h-72 px-5 py-8' : 'min-h-80 px-6 py-12',
        bordered && 'border-border bg-muted/20 rounded-[var(--radius-card)] border border-dashed',
        className,
      )}
    >
      <EmptyArt icon={icon ?? <Inbox aria-hidden="true" />} compact={compact} />

      <p className={cn('text-foreground font-semibold', compact ? 'text-sm' : 'text-base')}>
        {title ?? messages.noResults}
      </p>
      <p
        className={cn(
          'text-muted-foreground mt-1.5 max-w-sm leading-relaxed',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        {description ?? messages.noResultsHint}
      </p>
      {action ? <div className={compact ? 'mt-4' : 'mt-5'}>{action}</div> : null}
    </div>
  );
}
