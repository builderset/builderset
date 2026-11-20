'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';

import { Icon } from './icons';

const REGION = /^\s*(\/\/|#|\/\*|<!--)\s*#?(end)?region\b/;

/** A code block: the file's name above it when it has one, and a copy button. */
export function CodeBlock({
  title,
  children,
  ...props
}: ComponentProps<'pre'> & { title?: string }) {
  const pre = useRef<HTMLPreElement>(null);
  const [done, setDone] = useState(false);

  // A whole file included on a page keeps its `// #region` markers (they are
  // how other pages include part of it): hide them here.
  useEffect(() => {
    for (const line of pre.current?.querySelectorAll<HTMLElement>('.line') ?? []) {
      if (REGION.test(line.textContent ?? '')) line.hidden = true;
    }
  }, []);
  const lines = () => {
    const shown = Array.from(pre.current?.querySelectorAll<HTMLElement>('.line') ?? []).filter(
      (line) => !line.hidden,
    );
    return shown.length
      ? shown.map((line) => line.textContent).join('\n')
      : (pre.current?.textContent ?? '');
  };
  const copy = (
    <button
      type="button"
      className={['bs-copy', title ? null : 'floating', done ? 'is-done' : null]
        .filter(Boolean)
        .join(' ')}
      aria-label={done ? 'Copied' : 'Copy the code'}
      onClick={() => {
        const text = lines();
        navigator.clipboard.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => {
              setDone(false);
            }, 1600);
          },
          () => {
            // The clipboard is refused: select the code so it can be copied by hand.
            const range = document.createRange();
            if (pre.current) range.selectNodeContents(pre.current);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          },
        );
      }}
    >
      <Icon name={done ? 'check' : 'copy'} />
      {title ? (done ? 'Copied' : 'Copy') : null}
    </button>
  );
  return (
    <figure className="bs-code">
      {title ? (
        <figcaption className="bs-code-h">
          <span className="file">{title}</span>
          {copy}
        </figcaption>
      ) : (
        copy
      )}
      <pre ref={pre} {...props}>
        {children}
      </pre>
    </figure>
  );
}
