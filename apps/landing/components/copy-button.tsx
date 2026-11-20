'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Copies `text`; if the browser refuses, selects the text next to it instead. */
export function CopyButton({
  text,
  floating = false,
  label,
}: {
  text: string;
  floating?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const classes = ['lp-copy', floating ? 'floating' : '', copied ? 'is-done' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      aria-label={copied ? 'Copied' : 'Copy'}
      onClick={(event) => {
        const button = event.currentTarget;
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 1600);
          },
          () => {
            const target = button.parentElement?.querySelector('pre, code');
            if (!target) return;
            const range = document.createRange();
            range.selectNodeContents(target);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          },
        );
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label ? <span>{copied ? 'Copied' : label}</span> : null}
    </button>
  );
}
