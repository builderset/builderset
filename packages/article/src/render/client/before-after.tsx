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
    <div className="bst:relative bst:aspect-[16/10] bst:w-full bst:overflow-hidden bst:rounded-card bst:bg-muted bst:select-none">
      <div className="bst:absolute bst:inset-0 bst:[&>*]:size-full bst:[&>*]:object-cover">
        {after}
      </div>
      <div
        className="bst:absolute bst:inset-0 bst:[&>*]:size-full bst:[&>*]:object-cover"
        style={{ clipPath: `inset(0 ${String(100 - position)}% 0 0)` }}
      >
        {before}
      </div>

      <span className="bst:absolute bst:top-3 bst:left-3 bst:rounded-full bst:bg-background/85 bst:px-2.5 bst:py-1 bst:text-xs bst:font-semibold bst:text-foreground bst:backdrop-blur">
        {beforeLabel}
      </span>
      <span className="bst:absolute bst:top-3 bst:right-3 bst:rounded-full bst:bg-background/85 bst:px-2.5 bst:py-1 bst:text-xs bst:font-semibold bst:text-foreground bst:backdrop-blur">
        {afterLabel}
      </span>

      <div
        aria-hidden="true"
        className="bst:pointer-events-none bst:absolute bst:inset-y-0 bst:w-0.5 bst:-translate-x-1/2 bst:bg-background bst:shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
        style={{ left: `${String(position)}%` }}
      >
        <span className="bst:absolute bst:top-1/2 bst:left-1/2 bst:grid bst:size-9 bst:-translate-x-1/2 bst:-translate-y-1/2 bst:place-items-center bst:rounded-full bst:bg-background bst:text-foreground bst:shadow-lg">
          <ChevronsLeftRight className="bst:size-4" />
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
        className="bst:absolute bst:inset-0 bst:size-full bst:cursor-ew-resize bst:opacity-0"
      />
    </div>
  );
}
