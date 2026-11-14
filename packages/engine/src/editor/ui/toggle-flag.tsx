'use client';

import { useId, useState } from 'react';

import { cn } from '../cn';

import { Switch } from './toggles';

/**
 * A yes/no setting, as a card: what it is and what it does on the left, the
 * switch on the right, centred against both lines.
 *
 * ── The whole card is the control ───────────────────────────────────────────
 * It is a `<label>` for the switch, so a press anywhere on it — the title, the
 * sentence, the padding — flips it. A 36×20 switch is a small thing to aim
 * at, and the card around it is the target a reader actually reaches for.
 *
 * ── Its state is readable from across the drawer ────────────────────────────
 * Off, it is a plain card whose edge turns dashed under the pointer: a surface
 * waiting to be pressed. On, the edge takes the primary and a faint wash of it
 * fills the card, so a settled "yes" reads at a glance without finding the
 * switch's knob.
 *
 * ── It always submits, and that is the point ────────────────────────────────
 * An unticked checkbox sends NOTHING. Every consumer of one therefore has to
 * read presence rather than value, and every schema has to tolerate the field
 * being absent. The hidden input here carries `"true"` or `"false"` in both
 * states, so a form reads one field the same way whichever way it is set.
 */

export interface ToggleFlagProps {
  /** The setting, as the card's heading. */
  title: string;
  /** One sentence on what switching it changes. */
  description?: string | undefined;
  /** The form field. A hidden input under this name carries `true` / `false`. */
  name?: string | undefined;
  /** Uncontrolled, like every other field in a drawer — see `FormDrawer`. */
  defaultChecked?: boolean | undefined;
  /** Controlled, for a surface that owns the value itself. */
  checked?: boolean | undefined;
  /** Called with the new state each time it is switched. */
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  /** The switch's id, so a validation message or a `Field` can point at it. */
  id?: string | undefined;
  /** Dims the card and stops it being switched. */
  disabled?: boolean | undefined;
  /** Applied to the card. */
  className?: string | undefined;
}

export function ToggleFlag({
  title,
  description,
  name,
  defaultChecked = false,
  checked: controlled,
  onCheckedChange,
  id,
  disabled,
  className,
}: ToggleFlagProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const checked = controlled ?? internal;
  const generated = useId();
  const switchId = id ?? generated;
  const descriptionId = `${switchId}-description`;

  return (
    <label
      htmlFor={switchId}
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn(
        'bst:group/flag bst:flex bst:cursor-pointer bst:items-center bst:gap-4 bst:rounded-card bst:border bst:px-4 bst:py-3.5',
        'bst:transition-[border-color,background-color,box-shadow] bst:duration-(--bst-dur-2) bst:ease-enter',
        checked
          ? 'bst:border-primary bst:bg-primary/[0.04] bst:shadow-[0_0_0_3px_color-mix(in_oklch,var(--builderset-primary,var(--bst-d-primary))_8%,transparent)] bst:hover:border-dashed'
          : 'bst:border-border bst:bg-card bst:hover:border-dashed bst:hover:border-border-strong',
        disabled && 'bst:pointer-events-none bst:cursor-not-allowed bst:opacity-60',
        className,
      )}
    >
      {/* The value, in both states — see the note above. */}
      {name ? <input type="hidden" name={name} value={checked ? 'true' : 'false'} /> : null}

      <span className="bst:flex bst:min-w-0 bst:flex-1 bst:flex-col bst:gap-0.5">
        <span className="bst:text-sm bst:leading-snug bst:font-medium bst:text-foreground">
          {title}
        </span>
        {description ? (
          <span
            id={descriptionId}
            className="bst:text-xs bst:leading-relaxed bst:text-muted-foreground"
          >
            {description}
          </span>
        ) : null}
      </span>

      <Switch
        id={switchId}
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onCheckedChange={(next) => {
          if (controlled === undefined) setInternal(next);
          onCheckedChange?.(next);
        }}
      />
    </label>
  );
}
