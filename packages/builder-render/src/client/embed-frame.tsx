'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';

/**
 * Click-to-load. Until the reader asks, the provider is not contacted at all —
 * no iframe, no request, no cookie — and the placeholder says whose content
 * would load. The iframe is sandboxed to what a player needs.
 */
export function EmbedFrame({
  src,
  title,
  aspect,
  providerName,
  notice,
  loadLabel,
  inert,
}: {
  src: string;
  title: string;
  aspect: number;
  providerName: string;
  notice: string;
  loadLabel: string;
  /** In the editor: always the placeholder, never the provider. */
  inert?: boolean | undefined;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="bg-muted border-border relative w-full overflow-hidden rounded-[var(--radius-card,0.625rem)] border"
      style={{ aspectRatio: String(aspect) }}
    >
      {loaded && !inert ? (
        <iframe
          src={src}
          title={title || providerName}
          className="absolute inset-0 size-full animate-[ui-fade-in_220ms_ease-out] border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <button
            type="button"
            disabled={inert}
            onClick={() => {
              setLoaded(true);
            }}
            className="group bg-primary text-primary-foreground grid size-14 cursor-pointer place-items-center rounded-full shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-default"
            aria-label={`${loadLabel} — ${providerName}`}
          >
            <Play className="size-6 translate-x-0.5" aria-hidden="true" />
          </button>
          <p className="text-foreground text-sm font-medium">{title || providerName}</p>
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">{notice}</p>
        </div>
      )}
    </div>
  );
}
