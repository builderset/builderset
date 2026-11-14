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
    <div className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:p-3">
        <label className="bst:flex bst:h-9 bst:items-center bst:gap-2 bst:rounded-control bst:border bst:border-input bst:bg-background bst:px-2.5 bst:focus-within:ring-2 bst:focus-within:ring-ring/40">
          <Search
            className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={messages.searchElements}
            aria-label={messages.searchElements}
            className="bst:h-full bst:w-full bst:bg-transparent bst:text-sm bst:outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label={messages.clear}
              onClick={() => {
                setQuery('');
              }}
              className="bst:text-muted-foreground bst:hover:text-foreground"
            >
              <X className="bst:size-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>
      </div>
      <div className="bst:flex-1 bst:space-y-5 bst:overflow-y-auto bst:px-3 bst:pb-6">
        {query ? (
          matches.length ? (
            <Grid choices={matches} onInsert={insert} />
          ) : (
            <p className="bst:px-1 bst:text-sm bst:text-muted-foreground">
              {messages.noElementsFound}
            </p>
          )
        ) : (
          <>
            {profile.structures?.length ? (
              <Group title={messages.structures}>
                <div className="bst:grid bst:grid-cols-2 bst:gap-2">
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
                      className="bst:group bst:flex bst:cursor-grab bst:flex-col bst:items-center bst:gap-2 bst:rounded-control bst:border bst:border-border bst:bg-card bst:px-2 bst:py-3 bst:transition-[colors,transform] bst:hover:border-primary/50 bst:hover:bg-accent/40 bst:active:scale-95 bst:active:cursor-grabbing"
                    >
                      {structure.icon}
                      <span className="bst:text-xs bst:font-medium">{structure.label}</span>
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
      <h3 className="bst:mb-2 bst:px-1 bst:text-[11px] bst:font-semibold bst:tracking-wider bst:text-muted-foreground bst:uppercase">
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
    <div className="bst:grid bst:grid-cols-2 bst:gap-2">
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
          className="bst:group bst:flex bst:cursor-grab bst:flex-col bst:items-center bst:gap-1.5 bst:rounded-control bst:border bst:border-border bst:bg-card bst:px-2 bst:py-3 bst:text-center bst:transition-[colors,transform] bst:hover:border-primary/50 bst:hover:bg-accent/40 bst:active:scale-95 bst:active:cursor-grabbing"
        >
          <ElementIcon
            name={choice.icon}
            className="bst:size-5 bst:text-muted-foreground bst:transition-[color,transform] bst:group-hover:-translate-y-0.5 bst:group-hover:text-primary"
          />
          <span className="bst:line-clamp-2 bst:text-xs bst:leading-tight bst:font-medium">
            {choice.name}
          </span>
        </button>
      ))}
    </div>
  );
}
