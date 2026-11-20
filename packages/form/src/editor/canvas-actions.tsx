'use client';

import { DockToggle, useEditor, useEditorContext } from '@builderset/engine/editor';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Tooltip,
} from '@builderset/engine/ui';
import { ChevronLeft, ChevronRight, Copy, Database, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { stepsOf, type FormDocument } from '../core';
import { useForm } from './context';

/**
 * The form's own controls around the canvas: in the dock, the step being
 * edited and the test answers; in the top bar, "Share" — the link, a link
 * with answers filled in, and how to put the form on a page.
 */

const DOCK_BUTTON = 'bst:size-[34px] bst:rounded-[9px] bst:[&_svg]:size-4';

export function FormDockItems() {
  const { store } = useEditorContext();
  const { words, step, setStep, testAnswers, setTestAnswers } = useForm();
  const count = useEditor<number, FormDocument>((state) => stepsOf(state.doc).length);
  const index = Math.min(step, count - 1);

  // ← and → move between steps when nothing is selected and nobody is typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      )
        return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (store.getState().selection.length > 0) return;
      if (event.key === 'ArrowRight' && index < count - 1) setStep(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) setStep(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [index, count, setStep, store]);

  return (
    <>
      <Tooltip content={`${words.previousStep} · ←`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={words.previousStep}
          disabled={index === 0}
          className={DOCK_BUTTON}
          onClick={() => {
            store.getState().select([]);
            setStep(index - 1);
          }}
        >
          <ChevronLeft />
        </Button>
      </Tooltip>
      <span className="bst:px-1.5 bst:font-mono bst:text-xs bst:text-muted-foreground bst:tabular-nums">
        {words.stepOfDock(index + 1, count)}
      </span>
      <Tooltip content={`${words.nextStep} · →`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={words.nextStep}
          disabled={index >= count - 1}
          className={DOCK_BUTTON}
          onClick={() => {
            store.getState().select([]);
            setStep(index + 1);
          }}
        >
          <ChevronRight />
        </Button>
      </Tooltip>
      <DockToggle label={words.testAnswers} pressed={testAnswers} onPressedChange={setTestAnswers}>
        <Database aria-hidden="true" />
      </DockToggle>
    </>
  );
}

/** A read-only line with a copy button. */
function CopyLine({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const { host } = useEditorContext();
  const { words } = useForm();
  return (
    <div className="bst:grid bst:gap-1.5">
      <Label className="bst:text-xs bst:font-medium">{label}</Label>
      <div className="bst:flex bst:gap-1.5">
        <Input readOnly value={value} className="bst:font-mono bst:text-xs" aria-label={label} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={words.copy}
          onClick={() => {
            void navigator.clipboard
              .writeText(value)
              .then(() => {
                host.toast('success', words.copied);
              })
              .catch(() => undefined);
          }}
        >
          <Copy aria-hidden="true" />
        </Button>
      </div>
      {hint ? <p className="bst:text-xs bst:text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** "Share": the form's link, a prefilled link and the code for a page. */
export function ShareButton() {
  const { words, publicUrl } = useForm();
  const slug = useEditor<string, FormDocument>((state) => state.doc.meta.slug);
  const prefill = useEditor<string | null, FormDocument>((state) => {
    const field = Object.values(state.doc.nodes).find(
      (node) =>
        typeof node.props.prefill === 'string' && node.props.prefill && node.type !== 'hidden',
    );
    return field ? (field.props.prefill as string) : null;
  });
  const [tab, setTab] = useState<'link' | 'embed'>('link');
  if (!publicUrl) return null;
  const url = publicUrl(slug || 'form');
  const code = [
    "import { FormView } from '@builderset/form/render';",
    "import '@builderset/form/form.css';",
    '',
    '<FormView document={form} locale="en" onSubmit={send} />',
  ].join('\n');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Link2 aria-hidden="true" />}
          className="bst:h-8 bst:rounded-[9px] bst:bg-card"
        >
          <span className="bst:hidden bst:lg:inline">{words.share}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="bst:grid bst:w-96 bst:gap-3 bst:p-3.5">
        <p className="bst:text-sm bst:font-semibold">{words.shareTitle}</p>
        <SegmentedControl
          aria-label={words.shareTitle}
          value={tab}
          onValueChange={setTab}
          options={[
            { value: 'link', label: words.link },
            { value: 'embed', label: words.embed },
          ]}
          className="bst:w-full bst:[&>*]:flex-1"
        />
        {tab === 'link' ? (
          <>
            <CopyLine label={words.linkLabel} value={url} />
            {prefill ? (
              <CopyLine
                label={words.prefilledLink}
                value={`${url}?${prefill}=…`}
                hint={words.prefilledHint}
              />
            ) : null}
          </>
        ) : (
          <div className="bst:grid bst:gap-1.5">
            <Label className="bst:text-xs bst:font-medium">{words.embedLabel}</Label>
            <pre className="bst:overflow-x-auto bst:rounded-control bst:bg-muted bst:p-3 bst:font-mono bst:text-[11.5px] bst:leading-relaxed">
              {code}
            </pre>
            <p className="bst:text-xs bst:text-muted-foreground">{words.embedHint}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
