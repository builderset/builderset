'use client';

import { Label } from '@builderset/engine/ui';
import { useId, type ReactNode } from 'react';

/** A setting: its label (with something beside it), its control, a line of help. */
export function Row({
  label,
  hint,
  aside,
  children,
}: {
  label: string;
  hint?: ReactNode;
  aside?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="bst:space-y-1.5">
      <div className="bst:flex bst:items-center bst:justify-between bst:gap-2">
        <Label htmlFor={id} className="bst:min-w-0 bst:text-xs bst:font-medium">
          {label}
        </Label>
        {aside}
      </div>
      {children(id)}
      {hint ? <p className="bst:text-xs bst:text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A soft box holding switches: the concept's grey card around toggles. */
export function Soft({ children }: { children: ReactNode }) {
  return (
    <div className="bst:grid bst:gap-3 bst:rounded-card bst:bg-accent/60 bst:p-3">{children}</div>
  );
}

/** Two settings side by side. */
export function Pair({ children }: { children: ReactNode }) {
  return <div className="bst:grid bst:grid-cols-2 bst:gap-3">{children}</div>;
}
