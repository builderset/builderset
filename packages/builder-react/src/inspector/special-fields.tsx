'use client';

import { Button, Input, Label, SegmentedControl, Select } from '@motors/ui';
import { Link2, Link2Off, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { humanize } from '../messages';
import { LabeledRow } from './field-layout';
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
  name: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
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

  // The picker first, so it sits level with the label inline; the brand's
  // swatches under it, and only when there are any.
  const hasSwatches = nullable || tokens.length > 0;
  return (
    <LabeledRow id={id} label={label}>
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="color"
            aria-label={label}
            value={hex}
            onChange={(event) => {
              onChange(event.target.value);
              setDraft(event.target.value);
            }}
            className="border-input size-[30px] shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
          />
          <Input
            id={id}
            value={draft}
            placeholder="#rrggbb"
            className="font-mono text-xs"
            onChange={(event) => {
              setDraft(event.target.value);
              if (HEX.test(event.target.value)) onChange(event.target.value);
            }}
          />
        </div>
        {hasSwatches ? (
          <div className="flex flex-wrap gap-1">
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
                  'border-border relative size-6 overflow-hidden rounded-md border bg-white transition-transform active:scale-90',
                  (value === null || value === undefined) && 'ring-primary ring-2 ring-offset-1',
                )}
              >
                <span className="absolute inset-0 m-auto h-px w-8 -rotate-45 bg-red-500" />
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
                  'border-border size-6 rounded-md border transition-transform active:scale-90',
                  value === token.value && 'ring-primary ring-2 ring-offset-1',
                )}
                style={{ background: token.hex }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </LabeledRow>
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
  name: string;
  value: Padding;
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

  const toggle = (
    <button
      type="button"
      aria-pressed={linked}
      title={linked ? 'Unlink' : 'Link'}
      onClick={() => {
        setLinked(!linked);
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] [&_svg]:size-3.5"
    >
      {linked ? <Link2 aria-hidden="true" /> : <Link2Off aria-hidden="true" />}
    </button>
  );

  return (
    <div className="space-y-1.5">
      <LabeledRow label={label}>
        <div className="flex min-w-0 items-center justify-end gap-1">
          {linked ? (
            <div className="min-w-0 flex-1">
              {stepper('top', `${label} · ${messages.allSides}`)}
            </div>
          ) : null}
          {toggle}
        </div>
      </LabeledRow>
      {linked ? null : (
        <div className="grid min-w-0 grid-cols-2 gap-x-2 gap-y-1.5">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <div key={side} className="min-w-0 space-y-0.5">
              <span className="text-muted-foreground block text-[10px] font-medium tracking-wide uppercase">
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
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{messages.visibility}</Label>
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
          className="w-full [&>*]:flex-1"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">{messages.showWhen}</Label>
        {value.when.map((condition, index) => (
          <div
            key={index}
            className="border-border space-y-1.5 rounded-[var(--radius-control)] border p-2"
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
            <div className="grid min-w-0 grid-cols-2 gap-1.5">
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
          className="w-full border-dashed"
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
