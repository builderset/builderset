'use client';

import { isSafeUrl } from '@motors/builder-core';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../cn';

/**
 * The formatting bar over a text selection: marks, a link, and clear.
 *
 * Positioned from the selection's own rectangle, above it — or below when the
 * selection is near the top of the window — so it never covers what is being
 * formatted.
 */
export function TextToolbar({ editor }: { editor: Editor }) {
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState('');
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      empty: e.state.selection.empty,
      focused: e.isFocused,
      from: e.state.selection.from,
      to: e.state.selection.to,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      highlight: e.isActive('highlight'),
      link: e.isActive('link'),
    }),
  });

  const visible = (!state.empty && state.focused) || linking;
  let position: { left: number; top: number } | null = null;
  if (visible) {
    const start = editor.view.coordsAtPos(state.from);
    const end = editor.view.coordsAtPos(state.to);
    const above = start.top > 64;
    position = {
      left: Math.max(8, (start.left + end.right) / 2 - 150),
      top: above ? start.top - 44 : end.bottom + 8,
    };
  }

  const toggle = (name: string) => () => {
    editor.chain().focus().toggleMark(name).run();
  };

  const applyLink = () => {
    const url = href.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (isSafeUrl(url)) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinking(false);
  };

  return createPortal(
    <AnimatePresence>
      {position ? (
        <motion.div
          key="toolbar"
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.14 }}
          onMouseDown={(event) => {
            // Keep the selection: a click on the bar must not blur the text.
            if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
          }}
          className="border-border bg-popover text-popover-foreground fixed z-[80] flex items-center gap-0.5 rounded-[var(--radius-control)] border p-1 shadow-lg"
          style={{ left: position.left, top: position.top }}
        >
          {linking ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                applyLink();
              }}
            >
              <input
                autoFocus
                value={href}
                onChange={(event) => {
                  setHref(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setLinking(false);
                }}
                placeholder="https://"
                aria-invalid={href.trim() !== '' && !isSafeUrl(href.trim())}
                className="border-input bg-background aria-invalid:border-destructive h-7 w-60 rounded-md border px-2 text-sm outline-none"
              />
              <ToolButton label="OK" onClick={applyLink}>
                <span className="px-1 text-xs font-semibold">OK</span>
              </ToolButton>
            </form>
          ) : (
            <>
              <ToolButton label="Bold" active={state.bold} onClick={toggle('bold')}>
                <Bold />
              </ToolButton>
              <ToolButton label="Italic" active={state.italic} onClick={toggle('italic')}>
                <Italic />
              </ToolButton>
              <ToolButton label="Underline" active={state.underline} onClick={toggle('underline')}>
                <Underline />
              </ToolButton>
              <ToolButton label="Strikethrough" active={state.strike} onClick={toggle('strike')}>
                <Strikethrough />
              </ToolButton>
              <ToolButton label="Code" active={state.code} onClick={toggle('code')}>
                <Code />
              </ToolButton>
              <ToolButton label="Highlight" active={state.highlight} onClick={toggle('highlight')}>
                <Highlighter />
              </ToolButton>
              <span className="bg-border mx-0.5 h-5 w-px" aria-hidden="true" />
              {state.link ? (
                <ToolButton
                  label="Remove link"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  }}
                >
                  <Link2Off />
                </ToolButton>
              ) : null}
              <ToolButton
                label="Link"
                active={state.link}
                onClick={() => {
                  const current = editor.getAttributes('link').href as string | undefined;
                  setHref(current ?? '');
                  setLinking(true);
                }}
              >
                <Link2 />
              </ToolButton>
              <ToolButton
                label="Clear formatting"
                onClick={() => {
                  editor.chain().focus().unsetAllMarks().run();
                }}
              >
                <RemoveFormatting />
              </ToolButton>
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function ToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-md transition-colors active:scale-95 [&_svg]:size-4',
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
