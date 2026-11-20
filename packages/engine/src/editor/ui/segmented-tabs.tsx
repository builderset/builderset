'use client';

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '../cn';

export interface SegmentedTab<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** A small count beside the label: issues on a tab, for one. */
  badge?: ReactNode;
}

export interface SegmentedTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  tabs: readonly SegmentedTab<T>[];
  /** The icon above the label rather than beside it: a panel's main switch. */
  stacked?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * A panel's tabs as one segmented strip: the chosen tab is a raised pill that
 * slides — with a little overshoot — to the one picked next.
 *
 * The pill is measured from the selected button rather than computed from an
 * index, so tabs of different widths and a panel that resizes stay right.
 * Arrow keys move between tabs, as a tablist should.
 */
export function SegmentedTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  stacked = false,
  className,
  ...aria
}: SegmentedTabsProps<T>) {
  const list = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);
  // No slide on the first paint: the pill starts where it belongs.
  const [moving, setMoving] = useState(false);

  const measure = useCallback(() => {
    const selected = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selected) setInk({ x: selected.offsetLeft, w: selected.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    measure();
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [measure, value, tabs.length]);

  useLayoutEffect(() => {
    if (!ink || moving) return;
    const frame = requestAnimationFrame(() => {
      setMoving(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [ink, moving]);

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={aria['aria-label']}
      data-slot="segmented-tabs"
      className={cn('bst:relative bst:flex bst:rounded-[12px] bst:bg-muted bst:p-[3px]', className)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const at = tabs.findIndex((tab) => tab.value === value);
        const next = tabs[(at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        if (!next) return;
        event.preventDefault();
        onValueChange(next.value);
        requestAnimationFrame(() => {
          list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
        });
      }}
    >
      {ink ? (
        <span
          aria-hidden="true"
          className={cn(
            'bst:absolute bst:top-[3px] bst:bottom-[3px] bst:left-0 bst:rounded-[9px] bst:bg-card',
            'bst:shadow-[0_1px_2px_rgb(20_23_30/0.1),0_2px_8px_rgb(20_23_30/0.06)]',
            moving &&
              'bst:transition-[transform,width] bst:duration-[420ms] bst:ease-[cubic-bezier(.34,1.25,.5,1)]',
          )}
          style={{ transform: `translateX(${String(ink.x)}px)`, width: ink.w }}
        />
      ) : null}
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onValueChange(tab.value);
            }}
            className={cn(
              'bld-focus bst:relative bst:z-[1] bst:flex bst:min-w-0 bst:flex-1 bst:basis-0 bst:cursor-pointer bst:items-center bst:justify-center bst:rounded-[9px] bst:px-1.5 bst:font-semibold bst:whitespace-nowrap bst:transition-colors bst:duration-200',
              stacked
                ? 'bst:h-12 bst:flex-col bst:gap-[3px] bst:text-[11.5px] bst:[&_svg]:size-[17px]'
                : 'bst:h-8 bst:gap-1.5 bst:text-[12.5px] bst:[&_svg]:size-[15px]',
              'bst:[&_svg]:shrink-0',
              selected
                ? 'bst:text-foreground'
                : 'bst:text-muted-foreground bst:hover:text-foreground',
            )}
          >
            {tab.icon}
            <span className="bst:min-w-0 bst:truncate">{tab.label}</span>
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
