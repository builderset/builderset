'use client';

import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

import { cn } from '../cn';

/**
 * A number with its own − and + inside the box.
 *
 * Typing accepts digits, one decimal point (a comma counts as one) and — only
 * when the range goes below zero — a leading minus; anything else never reaches
 * the box. A value is committed as soon as it is a number inside the range, so
 * the canvas follows the typing, and clamped on blur.
 *
 * The figure rolls with the change: going up, the new one drops in from above;
 * going down, it rises from below. Holding a button keeps stepping.
 */
export interface NumberStepperProps {
  /** The number shown; empty shows a dash. */
  value: number | null | undefined;
  /**
   * Called on each step, as soon as a typed value is a number in range, and
   * with `null` when a `nullable` box is cleared.
   */
  onChange: (value: number | null) => void;
  /** The lowest value. Stepping stops there, and a typed value is clamped to it on blur. */
  min?: number | undefined;
  /** The highest value. Stepping stops there, and a typed value is clamped to it on blur. */
  max?: number | undefined;
  /** 1 by default; 0.1 steps (and rounds) to one decimal. */
  step?: number | undefined;
  /** Whole numbers only — the decimal point is refused while typing. */
  integer?: boolean | undefined;
  /** Clearing the box means "no value" rather than snapping back. */
  nullable?: boolean | undefined;
  /** Shown after the figure while not editing — "px", "min". */
  suffix?: string | undefined;
  /** The input's id, so a label can point at it. */
  id?: string | undefined;
  /** The accessible name, when there is no visible label. */
  'aria-label'?: string | undefined;
  /** The − button's accessible name and tooltip. Default: `'Decrease'`. */
  decreaseLabel?: string | undefined;
  /** The + button's accessible name and tooltip. Default: `'Increase'`. */
  increaseLabel?: string | undefined;
  /** `sm` is a shorter box with narrower buttons, for tight rows. Default: `'md'`. */
  size?: 'md' | 'sm';
  /** Applied to the outer box. */
  className?: string | undefined;
}

const HOLD_DELAY = 380;
const HOLD_EVERY = 70;

function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  integer = false,
  nullable = false,
  suffix,
  id,
  'aria-label': ariaLabel,
  decreaseLabel = 'Decrease',
  increaseLabel = 'Increase',
  size = 'md',
  className,
}: NumberStepperProps) {
  const reduceMotion = useReducedMotion();
  const decimals = integer ? 0 : decimalsOf(step);
  const current = typeof value === 'number' && Number.isFinite(value) ? value : null;

  /** Into range, and — for a step — rid of float noise (0.1 + 0.2). */
  const tidy = (next: number, precision?: number) => {
    let result = integer ? Math.round(next) : next;
    if (!integer && precision !== undefined) result = Number(result.toFixed(precision));
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };
  /** A typed 1.25 stays 1.25; a 0.1-step value always shows its one decimal. */
  const format = (next: number | null) =>
    next === null
      ? ''
      : integer
        ? String(next)
        : next.toFixed(Math.max(decimals, decimalsOf(next)));
  const stepped = (base: number, by: number) =>
    tidy(base + by, Math.max(decimals, decimalsOf(base)));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // Which way the figure moved, worked out when the value changes — during
  // render, so the animation that follows already knows its direction.
  const [shown, setShown] = useState<{ value: number | null; direction: 1 | -1 }>({
    value: current,
    direction: 1,
  });
  if (shown.value !== current) {
    setShown({
      value: current,
      direction: (current ?? 0) >= (shown.value ?? 0) ? 1 : -1,
    });
  }

  // The latest value for the hold-to-repeat timer, which outlives renders.
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  }, [current]);
  const timers = useRef<{ delay?: number | undefined; repeat?: number | undefined }>({});
  const stopHold = () => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    timers.current.delay = undefined;
    timers.current.repeat = undefined;
  };
  useEffect(() => {
    const held = timers.current;
    return () => {
      window.clearTimeout(held.delay);
      window.clearInterval(held.repeat);
    };
  }, []);

  // The select-all on focus waits a frame (a click's own mouseup would undo it
  // sooner). Typing that lands before the frame cancels it: selecting then
  // would put the next keystroke over the characters already typed.
  const selectFrame = useRef<number | undefined>(undefined);
  const cancelSelect = () => {
    if (selectFrame.current !== undefined) cancelAnimationFrame(selectFrame.current);
    selectFrame.current = undefined;
  };
  useEffect(() => cancelSelect, []);

  const stepBy = (direction: 1 | -1) => {
    const base = latest.current ?? (direction > 0 ? (min ?? 0) - step : (max ?? 0) + step);
    const next = stepped(base, direction * step);
    if (next === latest.current) return;
    latest.current = next;
    // Stepping while the box is being typed in keeps what it shows in step.
    setDraft(format(next));
    onChange(next);
  };

  const startHold = (direction: 1 | -1) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    stepBy(direction);
    stopHold();
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(() => {
        stepBy(direction);
      }, HOLD_EVERY);
    }, HOLD_DELAY);
  };

  const allowsNegative = min === undefined || min < 0;
  const pattern = integer
    ? allowsNegative
      ? /^-?\d*$/
      : /^\d*$/
    : allowsNegative
      ? /^-?\d*[.,]?\d*$/
      : /^\d*[.,]?\d*$/;

  const commit = () => {
    const text = draft.replace(',', '.').trim();
    if (text === '' || text === '-' || text === '.') {
      if (nullable) onChange(null);
    } else {
      const parsed = Number(text);
      if (Number.isFinite(parsed)) {
        const next = tidy(parsed);
        if (next !== current) onChange(next);
      }
    }
    setEditing(false);
  };

  const atMin = current !== null && min !== undefined && current <= min;
  const atMax = current !== null && max !== undefined && current >= max;
  const height = size === 'sm' ? 'h-7' : 'h-[30px]';
  const button = cn(
    'text-muted-foreground flex shrink-0 cursor-pointer items-center justify-center transition-colors',
    'hover:bg-accent hover:text-foreground active:scale-90 disabled:cursor-not-allowed disabled:opacity-35',
    'disabled:hover:bg-transparent [&_svg]:size-3.5',
    size === 'sm' ? 'w-6' : 'w-7',
  );
  const variants = {
    enter: (direction: number) => ({ y: direction > 0 ? '-100%' : '100%', opacity: 0 }),
    center: { y: '0%', opacity: 1 },
    exit: (direction: number) => ({ y: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  };

  return (
    <div
      data-slot="number-stepper"
      className={cn(
        'border-input bg-background focus-within:ring-ring/40 rounded-control flex w-full min-w-0 items-stretch overflow-hidden border focus-within:ring-2',
        height,
        className,
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={decreaseLabel}
        title={decreaseLabel}
        disabled={atMin}
        onPointerDown={startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        className={cn(button, 'border-input border-r')}
      >
        <Minus aria-hidden="true" />
      </button>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <input
          id={id}
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          autoComplete="off"
          aria-label={ariaLabel}
          role="spinbutton"
          aria-valuenow={current ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          value={editing ? draft : format(current)}
          onFocus={(event) => {
            setDraft(format(current));
            setEditing(true);
            const input = event.currentTarget;
            cancelSelect();
            selectFrame.current = requestAnimationFrame(() => {
              selectFrame.current = undefined;
              input.select();
            });
          }}
          onBlur={commit}
          onChange={(event) => {
            cancelSelect();
            const text = event.target.value;
            if (!pattern.test(text)) return;
            setDraft(text);
            const parsed = Number(text.replace(',', '.'));
            if (text.trim() === '' || !Number.isFinite(parsed)) return;
            const inRange =
              (min === undefined || parsed >= min) && (max === undefined || parsed <= max);
            if (inRange) onChange(integer ? Math.round(parsed) : parsed);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            else if (event.key === 'Escape') {
              setDraft(format(current));
              setEditing(false);
              event.currentTarget.blur();
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              const direction = event.key === 'ArrowUp' ? 1 : -1;
              const times = event.shiftKey ? 10 : 1;
              const base = current ?? min ?? 0;
              const next = stepped(base, direction * step * times);
              setDraft(format(next));
              if (next !== current) onChange(next);
            }
          }}
          className={cn(
            'absolute inset-0 h-full w-full bg-transparent px-1 text-center text-xs tabular-nums outline-none',
            // While not editing, the rolling figure below is what is seen.
            !editing && 'text-transparent',
          )}
        />
        {!editing ? (
          <AnimatePresence initial={false} custom={shown.direction}>
            <motion.span
              key={format(current)}
              custom={shown.direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }
              }
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center gap-0.5 text-xs tabular-nums"
            >
              {current === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  {format(current)}
                  {suffix ? <span className="text-muted-foreground">{suffix}</span> : null}
                </>
              )}
            </motion.span>
          </AnimatePresence>
        ) : null}
      </div>

      <button
        type="button"
        tabIndex={-1}
        aria-label={increaseLabel}
        title={increaseLabel}
        disabled={atMax}
        onPointerDown={startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        className={cn(button, 'border-input border-l')}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
