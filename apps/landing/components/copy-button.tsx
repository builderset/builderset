'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ text, floating = false }: { text: string; floating?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={floating ? 'bs-copy floating' : 'bs-copy'}
      aria-label={copied ? 'Copied' : 'Copy'}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 1600);
        });
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
