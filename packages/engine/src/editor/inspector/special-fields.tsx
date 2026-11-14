'use client';

import { Button, Input, Label, SegmentedControl, Select } from '../ui';
import { Link2, Link2Off, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { humanize } from '../messages';
import { NumberStepper } from './number-stepper';

/**
 * Field controls for shapes the generic schema walk would draw badly: a colour
 * (swatches, not a text box), a four-sided spacing box, and a block's
 * visibility rules.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isColorField(name: string): boolean {
  return /(color|colou?r|background|backdrop|accent|markerColor)$/i.test(name) || name === 'color';
}

export function ColorField({
  name,
  value,
  onChange,
  nullable,
}: {
  /** The prop's name, which picks the field's label. */
  name: string;
  /** The colour: a hex value or one of the profile's colour tokens; empty means none. */
  value: string | null | undefined;
  /** Called with a hex value, a token's value, or `null` for none. */
  onChange: (value: string | null) => void;
  /** Offers a "none" swatch first, which clears the colour. */
  nullable: boolean;
}) {
  const { profile, messages } = useEditorContext();
  const id = useId();
  const tokens = profile.colorTokens ?? [];
  const hex =
    value && HEX.test(value)
      ? value
      : (tokens.find((token) => token.value === value)?.hex ?? '#000000');
  const [draft, setDraft] = useState(value ?? '');
  const label = messages.fieldLabels[name] ?? messages.styleKeys[name] ?? humanize(name);

  return (
    <div className="bst:space-y-1.5">
      <Label htmlFor={id} className="bst:text-xs bst:font-medium">
        {label}
      </Label>
      <div className="bst:flex bst:flex-wrap bst:gap-1.5">
        {nullable ? (
          <button
            type="button"
            title={messages.none}
            aria-label={messages.none}
            aria-pressed={value === null || value === undefined}
            onClick={() => {
              onChange(null);
            }}
            className={cn(
              'bst:relative bst:size-6 bst:overflow-hidden bst:rounded-md bst:border bst:border-border bst:bg-white bst:transition-transform bst:active:scale-90',
              (value === null || value === undefined) &&
                'bst:ring-2 bst:ring-primary bst:ring-offset-1',
            )}
          >
            <span className="bst:absolute bst:inset-0 bst:m-auto bst:h-px bst:w-8 bst:-rotate-45 bst:bg-red-500" />
          </button>
        ) : null}
        {tokens.map((token) => (
          <button
            key={token.value}
            type="button"
            title={token.label}
            aria-label={token.label}
            aria-pressed={value === token.value}
            onClick={() => {
              onChange(token.value);
              setDraft(token.value);
            }}
            className={cn(
              'bst:size-6 bst:rounded-md bst:border bst:border-border bst:transition-transform bst:active:scale-90',
              value === token.value && 'bst:ring-2 bst:ring-primary bst:ring-offset-1',
            )}
            style={{ background: token.hex }}
          />
        ))}
      </div>
      <div className="bst:flex bst:min-w-0 bst:items-center bst:gap-2">
        <input
          type="color"
          aria-label={label}
          value={hex}
          onChange={(event) => {
            onChange(event.target.value);
            setDraft(event.target.value);
          }}
          className="bst:size-[30px] bst:shrink-0 bst:cursor-pointer bst:rounded-md bst:border bst:border-input bst:bg-transparent bst:p-0.5"
        />
        <Input
          id={id}
          value={draft}
          placeholder="#rrggbb"
          className="bst:font-mono bst:text-xs"
          onChange={(event) => {
            setDraft(event.target.value);
            if (HEX.test(event.target.value)) onChange(event.target.value);
          }}
        />
      </div>
    </div>
  );
}

interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function isPadding(value: unknown): value is Padding {
  return (
    !!value &&
    typeof value === 'object' &&
    ['top', 'right', 'bottom', 'left'].every(
      (key) => typeof (value as Record<string, unknown>)[key] === 'number',
    )
  );
}

/** Top, right, bottom, left — linked (all four together) or one by one. */
export function SpacingField({
  name,
  value,
  onChange,
}: {
  /** The prop's name, which picks the field's label. */
  name: string;
  /** The four sides, in pixels. */
  value: Padding;
  /** Called with all four sides on each change, each a whole number from 0 to 160. */
  onChange: (value: Padding) => void;
}) {
  const { messages } = useEditorContext();
  const same = value.top === value.right && value.top === value.bottom && value.top === value.left;
  const [linked, setLinked] = useState(same);
  const label = messages.fieldLabels[name] ?? humanize(name);

  const set = (side: keyof Padding, next: number) => {
    const clamped = Math.max(0, Math.min(160, Math.round(next) || 0));
    onChange(
      linked
        ? { top: clamped, right: clamped, bottom: clamped, left: clamped }
        : { ...value, [side]: clamped },
    );
  };

  const stepper = (side: keyof Padding, ariaLabel: string) => (
    <NumberStepper
      size="sm"
      min={0}
      max={160}
      integer
      aria-label={ariaLabel}
      decreaseLabel={messages.decrease}
      increaseLabel={messages.increase}
      value={value[side]}
      onChange={(next) => {
        if (next !== null) set(side, next);
      }}
    />
  );

  return (
    <div className="bst:space-y-1.5">
      <div className="bst:flex bst:items-center bst:justify-between">
        <Label className="bst:text-xs bst:font-medium">{label}</Label>
        <button
          type="button"
          aria-pressed={linked}
          title={linked ? 'Unlink' : 'Link'}
          onClick={() => {
            setLinked(!linked);
          }}
          className="bst:cursor-pointer bst:text-muted-foreground bst:hover:text-foreground bst:[&_svg]:size-3.5"
        >
          {linked ? <Link2 aria-hidden="true" /> : <Link2Off aria-hidden="true" />}
        </button>
      </div>
      {linked ? (
        stepper('top', `${label} · ${messages.allSides}`)
      ) : (
        <div className="bst:grid bst:min-w-0 bst:grid-cols-2 bst:gap-x-2 bst:gap-y-1.5">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <div key={side} className="bst:min-w-0 bst:space-y-0.5">
              <span className="bst:block bst:text-[10px] bst:font-medium bst:tracking-wide bst:text-muted-foreground bst:uppercase">
                {messages.sides[side]}
              </span>
              {stepper(side, `${label} · ${messages.sides[side]}`)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DisplayValue {
  hideOn: 'none' | 'mobile' | 'desktop';
  when: { var: string; op: string; value?: string | undefined }[];
}

export function isDisplay(value: unknown): value is DisplayValue {
  return (
    !!value &&
    typeof value === 'object' &&
    'hideOn' in value &&
    Array.isArray((value as { when?: unknown }).when)
  );
}

const OPS = ['exists', 'missing', 'eq', 'neq', 'gt', 'lt', 'contains'] as const;

/** Where a block shows: every device, or not on one; always, or on conditions. */
export function DisplayField({
  value,
  onChange,
}: {
  value: DisplayValue;
  onChange: (value: DisplayValue) => void;
}) {
  const { profile, messages } = useEditorContext();
  const variables = profile.variables ?? [];

  return (
    <div className="bst:space-y-3">
      <div className="bst:space-y-1.5">
        <Label className="bst:text-xs bst:font-medium">{messages.visibility}</Label>
        <SegmentedControl
          aria-label={messages.visibility}
          value={value.hideOn}
          onValueChange={(hideOn) => {
            onChange({ ...value, hideOn });
          }}
          options={[
            { value: 'none', label: messages.showEverywhere },
            { value: 'mobile', label: messages.hideOnMobile },
            { value: 'desktop', label: messages.hideOnDesktop },
          ]}
          className="bst:w-full bst:[&>*]:flex-1"
        />
      </div>
      <div className="bst:space-y-2">
        <Label className="bst:text-xs bst:font-medium">{messages.showWhen}</Label>
        {value.when.map((condition, index) => (
          <div
            key={index}
            className="bst:space-y-1.5 bst:rounded-control bst:border bst:border-border bst:p-2"
          >
            <Select
              value={condition.var}
              placeholder={messages.variable}
              onValueChange={(next) => {
                const when = [...value.when];
                when[index] = { ...condition, var: next };
                onChange({ ...value, when });
              }}
              options={variables.map((variable) => ({
                value: variable.path,
                label: `${variable.label} (${variable.path})`,
              }))}
            />
            <div className="bst:grid bst:min-w-0 bst:grid-cols-2 bst:gap-1.5">
              <Select
                value={condition.op}
                onValueChange={(op) => {
                  const when = [...value.when];
                  when[index] = { ...condition, op };
                  onChange({ ...value, when });
                }}
                options={OPS.map((op) => ({ value: op, label: messages.ops[op] ?? op }))}
              />
              {condition.op === 'exists' || condition.op === 'missing' ? null : (
                <Input
                  value={condition.value ?? ''}
                  onChange={(event) => {
                    const when = [...value.when];
                    when[index] = { ...condition, value: event.target.value };
                    onChange({ ...value, when });
                  }}
                />
              )}
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                aria-label={messages.removeItem}
                onClick={() => {
                  onChange({ ...value, when: value.when.filter((_, other) => other !== index) });
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bst:w-full bst:border-dashed"
          disabled={value.when.length >= 5 || variables.length === 0}
          icon={<Plus aria-hidden="true" />}
          onClick={() => {
            onChange({
              ...value,
              when: [...value.when, { var: variables[0]?.path ?? '', op: 'exists' }],
            });
          }}
        >
          {messages.addCondition}
        </Button>
      </div>
    </div>
  );
}
