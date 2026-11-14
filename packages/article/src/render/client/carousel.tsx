'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

/**
 * A scroll-snap carousel. The slides are ordinary content in a scroller, so a
 * finger swipes it, a trackpad scrolls it and the keyboard reaches every
 * slide with Tab — the buttons are a convenience on top, not the mechanism.
 */
export function Carousel({
  slides,
  previous,
  next,
}: {
  slides: ReactNode[];
  previous: string;
  next: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (to: number) => {
    const element = track.current;
    if (!element) return;
    const target = Math.max(0, Math.min(slides.length - 1, to));
    const slide = element.children.item(target) as HTMLElement | null;
    slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setIndex(target);
  };

  return (
    <div className="bst:relative">
      <div
        ref={track}
        onScroll={(event) => {
          const element = event.currentTarget;
          const width = element.firstElementChild?.clientWidth ?? 1;
          setIndex(Math.round(element.scrollLeft / Math.max(1, width)));
        }}
        className="bst:flex bst:snap-x bst:snap-mandatory bst:[scrollbar-width:none] bst:gap-3 bst:overflow-x-auto bst:scroll-smooth bst:pb-2 bst:[&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, slideIndex) => (
          <div key={slideIndex} className="bst:w-[85%] bst:shrink-0 bst:snap-start bst:sm:w-[70%]">
            {slide}
          </div>
        ))}
      </div>
      <div className="bst:mt-3 bst:flex bst:items-center bst:justify-between bst:gap-3">
        <div className="bst:flex bst:gap-1.5" aria-hidden="true">
          {slides.map((_, dot) => (
            <span
              key={dot}
              className={`bst:h-1.5 bst:rounded-full bst:transition-all bst:duration-300 ${dot === index ? 'bst:w-5 bst:bg-primary' : 'bst:w-1.5 bst:bg-border'}`}
            />
          ))}
        </div>
        <div className="bst:flex bst:gap-2">
          {[
            { label: previous, to: index - 1, Icon: ChevronLeft, disabled: index === 0 },
            {
              label: next,
              to: index + 1,
              Icon: ChevronRight,
              disabled: index >= slides.length - 1,
            },
          ].map(({ label, to, Icon, disabled }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              disabled={disabled}
              onClick={() => {
                go(to);
              }}
              className="bst:grid bst:size-9 bst:cursor-pointer bst:place-items-center bst:rounded-full bst:border bst:border-border bst:transition-[background-color,scale] bst:hover:bg-muted bst:active:scale-90 bst:disabled:cursor-default bst:disabled:opacity-40"
            >
              <Icon className="bst:size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
