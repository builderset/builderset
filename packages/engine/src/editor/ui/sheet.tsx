'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useMessages } from '../context';
import { cn } from '../cn';

import { ICON_MOTION } from './button';
import {
  DrawerPanel,
  Overlay,
  OverlayClose,
  OverlayBody,
  OverlayDescription,
  OverlayHeader,
  OverlayTitle,
} from './overlay';

/**
 * A sheet from the bottom edge, for one decision.
 *
 * ── Why a phone gets this and not the dropdown ───────────────────────────────
 * A dropdown anchored under a 36px circle in the top-right corner opens at the
 * far end of the screen from the thumb holding the phone, and it has room for a
 * flag and a word. A sheet comes up from the edge the hand is already at, and
 * has the width to say what each choice actually changes — which is the
 * difference between a menu and something worth opening. The public site
 * already answers this question this way; the back office is the same product.
 *
 * ── One sheet, one question ──────────────────────────────────────────────────
 * Language and appearance are two unrelated decisions, so they do not share a
 * panel. Stacked into one they became two unlabelled lists in a box, with the
 * reader left to work out from the flags which was which — and neither could
 * afford a title or a caption. Split, each gets both, and the topbar keeps the
 * same affordances it has on a desktop so the mental model does not change with
 * the viewport.
 *
 * ── Built on `DrawerPanel`, not on a second implementation ───────────────────
 * The bottom sheet IS the drawer's phone shape — `DrawerPanel` already goes to
 * `side="bottom"` below `sm`. Reusing it means one focus trap, one scroll lock,
 * one Escape handler and one set of exit animations, and it inherits the staged
 * content entrance in the theme stylesheet for free. A site without Radix draws its own
 * with `motion` because it has no Radix; this does not need a dependency to
 * arrive at the same panel.
 */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** What is being chosen. Also the panel's accessible name. */
  title: string;
  /** One sentence on what the choice actually changes. */
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, description, children, className }: SheetProps) {
  const messages = useMessages();

  return (
    <Overlay
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerPanel
        side="bottom"
        // The panel's own close sits in its top corner, above the grabber and
        // out of line with the heading. The sheet draws its own, in the
        // header row — see below.
        hideClose
        closeLabel={messages.close}
        className={cn(
          // A sheet's top corners are rounder than a card's. It is a surface
          // sliding up over the page rather than a panel sitting on it, and the
          // curve is what says which edge it came from — so this is a literal
          // rather than `--radius-card`, which is solved for a dense table.
          'max-h-[85dvh] rounded-t-[1.5rem]',
          className,
        )}
      >
        {/* The grabber. It is not draggable — it is the affordance that says
            which edge this came from and that it goes back there, which is what
            makes the panel read as a sheet rather than as something permanently
            docked to the bottom of the screen. */}
        <span
          aria-hidden="true"
          className="bg-border-strong mt-3 block h-1 w-9 shrink-0 self-center rounded-full"
        />

        {/* The heading and the close, as one row: the button is centred
            against the title AND the description together, so it lines up
            with the block it closes rather than with its first line.
            Vertical room on both sides — the header draws its own rule
            underneath (see `base.css`), and at `pb-0` the description sat on
            that line. */}
        <OverlayHeader className="flex-row items-center gap-3 px-4 py-0 pt-5 pb-6">
          <div className="flex min-w-0 flex-1 flex-col">
            <OverlayTitle className="text-base leading-tight">{title}</OverlayTitle>
            {description ? (
              <OverlayDescription className="mt-0.5 pr-0 text-xs leading-snug">
                {description}
              </OverlayDescription>
            ) : null}
          </div>
          <OverlayClose
            aria-label={messages.close}
            className={cn(
              'ui-focus text-muted-foreground hover:text-foreground hover:bg-accent border-border grid size-9 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-control)] border',
              'transition-[background-color,color,scale] duration-(--dur-2) active:scale-90',
              ICON_MOTION,
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </OverlayClose>
        </OverlayHeader>

        <OverlayBody className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </OverlayBody>
      </DrawerPanel>
    </Overlay>
  );
}

export interface SheetOptionProps {
  icon?: ReactNode;
  name: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One choice in a sheet.
 *
 * An icon, a name and a line of explanation. It stays captioned at this size —
 * "Match system" means nothing to most people until it says that it follows the
 * phone — but the row is tight enough that three options are on screen at once,
 * which is what makes it a choice rather than a list to scroll.
 */
export function SheetOption({ icon, name, description, selected, onSelect }: SheetOptionProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={cn(
          'ui-focus flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3 text-left',
          'transition-colors duration-(--dur-2)',
          selected
            ? 'border-primary/50 bg-primary/8'
            : 'border-border bg-background active:bg-accent',
        )}
      >
        {icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full',
              selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{name}</span>
          {description ? (
            <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
              {description}
            </span>
          ) : null}
        </span>

        {/* A filled dot rather than a tick: it is a radio group — exactly one is
            always on — and a tick reads as "applied" rather than as "selected". */}
        <span
          aria-hidden="true"
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-primary' : 'border-border-strong',
          )}
        >
          {selected ? <span className="bg-primary size-1.5 rounded-full" /> : null}
        </span>
      </button>
    </li>
  );
}

/**
 * A row in a sheet that DOES something rather than selecting something.
 *
 * Sign out, open the profile. Same geometry as `SheetOption` so a sheet mixing
 * the two reads as one list, minus the radio dot — there is nothing to be the
 * current one of.
 */
export function SheetAction({
  icon,
  name,
  description,
  destructive,
  onSelect,
}: {
  icon?: ReactNode;
  name: string;
  description?: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'ui-focus flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-3 text-left',
          'transition-colors duration-(--dur-2)',
          destructive
            ? 'border-destructive/30 bg-destructive/5 active:bg-destructive/10'
            : 'border-border bg-background active:bg-accent',
        )}
      >
        {icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              destructive ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm font-semibold', destructive && 'text-destructive')}>
            {name}
          </span>
          {description ? (
            <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
