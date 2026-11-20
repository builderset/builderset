'use client';

import { useEffect, useState } from 'react';

/** The headings of the page being read, in order. */
export function pageHeadings(levels = 'h2[id], h3[id]'): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`#bs-article :is(${levels})`));
}

export interface Reading {
  /** The heading the reader is under. */
  active: string | null;
  /** The h2 the reader is under. */
  section: string | null;
  /** How far down the page, 0 to 1. */
  progress: number;
}

/** Where the reader is on the page, updated once a frame while scrolling. */
export function useReading(key: string): Reading {
  const [reading, setReading] = useState<Reading>({ active: null, section: null, progress: 0 });

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const list = pageHeadings();
      const line = 150;
      let active: HTMLElement | null = list[0] ?? null;
      for (const heading of list) if (heading.getBoundingClientRect().top <= line) active = heading;
      const end = document.documentElement.scrollHeight - window.innerHeight;
      if (list.length && window.scrollY >= end - 4) active = list[list.length - 1]!;
      let section: HTMLElement | null = null;
      if (active) {
        for (let i = list.indexOf(active); i >= 0; i -= 1) {
          if (list[i]!.tagName === 'H2') {
            section = list[i]!;
            break;
          }
        }
      }
      const progress = end > 0 ? Math.min(1, Math.max(0, window.scrollY / end)) : 1;
      setReading((current) =>
        current.active === (active?.id ?? null) &&
        current.section === (section?.id ?? null) &&
        Math.abs(current.progress - progress) < 0.005
          ? current
          : { active: active?.id ?? null, section: section?.id ?? null, progress },
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  return reading;
}
