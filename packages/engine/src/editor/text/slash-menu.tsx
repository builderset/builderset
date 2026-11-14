'use client';

import type { ElementRegistry } from '../../core';
import type { Editor } from '@tiptap/core';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import type { EditorMessages } from '../messages';

export interface ElementChoice {
  type: string;
  icon: string;
  name: string;
  description: string;
  category: string;
}

/** Every element a writer may insert, with its words in the UI language. */
export function elementChoices(
  registry: ElementRegistry,
  messages: EditorMessages,
): ElementChoice[] {
  return registry.insertable().map((definition) => {
    const text = messages.elements[definition.type];
    return {
      type: definition.type,
      icon: definition.icon,
      name: text?.name ?? definition.type,
      description: text?.description ?? '',
      category: definition.category,
    };
  });
}

/** Loose matching: every word of the query somewhere in the name, type or keywords. */
export function matchChoices(
  registry: ElementRegistry,
  choices: ElementChoice[],
  query: string,
): ElementChoice[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return choices;
  return choices
    .map((choice) => {
      const keywords = registry.get(choice.type)?.keywords ?? [];
      const haystack = [choice.name, choice.type, choice.description, ...keywords]
        .join(' ')
        .toLowerCase();
      const score = words.every((word) => haystack.includes(word))
        ? choice.name.toLowerCase().startsWith(words[0] ?? '')
          ? 2
          : 1
        : 0;
      return { choice, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.choice);
}

export function slashMatches(
  registry: ElementRegistry,
  messages: EditorMessages,
  query: string,
): ElementChoice[] {
  return matchChoices(registry, elementChoices(registry, messages), query).slice(0, 8);
}

export function SlashMenu({
  editor,
  query,
  activeIndex,
  onHover,
  onChoose,
  onClose,
}: {
  editor: Editor;
  query: string;
  activeIndex: number;
  onHover: (index: number) => void;
  onChoose: (type: string) => void;
  onClose: () => void;
}) {
  const { registry, messages } = useEditorContext();
  const matches = slashMatches(registry, messages, query);
  const listRef = useRef<HTMLDivElement>(null);
  const coords = editor.view.coordsAtPos(editor.state.selection.from);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!listRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('mousedown', close);
    };
  }, [onClose]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${String(activeIndex)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return createPortal(
    <motion.div
      ref={listRef}
      role="listbox"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.14 }}
      className="bst:fixed bst:z-[80] bst:max-h-72 bst:w-72 bst:overflow-y-auto bst:rounded-card bst:border bst:border-border bst:bg-popover bst:p-1 bst:text-popover-foreground bst:shadow-lg"
      style={{ left: coords.left, top: coords.bottom + 6 }}
    >
      {matches.length === 0 ? (
        <p className="bst:px-3 bst:py-2 bst:text-sm bst:text-muted-foreground">
          {messages.noElementsFound}
        </p>
      ) : (
        matches.map((choice, index) => (
          <button
            key={choice.type}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            data-index={index}
            onMouseEnter={() => {
              onHover(index);
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              onChoose(choice.type);
            }}
            className={cn(
              'bst:flex bst:w-full bst:items-center bst:gap-3 bst:rounded-control bst:px-2 bst:py-1.5 bst:text-left',
              index === activeIndex ? 'bst:bg-accent' : 'bst:hover:bg-accent/60',
            )}
          >
            <span className="bst:flex bst:size-8 bst:shrink-0 bst:items-center bst:justify-center bst:rounded-md bst:border bst:border-border bst:bg-background">
              <ElementIcon name={choice.icon} className="bst:size-4" />
            </span>
            <span className="bst:min-w-0">
              <span className="bst:block bst:truncate bst:text-sm bst:font-medium">
                {choice.name}
              </span>
              <span className="bst:block bst:truncate bst:text-xs bst:text-muted-foreground">
                {choice.description}
              </span>
            </span>
          </button>
        ))
      )}
    </motion.div>,
    document.body,
  );
}
