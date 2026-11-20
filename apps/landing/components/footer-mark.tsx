'use client';

import { useRef } from 'react';

/** The giant wordmark at the foot of the page; it lights up under the pointer. */
export function FooterMark() {
  const mark = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={mark}
      className="lp-footer-mark"
      data-reveal
      aria-hidden="true"
      onPointerMove={(event) => {
        const element = mark.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--mx', `${String(event.clientX - rect.left)}px`);
        element.style.setProperty('--my', `${String(event.clientY - rect.top)}px`);
        element.style.setProperty('--glow', '1');
      }}
      onPointerLeave={() => {
        mark.current?.style.setProperty('--glow', '0');
      }}
    >
      <span>Builderset</span>
    </div>
  );
}
