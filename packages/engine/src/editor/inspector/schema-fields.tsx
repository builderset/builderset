'use client';

import type { MediaKind, MediaRef, RichText } from '../../core';
import { Button, Input, Label, SegmentedControl, Switch, Textarea, Select } from '../ui';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { humanize } from '../messages';
import { RichTextInput } from '../text/rich-text-input';
import { MediaField } from './media-field';
import { NumberStepper } from './number-stepper';
import { classify, defaultFor, HIDDEN_PROPS, type JsonSchema } from './schema';
import { AlignField, FontField, isAlignField, isFontField } from './type-fields';
import {
  ColorField,
  DisplayField,
  isColorField,
  isDisplay,
  isPadding,
  SpacingField,
} from './special-fields';

export interface FieldProps {
  name: string;
  schema: JsonSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  /** What kind of media a media field holds — from the element. */
  mediaKind?: MediaKind | undefined;
  depth?: number | undefined;
}

function useLabel(name: string): string {
  const { messages } = useEditorContext();
  return messages.fieldLabels[name] ?? messages.styleKeys[name] ?? humanize(name);
}

/** Every prop of an object, in schema order. */
export function ObjectFields({
  schema,
  value,
  onChange,
  mediaKind,
  depth = 0,
}: {
  schema: JsonSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  mediaKind?: MediaKind | undefined;
  depth?: number | undefined;
}) {
  const properties = Object.entries(schema.properties ?? {}).filter(
    ([key]) => !HIDDEN_PROPS.has(key),
  );
  return (
    <div className={cn('bst:space-y-4', depth > 0 && 'bst:space-y-3')}>
      {properties.map(([key, child]) => (
        <SchemaField
          key={key}
          name={key}
          schema={child}
          value={value[key]}
          mediaKind={mediaKind}
          depth={depth}
          onChange={(next) => {
            onChange({ ...value, [key]: next });
          }}
        />
      ))}
    </div>
  );
}

export function SchemaField(props: FieldProps) {
  const { name, schema, value, onChange, mediaKind, depth = 0 } = props;
  const id = useId();
  const label = useLabel(name);
  const { messages } = useEditorContext();
  const field = classify(schema, name);

  // Shapes with a control of their own.
  if (isFontField(name) && (field.kind === 'enum' || field.kind === 'nullable')) {
    return (
      <FontField
        value={typeof value === 'string' ? value : null}
        nullable={field.kind === 'nullable'}
        onChange={onChange}
      />
    );
  }
  if (field.kind === 'enum' && isAlignField(name, field.options)) {
    return (
      <AlignField
        name={name}
        value={typeof value === 'string' ? value : undefined}
        options={field.options}
        onChange={onChange}
      />
    );
  }
  if (field.kind === 'string' && isColorField(name)) {
    return (
      <ColorField
        name={name}
        value={typeof value === 'string' ? value : null}
        nullable={false}
        onChange={onChange}
      />
    );
  }
  if (
    field.kind === 'nullable' &&
    isColorField(name) &&
    classify(field.inner, name).kind === 'string'
  ) {
    return (
      <ColorField
        name={name}
        value={typeof value === 'string' ? value : null}
        nullable
        onChange={onChange}
      />
    );
  }
  if (field.kind === 'object' && isPadding(value)) {
    return <SpacingField name={name} value={value} onChange={onChange} />;
  }
  if (field.kind === 'object' && isDisplay(value)) {
    return <DisplayField value={value} onChange={onChange} />;
  }

  switch (field.kind) {
    case 'boolean':
      return (
        <label
          htmlFor={id}
          className="bst:flex bst:cursor-pointer bst:items-center bst:justify-between bst:gap-3 bst:text-sm"
        >
          <span className="bst:font-medium">{label}</span>
          <Switch
            id={id}
            checked={value === true}
            onCheckedChange={(checked) => {
              onChange(checked);
            }}
          />
        </label>
      );

    case 'enum': {
      const options = field.options.map((option) => ({ value: option, label: humanize(option) }));
      const short = options.length <= 4 && options.every((option) => option.label.length <= 8);
      return (
        <Row id={id} label={label}>
          {short ? (
            <SegmentedControl
              aria-label={label}
              value={typeof value === 'string' ? value : (options[0]?.value ?? '')}
              onValueChange={(next) => {
                onChange(next);
              }}
              options={options}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          ) : (
            <Select
              id={id}
              value={typeof value === 'string' ? value : ''}
              onValueChange={(next) => {
                onChange(next);
              }}
              options={options}
            />
          )}
        </Row>
      );
    }

    case 'string':
      return (
        <Row id={id} label={label}>
          {field.multiline ? (
            <Textarea
              id={id}
              rows={name === 'code' ? 8 : 3}
              maxLength={field.max}
              value={typeof value === 'string' ? value : ''}
              className={cn(name === 'code' && 'bst:font-mono bst:text-xs')}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            />
          ) : (
            <Input
              id={id}
              maxLength={field.max}
              value={typeof value === 'string' ? value : ''}
              inputMode={/href|url|source|link/i.test(name) ? 'url' : undefined}
              placeholder={/href|url|source/i.test(name) ? 'https://' : undefined}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            />
          )}
        </Row>
      );

    case 'number':
      return (
        <Row id={id} label={label}>
          <NumberStepper
            id={id}
            value={typeof value === 'number' ? value : null}
            min={field.min}
            max={field.max}
            integer={field.integer}
            decreaseLabel={messages.decrease}
            increaseLabel={messages.increase}
            onChange={(next) => {
              if (next !== null) onChange(next);
            }}
          />
        </Row>
      );

    case 'richText':
      return (
        <Row id={id} label={label}>
          <RichTextInput
            id={id}
            value={Array.isArray(value) ? (value as RichText) : []}
            onChange={onChange}
          />
        </Row>
      );

    case 'media':
      return (
        <Row id={id} label={label}>
          <MediaField
            id={id}
            kind={mediaKind}
            value={value as MediaRef | null}
            onChange={onChange}
          />
        </Row>
      );

    case 'nullable': {
      const inner = classify(field.inner, name);
      // A nullable media field is simply "no media yet"; the picker handles it.
      if (inner.kind === 'media') {
        return <SchemaField {...props} schema={field.inner} />;
      }
      if (value === null || value === undefined) {
        return (
          <Row id={id} label={label}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus aria-hidden="true" />}
              onClick={() => {
                onChange(defaultFor(field.inner));
              }}
            >
              {messages.addItem}
            </Button>
          </Row>
        );
      }
      return (
        <div className="bst:relative">
          <SchemaField {...props} schema={field.inner} />
          <button
            type="button"
            onClick={() => {
              onChange(null);
            }}
            className="bst:absolute bst:top-0 bst:right-0 bst:text-xs bst:text-muted-foreground bst:hover:text-destructive"
          >
            {messages.clear}
          </button>
        </div>
      );
    }

    case 'object':
      if (!name) {
        return (
          <ObjectFields
            schema={schema}
            value={(value ?? {}) as Record<string, unknown>}
            onChange={onChange}
            mediaKind={mediaKind}
            depth={depth + 1}
          />
        );
      }
      return (
        <fieldset className="bst:space-y-3 bst:rounded-control bst:border bst:border-border bst:p-3">
          <legend className="bst:px-1 bst:text-xs bst:font-semibold">{label}</legend>
          <ObjectFields
            schema={schema}
            value={(value ?? {}) as Record<string, unknown>}
            onChange={onChange}
            mediaKind={mediaKind}
            depth={depth + 1}
          />
        </fieldset>
      );

    case 'array':
      return (
        <ArrayField
          label={label}
          item={field.item}
          min={field.min}
          max={field.max}
          value={Array.isArray(value) ? (value as unknown[]) : []}
          onChange={onChange}
          mediaKind={mediaKind}
          depth={depth}
        />
      );

    default:
      return null;
  }
}

function Row({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="bst:space-y-1.5">
      <Label htmlFor={id} className="bst:text-xs bst:font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** A title for a list item, from its first text-ish prop. */
function itemTitle(item: unknown, index: number): string {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    for (const value of Object.values(item as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) return value.slice(0, 40);
      if (
        Array.isArray(value) &&
        value.length &&
        typeof value[0] === 'object' &&
        value[0] &&
        'text' in value[0]
      ) {
        const text = (value as { text: string }[]).map((run) => run.text).join('');
        if (text.trim()) return text.slice(0, 40);
      }
    }
  }
  if (typeof item === 'string' && item.trim()) return item.slice(0, 40);
  return `#${String(index + 1)}`;
}

function ArrayField({
  label,
  item,
  min,
  max,
  value,
  onChange,
  mediaKind,
  depth,
}: {
  label: string;
  item: JsonSchema;
  min: number;
  max: number;
  value: unknown[];
  onChange: (value: unknown[]) => void;
  mediaKind?: MediaKind | undefined;
  depth: number;
}) {
  const { messages } = useEditorContext();
  const [open, setOpen] = useState<number | null>(value.length === 1 ? 0 : null);
  const itemKind = classify(item);
  const simple = itemKind.kind !== 'object' && itemKind.kind !== 'array';

  return (
    <div className="bst:space-y-2">
      <div className="bst:flex bst:items-center bst:justify-between">
        <span className="bst:text-xs bst:font-medium">{label}</span>
        <span className="bst:text-xs bst:text-muted-foreground bst:tabular-nums">
          {value.length}/{max}
        </span>
      </div>
      <div className="bst:space-y-1.5">
        <AnimatePresence initial={false}>
          {value.map((entry, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="bst:overflow-hidden bst:rounded-control bst:border bst:border-border bst:bg-card"
            >
              {simple ? (
                <div className="bst:flex bst:items-start bst:gap-2 bst:p-2">
                  <div className="bst:min-w-0 bst:flex-1">
                    <SchemaField
                      name={String(index + 1)}
                      schema={item}
                      value={entry}
                      mediaKind={mediaKind}
                      depth={depth + 1}
                      onChange={(next) => {
                        const copy = [...value];
                        copy[index] = next;
                        onChange(copy);
                      }}
                    />
                  </div>
                  <RemoveButton
                    disabled={value.length <= min}
                    label={messages.removeItem}
                    onClick={() => {
                      onChange(value.filter((_, other) => other !== index));
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="bst:flex bst:items-center bst:gap-1 bst:pr-1">
                    <button
                      type="button"
                      aria-expanded={open === index}
                      onClick={() => {
                        setOpen(open === index ? null : index);
                      }}
                      className="bst:flex bst:min-w-0 bst:flex-1 bst:items-center bst:gap-2 bst:px-3 bst:py-2 bst:text-left bst:text-sm bst:hover:bg-accent/50"
                    >
                      <ChevronDown
                        className={cn(
                          'bst:size-3.5 bst:shrink-0 bst:text-muted-foreground bst:transition-transform',
                          open !== index && 'bst:-rotate-90',
                        )}
                        aria-hidden="true"
                      />
                      <span className="bst:truncate">{itemTitle(entry, index)}</span>
                    </button>
                    <RemoveButton
                      disabled={value.length <= min}
                      label={messages.removeItem}
                      onClick={() => {
                        onChange(value.filter((_, other) => other !== index));
                        setOpen(null);
                      }}
                    />
                  </div>
                  {open === index ? (
                    <div className="bst:border-t bst:border-border bst:p-3">
                      <SchemaField
                        name=""
                        schema={item}
                        value={entry}
                        mediaKind={mediaKind}
                        depth={depth + 1}
                        onChange={(next) => {
                          const copy = [...value];
                          copy[index] = next;
                          onChange(copy);
                        }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bst:w-full bst:border-dashed"
        disabled={value.length >= max}
        icon={<Plus aria-hidden="true" />}
        onClick={() => {
          onChange([...value, defaultFor(item)]);
          setOpen(value.length);
        }}
      >
        {messages.addItem}
      </Button>
    </div>
  );
}

function RemoveButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="destructive"
      size="icon-xs"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="bst:mt-1 bst:shrink-0"
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );
}
