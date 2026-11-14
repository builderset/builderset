'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, type ComponentProps } from 'react';

import { cn } from '../cn';

import { ICON_MOTION } from './button';
import { usePortalContainer } from './portal';
/**
 * The overlay primitives — a centred dialog and a side drawer, one focus trap.
 *
 * A drawer IS a dialog: the semantics are identical (a modal surface over a
 * scrim, with focus trapped inside it), and only the geometry differs. So both
 * are built on `@radix-ui/react-dialog` and share every behaviour that is easy
 * to get wrong — the trap, the scroll lock, the `aria-modal` wiring, Escape, and
 * the layer stack that lets a select inside a drawer close without closing the
 * drawer under it.
 *
 * ── Exit animations actually play ────────────────────────────────────────────
 * Radix keeps the node mounted while `data-state="closed"` as long as an
 * animation is running on it, and removes it when the animation ends. That is
 * why every exit below is an `animate-[…]` rather than a `transition`: a
 * transition has no end event Radix can wait for, so the panel would vanish and
 * the scrim would linger. Rapid open/close is safe for the same reason — the
 * state attribute flips and the running animation is replaced, rather than two
 * timers racing to unmount the same node.
 *
 * ── The bands ────────────────────────────────────────────────────────────────
 * `data-slot="overlay-panel|overlay-header|overlay-footer"` and `data-pad` are
 * read by the theme stylesheet, which is what makes a header and a footer
 * reach the panel's own edges while the body between them keeps its padding.
 * That rule is stated once there rather than per component, because "overlay" is
 * four components here and will be five.
 */

export const Overlay = DialogPrimitive.Root;
export const OverlayTrigger = DialogPrimitive.Trigger;
export const OverlayClose = DialogPrimitive.Close;

function Backdrop({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'bst:fixed bst:inset-0 bst:z-50 bst:bg-(--bst-scrim) bst:backdrop-blur-sm',
        'bst:data-[state=open]:animate-[bst-fade-in_var(--bst-dur-overlay-in)_var(--bst-ease-enter)]',
        'bst:data-[state=closed]:animate-[bst-fade-out_var(--bst-dur-overlay)_var(--bst-ease-exit)]',
        className,
      )}
      {...props}
    />
  );
}

interface PanelProps extends ComponentProps<typeof DialogPrimitive.Content> {
  /** Leaves out the ✕ in the top corner, for a panel that draws its own close. */
  hideClose?: boolean;
  /** The ✕ button's accessible name. */
  closeLabel: string;
  /** Cancels the panel's own padding for the flush bands. See the CSS. */
  pad?: '0' | 'md' | 'lg';
}

/**
 * Focus returns to whatever opened this, even with no trigger.
 *
 * Radix restores focus to its `Trigger`, and an overlay opened from controlled
 * state — which is most of them here, since a row's Edit button sets state
 * rather than wrapping the drawer — has none. Its fallback then leaves focus on
 * `<body>`, so a keyboard reader who closes a drawer is returned to the top of
 * the document and has to tab through the whole shell to get back.
 *
 * The opener is read on OPEN, while focus is still on it. A tick later it is
 * already inside the trap and unreadable.
 */
function useFocusReturn() {
  const opener = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: (event: Event) => {
      const active = typeof document === 'undefined' ? null : document.activeElement;
      opener.current = active instanceof HTMLElement ? active : null;
      // Radix focuses the first focusable child, which in a form drawer is the
      // first input — and focusing an input scrolls a long form to it before the
      // reader has seen the title. The panel itself takes focus instead.
      event.preventDefault();
      (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
    },
    onCloseAutoFocus: (event: Event) => {
      const target = opener.current;
      opener.current = null;
      // Gone from the DOM — the row was deleted, the control unmounted while the
      // drawer was open. Radix's own fallback beats focusing a detached node.
      if (!target?.isConnected) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
    },
  };
}

function CloseButton({ label }: { label: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={label}
      className={cn(
        'bld-focus bst:absolute bst:top-3 bst:right-3 bst:z-10 bst:rounded-control bst:p-1.5',
        'bst:text-muted-foreground bst:transition-colors bst:duration-(--bst-dur-1)',
        'bst:hover:bg-accent bst:hover:text-foreground',
        ICON_MOTION,
      )}
    >
      <X className="bst:size-4" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

/** A centred modal. */
export function DialogPanel({
  className,
  children,
  hideClose,
  closeLabel,
  pad = 'md',
  ...props
}: PanelProps) {
  const focus = useFocusReturn();

  return (
    <DialogPrimitive.Portal container={usePortalContainer()}>
      <Backdrop />
      <DialogPrimitive.Content
        data-slot="overlay-panel"
        data-pad={pad}
        tabIndex={-1}
        {...focus}
        className={cn(
          'bst:fixed bst:top-1/2 bst:left-1/2 bst:z-50 bst:flex bst:w-[calc(100vw-2rem)] bst:max-w-md bst:-translate-x-1/2 bst:-translate-y-1/2',
          // No elevation. The scrim is a near-black in BOTH themes now, so the
          // panel is already the only lit thing on screen — a drop shadow on top
          // of that is separating it from something that has nothing left to be
          // separated from, and in dark mode an outward bloom on a dark panel
          // over a dark scrim just smudges its edge.
          'bst:flex-col bst:rounded-card bst:bg-background bst:outline-none',
          // The panel is capped at the viewport and its BODY scrolls, not the
          // page behind it — otherwise a tall dialog on a short window puts its
          // footer somewhere unreachable.
          'bst:max-h-[calc(100dvh-2rem)]',
          pad === 'md' && 'bst:p-6',
          pad === 'lg' && 'bst:p-8',
          'bst:data-[state=open]:animate-[bst-zoom-in_var(--bst-dur-overlay-in)_var(--bst-ease-enter)]',
          'bst:data-[state=closed]:animate-[bst-zoom-out_var(--bst-dur-overlay)_var(--bst-ease-exit)]',
          className,
        )}
        {...props}
      >
        {hideClose ? null : <CloseButton label={closeLabel} />}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export interface DrawerPanelProps extends PanelProps {
  /** Which edge it comes from. Bottom is the phone shape. */
  side?: 'right' | 'bottom';
}

/**
 * A side panel.
 *
 * ── Full-width on a phone, and from the BOTTOM there ─────────────────────────
 * A 560px panel inset from the right is a desktop shape. On a phone the same
 * component is a sheet that comes up from the bottom edge and fills the width —
 * which is where a thumb is, and which leaves the top of the screen showing
 * enough of the page behind to keep the reader oriented. The direction is a
 * prop rather than a breakpoint because a few surfaces want the sheet on
 * desktop too, but the default `right` switches itself at `sm`.
 */
export function DrawerPanel({
  className,
  children,
  hideClose,
  closeLabel,
  side = 'right',
  pad = '0',
  ...props
}: DrawerPanelProps) {
  const focus = useFocusReturn();

  return (
    <DialogPrimitive.Portal container={usePortalContainer()}>
      <Backdrop />
      <DialogPrimitive.Content
        data-slot="overlay-panel"
        data-pad={pad}
        tabIndex={-1}
        {...focus}
        className={cn(
          // Flat, for the same reason the dialog is — see `DialogPanel`.
          'bst:fixed bst:z-50 bst:flex bst:flex-col bst:bg-card bst:outline-none',
          side === 'right'
            ? cn(
                // Below `sm` it is a bottom sheet whichever side was asked for:
                // a panel inset from the right on a 360px screen leaves a
                // 40px strip of page nobody can use.
                'bst:inset-x-0 bst:bottom-0 bst:max-h-[92dvh] bst:rounded-t-card',
                'bst:sm:inset-y-4 bst:sm:right-4 bst:sm:left-auto bst:sm:max-h-none bst:sm:w-[min(35rem,calc(100vw-2rem))]',
                'bst:sm:rounded-card',
                'bst:data-[state=open]:animate-[bst-slide-in-bottom_var(--bst-dur-overlay-in)_var(--bst-ease-enter)]',
                'bst:data-[state=closed]:animate-[bst-slide-out-bottom_var(--bst-dur-3)_var(--bst-ease-exit)]',
                'bst:sm:data-[state=open]:animate-[bst-slide-in-right_var(--bst-dur-overlay-in)_var(--bst-ease-enter)]',
                'bst:sm:data-[state=closed]:animate-[bst-slide-out-right_var(--bst-dur-3)_var(--bst-ease-exit)]',
              )
            : cn(
                'bst:inset-x-0 bst:bottom-0 bst:max-h-[92dvh] bst:rounded-t-card',
                'bst:data-[state=open]:animate-[bst-slide-in-bottom_var(--bst-dur-overlay-in)_var(--bst-ease-enter)]',
                'bst:data-[state=closed]:animate-[bst-slide-out-bottom_var(--bst-dur-3)_var(--bst-ease-exit)]',
              ),
          className,
        )}
        {...props}
      >
        {hideClose ? null : <CloseButton label={closeLabel} />}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/**
 * The header band. Flush with the panel's edges — the inset belongs to the
 * content inside it, so the rule underneath reaches both corners.
 */
export function OverlayHeader({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      data-slot="overlay-header"
      className={cn(
        'bst:flex bst:shrink-0 bst:flex-col bst:px-5 bst:py-4 bst:text-left',
        className,
      )}
      {...props}
    />
  );
}

export function OverlayTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        // `pr-8` clears the close button, which is positioned absolutely at the
        // panel's corner. On the TITLE rather than on the band, because the band
        // is what has to reach the edges — a title sliding under an ✕ is a
        // collision, not a margin.
        'bst:pr-8 bst:text-base bst:leading-tight bst:font-semibold bst:tracking-tight bst:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function OverlayDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(
        'bst:mt-1 bst:pr-8 bst:text-sm bst:leading-snug bst:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** The scrolling middle. The only part of an overlay that scrolls. */
export function OverlayBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="overlay-body"
      className={cn('bst:min-h-0 bst:flex-1 bst:overflow-y-auto bst:px-5 bst:py-4', className)}
      {...props}
    />
  );
}

/**
 * The footer — an edge-to-edge action bar.
 *
 * `mt-auto` pins it to the bottom when the body is short, so a two-field drawer
 * does not leave its buttons floating in the middle of a tall panel. It never
 * scrolls: the actions have to stay reachable while the body is being read,
 * which on a phone in landscape is the whole reason this is a flex column.
 */
export function OverlayFooter({ className, ...props }: ComponentProps<'footer'>) {
  return (
    <footer
      data-slot="overlay-footer"
      className={cn('bst:mt-auto bst:flex bst:shrink-0 bst:items-stretch', className)}
      {...props}
    />
  );
}

/** Every button in the action bar: full height, one column, square corners. */
export const barButtonClass =
  'bst:h-12 bst:flex-1 bst:gap-2 bst:rounded-none bst:border-0 bst:text-sm bst:font-semibold bst:focus-visible:outline-offset-[-2px]';
