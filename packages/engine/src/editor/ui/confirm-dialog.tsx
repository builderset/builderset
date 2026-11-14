'use client';

import { AlertTriangle, Check, Info, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useMessages } from '../context';
import { cn } from '../cn';

import { Button } from './button';
import {
  barButtonClass,
  DialogPanel,
  Overlay,
  OverlayDescription,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
} from './overlay';

/**
 * The confirmation. Delete, discard, warn, acknowledge — one component.
 *
 * ── The confirm is a SOLID fill, inverting the button's own rule ─────────────
 * `Button`'s `destructive` variant is a tint, chosen so a delete button in a
 * table row does not shout. That argument does not survive the move into a modal
 * whose entire purpose is one question: here the confirm is the only thing being
 * asked, and a 10% wash beside a filled cancel reads as the DISABLED option. So
 * this uses `danger`, the solid variant, and the pair reads as "this one acts,
 * that one leaves" before either label does.
 *
 * ── Duplicate actions ────────────────────────────────────────────────────────
 * Guarded twice, and both are needed. `busy` disables the buttons, which handles
 * the pointer; a ref lock handles the case the state has not repainted yet —
 * a double-click delivers both events before React commits, and "delete twice"
 * against an idempotent endpoint is a 404 the reader sees as a failure.
 *
 * ── Dismissal ────────────────────────────────────────────────────────────────
 * Escape and the backdrop mean "never mind" and are BLOCKED while the action is
 * in flight: a request that is already sent cannot be recalled by closing the
 * dialog, and dismissing it would leave the reader believing they cancelled.
 * `dismissible: false` blocks them entirely, for the questions whose answer must
 * be a button.
 */

export type ConfirmTone = 'default' | 'destructive' | 'warning' | 'success';

const TONES: Record<ConfirmTone, { badge: string; fill: string; icon: ReactNode }> = {
  default: {
    badge: 'bg-primary/10 text-primary',
    fill: 'bg-primary text-primary-foreground hover:bg-primary/85',
    icon: <Info className="size-7" aria-hidden="true" />,
  },
  destructive: {
    badge: 'bg-destructive/10 text-destructive',
    fill: 'bg-destructive text-destructive-foreground hover:bg-destructive/85',
    icon: <AlertTriangle className="size-7" aria-hidden="true" />,
  },
  // `--warn` and `--ok` carry no foreground token of their own, and
  // `--background` is the right answer rather than a stand-in: near-white in
  // light and near-black in dark, which is exactly the inversion a fill this
  // saturated needs.
  warning: {
    badge: 'bg-warn/10 text-warn',
    fill: 'bg-warn text-background hover:bg-warn/85',
    icon: <AlertTriangle className="size-7" aria-hidden="true" />,
  },
  success: {
    badge: 'bg-ok/10 text-ok',
    fill: 'bg-ok text-background hover:bg-ok/85',
    icon: <Check className="size-7" aria-hidden="true" />,
  },
};

export interface ConfirmDialogProps {
  /** Whether the dialog is shown. */
  open: boolean;
  /**
   * Called with `false` to close it: Cancel, Escape, the backdrop, or a confirm
   * that succeeded.
   */
  onOpenChange: (open: boolean) => void;
  /** The question, as the heading. */
  title: string;
  /** More on what will happen, under the title. */
  description?: ReactNode;
  /** Something to look at before deciding — a list of what is about to go. */
  children?: ReactNode;
  /** The confirm button's text. Default: the editor's word for "Confirm". */
  confirmLabel?: string;
  /** The cancel button's text. Default: the editor's word for "Cancel". */
  cancelLabel?: string;
  /**
   * A third answer — "save a copy", "discard and continue".
   *
   * Some questions genuinely have three, and the alternative is a second dialog
   * behind the first. When present the bar stacks rather than sitting in a row:
   * three full-height buttons side by side are 33% each, which is not enough
   * width for a label that is a verb phrase.
   */
  secondaryLabel?: string;
  /**
   * Called when the third answer is pressed; shown only with `secondaryLabel`.
   * The dialog stays open — close it here if the answer should.
   */
  onSecondary?: () => void;
  /** The colour of the icon disc and the confirm button, and the icon. Default: `'default'`. */
  tone?: ConfirmTone;
  /**
   * Resolves to a message on failure, or nothing on success.
   *
   * A returned string is rendered in the dialog and the dialog STAYS OPEN — the
   * reader is one click from trying again, with the reason in front of them. A
   * dialog that closes on failure and raises a toast somewhere else makes them
   * find their way back to the row first.
   */
  onConfirm: () => Promise<string | null | undefined> | string | null | undefined;
  /** Escape and backdrop. Always blocked while busy, whatever this says. */
  dismissible?: boolean;
  /** Replaces the tone's icon in the disc above the title. */
  icon?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  secondaryLabel,
  onSecondary,
  tone = 'default',
  onConfirm,
  dismissible = true,
  icon,
}: ConfirmDialogProps) {
  const messages = useMessages();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const palette = TONES[tone];
  const hasSecondary = Boolean(secondaryLabel && onSecondary);

  // A dialog reopened for a different row must not still be showing the last
  // one's failure. Reset on open rather than on close, so the message survives
  // the closing animation instead of blanking as the panel slides away.
  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
      lock.current = false;
    }
  }, [open]);

  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const message = await onConfirm();
      if (typeof message === 'string' && message) setError(message);
      else onOpenChange(false);
    } catch {
      setError(messages.somethingWentWrong);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const block = (event: Event) => {
    if (busy || !dismissible) event.preventDefault();
  };

  return (
    <Overlay open={open} onOpenChange={onOpenChange}>
      <DialogPanel
        pad="0"
        hideClose
        closeLabel={messages.close}
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
      >
        <OverlayHeader className="items-center px-8 pt-8 pb-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                // 56px. This is the only graphic in a panel whose whole
                // job is one question, and at 48 it read as an icon beside the
                // title rather than as the thing the title explains.
                'flex size-14 items-center justify-center rounded-full',
                'animate-[ui-zoom-in_var(--dur-3)_var(--ease-enter)]',
                palette.badge,
              )}
            >
              {icon ?? palette.icon}
            </div>
            <OverlayTitle className="pr-0 text-center">{title}</OverlayTitle>
            {description ? (
              <OverlayDescription asChild className="pr-0 text-center">
                <div>{description}</div>
              </OverlayDescription>
            ) : null}
          </div>
        </OverlayHeader>

        {children ? <div className="px-8 pb-6">{children}</div> : null}

        {error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mx-8 mb-6 rounded-[var(--radius-control)] border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        <OverlayFooter className={cn(hasSecondary && 'flex-col-reverse items-stretch')}>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              onOpenChange(false);
            }}
            className={barButtonClass}
            icon={<X aria-hidden="true" />}
          >
            {cancelLabel ?? messages.cancel}
          </Button>
          {hasSecondary ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={onSecondary}
              className={barButtonClass}
            >
              {secondaryLabel}
            </Button>
          ) : null}
          <Button
            loading={busy}
            onClick={() => {
              void confirm();
            }}
            className={cn(barButtonClass, palette.fill)}
            icon={
              tone === 'destructive' ? <Trash2 aria-hidden="true" /> : <Check aria-hidden="true" />
            }
          >
            {confirmLabel ?? messages.confirm}
          </Button>
        </OverlayFooter>
      </DialogPanel>
    </Overlay>
  );
}
