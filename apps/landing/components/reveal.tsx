'use client';

import { useEffect } from 'react';

/**
 * Marks each `[data-reveal]` block `.is-in` as it scrolls into view, once.
 * The blocks wait only while `html.lp-anim` is set (see HEAD_SCRIPT), so the
 * page reads in full without a script and with reduced motion.
 */
export function Reveal() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      for (const block of blocks) block.classList.add('is-in');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    for (const block of blocks) observer.observe(block);
    return () => {
      observer.disconnect();
    };
  }, []);
  return null;
}
