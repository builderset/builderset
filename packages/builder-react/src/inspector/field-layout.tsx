'use client';

import { Label } from '@motors/ui';
import { createContext, useContext, type ReactNode } from 'react';

/**
 * How a field lays out its label: above the control (the default), or on the
 * left with the control on the right — every control in one column of the same
 * width, so a panel of them reads as a form rather than a stack.
 *
 * A context rather than a prop, because the fields that care are several
 * levels down (object → field → colour/font/align) and the choice belongs to
 * the panel holding them, not to any one of them.
 */
export type FieldLayout = 'stacked' | 'inline';

const FieldLayoutContext = createContext<FieldLayout>('stacked');

export function FieldLayoutProvider({
  layout,
  children,
}: {
  layout: FieldLayout;
  children: ReactNode;
}) {
  return <FieldLayoutContext.Provider value={layout}>{children}</FieldLayoutContext.Provider>;
}

export function useFieldLayout(): FieldLayout {
  return useContext(FieldLayoutContext);
}

/**
 * A label and its control. `wide` keeps the control full width under its label
 * even inline — a rich-text editor or a media picker squeezed into half the
 * panel is not usable.
 *
 * Inline, the label's line height matches a control's height, so it sits
 * level with the control's first line however tall the control grows.
 */
export function LabeledRow({
  id,
  label,
  wide = false,
  children,
}: {
  id?: string | undefined;
  label: string;
  wide?: boolean | undefined;
  children: ReactNode;
}) {
  const layout = useFieldLayout();
  if (layout === 'inline' && !wide) {
    return (
      <div className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-x-3">
        <Label
          htmlFor={id}
          title={label}
          className="block truncate text-xs leading-[30px] font-medium"
        >
          {label}
        </Label>
        <div className="min-w-0">{children}</div>
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}
