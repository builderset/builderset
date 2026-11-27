'use client';

import type { Breakpoint, EditableTextField } from '@builderset/engine';
import type { ReactNode } from 'react';

import type { EmailDocument } from '../core';
import type { BrandKit } from '../render';
import { EmailCanvas, type EditableField } from './canvas';
import { useEmail } from './context';
import { darkened } from './dark-preview';

/**
 * The email on the canvas, and nothing around it: its backdrop is the work
 * area. It is drawn as it is written (variables as chips), filled in with the
 * type's example data, or as a dark inbox draws it: the dock's two switches.
 * The inbox's view of it — sender, subject, preheader — is in the settings.
 */

/** What the profile passes on to the canvas: how to draw the email's parts. */
export interface EmailDrawing {
  brand: BrandKit;
  assetUrl: (key: string) => string;
  socialIcon?: ((network: string, style: string) => string | null) | undefined;
  fontPreviews: boolean;
  locale: string;
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
