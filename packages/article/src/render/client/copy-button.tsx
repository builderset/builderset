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
      className="bst:inline-flex bst:h-7 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-control bst:px-2 bst:text-xs bst:font-medium bst:text-muted-foreground bst:transition-colors bst:hover:bg-muted bst:hover:text-foreground"
      aria-live="polite"
    >
      {copied ? (
        <Check className="bst:size-3.5 bst:animate-[bst-pop_220ms_ease-out]" aria-hidden="true" />
      ) : (
        <Copy className="bst:size-3.5" aria-hidden="true" />
      )}
      {copied ? done : label}
    </button>
  );
}
