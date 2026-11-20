'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const Inner = dynamic(
  () => import('./hero-editor-inner').then((module) => module.HeroEditorInner),
  { ssr: false, loading: () => <Placeholder /> },
);

/** The size the editor is laid out at; it is scaled down to fit, never squeezed. */
const WIDTH = 1280;
const HEIGHT = 780;

/**
 * The hero's product shot is the real editor — so it is always the builders'
 * current design — laid out at a desktop size and scaled to the space it has.
 * It is `inert`: shown, not used. The live editor further down is the one to try.
 */
export function HeroEditor() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const fit = () => {
      setScale(element.clientWidth / WIDTH);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="lp-shot" style={{ height: scale ? HEIGHT * scale : undefined }}>
      <div
        className="lp-shot-frame"
        inert
        aria-hidden="true"
        style={{
          width: WIDTH,
          height: HEIGHT,
          transform: `scale(${String(scale)})`,
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        <Inner />
      </div>
    </div>
  );
}

function Placeholder() {
  return <div className="lp-shot-wait" />;
}
