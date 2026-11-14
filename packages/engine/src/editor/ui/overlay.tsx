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
        'fixed inset-0 z-50 bg-[var(--scrim)] backdrop-blur-sm',
        'data-[state=open]:animate-[ui-fade-in_var(--dur-overlay-in)_var(--ease-enter)]',
        'data-[state=closed]:animate-[ui-fade-out_var(--dur-overlay)_var(--ease-exit)]',
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
        'ui-focus absolute top-3 right-3 z-10 rounded-[var(--radius-control)] p-1.5',
        'text-muted-foreground transition-colors duration-(--dur-1)',
        'hover:bg-accent hover:text-foreground',
        ICON_MOTION,
      )}
    >
      <X className="size-4" aria-hidden="true" />
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
          'fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
          // No elevation. The scrim is a near-black in BOTH themes now, so the
          // panel is already the only lit thing on screen — a drop shadow on top
          // of that is separating it from something that has nothing left to be
          // separated from, and in dark mode an outward bloom on a dark panel
          // over a dark scrim just smudges its edge.
          'bg-background flex-col rounded-[var(--radius-card)] outline-none',
          // The panel is capped at the viewport and its BODY scrolls, not the
          // page behind it — otherwise a tall dialog on a short window puts its
          // footer somewhere unreachable.
          'max-h-[calc(100dvh-2rem)]',
          pad === 'md' && 'p-6',
          pad === 'lg' && 'p-8',
          'data-[state=open]:animate-[ui-zoom-in_var(--dur-overlay-in)_var(--ease-enter)]',
          'data-[state=closed]:animate-[ui-zoom-out_var(--dur-overlay)_var(--ease-exit)]',
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
          'bg-card fixed z-50 flex flex-col outline-none',
          side === 'right'
            ? cn(
                // Below `sm` it is a bottom sheet whichever side was asked for:
                // a panel inset from the right on a 360px screen leaves a
                // 40px strip of page nobody can use.
                'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-card)]',
                'sm:inset-y-4 sm:right-4 sm:left-auto sm:max-h-none sm:w-[min(35rem,calc(100vw-2rem))]',
                'sm:rounded-[var(--radius-card)]',
                'data-[state=open]:animate-[ui-slide-in-bottom_var(--dur-overlay-in)_var(--ease-enter)]',
                'data-[state=closed]:animate-[ui-slide-out-bottom_var(--dur-3)_var(--ease-exit)]',
                'sm:data-[state=open]:animate-[ui-slide-in-right_var(--dur-overlay-in)_var(--ease-enter)]',
                'sm:data-[state=closed]:animate-[ui-slide-out-right_var(--dur-3)_var(--ease-exit)]',
              )
            : cn(
                'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-card)]',
                'data-[state=open]:animate-[ui-slide-in-bottom_var(--dur-overlay-in)_var(--ease-enter)]',
                'data-[state=closed]:animate-[ui-slide-out-bottom_var(--dur-3)_var(--ease-exit)]',
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
      className={cn('flex shrink-0 flex-col px-5 py-4 text-left', className)}
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
        'text-foreground pr-8 text-base leading-tight font-semibold tracking-tight',
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
      className={cn('text-muted-foreground mt-1 pr-8 text-sm leading-snug', className)}
      {...props}
    />
  );
}

/** The scrolling middle. The only part of an overlay that scrolls. */
export function OverlayBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="overlay-body"
      className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)}
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
      className={cn('mt-auto flex shrink-0 items-stretch', className)}
      {...props}
    />
  );
}

/** Every button in the action bar: full height, one column, square corners. */
export const barButtonClass =
  'h-12 flex-1 gap-2 rounded-none border-0 text-sm font-semibold focus-visible:outline-offset-[-2px]';
