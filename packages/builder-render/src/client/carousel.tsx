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
    <div className="relative">
      <div
        ref={track}
        onScroll={(event) => {
          const element = event.currentTarget;
          const width = element.firstElementChild?.clientWidth ?? 1;
          setIndex(Math.round(element.scrollLeft / Math.max(1, width)));
        }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, slideIndex) => (
          <div key={slideIndex} className="w-[85%] shrink-0 snap-start sm:w-[70%]">
            {slide}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {slides.map((_, dot) => (
            <span
              key={dot}
              className={`h-1.5 rounded-full transition-all duration-300 ${dot === index ? 'bg-primary w-5' : 'bg-border w-1.5'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
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
              className="border-border hover:bg-muted grid size-9 cursor-pointer place-items-center rounded-full border transition-[background-color,scale] active:scale-90 disabled:cursor-default disabled:opacity-40"
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
