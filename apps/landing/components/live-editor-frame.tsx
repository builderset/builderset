'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// The editor runs in the browser only, and is the heavy part of this page: it
// is fetched when its frame comes near the screen, never for a phone.
const LiveEditor = dynamic(() => import('./live-editor').then((module) => module.LiveEditor), {
  ssr: false,
  loading: () => <Assembling />,
});

export function LiveEditorFrame({ playground }: { playground: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => {
      setWide(query.matches);
    };
    update();
    query.addEventListener('change', update);
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', update);
    };
  }, []);

  return (
    <div className="bs-window">
      <div className="bs-window-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <p>your-app.com/emails/welcome/edit</p>
      </div>
      <div ref={frame} className="bs-frame">
        {wide ? (
          near ? (
            <LiveEditor />
          ) : (
            <Assembling />
          )
        ) : (
          <div className="bs-narrow">
            <Assembling />
            <p>
              The editor is made for a larger screen. <a href={playground}>Open the playground</a>{' '}
              on one, or keep reading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** A document assembling itself from blocks, while the editor loads. */
function Assembling() {
  return (
    <div className="bs-assembling" aria-label="Loading the editor">
      <div className="bs-doc">
        <span className="row r1" />
        <span className="row r2" />
        <span className="split">
          <span className="cell c1" />
          <span className="cell c2" />
        </span>
        <span className="row r3" />
        <span className="btn" />
      </div>
    </div>
  );
}
