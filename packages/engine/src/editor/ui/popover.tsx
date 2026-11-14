'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useRef, useState, type ComponentProps } from 'react';

import { cn } from '../cn';
import { usePortalContainer } from './portal';

/**
 * The floating layers: popover, dropdown menu, tooltip.
 *
 * One file because they share one visual definition — the panel class below —
 * and that is the thing which must not drift. Three separate modules is three
 * places to update a shadow and two of them get forgotten.
 *
 * ── They all work inside a drawer, and that is not automatic ─────────────────
 * Each portals to the body, so none is clipped by the drawer panel's
 * `overflow: hidden`. Radix's own layer stack then keeps the open one above the
 * drawer's focus trap, and — the part that is easy to get wrong by hand —
 * dismissing the popover does NOT dismiss the drawer behind it: Escape is
 * consumed by the topmost layer only.
 */

/** The floating surface, shared by all three. */
const panelClass = cn(
  'bst:z-50 bst:rounded-card bst:border bst:border-border bst:bg-popover bst:text-popover-foreground bst:shadow-pop',
  // Direction-aware, so a menu that had to flip above its trigger animates from
  // below rather than sliding the wrong way out of it.
  'bst:data-[state=open]:animate-[bst-zoom-in_var(--bst-dur-2)_var(--bst-ease-enter)]',
  'bst:data-[state=closed]:animate-[bst-zoom-out_var(--bst-dur-1)_var(--bst-ease-exit)]',
);

// ── Popover ──────────────────────────────────────────────────────────────────

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal container={usePortalContainer()}>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        // `collisionPadding` keeps a popover off the viewport edge, which on a
        // phone is the difference between a readable panel and one with its
        // right-hand column cut off.
        collisionPadding={8}
        className={cn(panelClass, 'bst:w-72 bst:p-4 bst:outline-none', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

// ── Dropdown menu ────────────────────────────────────────────────────────────

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal container={usePortalContainer()}>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          panelClass,
          'bst:min-w-44 bst:overflow-hidden bst:p-1',
          // The menu is a scroller when it is taller than the space it has;
          // without this it simply overflows the viewport and the last items
          // are unreachable.
          'bst:max-h-(--radix-dropdown-menu-content-available-height) bst:overflow-y-auto',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  /** Draws the item in the destructive colour — for a delete. */
  destructive?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-destructive={destructive ? true : undefined}
      className={cn(
        'bst:relative bst:flex bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-control',
        'bst:px-2.5 bst:py-1.5 bst:text-sm bst:outline-none bst:select-none',
        // `highlighted` covers pointer and keyboard together, so arrowing
        // through a menu looks the same as hovering it.
        'bst:data-highlighted:bg-accent bst:data-highlighted:text-accent-foreground',
        'bst:data-[destructive=true]:text-destructive bst:data-[destructive=true]:data-highlighted:bg-destructive/10',
        'bst:data-disabled:pointer-events-none bst:data-disabled:text-muted-foreground',
        "bst:[&_svg]:pointer-events-none bst:[&_svg]:shrink-0 bst:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        'bst:px-2.5 bst:py-1.5 bst:text-xs bst:font-semibold bst:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('bst:-mx-1 bst:my-1 bst:h-px bst:bg-border', className)}
      {...props}
    />
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

/**
 * Mounted once, at the root of the app.
 *
 * Radix needs a provider for the shared open/close delay — the behaviour where
 * moving between two tooltipped buttons shows the second immediately instead of
 * waiting again. Without it each tooltip has its own timer and a toolbar feels
 * sticky.
 */
export function TooltipProvider({
  delayDuration = 400,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export interface TooltipProps {
  /** What the tooltip says. */
  content: React.ReactNode;
  /** The trigger: one element that can hold a ref, such as a button. */
  children: React.ReactNode;
  /** Which side of the trigger it opens on. Default: `'top'`. */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * A tooltip is a HINT, never the only place something is said.
 *
 * It does not appear on touch — there is no hover to trigger it — and it is not
 * reliably announced by every screen reader. So an icon-only button carries an
 * `aria-label` as well, and this repeats it visually rather than replacing it.
 */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  /**
   * Open only when the reader actually asked for it.
   *
   * ── The bug this exists for ─────────────────────────────────────────────
   * Radix opens a tooltip on the trigger's `focus`, and a dialog RESTORES focus
   * to whatever opened it when it closes. So pressing a row action, saving, and
   * watching the drawer go left the tooltip hanging over a table the pointer
   * was nowhere near — and it stayed until something else took focus, because
   * no `pointerleave` was ever coming for a pointer that had not entered.
   *
   * Uncontrolled, Radix cannot tell the two apart: a focus is a focus. So the
   * state is held here and an open is refused unless the trigger is genuinely
   * under the pointer or genuinely keyboard-focused. `:focus-visible` is doing
   * the real work — the browser already tracks input modality, so focus
   * restored after a mouse click does not match it while focus restored after
   * an Enter press does, which is exactly the line a hint should be drawn on.
   */
  function requestOpen(next: boolean) {
    if (!next) {
      setOpen(false);
      return;
    }
    const trigger = triggerRef.current;
    if (trigger && !trigger.matches(':hover') && !trigger.matches(':focus-visible')) return;
    setOpen(true);
  }

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={requestOpen}>
      <TooltipPrimitive.Trigger asChild ref={triggerRef}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal container={usePortalContainer()}>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            panelClass,
            'bst:max-w-64 bst:bg-foreground bst:px-2.5 bst:py-1.5 bst:text-xs bst:font-medium bst:text-background',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
