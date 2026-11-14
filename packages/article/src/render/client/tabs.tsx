'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '../cn';

/**
 * Tabs, with the WAI-ARIA keyboard pattern: arrows move between tabs, Home and
 * End jump to the ends, and only the active tab is in the tab order. Every
 * panel stays in the DOM (hidden), so the page's text is all there for search
 * and for find-in-page.
 */
export function TabsIsland({
  titles,
  panels,
  align,
}: {
  titles: string[];
  panels: ReactNode[];
  align: 'start' | 'center' | 'stretch';
}) {
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const next = (index + titles.length) % titles.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') focusTab(active + 1);
    else if (event.key === 'ArrowLeft') focusTab(active - 1);
    else if (event.key === 'Home') focusTab(0);
    else if (event.key === 'End') focusTab(titles.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className={cn(
          'bst:flex bst:gap-1 bst:overflow-x-auto bst:border-b bst:border-border',
          align === 'center' && 'bst:justify-center',
        )}
      >
        {titles.map((title, index) => (
          <button
            key={`${base}-${String(index)}`}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${String(index)}`}
            aria-selected={index === active}
            aria-controls={`${base}-panel-${String(index)}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => {
              setActive(index);
            }}
            className={cn(
              'bst:relative bst:-mb-px bst:cursor-pointer bst:px-4 bst:py-2.5 bst:text-sm bst:font-medium bst:whitespace-nowrap bst:transition-colors',
              'bst:after:absolute bst:after:inset-x-2 bst:after:bottom-0 bst:after:h-0.5 bst:after:scale-x-0 bst:after:rounded-full bst:after:bg-primary bst:after:transition-transform bst:after:duration-200',
              align === 'stretch' && 'bst:flex-1',
              index === active
                ? 'bst:text-foreground bst:after:scale-x-100'
                : 'bst:text-muted-foreground bst:hover:text-foreground',
            )}
          >
            {title}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <div
          key={`${base}-panel-${String(index)}`}
          role="tabpanel"
          id={`${base}-panel-${String(index)}`}
          aria-labelledby={`${base}-tab-${String(index)}`}
          hidden={index !== active}
          tabIndex={0}
          className="bst:animate-[bst-fade-in_200ms_ease-out] bst:pt-5 bst:outline-none"
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
