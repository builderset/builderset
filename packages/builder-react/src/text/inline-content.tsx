'use client';

import type { Editor } from '@tiptap/core';
import { useEffect, useRef } from 'react';

/**
 * TipTap's `EditorContent`, mounted into a `<span>`.
 *
 * The canvas edits text INSIDE the renderer's own elements — a paragraph's
 * `<p>`, a heading's `<h2>` — and a `<div>` is not allowed there. This does
 * what `EditorContent` does (moves the editor's DOM out of its detached holder
 * and tells the editor where it now lives) without the wrapper div. The
 * builder uses no React node views, so none of their portal plumbing is needed.
 */
export function InlineContent({ editor, className }: { editor: Editor; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || editor.isDestroyed) return;
    const holder = editor.view.dom.parentNode;
    if (holder && holder !== element) {
      element.append(...Array.from(holder.childNodes));
      editor.setOptions({ element });
    }
    return () => {
      if (editor.isDestroyed) return;
      const current = editor.view.dom.parentNode;
      if (!current) return;
      // Back into a detached holder, as `EditorContent` does on unmount, so a
      // remount finds the editor where it expects it.
      const detached = document.createElement('div');
      detached.append(...Array.from(current.childNodes));
      editor.setOptions({ element: detached });
    };
  }, [editor]);

  return <span ref={ref} className={className} />;
}
