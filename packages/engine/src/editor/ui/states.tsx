'use client';

import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { useMessages } from '../context';
import { cn } from '../cn';

/**
 * The empty state. The error and loading states that usually sit beside it
 * are not used by the editor and are left out; their notes below still
 * describe the shared shape.
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
  /** The heading, naming what is missing. Default: the editor's "No results". */
  title?: string | undefined;
  /**
   * One sentence under the title on what would go here. Default: the editor's
   * hint for no results — only under the default title; a state with a title
   * of its own shows no second line unless it is given one.
   */
  description?: string | undefined;
  /** Shown in the tile at the centre. Default: an inbox. */
  icon?: ReactNode;
  /** The way out of the empty state — "Add the first line", "Create". */
  action?: ReactNode;
  /**
   * `default` holds the same floor as the loading and error states, so a table
   * does not change height between them. `compact` is for an empty SECTION
   * inside a form or a card, where that floor would push everything below it
   * off the screen. `inline` is a single quiet row — an icon tile and the
   * sentence on a dashed card — for an empty list inside a side panel, under a
   * heading that already names it.
   */
  size?: 'default' | 'compact' | 'inline' | undefined;
  /**
   * A dashed card around it — for an empty state standing on its own in a form,
   * where there is no table or panel edge to frame it. Off inside a table,
   * which already has one.
   */
  bordered?: boolean | undefined;
  /** Applied to the outer block. */
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
        'bst:relative bst:grid bst:shrink-0 bst:place-items-center',
        compact ? 'bst:mb-4 bst:size-28' : 'bst:mb-6 bst:size-36',
      )}
    >
      {/* The glow, under everything: what lifts the tile off the surface. */}
      <span className="bst:absolute bst:inset-6 bst:rounded-full bst:bg-primary/10 bst:blur-2xl" />

      {/* The orbit — dashed, and turning slowly with one dot riding it. */}
      <span className="bst:absolute bst:inset-2 bst:rounded-full bst:border bst:border-dashed bst:border-border" />
      <span className="bst:absolute bst:inset-2 bst:animate-[bst-spin_14s_linear_infinite] bst:rounded-full">
        <span className="bst:absolute bst:top-0 bst:left-1/2 bst:size-1.5 bst:-translate-x-1/2 bst:-translate-y-1/2 bst:rounded-full bst:bg-primary bst:ring-2 bst:ring-card" />
      </span>
      <span
        className={cn(
          'bst:absolute bst:rounded-full bst:border bst:border-border/70 bst:bg-muted/30',
          compact ? 'bst:inset-6' : 'bst:inset-7',
        )}
      />

      {PARTICLES.map((dot) => (
        <span
          key={`${String(dot.x)}-${String(dot.y)}`}
          className={cn(
            'bst:absolute bst:animate-[bst-particle_3.2s_ease-in-out_infinite] bst:rounded-full',
            dot.primary ? 'bst:bg-primary/70' : 'bst:bg-muted-foreground/50',
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
          className="bst:absolute bst:animate-[bst-particle_3.6s_ease-in-out_infinite] bst:text-primary/80"
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
          'bst:relative bst:grid bst:place-items-center bst:border bst:border-border bst:text-foreground',
          'bst:bg-gradient-to-b bst:from-card bst:to-muted',
          'bst:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(0_0_0/0.08),0_12px_28px_-12px_rgb(0_0_0/0.35)]',
          'bst:[&_svg]:shrink-0',
          compact
            ? 'bst:size-12 bst:rounded-[0.9rem] bst:[&_svg]:size-5'
            : 'bst:size-15 bst:rounded-2xl bst:[&_svg]:size-6',
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
  const hint = description ?? (title === undefined ? messages.noResultsHint : undefined);

  if (size === 'inline') {
    return (
      <div
        className={cn(
          'bst:mx-3 bst:flex bst:animate-[bst-rise_var(--bst-dur-4)_var(--bst-ease-enter)] bst:items-center bst:gap-3 bst:rounded-[12px] bst:border bst:border-dashed bst:border-border bst:bg-muted/25 bst:p-3',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="bst:grid bst:size-9 bst:shrink-0 bst:place-items-center bst:rounded-[10px] bst:border bst:border-border bst:bg-gradient-to-b bst:from-card bst:to-muted bst:text-muted-foreground bst:shadow-[0_1px_2px_rgb(0_0_0/0.06)] bst:[&_svg]:size-4"
        >
          {icon ?? <Inbox aria-hidden="true" />}
        </span>
        <span className="bst:min-w-0 bst:flex-1">
          <p className="bst:text-[12px] bst:leading-snug bst:text-muted-foreground">
            {title ?? messages.noResults}
          </p>
          {hint ? (
            <p className="bst:mt-0.5 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground/80">
              {hint}
            </p>
          ) : null}
          {action ? <div className="bst:mt-2">{action}</div> : null}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bst:flex bst:flex-1 bst:flex-col bst:items-center bst:justify-center bst:text-center',
        'bst:animate-[bst-rise_var(--bst-dur-4)_var(--bst-ease-enter)]',
        // The same floor the other two states hold, so a table does not change
        // height as it moves between loading, empty and broken.
        compact ? 'bst:min-h-72 bst:px-5 bst:py-8' : 'bst:min-h-80 bst:px-6 bst:py-12',
        bordered &&
          'bst:rounded-card bst:border bst:border-dashed bst:border-border bst:bg-muted/20',
        className,
      )}
    >
      <EmptyArt icon={icon ?? <Inbox aria-hidden="true" />} compact={compact} />

      <p
        className={cn(
          'bst:font-semibold bst:text-foreground',
          compact ? 'bst:text-sm' : 'bst:text-base',
        )}
      >
        {title ?? messages.noResults}
      </p>
      {hint ? (
        <p
          className={cn(
            'bst:mt-1.5 bst:max-w-sm bst:leading-relaxed bst:text-muted-foreground',
            compact ? 'bst:text-xs' : 'bst:text-sm',
          )}
        >
          {hint}
        </p>
      ) : null}
      {action ? <div className={compact ? 'bst:mt-4' : 'bst:mt-5'}>{action}</div> : null}
    </div>
  );
}
