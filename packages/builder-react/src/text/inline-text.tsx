'use client';

import {
  createFragment,
  indexInParent,
  isSafeUrl,
  parentOf,
  type RichText,
} from '@motors/builder-core';
import type { EditableTextField } from '@motors/builder-render';
import { Mark, mergeAttributes, type Editor } from '@tiptap/core';
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
import { Placeholder } from '@tiptap/extensions';
import { useEditor as useTiptap } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useEditor, useEditorContext } from '../context';
import { InlineContent } from './inline-content';
import { SlashMenu, slashMatches } from './slash-menu';
import { TextToolbar } from './text-toolbar';
import {
  fromTiptap,
  joinRichText,
  richTextLength,
  setAtPath,
  splitRichText,
  toTiptap,
} from './convert';

/** A footnote reference, kept as a mark so it survives a round trip. */
const Footnote = Mark.create({
  name: 'footnote',
  addAttributes() {
    return { ref: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, { 'data-footnote': '', class: 'text-primary font-semibold' }),
      0,
    ];
  },
});

/** Where Enter and Backspace may create or merge blocks. */
const BLOCK_TEXT = new Set(['paragraph', 'heading', 'quote', 'callout', 'disclaimer']);

/** `## ` → heading, and friends. Checked on every change of an empty-ish paragraph. */
const MARKDOWN: { pattern: RegExp; type: string; props?: Record<string, unknown> }[] = [
  { pattern: /^####\s/, type: 'heading', props: { level: 4 } },
  { pattern: /^###\s/, type: 'heading', props: { level: 3 } },
  { pattern: /^##?\s/, type: 'heading', props: { level: 2 } },
  { pattern: /^[-*]\s/, type: 'list', props: { style: 'bullet' } },
  { pattern: /^1[.)]\s/, type: 'list', props: { style: 'number' } },
  { pattern: /^\[\s?\]\s/, type: 'list', props: { style: 'check' } },
  { pattern: /^>\s/, type: 'quote' },
];

export function InlineText({ field }: { field: EditableTextField }) {
  const { store, registry, messages } = useEditorContext();
  const { nodeId, path, value, placeholder } = field;
  const editingThis = useEditor((state) => state.editingId === nodeId);
  const nodeType = useEditor((state) => state.doc.nodes[nodeId]?.type);
  const coalesceKey = `text:${nodeId}:${path}`;
  const [slash, setSlash] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const lastWritten = useRef<RichText>(value);
  const editorRef = useRef<Editor | null>(null);
  const slashRef = useRef({ slash, slashIndex });
  slashRef.current = { slash, slashIndex };

  const write = (next: RichText) => {
    lastWritten.current = next;
    const node = store.getState().doc.nodes[nodeId];
    if (!node) return;
    store
      .getState()
      .updateNode(nodeId, { props: setAtPath(node.props, path, next) }, 'Type', coalesceKey);
  };

  /** Turn this paragraph into another element, keeping what follows the marker. */
  const convert = (type: string, props: Record<string, unknown>, rest: RichText) => {
    const state = store.getState();
    const { doc } = state;
    const parent = parentOf(doc, nodeId);
    if (!parent) return false;
    const fragment = createFragment(
      registry,
      type,
      type === 'list' ? { ...props, items: [{ text: rest }] } : { ...props, text: rest },
    );
    const index = indexInParent(doc, nodeId);
    const inserted = state.insertFragment(
      fragment,
      { parentId: parent.id, index },
      `Turn into ${type}`,
    );
    if (inserted.length === 0) return false;
    state.removeNodes([nodeId]);
    state.select(inserted);
    state.setEditing(inserted[0] ?? null);
    return true;
  };

  const actions = useRef({
    enter(editor: Editor): boolean {
      const state = store.getState();
      const node = state.doc.nodes[nodeId];
      if (!node || !BLOCK_TEXT.has(node.type) || path !== 'text') return false;
      const parent = parentOf(state.doc, nodeId);
      if (!parent) return false;
      const current = fromTiptap(editor.getJSON());
      const offset = editor.state.selection.from - 1;
      const [before, after] = splitRichText(current, offset);
      write(before);
      const fragment = createFragment(registry, 'paragraph', { text: after });
      const inserted = state.insertFragment(
        fragment,
        { parentId: parent.id, index: indexInParent(state.doc, nodeId) + 1 },
        'New paragraph',
      );
      if (inserted[0]) {
        state.select(inserted);
        state.setEditing(inserted[0]);
      }
      return true;
    },
    backspaceAtStart(editor: Editor): boolean {
      const state = store.getState();
      const node = state.doc.nodes[nodeId];
      if (!node || !BLOCK_TEXT.has(node.type) || path !== 'text') return false;
      const parent = parentOf(state.doc, nodeId);
      const index = indexInParent(state.doc, nodeId);
      const previousId = parent?.children?.[index - 1];
      const previous = previousId ? state.doc.nodes[previousId] : undefined;
      const current = fromTiptap(editor.getJSON());
      if (previous && BLOCK_TEXT.has(previous.type) && Array.isArray(previous.props.text)) {
        // Merge into the block above, the way a word processor does.
        const merged = joinRichText(previous.props.text as RichText, current);
        state.updateNode(previous.id, { props: { text: merged } }, 'Merge');
        state.removeNodes([nodeId]);
        state.select([previous.id]);
        state.setEditing(previous.id);
        return true;
      }
      if (richTextLength(current) === 0 && (parent?.children?.length ?? 0) > 1) {
        state.removeNodes([nodeId]);
        return true;
      }
      return false;
    },
  });

  const extensions = useMemo(
    () => [
      Document.extend({ content: 'paragraph' }),
      Paragraph,
      Text,
      HardBreak,
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      Highlight,
      Subscript,
      Superscript,
      Footnote,
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        isAllowedUri: (url) => isSafeUrl(url),
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    [placeholder],
  );

  const editor = useTiptap({
    extensions,
    content: toTiptap(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none [&_p]:m-0 [&_p]:inline-block [&_p]:min-w-[1ch] [&_p]:w-full',
        'data-inline-text': '',
      },
      handleKeyDown(view, event) {
        const current = slashRef.current;
        if (current.slash !== null) {
          const matches = slashMatches(registry, messages, current.slash);
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setSlashIndex((index) => (index + step + matches.length) % Math.max(1, matches.length));
            return true;
          }
          if (event.key === 'Enter') {
            const chosen = matches[current.slashIndex];
            if (chosen) chooseSlash(chosen.type);
            return true;
          }
          if (event.key === 'Escape') {
            setSlash(null);
            return true;
          }
        }
        const instance = editorRef.current;
        if (event.key === 'Enter' && !event.shiftKey && instance) {
          return actions.current.enter(instance);
        }
        if (
          event.key === 'Backspace' &&
          instance &&
          view.state.selection.empty &&
          view.state.selection.from <= 1
        ) {
          return actions.current.backspaceAtStart(instance);
        }
        return false;
      },
    },
    onFocus() {
      const state = store.getState();
      if (state.selection.length !== 1 || state.selection[0] !== nodeId) state.select([nodeId]);
      if (state.editingId !== nodeId) state.setEditing(nodeId);
    },
    onUpdate({ editor: instance }) {
      const next = fromTiptap(instance.getJSON());
      const plain = next.map((run) => run.text).join('');

      // The slash menu: "/" typed into an otherwise empty paragraph.
      if (nodeType === 'paragraph' && path === 'text' && /^\/[\w-]*$/.test(plain)) {
        setSlash(plain.slice(1));
        setSlashIndex(0);
      } else if (slashRef.current.slash !== null) {
        setSlash(null);
      }

      // Markdown shortcuts, only at the very start of a paragraph.
      if (nodeType === 'paragraph' && path === 'text') {
        if (plain === '---') {
          convert('divider', {}, []);
          return;
        }
        for (const shortcut of MARKDOWN) {
          const match = shortcut.pattern.exec(plain);
          if (match) {
            const [, rest] = splitRichText(next, match[0].length);
            if (convert(shortcut.type, shortcut.props ?? {}, rest)) return;
          }
        }
      }
      write(next);
    },
  });

  editorRef.current = editor;

  function chooseSlash(type: string) {
    setSlash(null);
    const state = store.getState();
    const parent = parentOf(state.doc, nodeId);
    if (!parent) return;
    const index = indexInParent(state.doc, nodeId);
    const inserted = state.insertElement(type, { parentId: parent.id, index });
    if (inserted) {
      state.removeNodes([nodeId]);
      state.select([inserted]);
      state.setEditing(inserted);
    }
  }

  // An outside change — undo, the inspector, a restored revision — replaces
  // the editor's content. Its own typing does not: that would move the caret.
  useEffect(() => {
    if (!editor) return;
    if (value === lastWritten.current) return;
    const current = fromTiptap(editor.getJSON());
    if (JSON.stringify(current) === JSON.stringify(value)) return;
    lastWritten.current = value;
    editor.commands.setContent(toTiptap(value), { emitUpdate: false });
  }, [editor, value]);

  // Focus when this block becomes the one being typed into (Enter, slash, undo).
  useEffect(() => {
    if (editor && editingThis && !editor.isFocused) editor.commands.focus('end');
  }, [editor, editingThis]);

  if (!editor) {
    // The first render (and the server's): the text as it reads, so the canvas
    // never flashes empty before the editor mounts.
    return <span>{value.map((run) => run.text).join('')}</span>;
  }

  return (
    <>
      <InlineContent
        editor={editor}
        className="contents [&_.ProseMirror]:inline-block [&_.ProseMirror]:w-full"
      />
      {editingThis ? <TextToolbar editor={editor} /> : null}
      {slash !== null ? (
        <SlashMenu
          editor={editor}
          query={slash}
          activeIndex={slashIndex}
          onHover={setSlashIndex}
          onChoose={chooseSlash}
          onClose={() => {
            setSlash(null);
          }}
        />
      ) : null}
    </>
  );
}
