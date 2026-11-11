'use client';

import { ChevronsLeftRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/**
 * Two pictures, one clipped over the other, with a handle between them. The
 * handle is a real `range` input under the hood — so it is keyboard- and
 * screen-reader-operable without any code of its own — laid invisibly over
 * the whole picture so a drag anywhere moves it.
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
  handleLabel,
  start,
}: {
  before: ReactNode;
  after: ReactNode;
  beforeLabel: string;
  afterLabel: string;
  handleLabel: string;
  start: number;
}) {
  const [position, setPosition] = useState(start);

  return (
    <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card,0.625rem)] select-none">
      <div className="absolute inset-0 [&>*]:size-full [&>*]:object-cover">{after}</div>
      <div
        className="absolute inset-0 [&>*]:size-full [&>*]:object-cover"
        style={{ clipPath: `inset(0 ${String(100 - position)}% 0 0)` }}
      >
        {before}
      </div>

      <span className="bg-background/85 text-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur">
        {beforeLabel}
      </span>
      <span className="bg-background/85 text-foreground absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur">
        {afterLabel}
      </span>

      <div
        aria-hidden="true"
        className="bg-background pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
        style={{ left: `${String(position)}%` }}
      >
        <span className="bg-background text-foreground absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-lg">
          <ChevronsLeftRight className="size-4" />
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        aria-label={handleLabel}
        onChange={(event) => {
          setPosition(Number(event.target.value));
        }}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
