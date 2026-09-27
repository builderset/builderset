'use client';

import { isSafeUrl, type RichText } from '@motors/builder-core';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Highlight from '@tiptap/extension-highlight';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor as useTiptap } from '@tiptap/react';
import { useEffect, useRef } from 'react';

import { fromTiptap, toTiptap } from './convert';
import { TextToolbar } from './text-toolbar';

/**
 * A rich-text value as a form control — for the inspector, where a caption or
 * an FAQ answer is edited beside the canvas rather than on it. Same marks and
 * the same formatting bar as the canvas; Enter is a line break here.
 */
export function RichTextInput({
  value,
  onChange,
  id,
  multiline = true,
}: {
  value: RichText;
  onChange: (value: RichText) => void;
  id?: string | undefined;
  multiline?: boolean;
}) {
  const last = useRef(value);
  const change = useRef(onChange);
  change.current = onChange;

  const editor = useTiptap({
    extensions: [
      Document.extend({ content: 'paragraph' }),
      Paragraph,
      Text,
      HardBreak.extend({
        addKeyboardShortcuts() {
          // eslint-disable-next-line @typescript-eslint/naming-convention -- TipTap's key names
          return multiline ? { Enter: () => this.editor.commands.setHardBreak() } : {};
        },
      }),
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      Highlight,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        autolink: false,
        isAllowedUri: (url) => isSafeUrl(url),
      }),
    ],
    content: toTiptap(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          'border-input bg-background focus:ring-ring/40 min-h-9 w-full rounded-[var(--radius-control)] border px-3 py-1.5 text-sm outline-none focus:ring-2 [&_p]:m-0',
      },
    },
    onUpdate({ editor: instance }) {
      const next = fromTiptap(instance.getJSON());
      last.current = next;
      change.current(next);
    },
  });

  useEffect(() => {
    if (!editor || value === last.current) return;
    if (JSON.stringify(fromTiptap(editor.getJSON())) === JSON.stringify(value)) return;
    last.current = value;
    editor.commands.setContent(toTiptap(value), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="border-input bg-background min-h-9 rounded-[var(--radius-control)] border px-3 py-1.5 text-sm">
        {value.map((run) => run.text).join('')}
      </div>
    );
  }
  return (
    <>
      <EditorContent editor={editor} />
      <TextToolbar editor={editor} />
    </>
  );
}
