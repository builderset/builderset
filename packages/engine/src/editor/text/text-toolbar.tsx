'use client';

import { isSafeUrl } from '../../core';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Braces,
  ChevronDown,
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
import { useStylesheet } from '../use-stylesheet';

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
  const [choosingFont, setChoosingFont] = useState(false);
  const fonts = profile.fonts ?? [];
  useStylesheet(choosingFont ? profile.fontsPreviewUrl : null);
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
      font: (e.getAttributes('font').family as string | undefined) ?? null,
    }),
  });

  // With variables to offer, the bar stays up at a caret too: inserting a
  // variable where the cursor is is the common case in an email.
  const visible =
    ((!state.empty || variables.length > 0 || fonts.length > 0) && state.focused) ||
    linking ||
    picking ||
    choosingFont;
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

  /**
   * Set the font of the selection — or, with nothing selected, of the whole
   * field, which is what "change this text's font" means with a caret.
   */
  const applyFont = (family: string | null) => {
    const chain = editor.chain().focus();
    const scoped = editor.state.selection.empty ? chain.selectAll() : chain;
    if (family) scoped.setMark('font', { family }).run();
    else scoped.unsetMark('font').run();
    setChoosingFont(false);
    setQuery('');
  };
  const currentFont = fonts.find((font) => font.key === state.font);

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
          className="border-border bg-popover text-popover-foreground rounded-control fixed z-[80] flex items-center gap-0.5 border p-1 shadow-lg"
          style={{ left: position.left, top: position.top }}
        >
          {choosingFont ? (
            <div className="w-72">
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setChoosingFont(false);
                }}
                placeholder={messages.searchFonts}
                className="border-input bg-background mb-1 h-7 w-full rounded-md border px-2 text-sm outline-none"
              />
              <div className="max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    applyFont(null);
                  }}
                  className={cn(
                    'flex w-full items-center rounded px-2 py-1.5 text-left text-sm',
                    !state.font ? 'bg-accent' : 'hover:bg-accent',
                  )}
                >
                  {messages.inheritFont}
                </button>
                {[...new Set(fonts.map((font) => font.category))].map((group) => {
                  const inGroup = fonts.filter(
                    (font) =>
                      font.category === group &&
                      font.label.toLowerCase().includes(query.trim().toLowerCase()),
                  );
                  if (!inGroup.length) return null;
                  return (
                    <div key={group}>
                      <p className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                        {messages.fontGroups[group] ?? group}
                      </p>
                      {inGroup.map((font) => (
                        <button
                          key={font.key}
                          type="button"
                          onClick={() => {
                            applyFont(font.key);
                          }}
                          className={cn(
                            'flex w-full items-center rounded px-2 py-1.5 text-left text-[15px]',
                            state.font === font.key ? 'bg-accent' : 'hover:bg-accent',
                          )}
                          style={{ fontFamily: font.stack }}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : picking ? (
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
              {fonts.length ? (
                <>
                  <button
                    type="button"
                    title={messages.font}
                    aria-label={messages.font}
                    onClick={() => {
                      setChoosingFont(true);
                    }}
                    className="hover:bg-accent flex h-7 max-w-36 items-center gap-1 rounded-md px-2 text-xs"
                  >
                    <span
                      className="truncate"
                      style={currentFont ? { fontFamily: currentFont.stack } : undefined}
                    >
                      {currentFont?.label ?? messages.inheritFont}
                    </span>
                    <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden="true" />
                  </button>
                  <span className="bg-border mx-0.5 h-5 w-px" aria-hidden="true" />
                </>
              ) : null}
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
