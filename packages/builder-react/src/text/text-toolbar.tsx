'use client';

import { isSafeUrl } from '@motors/builder-core';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Braces,
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
import { useEditorContext } from '../context';

/**
 * The formatting bar over a text selection: marks, a link, and clear.
 *
 * Positioned from the selection's own rectangle, above it — or below when the
 * selection is near the top of the window — so it never covers what is being
 * formatted.
 */
export function TextToolbar({ editor }: { editor: Editor }) {
  const { profile, messages } = useEditorContext();
  const variables = profile.variables ?? [];
  const [linking, setLinking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
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

  // With variables to offer, the bar stays up at a caret too: inserting a
  // variable where the cursor is is the common case in an email.
  const visible = ((!state.empty || variables.length > 0) && state.focused) || linking || picking;
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

  const insertVariable = (path: string) => {
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'text', text: `{{${path}}}`, marks: [{ type: 'variable', attrs: { path } }] },
        { type: 'text', text: ' ' },
      ])
      .run();
    setPicking(false);
    setQuery('');
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
          {picking ? (
            <div className="w-64">
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setPicking(false);
                }}
                placeholder={messages.searchVariables}
                className="border-input bg-background mb-1 h-7 w-full rounded-md border px-2 text-sm outline-none"
              />
              <div className="max-h-56 overflow-y-auto">
                {variables
                  .filter((variable) =>
                    `${variable.path} ${variable.label}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((variable) => (
                    <button
                      key={variable.path}
                      type="button"
                      onClick={() => {
                        insertVariable(variable.path);
                      }}
                      className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs"
                    >
                      <span className="truncate">{variable.label}</span>
                      <code className="text-muted-foreground shrink-0 text-[10px]">
                        {variable.path}
                      </code>
                    </button>
                  ))}
              </div>
            </div>
          ) : linking ? (
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
              {variables.length ? (
                <ToolButton
                  label={messages.insertVariable}
                  onClick={() => {
                    setPicking(true);
                  }}
                >
                  <Braces />
                </ToolButton>
              ) : null}
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
