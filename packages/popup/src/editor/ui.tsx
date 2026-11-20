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

/** A heading between groups of settings. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bst:space-y-4 bst:border-t bst:border-border bst:pt-3.5">
      <h4 className="bst:text-xs bst:font-semibold">{title}</h4>
      {children}
    </section>
  );
}
