'use client';

import type { Breakpoint, EditableTextField } from '@builderset/engine';
import { useEditor, useEditorContext } from '@builderset/engine/editor';
import { Button } from '@builderset/engine/ui';
import { Database } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { TEMPLATE_TOKEN, type EmailDocument } from '../core';
import { createContext as createRenderContext, fill, type BrandKit } from '../render';
import { EmailCanvas, type EditableField } from './canvas';
import { useEmail } from './context';
import { darkened } from './dark-preview';

/**
 * The canvas as a mail window: the inbox's header — who it is from, to whom,
 * the subject and the preheader — over the email itself. The email is drawn
 * as it is written (variables as chips), filled in with the type's example
 * data, or as a dark inbox draws it: the dock's two switches.
 */

/** What the profile passes on to the canvas: how to draw the email's parts. */
export interface EmailDrawing {
  brand: BrandKit;
  assetUrl: (key: string) => string;
  socialIcon?: ((network: string, style: string) => string | null) | undefined;
  fontPreviews: boolean;
  locale: string;
}

/** Text with `{{ variables }}`, the variables drawn as chips. */
function WithChips({ text, dark }: { text: string; dark: boolean }) {
  const parts = text.split(new RegExp(TEMPLATE_TOKEN.source, 'g'));
  // `split` with groups gives [text, path, format, text, path, format, …].
  const out: ReactNode[] = [];
  for (let index = 0; index < parts.length; index += 3) {
    const before = parts[index];
    if (before) out.push(<Fragment key={`t${String(index)}`}>{before}</Fragment>);
    const path = parts[index + 1];
    if (path) {
      out.push(
        <span
          key={`v${String(index)}`}
          className={
            dark
              ? 'bst:rounded bst:bg-[#2b3a5c] bst:px-1 bst:text-[0.92em] bst:font-medium bst:text-[#a9c1ff]'
              : 'bst:rounded bst:bg-[#e7eefc] bst:px-1 bst:text-[0.92em] bst:font-medium bst:text-[#1d4ed8]'
          }
        >
          {path}
        </span>,
      );
    }
  }
  return <>{out}</>;
}

/** The inbox's header over the email: the profile's `canvasHeader`. */
export function MailHeader() {
  const { words, brand, sample, view, setView } = useEmail();
  const { messages } = useEditorContext();
  // As it reads in the language being written.
  const doc = useEditor<EmailDocument, EmailDocument>((state) => state.view);
  const lang = useEditor((state) => state.lang);
  const w = words.email;
  const context = createRenderContext(doc, {
    assetUrl: () => '',
    brand,
    data: sample,
    locale: lang ?? undefined,
  });
  const line = (text: string) =>
    view.exampleData ? fill(text, context) : <WithChips text={text} dark={view.dark} />;

  return (
    <div
      className={
        view.dark
          ? 'bst:border-b bst:border-[#2c2d31] bst:bg-[#1c1d20] bst:text-[#e7e8ea]'
          : 'bst:border-b bst:border-[#ececf0] bst:bg-white bst:text-[#111827]'
      }
    >
      {view.exampleData ? (
        <div className="bst:flex bst:items-center bst:gap-2 bst:bg-[#fff7ed] bst:px-4 bst:py-1.5 bst:text-[12px] bst:text-[#9a3412]">
          <Database className="bst:size-3.5 bst:shrink-0" aria-hidden="true" />
          <span className="bst:min-w-0 bst:flex-1">{w.showingExampleData}</span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="bst:h-6 bst:text-[#9a3412] bst:hover:bg-[#ffedd5]"
            onClick={() => {
              setView({ exampleData: false });
            }}
          >
            {messages.backToEditing}
          </Button>
        </div>
      ) : null}
      <div className="bst:flex bst:gap-3 bst:px-5 bst:py-3.5">
        <span
          aria-hidden="true"
          className="bst:flex bst:size-9 bst:shrink-0 bst:items-center bst:justify-center bst:rounded-full bst:text-sm bst:font-semibold bst:text-white"
          style={{ background: brand.colors.primary ?? '#2a5bd7' }}
        >
          {brand.name.charAt(0).toUpperCase()}
        </span>
        <div className="bst:min-w-0 bst:flex-1 bst:font-sans">
          <p className="bst:flex bst:items-baseline bst:gap-2 bst:text-[13px]">
            <b className="bst:truncate bst:font-semibold">{brand.name}</b>
            <small className="bst:truncate bst:text-[12px] bst:opacity-60">
              {w.to} {line('{{recipient.email}}')}
            </small>
          </p>
          <p className="bst:mt-0.5 bst:truncate bst:text-[14px] bst:font-semibold">
            {doc.meta.subject ? (
              line(doc.meta.subject)
            ) : (
              <span className="bst:opacity-40">{w.subject}</span>
            )}
          </p>
          <p className="bst:truncate bst:text-[12.5px] bst:opacity-60">
            {doc.meta.preheader ? line(doc.meta.preheader) : w.preheader}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The email on the canvas, the way the dock's switches ask for. */
export function EmailFrame({
  doc,
  editText,
  viewport,
  drawing,
}: {
  doc: EmailDocument;
  editText: (field: EditableTextField) => ReactNode;
  viewport: Breakpoint;
  drawing: EmailDrawing;
}) {
  const { view, sample } = useEmail();
  const shown = view.dark ? darkened(doc, drawing.brand) : doc;
  const backdrop = shown.settings.backdrop;
  return (
    // The backdrop reaches the foot of the window, however short the email.
    <div
      className="bst:min-h-[calc(70vh-82px)]"
      style={{
        background: backdrop.startsWith('brand.')
          ? drawing.brand.colors[backdrop.slice(6)]
          : backdrop,
      }}
    >
      <EmailCanvas
        document={shown}
        editing
        mobile={viewport === 'mobile'}
        // With example data the text shows values, so it is not edited meanwhile.
        editText={
          view.exampleData
            ? undefined
            : (editText as unknown as (field: EditableField) => ReactNode)
        }
        assetUrl={drawing.assetUrl}
        brand={drawing.brand}
        locale={drawing.locale}
        mode={view.exampleData ? 'send' : 'preview-raw'}
        data={view.exampleData ? sample : undefined}
        socialIcon={drawing.socialIcon}
        fontPreviews={drawing.fontPreviews}
      />
    </div>
  );
}

/** The email as readers get it: filled in with the example data, nothing to edit. */
export function EmailReadOnly({
  doc,
  viewport,
  locale,
  drawing,
}: {
  doc: EmailDocument;
  viewport: Breakpoint;
  locale?: string | undefined;
  drawing: EmailDrawing;
}) {
  const { sample } = useEmail();
  return (
    <EmailCanvas
      document={doc}
      mobile={viewport === 'mobile'}
      assetUrl={drawing.assetUrl}
      brand={drawing.brand}
      locale={locale ?? drawing.locale}
      mode="send"
      data={sample}
      socialIcon={drawing.socialIcon}
      fontPreviews={drawing.fontPreviews}
    />
  );
}
