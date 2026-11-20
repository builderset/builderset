'use client';

import { parentOf, type Breakpoint, type BuilderNode } from '@builderset/engine';
import { useEditor, useEditorContext } from '@builderset/engine/editor';
import { Plus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

import { stepsOf, type FormDocument, type FormMeta, type FormSettings } from '../core';
import { FieldBox, FieldControl, FormProgress, formClassName, formStyle } from '../render';
import { useForm } from './context';
import {
  exampleAnswer,
  keyFollowsLabel,
  keyFromLabel,
  keysInUse,
  uniqueKey,
} from './field-helpers';

/**
 * The form on the canvas: a bar of steps over the form itself, drawn by the
 * same parts the live form uses — so the canvas is the form. Its words are
 * typed in place: the title, the intro, each label, the buttons. Each field's
 * box carries `data-node`, which is what the editor selects, measures and
 * drops beside; the step's grid carries its own, to drop into an empty step.
 */

/** Plain words edited in place. Uncontrolled while focused, so the caret never jumps. */
function Editable({
  value,
  onChange,
  placeholder,
  className,
  as: Tag = 'span',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  className?: string | undefined;
  as?: 'span' | 'h2' | 'p';
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element && document.activeElement !== element && element.textContent !== value) {
      element.textContent = value;
    }
  }, [value]);
  return (
    <Tag
      ref={ref as never}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-label={placeholder}
      data-placeholder={placeholder}
      className={`${className ?? ''} bst:cursor-text bst:rounded-[4px] bst:outline-none bst:empty:before:opacity-40 bst:empty:before:content-[attr(data-placeholder)] bst:hover:shadow-[0_0_0_1px_rgb(109_137_255/0.5)] bst:focus:shadow-[0_0_0_2px_#6d89ff]`}
      onInput={(event) => {
        onChange(event.currentTarget.textContent);
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          (event.currentTarget as HTMLElement).blur();
        }
      }}
    />
  );
}

/** The steps as tabs: pick one to edit it, double-click to rename, "+ Step" for another. */
function StepBar({ steps, index }: { steps: BuilderNode[]; index: number }) {
  const { store } = useEditorContext<FormDocument>();
  const { words, setStep } = useForm();
  const [renaming, setRenaming] = useState<string | null>(null);

  const addStep = () => {
    const { doc } = store.getState();
    const count = doc.nodes[doc.root]?.children?.length ?? 0;
    const id = store.getState().insertElement(
      'step',
      { parentId: doc.root, index: count },
      {
        title: words.stepNumber(count + 1),
      },
    );
    if (id) setStep(count);
  };

  return (
    <div
      role="tablist"
      aria-label={words.steps}
      className="bst:sticky bst:top-3 bst:z-10 bst:mx-auto bst:mb-5 bst:flex bst:w-max bst:max-w-[calc(100%-40px)] bst:[scrollbar-width:none] bst:gap-1 bst:overflow-x-auto bst:rounded-[13px] bst:border bst:border-border bst:bg-card bst:p-1 bst:shadow-[0_1px_2px_rgb(20_23_30/0.06),0_8px_24px_rgb(20_23_30/0.08)]"
    >
      {steps.map((step, position) => {
        const on = position === index;
        const title = typeof step.props.title === 'string' ? step.props.title : '';
        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => {
              // Another step: what was selected on this one is put down.
              if (position !== index) store.getState().select([]);
              setStep(position);
            }}
            onDoubleClick={() => {
              setRenaming(step.id);
            }}
            className={
              on
                ? 'bst:inline-flex bst:h-[34px] bst:shrink-0 bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-[9px] bst:bg-foreground bst:pr-3 bst:pl-1.5 bst:text-[12.5px] bst:font-semibold bst:whitespace-nowrap bst:text-background'
                : 'bst:inline-flex bst:h-[34px] bst:shrink-0 bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-[9px] bst:pr-3 bst:pl-1.5 bst:text-[12.5px] bst:font-semibold bst:whitespace-nowrap bst:text-muted-foreground bst:transition-colors bst:hover:bg-accent bst:hover:text-foreground'
            }
          >
            <b
              className={
                on
                  ? 'bst:grid bst:size-[22px] bst:place-items-center bst:rounded-[7px] bst:bg-background/20 bst:text-[11.5px]'
                  : 'bst:grid bst:size-[22px] bst:place-items-center bst:rounded-[7px] bst:bg-accent bst:text-[11.5px]'
              }
            >
              {position + 1}
            </b>
            {renaming === step.id ? (
              <input
                autoFocus
                defaultValue={title}
                aria-label={words.stepTitle}
                className="bst:h-6 bst:w-28 bst:rounded-md bst:border bst:border-primary bst:bg-background bst:px-1.5 bst:text-foreground bst:outline-none"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'Escape') setRenaming(null);
                }}
                onBlur={(event) => {
                  const next = event.currentTarget.value.trim();
                  if (next && next !== title) {
                    store
                      .getState()
                      .updateNode(step.id, { props: { title: next } }, words.stepTitle);
                  }
                  setRenaming(null);
                }}
              />
            ) : (
              <span>{title || words.stepNumber(position + 1)}</span>
            )}
            <em
              className={
                on
                  ? 'bst:font-mono bst:text-[11px] bst:font-medium bst:text-background/60 bst:not-italic'
                  : 'bst:font-mono bst:text-[11px] bst:font-medium bst:text-muted-foreground/70 bst:not-italic'
              }
            >
              {step.children?.length ?? 0}
            </em>
          </button>
        );
      })}
      <button
        type="button"
        onClick={addStep}
        className="bst:inline-flex bst:h-[34px] bst:shrink-0 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-[9px] bst:px-3 bst:text-[12.5px] bst:font-semibold bst:text-primary bst:transition-colors bst:hover:bg-primary/10"
      >
        <Plus className="bst:size-3.5" aria-hidden="true" />
        {words.addStep}
      </button>
    </div>
  );
}

export function FormCanvas({ doc, viewport }: { doc: FormDocument; viewport: Breakpoint }) {
  const { store } = useEditorContext<FormDocument>();
  const { words, visitor, step: wanted, setStep, testAnswers } = useForm();
  const selection = useEditor((state) => state.selection);
  const steps = stepsOf(doc);
  const index = Math.max(0, Math.min(wanted, steps.length - 1));
  const current = steps[index];
  const settings = doc.settings;
  const device = viewport === 'mobile' ? 'mobile' : 'desktop';
  const last = index === steps.length - 1;

  // Selecting a field on another step (from the outline, a check) goes to that
  // step — when the selection changes, not when the step does: picking another
  // step must not be pulled back to where the selection still is.
  const selected = selection[selection.length - 1];
  const shown = useRef(index);
  shown.current = index;
  useEffect(() => {
    if (!selected) return;
    const state = store.getState();
    let id: string | undefined = selected;
    while (id) {
      const node = state.doc.nodes[id];
      if (node?.type === 'step') {
        const position = stepsOf(state.doc).findIndex((candidate) => candidate.id === id);
        if (position >= 0 && position !== shown.current) setStep(position);
        return;
      }
      id = parentOf(state.doc, id)?.id;
    }
  }, [selected, store, setStep]);

  const setMeta = (patch: Partial<FormMeta>, key: string) => {
    store.getState().updateMeta(patch, words.titlePlaceholder, `form:meta:${key}`);
  };
  const setButtons = (patch: Partial<FormSettings['buttons']>, key: string) => {
    store.getState().updateDocument(
      words.buttonSubmit,
      (draft) => {
        draft.settings.buttons = { ...draft.settings.buttons, ...patch };
      },
      `form:buttons:${key}`,
    );
  };
  /** A new label, and the key with it while the key still follows the label. */
  const relabel = (node: BuilderNode, label: string) => {
    const props: Record<string, unknown> = { label };
    const key = node.props.key;
    if (
      typeof key === 'string' &&
      !node.props.lock &&
      keyFollowsLabel(key, node.props.label as string)
    ) {
      const base = keyFromLabel(label);
      if (base) props.key = uniqueKey(base, keysInUse(store.getState().doc, node.id));
    }
    store.getState().updateNode(node.id, { props }, words.label, `form:label:${node.id}`);
  };

  return (
    <div className="bst:px-6 bst:pt-4 bst:pb-10">
      <StepBar steps={steps} index={index} />
      <div
        className={formClassName(settings.style, device)}
        style={formStyle(settings.style, device)}
      >
        {index === 0 ? (
          <div className="bsf-head">
            <Editable
              as="h2"
              className="bsf-title"
              value={doc.meta.title}
              placeholder={words.titlePlaceholder}
              onChange={(title) => {
                setMeta({ title }, 'title');
              }}
            />
            <Editable
              as="p"
              className="bsf-intro"
              value={doc.meta.intro}
              placeholder={words.introPlaceholder}
              onChange={(intro) => {
                setMeta({ intro }, 'intro');
              }}
            />
          </div>
        ) : null}
        <FormProgress
          mode={settings.progress}
          titles={steps.map((candidate) => (candidate.props.title as string) || '')}
          index={index}
          words={visitor}
        />
        <div className="bsf-grid bst:min-h-20" data-node={current?.id}>
          {(current?.children ?? []).map((id) => {
            const node = doc.nodes[id];
            if (!node) return null;
            const editableLabel = typeof node.props.label === 'string' && node.type !== 'hidden';
            return (
              <FieldBox
                key={id}
                node={node}
                data-node={id}
                controlId={`canvas-${id}`}
                marker={settings.marker}
                words={visitor}
                mobile={device === 'mobile'}
                className={node.props.hideFromVisitors ? 'bst:opacity-45' : undefined}
                label={
                  editableLabel ? (
                    <Editable
                      value={node.props.label as string}
                      placeholder={words.label}
                      onChange={(label) => {
                        relabel(node, label);
                      }}
                    />
                  ) : undefined
                }
              >
                {node.type === 'heading' ? (
                  <Editable
                    as="p"
                    className="bsf-heading"
                    value={node.props.text as string}
                    placeholder={words.text}
                    onChange={(text) => {
                      store
                        .getState()
                        .updateNode(id, { props: { text } }, words.text, `form:text:${id}`);
                    }}
                  />
                ) : (
                  <FieldControl
                    node={node}
                    id={`canvas-${id}`}
                    words={visitor}
                    value={testAnswers ? exampleAnswer(node) : undefined}
                  />
                )}
              </FieldBox>
            );
          })}
          {current?.children?.length ? null : (
            <div className="bst:col-span-2 bst:grid bst:justify-items-center bst:gap-1.5 bst:rounded-[14px] bst:border-[1.5px] bst:border-dashed bst:border-[var(--bsf-line)] bst:px-5 bst:py-10 bst:text-center bst:text-[13px] bst:text-[var(--bsf-mute)]">
              <Plus className="bst:size-5" aria-hidden="true" />
              <b className="bst:text-[var(--bsf-ink)]">{words.emptyStep}</b>
              <span>{words.emptyStepHint}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const state = store.getState();
            state.select([]);
            state.setLeftTab('add');
            state.toggleLeft(true);
            requestAnimationFrame(() => {
              document.querySelector<HTMLInputElement>('[data-library-search]')?.focus();
            });
          }}
          className="bst:mt-[18px] bst:flex bst:h-12 bst:w-full bst:cursor-pointer bst:items-center bst:justify-center bst:gap-2 bst:rounded-xl bst:border-[1.5px] bst:border-dashed bst:border-[var(--bsf-line)] bst:text-[13.5px] bst:font-medium bst:text-[var(--bsf-mute)] bst:transition-colors bst:hover:border-[#6d89ff] bst:hover:bg-[#6d89ff]/5 bst:hover:text-[#6d89ff]"
        >
          <Plus className="bst:size-4" aria-hidden="true" />
          {words.addField}
        </button>
        <div className="bsf-nav">
          {index > 0 ? (
            <Editable
              className="bsf-back"
              value={settings.buttons.back}
              placeholder={words.buttonBack}
              onChange={(back) => {
                setButtons({ back }, 'back');
              }}
            />
          ) : (
            <span />
          )}
          <Editable
            className="bsf-button"
            value={last ? settings.buttons.submit : settings.buttons.next}
            placeholder={last ? words.buttonSubmit : words.buttonNext}
            onChange={(label) => {
              setButtons(last ? { submit: label } : { next: label }, last ? 'submit' : 'next');
            }}
          />
        </div>
      </div>
    </div>
  );
}
