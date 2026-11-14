'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Copies a code block, and says so for two seconds. */
export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
        });
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-control inline-flex h-7 cursor-pointer items-center gap-1.5 px-2 text-xs font-medium transition-colors"
      aria-live="polite"
    >
      {copied ? (
        <Check className="size-3.5 animate-[bst-pop_220ms_ease-out]" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {copied ? done : label}
    </button>
  );
}
