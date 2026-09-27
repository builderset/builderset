'use client';

import { CATEGORIES } from '@motors/builder-core';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

import { setActiveDrag, DRAG_TYPE_MIME } from '../canvas/drop';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { elementChoices, matchChoices, type ElementChoice } from '../text/slash-menu';

/**
 * The element library. Click to insert after the selection (or into a
 * selected container), or drag onto the canvas.
 */
export function AddPanel() {
  const { registry, messages, store } = useEditorContext();
  const recent = useEditor((state) => state.recent);
  const [query, setQuery] = useState('');
  const all = elementChoices(registry, messages);
  const matches = matchChoices(registry, all, query);

  const insert = (type: string) => {
    store.getState().insertElement(type);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <label className="border-input bg-background focus-within:ring-ring/40 flex h-9 items-center gap-2 rounded-[var(--radius-control)] border px-2.5 focus-within:ring-2">
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={messages.searchElements}
            aria-label={messages.searchElements}
            className="h-full w-full bg-transparent text-sm outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label={messages.clear}
              onClick={() => {
                setQuery('');
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {query ? (
          matches.length ? (
            <Grid choices={matches} onInsert={insert} />
          ) : (
            <p className="text-muted-foreground px-1 text-sm">{messages.noElementsFound}</p>
          )
        ) : (
          <>
            {recent.length ? (
              <Group title={messages.recentlyUsed}>
                <Grid
                  choices={recent
                    .map((type) => all.find((choice) => choice.type === type))
                    .filter((choice): choice is ElementChoice => !!choice)}
                  onInsert={insert}
                />
              </Group>
            ) : null}
            {CATEGORIES.map((category) => {
              const inCategory = all.filter((choice) => choice.category === category);
              if (inCategory.length === 0) return null;
              return (
                <Group key={category} title={messages.categories[category] ?? category}>
                  <Grid choices={inCategory} onInsert={insert} />
                </Group>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({
  choices,
  onInsert,
}: {
  choices: ElementChoice[];
  onInsert: (type: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {choices.map((choice, index) => (
        <button
          key={choice.type}
          type="button"
          style={{
            animation: 'ui-rise var(--dur-3, 220ms) var(--ease-enter, ease-out) both',
            animationDelay: `${String(Math.min(index, 10) * 12)}ms`,
          }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAG_TYPE_MIME, choice.type);
            event.dataTransfer.effectAllowed = 'copy';
            setActiveDrag({ kind: 'type', type: choice.type });
          }}
          onDragEnd={() => {
            setActiveDrag(null);
          }}
          onClick={() => {
            onInsert(choice.type);
          }}
          title={choice.description}
          className="group border-border bg-card hover:border-primary/50 hover:bg-accent/40 flex cursor-grab flex-col items-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-3 text-center transition-[colors,transform] active:scale-95 active:cursor-grabbing"
        >
          <ElementIcon
            name={choice.icon}
            className="text-muted-foreground group-hover:text-primary size-5 transition-[color,transform] group-hover:-translate-y-0.5"
          />
          <span className="line-clamp-2 text-xs leading-tight font-medium">{choice.name}</span>
        </button>
      ))}
    </div>
  );
}
