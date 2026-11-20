'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { Icon } from './icons';
import { useReading } from './spy';

export interface TocEntry {
  title: ReactNode;
  url: string;
  depth: number;
}

/** "On this page", with a marker that slides to the section being read. */
export function Toc({
  entries,
  markdownUrl,
  editUrl,
}: {
  entries: TocEntry[];
  markdownUrl: string;
  editUrl: string;
}) {
  const pathname = usePathname();
  const reading = useReading(pathname);
  const list = useRef<HTMLOListElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);
  const shown = entries.filter((entry) => entry.depth <= 3);

  useLayoutEffect(() => {
    const link = list.current?.querySelector<HTMLElement>('a.is-active');
    setMarker(link ? { top: link.offsetTop, height: link.offsetHeight } : null);
  }, [reading.active, shown.length]);

  return (
    <aside className="bs-toc" aria-label="On this page">
      {shown.length ? (
        <>
          <h4>On this page</h4>
          <ol ref={list}>
            <span
              className="bs-toc-marker"
              style={marker ? { top: marker.top, height: marker.height, opacity: 1 } : undefined}
            />
            {shown.map((entry) => (
              <li key={entry.url} className={entry.depth >= 3 ? 'l3' : 'l2'}>
                <a
                  href={entry.url}
                  className={`#${reading.active ?? ''}` === entry.url ? 'is-active' : undefined}
                >
                  {entry.title}
                </a>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <div className="bs-toc-actions">
        <CopyMarkdown url={markdownUrl} />
        <a href={editUrl}>
          <Icon name="edit" />
          Edit this page
        </a>
      </div>
    </aside>
  );
}

/** The page as Markdown, for pasting into a chat with an AI assistant. */
function CopyMarkdown({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  return (
    <button
      type="button"
      onClick={() => {
        const text = fetch(url).then((response) => response.text());
        // Safari needs the clipboard write to start inside the click.
        const write =
          typeof ClipboardItem !== 'undefined'
            ? navigator.clipboard.write([
                new ClipboardItem({
                  'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })),
                }),
              ])
            : text.then((t) => navigator.clipboard.writeText(t));
        write.then(
          () => {
            setState('done');
            setTimeout(() => {
              setState('idle');
            }, 1800);
          },
          () => {
            setState('failed');
          },
        );
      }}
    >
      <Icon name={state === 'done' ? 'check' : 'markdown'} />
      {state === 'done'
        ? 'Copied as Markdown'
        : state === 'failed'
          ? 'Could not copy — open it'
          : 'Copy as Markdown'}
    </button>
  );
}

/**
 * Blocks of the page rise in as they come into view, once. Everything already
 * on screen is shown at once, and without script nothing is hidden.
 */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('#bs-article .bs-prose > *'));
    const fold = window.innerHeight;
    for (const block of blocks)
      if (block.getBoundingClientRect().top < fold) block.classList.add('is-in');
    document.documentElement.classList.add('bs-anim');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.02 },
    );
    for (const block of blocks) if (!block.classList.contains('is-in')) observer.observe(block);
    // A link to a section further down: show everything above it.
    const onHash = () => {
      for (const block of blocks) block.classList.add('is-in');
    };
    window.addEventListener('hashchange', onHash);
    if (location.hash) onHash();
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', onHash);
    };
  }, [pathname]);
  return null;
}
