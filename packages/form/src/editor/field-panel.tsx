'use client';

import type { BuilderNode, MediaRef } from '@builderset/engine';
import { MediaField, useEditor, useEditorContext } from '@builderset/engine/editor';
import {
  Button,
  Input,
  SegmentedControl,
  SegmentedTabs,
  Select,
  Textarea,
  ToggleFlag,
} from '@builderset/engine/ui';
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Lock,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Split,
  TextCursorInput,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import {
  answerKindOf,
  formFields,
  LOGIC_OPS,
  stepsOf,
  takesAnswer,
  type FieldChecks,
  type FieldLogic,
  type FormDocument,
  type LogicRule,
} from '../core';
import { errorText } from '../render';
import { useForm } from './context';
import {
  keyFollowsLabel,
  keyFromLabel,
  keysInUse,
  swapFieldType,
  swappableWith,
  uniqueKey,
} from './field-helpers';
import { Group, Row } from './ui';

/**
 * The inspector for a selected field, in place of the shared one: four tabs,
 * as a form needs them.
 *
 * - Field: its words, required, width, its choices or range, its files.
 * - Checks: what an answer must look like, and the message when it does not.
 * - Logic: "show only when…" from earlier answers, and who depends on it.
 * - More: its key, the link parameter that fills it, read only, hidden,
 *   protected, which step it is on.
 *
 * A step gets a panel of its own: its title, and deleting it.
 */

type Tab = 'field' | 'checks' | 'logic' | 'more';

/** Changes to one field, each a named undo step that coalesces while typing. */
function useField(id: string) {
  const { store } = useEditorContext<FormDocument>();
  const node = useEditor<BuilderNode | undefined, FormDocument>((state) => state.view.nodes[id]);
  const update = (props: Record<string, unknown>, label: string, key = label) => {
    store.getState().updateNode(id, { props }, label, `form:field:${id}:${key}`);
  };
  return { node, update, store };
}

/** A number box that takes empty for "none". */
function NumberInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string | undefined;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  return (
    <Input
      id={id}
      inputMode="decimal"
      placeholder={placeholder ?? '–'}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const next = event.target.value.trim();
        if (next === '') onChange(null);
        else if (Number.isFinite(Number(next))) onChange(Number(next));
      }}
    />
  );
}

export function FieldPanel({ id }: { id: string }) {
  const { words } = useForm();
  const { node } = useField(id);
  const [tab, setTab] = useState<Tab>('field');
  if (!node) return null;
  if (node.type === 'step') return <StepPanel id={id} />;

  const input = takesAnswer(node) && node.type !== 'hidden';
  const tabs = [
    {
      value: 'field' as const,
      label: words.fieldTab,
      icon: <TextCursorInput aria-hidden="true" />,
    },
    ...(input
      ? [
          {
            value: 'checks' as const,
            label: words.checksTab,
            icon: <ShieldCheck aria-hidden="true" />,
          },
        ]
      : []),
    ...(node.type !== 'hidden'
      ? [{ value: 'logic' as const, label: words.logicTab, icon: <Split aria-hidden="true" /> }]
      : []),
    {
      value: 'more' as const,
      label: words.moreTab,
      icon: <SlidersHorizontal aria-hidden="true" />,
    },
  ];
  const shown = tabs.some((candidate) => candidate.value === tab) ? tab : 'field';

  return (
    <div className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col">
      <SegmentedTabs
        aria-label={words.fieldTab}
        value={shown}
        onValueChange={setTab}
        tabs={tabs}
        className="bst:mx-4 bst:mt-3 bst:mb-1 bst:shrink-0"
      />
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:space-y-4 bst:overflow-y-auto bst:px-4 bst:pt-3.5 bst:pb-6">
        {shown === 'field' ? <FieldTab id={id} /> : null}
        {shown === 'checks' ? <ChecksTab id={id} /> : null}
        {shown === 'logic' ? <LogicTab id={id} /> : null}
        {shown === 'more' ? <MoreTab id={id} /> : null}
      </div>
    </div>
  );
}

/** Why a field cannot be removed: a template needs it, or someone protected it. */
function LockBox({ node }: { node: BuilderNode }) {
  const { words, templateName } = useForm();
  const lock = typeof node.props.lock === 'string' ? node.props.lock : '';
  if (!lock && node.props.protect !== true) return null;
  return (
    <div className="bst:grid bst:grid-cols-[18px_minmax(0,1fr)] bst:gap-2.5 bst:rounded-card bst:border bst:border-warn/35 bst:bg-warn/10 bst:p-3 bst:text-warn">
      <Lock className="bst:mt-0.5 bst:size-4" aria-hidden="true" />
      <div className="bst:grid bst:gap-0.5">
        <b className="bst:text-[12.5px] bst:text-foreground">
          {lock ? words.lockedTitle(templateName ?? '') : words.protectedTitle}
        </b>
        <small className="bst:text-xs bst:leading-snug bst:text-foreground/80">
          {lock ? words.lockedBody(lock) : words.protectedBody}
        </small>
      </div>
    </div>
  );
}

function FieldTab({ id }: { id: string }) {
  const { words } = useForm();
  const { messages, registry } = useEditorContext();
  const { node, update, store } = useField(id);
  if (!node) return null;
  const p = node.props;
  const type = node.type;
  const locked = typeof p.lock === 'string' && p.lock !== '';
  const input = takesAnswer(node) && type !== 'hidden';
  const text = (
    key: string,
    label: string,
    options: { placeholder?: string; area?: boolean; mono?: boolean; hint?: string } = {},
  ) => (
    <Row label={label} hint={options.hint}>
      {(fieldId) =>
        options.area ? (
          <Textarea
            id={fieldId}
            rows={3}
            value={typeof p[key] === 'string' ? p[key] : ''}
            placeholder={options.placeholder}
            onChange={(event) => {
              update({ [key]: event.target.value }, label, key);
            }}
          />
        ) : (
          <Input
            id={fieldId}
            value={typeof p[key] === 'string' ? p[key] : ''}
            placeholder={options.placeholder}
            className={options.mono ? 'bst:font-mono bst:text-xs' : undefined}
            onChange={(event) => {
              update({ [key]: event.target.value }, label, key);
            }}
          />
        )
      }
    </Row>
  );
  const number = (key: string, label: string) => (
    <Row label={label}>
      {(fieldId) => (
        <NumberInput
          id={fieldId}
          value={typeof p[key] === 'number' ? p[key] : null}
          onChange={(value) => {
            if (value !== null) update({ [key]: value }, label, key);
          }}
        />
      )}
    </Row>
  );
  const relabel = (label: string) => {
    const props: Record<string, unknown> = { label };
    const key = p.key;
    if (typeof key === 'string' && !locked && keyFollowsLabel(key, p.label as string)) {
      const base = keyFromLabel(label);
      if (base) props.key = uniqueKey(base, keysInUse(store.getState().doc, id));
    }
    update(props, words.label, 'label');
  };
  const swaps = swappableWith(type).filter((candidate) => candidate !== type);

  return (
    <>
      <LockBox node={node} />
      {typeof p.label === 'string' ? (
        <Row label={type === 'consent' || type === 'hidden' ? words.key : words.label}>
          {(fieldId) => (
            <Input
              id={fieldId}
              value={p.label as string}
              onChange={(event) => {
                relabel(event.target.value);
              }}
            />
          )}
        </Row>
      ) : null}
      {type === 'heading' ? text('text', words.text) : null}
      {type === 'paragraph' ? text('text', words.text, { area: true }) : null}
      {'placeholder' in p ? text('placeholder', words.placeholder) : null}
      {input ? text('help', words.help, { placeholder: words.helpHint }) : null}
      {input ? (
        <ToggleFlag
          title={words.required}
          description={
            locked && p.required
              ? words.requiredLocked
              : p.required
                ? words.requiredOn
                : words.requiredOff
          }
          checked={p.required === true}
          disabled={locked && p.required === true}
          onCheckedChange={(required) => {
            update({ required }, words.required);
          }}
        />
      ) : null}
      {'width' in p ? (
        <Row label={messages.styleKeys.width ?? words.labels} hint={words.widthHint}>
          {() => (
            <SegmentedControl
              aria-label={words.widthFull}
              value={p.width as string}
              onValueChange={(width) => {
                update({ width }, words.widthFull);
              }}
              options={[
                { value: 'full', label: words.widthFull },
                { value: 'half', label: words.widthHalf },
              ]}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          )}
        </Row>
      ) : null}
      {Array.isArray(p.options) ? <OptionsEditor id={id} /> : null}
      {type === 'radio' || type === 'checkbox' ? (
        <Row label={words.optionsAs}>
          {() => (
            <SegmentedControl
              aria-label={words.optionsAs}
              value={p.layout as string}
              onValueChange={(layout) => {
                update({ layout }, words.optionsAs);
              }}
              options={[
                { value: 'list', label: words.layoutList },
                { value: 'buttons', label: words.layoutButtons },
                { value: 'cards', label: words.layoutCards },
              ]}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          )}
        </Row>
      ) : null}
      {type === 'rating' ? (
        <Row label={words.stars}>
          {() => (
            <SegmentedControl
              aria-label={words.stars}
              value={String(p.stars)}
              onValueChange={(stars) => {
                update({ stars: Number(stars) }, words.stars);
              }}
              options={['3', '5', '10'].map((value) => ({ value, label: value }))}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          )}
        </Row>
      ) : null}
      {type === 'scale' ? (
        <>
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            <Row label={words.scaleFrom}>
              {() => (
                <SegmentedControl
                  aria-label={words.scaleFrom}
                  value={String(p.from)}
                  onValueChange={(from) => {
                    update({ from: Number(from) }, words.scaleFrom);
                  }}
                  options={['0', '1'].map((value) => ({ value, label: value }))}
                  className="bst:w-full bst:[&>*]:flex-1"
                />
              )}
            </Row>
            <Row label={words.scaleTo}>
              {() => (
                <SegmentedControl
                  aria-label={words.scaleTo}
                  value={String(p.to)}
                  onValueChange={(to) => {
                    update({ to: Number(to) }, words.scaleTo);
                  }}
                  options={['5', '7', '10'].map((value) => ({ value, label: value }))}
                  className="bst:w-full bst:[&>*]:flex-1"
                />
              )}
            </Row>
          </div>
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            {text('lowLabel', words.lowLabel)}
            {text('highLabel', words.highLabel)}
          </div>
        </>
      ) : null}
      {type === 'slider' ? (
        <>
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            {number('min', words.min)}
            {number('max', words.max)}
          </div>
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            {number('step', words.step)}
            {number('defaultValue', words.startsAt)}
          </div>
          {text('unit', words.unit)}
        </>
      ) : null}
      {type === 'number' ? text('unit', words.unit, { placeholder: 'km, €' }) : null}
      {type === 'phone' ? text('prefix', words.prefix, { placeholder: '+355' }) : null}
      {type === 'textarea' ? number('rows', words.rows) : null}
      {type === 'file' ? (
        <>
          <Row label={words.accept} hint={words.acceptHint}>
            {(fieldId) => (
              <Input
                id={fieldId}
                defaultValue={(p.accept as string[]).join(', ')}
                className="bst:font-mono bst:text-xs"
                onBlur={(event) => {
                  const accept = event.target.value
                    .split(',')
                    .map((extension) => extension.trim().toLowerCase().replace(/^\./, ''))
                    .filter((extension) => /^[a-z0-9]{1,8}$/.test(extension));
                  update({ accept }, words.accept);
                }}
              />
            )}
          </Row>
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            {number('maxFiles', words.maxFiles)}
            {number('maxMb', words.maxMb)}
          </div>
        </>
      ) : null}
      {type === 'consent' ? (
        <>
          {text('text', words.consentText, { area: true })}
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            {text('linkText', words.linkText)}
            {text('linkUrl', words.linkUrl, { placeholder: 'https://', mono: true })}
          </div>
        </>
      ) : null}
      {type === 'image' ? (
        <>
          <Row label={words.image}>
            {(fieldId) => (
              <MediaField
                id={fieldId}
                value={p.media as MediaRef | null}
                onChange={(media) => {
                  update({ media }, words.image);
                }}
              />
            )}
          </Row>
          {text('alt', words.alt)}
        </>
      ) : null}
      {type === 'hidden' ? text('value', words.value, { mono: true }) : null}
      {type === 'text' ? text('defaultValue', words.defaultAnswer) : null}
      {(type === 'select' || type === 'radio') && Array.isArray(p.options) ? (
        <Row label={words.defaultAnswer}>
          {(fieldId) => (
            <Select
              id={fieldId}
              value={(p.defaultValue as string) || '__none'}
              onValueChange={(value) => {
                update({ defaultValue: value === '__none' ? '' : value }, words.defaultAnswer);
              }}
              options={[
                { value: '__none', label: '—' },
                ...(p.options as string[])
                  .filter(Boolean)
                  .map((option) => ({ value: option, label: option })),
              ]}
            />
          )}
        </Row>
      ) : null}
      {swaps.length && !locked ? (
        <Row label={words.fieldType} hint={words.fieldTypeHint}>
          {(fieldId) => (
            <Select
              id={fieldId}
              value={type}
              onValueChange={(next) => {
                if (next === type) return;
                store.getState().updateDocument(words.fieldType, (draft) => {
                  swapFieldType(draft, registry, id, next);
                });
              }}
              options={[type, ...swaps].map((candidate) => ({
                value: candidate,
                label: messages.elements[candidate]?.name ?? candidate,
              }))}
            />
          )}
        </Row>
      ) : null}
    </>
  );
}

/** A choice field's options: edit, reorder, remove, add, or paste a whole list. */
function OptionsEditor({ id }: { id: string }) {
  const { words } = useForm();
  const { node, update } = useField(id);
  const [pasting, setPasting] = useState<string | null>(null);
  if (!node) return null;
  const options = node.props.options as string[];
  const set = (next: string[]) => {
    update({ options: next }, words.options, 'options');
  };
  return (
    <Row label={`${words.options} · ${String(options.length)}`}>
      {() => (
        <div className="bst:grid bst:gap-1.5">
          {options.map((option, index) => (
            <div
              key={index}
              className="bst:grid bst:grid-cols-[minmax(0,1fr)_auto_auto_auto] bst:items-center bst:gap-0.5"
            >
              <Input
                aria-label={`${words.options} ${String(index + 1)}`}
                value={option}
                className="bst:h-8"
                onChange={(event) => {
                  set(options.map((item, at) => (at === index ? event.target.value : item)));
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="↑"
                disabled={index === 0}
                onClick={() => {
                  const next = [...options];
                  [next[index - 1], next[index]] = [next[index] ?? '', next[index - 1] ?? ''];
                  set(next);
                }}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="↓"
                disabled={index === options.length - 1}
                onClick={() => {
                  const next = [...options];
                  [next[index], next[index + 1]] = [next[index + 1] ?? '', next[index] ?? ''];
                  set(next);
                }}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="×"
                disabled={options.length <= 1}
                onClick={() => {
                  set(options.filter((_, at) => at !== index));
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="bst:flex bst:gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              icon={<Plus aria-hidden="true" />}
              disabled={options.length >= 60}
              onClick={() => {
                set([...options, `${words.options} ${String(options.length + 1)}`]);
              }}
            >
              {words.addOption}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setPasting(pasting === null ? options.join('\n') : null);
              }}
            >
              {words.pasteList}
            </Button>
          </div>
          {pasting !== null ? (
            <div className="bst:grid bst:gap-1.5">
              <Textarea
                rows={5}
                value={pasting}
                placeholder={words.pasteHint}
                aria-label={words.pasteHint}
                onChange={(event) => {
                  setPasting(event.target.value);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="bst:justify-self-start"
                onClick={() => {
                  const next = pasting
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .slice(0, 60);
                  if (next.length) set(next);
                  setPasting(null);
                }}
              >
                {words.useList}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Row>
  );
}

function ChecksTab({ id }: { id: string }) {
  const { words, visitor } = useForm();
  const { node, update } = useField(id);
  if (!node) return null;
  const checks = node.props.checks as FieldChecks;
  const type = node.type;
  const set = (patch: Partial<FieldChecks>, label: string) => {
    update({ checks: { ...checks, ...patch } }, label, `checks:${label}`);
  };
  const pair = (first: [keyof FieldChecks, string], second: [keyof FieldChecks, string]) => (
    <div className="bst:grid bst:grid-cols-2 bst:gap-2">
      {[first, second].map(([key, label]) => (
        <Row key={key} label={label}>
          {(fieldId) => (
            <NumberInput
              id={fieldId}
              value={checks[key] as number | null}
              onChange={(value) => {
                set({ [key]: value === null ? null : Math.max(0, Math.round(value)) }, label);
              }}
            />
          )}
        </Row>
      ))}
    </div>
  );
  const kind = answerKindOf(type);
  const textish = ['text', 'textarea', 'password'].includes(type);
  const preview = errorText(
    checks.message
      ? { code: 'required', message: checks.message }
      : { code: type === 'email' ? 'email' : type === 'phone' ? 'phone' : 'required' },
    visitor,
  );

  return (
    <>
      {textish ? pair(['minLength', words.minLength], ['maxLength', words.maxLength]) : null}
      {type === 'number' ? (
        <div className="bst:grid bst:grid-cols-2 bst:gap-2">
          {(
            [
              ['min', words.lowest],
              ['max', words.highest],
            ] as const
          ).map(([key, label]) => (
            <Row key={key} label={label}>
              {(fieldId) => (
                <NumberInput
                  id={fieldId}
                  value={checks[key]}
                  onChange={(value) => {
                    set({ [key]: value }, label);
                  }}
                />
              )}
            </Row>
          ))}
        </div>
      ) : null}
      {type === 'checkbox' ? pair(['min', words.pickAtLeast], ['max', words.pickAtMost]) : null}
      {type === 'text' ? (
        <Row label={words.format}>
          {(fieldId) => (
            <Select
              id={fieldId}
              value={checks.pattern}
              onValueChange={(pattern) => {
                set({ pattern: pattern as FieldChecks['pattern'] }, words.format);
              }}
              options={[
                { value: 'none', label: words.formatNone },
                { value: 'letters', label: words.formatLetters },
                { value: 'digits', label: words.formatDigits },
                { value: 'custom', label: words.formatCustom },
              ]}
            />
          )}
        </Row>
      ) : null}
      {type === 'text' && checks.pattern === 'custom' ? (
        <Row label={words.pattern}>
          {(fieldId) => (
            <Input
              id={fieldId}
              value={checks.regex}
              placeholder="^[A-Z]{2}\d{3}[A-Z]{2}$"
              className="bst:font-mono bst:text-xs"
              onChange={(event) => {
                set({ regex: event.target.value }, words.pattern);
              }}
            />
          )}
        </Row>
      ) : null}
      {kind === 'none' ? (
        <p className="bst:text-xs bst:text-muted-foreground">{words.nothingToCheck}</p>
      ) : (
        <>
          <Row label={words.errorMessage} hint={words.errorMessageHint}>
            {(fieldId) => (
              <Input
                id={fieldId}
                value={checks.message}
                placeholder={visitor.errors.required()}
                onChange={(event) => {
                  set({ message: event.target.value }, words.errorMessage);
                }}
              />
            )}
          </Row>
          <div className="bst:grid bst:gap-1 bst:rounded-card bst:border bst:border-dashed bst:border-border-strong bst:px-3 bst:py-2.5">
            <small className="bst:text-[11px] bst:text-muted-foreground">
              {words.errorPreview}
            </small>
            <span className="bst:flex bst:items-center bst:gap-1.5 bst:text-[12.5px] bst:font-medium bst:text-destructive">
              <CircleAlert className="bst:size-3.5" aria-hidden="true" />
              {preview}
            </span>
          </div>
        </>
      )}
    </>
  );
}

function LogicTab({ id }: { id: string }) {
  const { words } = useForm();
  const { store } = useEditorContext<FormDocument>();
  const { node, update } = useField(id);
  const doc = useEditor<FormDocument, FormDocument>((state) => state.view);
  if (!node) return null;
  const logic = node.props.logic as FieldLogic;
  const fields = formFields(doc);
  const at = fields.findIndex(({ node: candidate }) => candidate.id === id);
  // Logic reads answers given before this field.
  const earlier = fields
    .slice(0, Math.max(0, at))
    .map(({ node: candidate }) => candidate)
    .filter((candidate) => takesAnswer(candidate) && candidate.type !== 'hidden');
  const labelOf = (key: string) =>
    (earlier.find((candidate) => candidate.props.key === key)?.props.label as string | undefined) ??
    key;
  const set = (patch: Partial<FieldLogic>) => {
    update({ logic: { ...logic, ...patch } }, words.logicTab, 'logic');
  };
  const setRule = (index: number, patch: Partial<LogicRule>) => {
    set({ rules: logic.rules.map((rule, at2) => (at2 === index ? { ...rule, ...patch } : rule)) });
  };
  /** The answers a rule can compare with: the field's choices, if it has them. */
  const valuesOf = (key: string): string[] | null => {
    const source = earlier.find((candidate) => candidate.props.key === key);
    if (!source) return null;
    if (Array.isArray(source.props.options)) return source.props.options as string[];
    if (source.type === 'yes-no') return ['yes', 'no'];
    return null;
  };
  const firstRule = (): LogicRule | null => {
    const source = earlier[earlier.length - 1];
    if (!source) return null;
    const values = valuesOf(source.props.key as string);
    return { key: source.props.key as string, op: 'is', value: values?.[0] ?? '' };
  };
  const summary = logic.rules
    .map(
      (rule) =>
        `“${labelOf(rule.key)}” ${words.ops[rule.op]}${rule.op === 'empty' || rule.op === 'not_empty' ? '' : ` “${rule.value}”`}`,
    )
    .join(logic.match === 'all' ? ` ${words.and} ` : ` ${words.or} `);
  const key = typeof node.props.key === 'string' ? node.props.key : null;
  const usedBy = key
    ? fields
        .map(({ node: candidate }) => candidate)
        .filter((candidate) => {
          const other = candidate.props.logic as FieldLogic | undefined;
          return other?.enabled && other.rules.some((rule) => rule.key === key);
        })
    : [];

  return (
    <>
      <ToggleFlag
        title={words.showWhen}
        description={words.showWhenHint}
        checked={logic.enabled}
        onCheckedChange={(enabled) => {
          const rule = enabled && logic.rules.length === 0 ? firstRule() : null;
          set({ enabled, ...(rule ? { rules: [rule] } : {}) });
        }}
      />
      {logic.enabled ? (
        <>
          {logic.rules.length > 1 ? (
            <SegmentedControl
              aria-label={words.showWhen}
              value={logic.match}
              onValueChange={(match) => {
                set({ match });
              }}
              options={[
                { value: 'all', label: words.matchAll },
                { value: 'any', label: words.matchAny },
              ]}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          ) : null}
          {logic.rules.map((rule, index) => {
            const values = valuesOf(rule.key);
            const takesValue = rule.op !== 'empty' && rule.op !== 'not_empty';
            return (
              <div
                key={index}
                className="bst:grid bst:gap-1.5 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2"
              >
                <div className="bst:flex bst:items-center bst:justify-between">
                  <span className="bst:font-mono bst:text-[11px] bst:font-semibold bst:text-warn">
                    {index === 0 ? words.when : logic.match === 'all' ? words.and : words.or}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="×"
                    onClick={() => {
                      const rules = logic.rules.filter((_, at2) => at2 !== index);
                      set({ rules, enabled: rules.length > 0 });
                    }}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
                <Select
                  aria-label={words.label}
                  value={rule.key}
                  onValueChange={(next) => {
                    setRule(index, { key: next, value: valuesOf(next)?.[0] ?? '' });
                  }}
                  options={earlier.map((candidate) => ({
                    value: candidate.props.key as string,
                    label: (candidate.props.label as string) || (candidate.props.key as string),
                  }))}
                />
                <div className="bst:grid bst:grid-cols-2 bst:gap-1.5">
                  <Select
                    aria-label={words.logicTab}
                    value={rule.op}
                    onValueChange={(op) => {
                      setRule(index, { op: op as LogicRule['op'] });
                    }}
                    options={LOGIC_OPS.map((op) => ({ value: op, label: words.ops[op] }))}
                  />
                  {takesValue ? (
                    values ? (
                      <Select
                        aria-label={words.value}
                        value={rule.value || '__none'}
                        onValueChange={(value) => {
                          setRule(index, { value: value === '__none' ? '' : value });
                        }}
                        options={[
                          { value: '__none', label: '—' },
                          ...values.filter(Boolean).map((value) => ({ value, label: value })),
                        ]}
                      />
                    ) : (
                      <Input
                        aria-label={words.value}
                        value={rule.value}
                        onChange={(event) => {
                          setRule(index, { value: event.target.value });
                        }}
                      />
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
          {earlier.length ? (
            logic.rules.length < 5 ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="bst:justify-self-start"
                icon={<Plus aria-hidden="true" />}
                onClick={() => {
                  const rule = firstRule();
                  if (rule) set({ rules: [...logic.rules, rule] });
                }}
              >
                {words.addRule}
              </Button>
            ) : null
          ) : (
            <p className="bst:text-xs bst:text-muted-foreground">{words.noEarlierFields}</p>
          )}
          {logic.rules.length ? (
            <p className="bst:rounded-control bst:bg-warn/10 bst:px-3 bst:py-2 bst:text-xs bst:leading-snug">
              {words.logicSummary(summary, node.props.required === true)}
            </p>
          ) : null}
        </>
      ) : null}
      {key ? (
        <Group title={words.usedBy}>
          {usedBy.length ? (
            <div className="bst:grid bst:gap-1">
              {usedBy.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="bst:flex bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-control bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-2 bst:text-left bst:text-[12.5px] bst:hover:border-primary/40"
                  onClick={() => {
                    store.getState().select([candidate.id]);
                  }}
                >
                  <Split className="bst:size-3.5 bst:text-muted-foreground" aria-hidden="true" />
                  {(candidate.props.label as string) || candidate.type}
                </button>
              ))}
            </div>
          ) : (
            <p className="bst:text-xs bst:text-muted-foreground">{words.usedByNone}</p>
          )}
        </Group>
      ) : null}
    </>
  );
}

function MoreTab({ id }: { id: string }) {
  const { words } = useForm();
  const { node, update, store } = useField(id);
  const doc = useEditor<FormDocument, FormDocument>((state) => state.view);
  if (!node) return null;
  const p = node.props;
  const locked = typeof p.lock === 'string' && p.lock !== '';
  const steps = stepsOf(doc);
  const stepIndex = steps.findIndex((step) => step.children?.includes(id));
  const position = (steps[stepIndex]?.children ?? []).indexOf(id);

  return (
    <>
      {typeof p.key === 'string' ? (
        <Row label={words.key} hint={locked ? words.keyLocked : words.keyHint}>
          {(fieldId) => (
            <Input
              id={fieldId}
              value={p.key as string}
              readOnly={locked}
              className="bst:font-mono bst:text-xs"
              onChange={(event) => {
                const key = keyFromLabel(event.target.value);
                if (key)
                  update({ key: uniqueKey(key, keysInUse(store.getState().doc, id)) }, words.key);
              }}
            />
          )}
        </Row>
      ) : null}
      {typeof p.prefill === 'string' ? (
        <Row label={words.fillFromLink} hint={words.fillFromLinkHint}>
          {(fieldId) => (
            <Input
              id={fieldId}
              value={p.prefill as string}
              placeholder="plate"
              className="bst:font-mono bst:text-xs"
              onChange={(event) => {
                update(
                  { prefill: event.target.value.replace(/[^a-z0-9_]/gi, '') },
                  words.fillFromLink,
                );
              }}
            />
          )}
        </Row>
      ) : null}
      {typeof p.readonly === 'boolean' ? (
        <ToggleFlag
          title={words.readonly}
          description={words.readonlyHint}
          checked={p.readonly}
          onCheckedChange={(readonly) => {
            update({ readonly }, words.readonly);
          }}
        />
      ) : null}
      {typeof p.hideFromVisitors === 'boolean' ? (
        <ToggleFlag
          title={words.hideFromVisitors}
          description={words.hideFromVisitorsHint}
          checked={p.hideFromVisitors}
          disabled={locked}
          onCheckedChange={(hideFromVisitors) => {
            update({ hideFromVisitors }, words.hideFromVisitors);
          }}
        />
      ) : null}
      {typeof p.protect === 'boolean' ? (
        <ToggleFlag
          title={words.protect}
          description={locked ? words.protectLocked : words.protectHint}
          checked={p.protect || locked}
          disabled={locked}
          onCheckedChange={(protect) => {
            update({ protect }, words.protect);
          }}
        />
      ) : null}
      <Group title={words.position}>
        <p className="bst:text-xs bst:text-muted-foreground">
          {words.positionHint(stepIndex + 1, position + 1, steps[stepIndex]?.children?.length ?? 0)}
        </p>
        {steps.length > 1 ? (
          <Row label={words.moveToStep}>
            {(fieldId) => (
              <Select
                id={fieldId}
                value={String(stepIndex)}
                onValueChange={(value) => {
                  const target = steps[Number(value)];
                  if (target && Number(value) !== stepIndex) {
                    store.getState().moveNodes([id], target.id, target.children?.length ?? 0);
                  }
                }}
                options={steps.map((step, index) => ({
                  value: String(index),
                  label: `${String(index + 1)}. ${(step.props.title as string) || words.stepNumber(index + 1)}`,
                }))}
              />
            )}
          </Row>
        ) : null}
      </Group>
    </>
  );
}

/** A step: its title, how many fields it holds, and deleting it. */
function StepPanel({ id }: { id: string }) {
  const { words } = useForm();
  const { node, update, store } = useField(id);
  const count = useEditor<number, FormDocument>(
    (state) => state.doc.nodes[state.doc.root]?.children?.length ?? 0,
  );
  if (!node) return null;
  return (
    <div className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
      <Row label={words.stepTitle}>
        {(fieldId) => (
          <Input
            id={fieldId}
            maxLength={80}
            value={node.props.title as string}
            onChange={(event) => {
              update({ title: event.target.value }, words.stepTitle);
            }}
          />
        )}
      </Row>
      <p className="bst:text-xs bst:text-muted-foreground">
        {words.stepFields(node.children?.length ?? 0)}
      </p>
      {count > 1 ? (
        <div className="bst:grid bst:gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bst:justify-self-start bst:text-destructive"
            icon={<Trash2 aria-hidden="true" />}
            onClick={() => {
              store.getState().removeNodes([id]);
            }}
          >
            {words.deleteStep}
          </Button>
          <p className="bst:text-xs bst:text-muted-foreground">{words.deleteStepHint}</p>
        </div>
      ) : null}
    </div>
  );
}
