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
      className="bst:relative bst:w-full bst:overflow-hidden bst:rounded-card bst:border bst:border-border bst:bg-muted"
      style={{ aspectRatio: String(aspect) }}
    >
      {loaded && !inert ? (
        <iframe
          src={src}
          title={title || providerName}
          className="bst:absolute bst:inset-0 bst:size-full bst:animate-[bst-fade-in_220ms_ease-out] bst:border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="bst:absolute bst:inset-0 bst:flex bst:flex-col bst:items-center bst:justify-center bst:gap-3 bst:p-6 bst:text-center">
          <button
            type="button"
            disabled={inert}
            onClick={() => {
              setLoaded(true);
            }}
            className="bst:group bst:grid bst:size-14 bst:cursor-pointer bst:place-items-center bst:rounded-full bst:bg-primary bst:text-primary-foreground bst:shadow-lg bst:transition-transform bst:duration-200 bst:hover:scale-105 bst:active:scale-95 bst:disabled:cursor-default"
            aria-label={`${loadLabel} — ${providerName}`}
          >
            <Play className="bst:size-6 bst:translate-x-0.5" aria-hidden="true" />
          </button>
          <p className="bst:text-sm bst:font-medium bst:text-foreground">{title || providerName}</p>
          <p className="bst:max-w-xs bst:text-xs bst:leading-relaxed bst:text-muted-foreground">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
}
