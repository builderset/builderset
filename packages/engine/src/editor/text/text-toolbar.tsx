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
          className="bst:fixed bst:z-[80] bst:flex bst:items-center bst:gap-0.5 bst:rounded-control bst:border bst:border-border bst:bg-popover bst:p-1 bst:text-popover-foreground bst:shadow-lg"
          style={{ left: position.left, top: position.top }}
        >
          {choosingFont ? (
            <div className="bst:w-72">
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
                className="bst:mb-1 bst:h-7 bst:w-full bst:rounded-md bst:border bst:border-input bst:bg-background bst:px-2 bst:text-sm bst:outline-none"
              />
              <div className="bst:max-h-72 bst:overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    applyFont(null);
                  }}
                  className={cn(
                    'bst:flex bst:w-full bst:items-center bst:rounded bst:px-2 bst:py-1.5 bst:text-left bst:text-sm',
                    !state.font ? 'bst:bg-accent' : 'bst:hover:bg-accent',
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
                      <p className="bst:px-2 bst:pt-2 bst:pb-1 bst:text-[10px] bst:font-semibold bst:tracking-wider bst:text-muted-foreground bst:uppercase">
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
                            'bst:flex bst:w-full bst:items-center bst:rounded bst:px-2 bst:py-1.5 bst:text-left bst:text-[15px]',
                            state.font === font.key ? 'bst:bg-accent' : 'bst:hover:bg-accent',
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
            <div className="bst:w-64">
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
                className="bst:mb-1 bst:h-7 bst:w-full bst:rounded-md bst:border bst:border-input bst:bg-background bst:px-2 bst:text-sm bst:outline-none"
              />
              <div className="bst:max-h-56 bst:overflow-y-auto">
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
                      className="bst:flex bst:w-full bst:items-center bst:justify-between bst:gap-2 bst:rounded bst:px-2 bst:py-1 bst:text-left bst:text-xs bst:hover:bg-accent"
                    >
                      <span className="bst:truncate">{variable.label}</span>
                      <code className="bst:shrink-0 bst:text-[10px] bst:text-muted-foreground">
                        {variable.path}
                      </code>
                    </button>
                  ))}
              </div>
            </div>
          ) : linking ? (
            <form
              className="bst:flex bst:items-center bst:gap-1"
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
                className="bst:h-7 bst:w-60 bst:rounded-md bst:border bst:border-input bst:bg-background bst:px-2 bst:text-sm bst:outline-none bst:aria-invalid:border-destructive"
              />
              <ToolButton label="OK" onClick={applyLink}>
                <span className="bst:px-1 bst:text-xs bst:font-semibold">OK</span>
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
                    className="bst:flex bst:h-7 bst:max-w-36 bst:items-center bst:gap-1 bst:rounded-md bst:px-2 bst:text-xs bst:hover:bg-accent"
                  >
                    <span
                      className="bst:truncate"
                      style={currentFont ? { fontFamily: currentFont.stack } : undefined}
                    >
                      {currentFont?.label ?? messages.inheritFont}
                    </span>
                    <ChevronDown
                      className="bst:size-3 bst:shrink-0 bst:opacity-60"
                      aria-hidden="true"
                    />
                  </button>
                  <span className="bst:mx-0.5 bst:h-5 bst:w-px bst:bg-border" aria-hidden="true" />
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
              <span className="bst:mx-0.5 bst:h-5 bst:w-px bst:bg-border" aria-hidden="true" />
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
        'bst:flex bst:size-7 bst:items-center bst:justify-center bst:rounded-md bst:transition-colors bst:active:scale-95 bst:[&_svg]:size-4',
        active ? 'bst:bg-primary bst:text-primary-foreground' : 'bst:hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
