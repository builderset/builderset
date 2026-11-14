'use client';

import { parentOf, type Fragment } from '../../core';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

import { DRAG_TYPE_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { elementChoices, matchChoices, type ElementChoice } from '../text/slash-menu';

/**
 * The element library. Click to insert after the selection (or into a
 * selected container), or drag onto the canvas.
 */
export function AddPanel() {
  const { registry, messages, store, profile } = useEditorContext();
  const recent = useEditor((state) => state.recent);
  const [query, setQuery] = useState('');
  const all = elementChoices(registry, messages);
  const matches = matchChoices(registry, all, query);

  const insert = (type: string) => {
    store.getState().insertElement(type);
  };

  /** A structure goes after the top-level block holding the selection, or last. */
  const insertStructure = (build: () => Fragment) => {
    const state = store.getState();
    const { doc } = state;
    let current = state.selection[0];
    while (current) {
      const parent = parentOf(doc, current);
      if (!parent || parent.id === doc.root) break;
      current = parent.id;
    }
    const children = doc.nodes[doc.root]?.children ?? [];
    const index = current ? children.indexOf(current) + 1 : children.length;
    state.insertFragment(
      build(),
      { parentId: doc.root, index: index || children.length },
      'Add structure',
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <label className="border-input bg-background focus-within:ring-ring/40 rounded-control flex h-9 items-center gap-2 border px-2.5 focus-within:ring-2">
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
            {profile.structures?.length ? (
              <Group title={messages.structures}>
                <div className="grid grid-cols-2 gap-2">
                  {profile.structures.map((structure) => (
                    <button
                      key={structure.id}
                      type="button"
                      draggable
                      title={structure.label}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_TYPE_MIME, `structure:${structure.id}`);
                        event.dataTransfer.effectAllowed = 'copy';
                        setDragChip(event.dataTransfer, `+ ${structure.label}`);
                        setActiveDrag({
                          kind: 'fragment',
                          rootType: 'section',
                          build: structure.build,
                        });
                      }}
                      onDragEnd={() => {
                        setActiveDrag(null);
                      }}
                      onClick={() => {
                        insertStructure(structure.build);
                      }}
                      className="group border-border bg-card hover:border-primary/50 hover:bg-accent/40 rounded-control flex cursor-grab flex-col items-center gap-2 border px-2 py-3 transition-[colors,transform] active:scale-95 active:cursor-grabbing"
                    >
                      {structure.icon}
                      <span className="text-xs font-medium">{structure.label}</span>
                    </button>
                  ))}
                </div>
              </Group>
            ) : null}
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
            {profile.categories.map((category) => {
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
            animation: 'bst-rise var(--bst-dur-3, 220ms) cubic-bezier(0.22, 1, 0.36, 1) both',
            animationDelay: `${String(Math.min(index, 10) * 12)}ms`,
          }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAG_TYPE_MIME, choice.type);
            event.dataTransfer.effectAllowed = 'copy';
            setDragChip(event.dataTransfer, `+ ${choice.name}`);
            setActiveDrag({ kind: 'type', type: choice.type });
          }}
          onDragEnd={() => {
            setActiveDrag(null);
          }}
          onClick={() => {
            onInsert(choice.type);
          }}
          title={choice.description}
          className="group border-border bg-card hover:border-primary/50 hover:bg-accent/40 rounded-control flex cursor-grab flex-col items-center gap-1.5 border px-2 py-3 text-center transition-[colors,transform] active:scale-95 active:cursor-grabbing"
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
