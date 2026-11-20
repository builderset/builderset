'use client';

import { parentOf, type Fragment } from '../../core';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DRAG_TYPE_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { useEditor, useEditorContext } from '../context';
import { QuietBoundary, renderReadOnly } from '../chrome/read-only';
import { ElementIcon } from '../icons';
import { usePortalContainer } from '../ui';
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

  const selected = useEditor((state) => state.selection.length > 0);
  const [peek, setPeek] = useState<{ type: string; top: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  /** Hover a tile a moment: a card beside the panel shows the block, filled in. */
  const onPeek = (type: string | null, element?: HTMLElement) => {
    clearTimeout(timer.current);
    if (!type || !element) {
      setPeek(null);
      return;
    }
    timer.current = setTimeout(() => {
      const tile = element.getBoundingClientRect();
      const panel = element.closest('.bld-panel')?.getBoundingClientRect();
      setPeek({
        type,
        top: Math.max(12, Math.min(tile.top - 20, window.innerHeight - 300)),
        left: (panel?.right ?? tile.right) + 10,
      });
    }, 380);
  };
  const recentChoices = recent
    .map((type) => all.find((choice) => choice.type === type))
    .filter((choice): choice is ElementChoice => !!choice);

  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:px-3 bst:pb-2.5">
        <label className="bst:flex bst:h-[34px] bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:text-muted-foreground bst:transition-[border-color,box-shadow] bst:focus-within:border-primary/45 bst:focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--builderset-primary,var(--bst-d-primary))_14%,transparent)]">
          <Search className="bst:size-4 bst:shrink-0" aria-hidden="true" />
          <input
            data-library-search=""
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder={messages.searchElements}
            aria-label={messages.searchElements}
            className="bst:h-full bst:w-full bst:min-w-0 bst:bg-transparent bst:text-[12.5px] bst:text-foreground bst:outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label={messages.clear}
              onClick={() => {
                setQuery('');
              }}
              className="bst:cursor-pointer bst:hover:text-foreground"
            >
              <X className="bst:size-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="bst:rounded-[5px] bst:border bst:border-border bst:bg-background bst:px-[5px] bst:py-[3px] bst:font-mono bst:text-[11px] bst:leading-none">
              /
            </kbd>
          )}
        </label>
      </div>
      {!query && recentChoices.length ? (
        <div className="bst:flex bst:shrink-0 bst:[scrollbar-width:none] bst:gap-1.5 bst:overflow-x-auto bst:px-3 bst:pb-3">
          {recentChoices.map((choice) => (
            <Chip key={choice.type} choice={choice} onInsert={insert} />
          ))}
        </div>
      ) : null}
      <div className="bld-scroll bst:flex-1 bst:overflow-y-auto bst:px-3 bst:pb-4">
        {query ? (
          matches.length ? (
            <Grid choices={matches} onInsert={insert} onPeek={onPeek} />
          ) : (
            <div className="bst:grid bst:justify-items-center bst:gap-1.5 bst:px-4 bst:py-7 bst:text-center bst:text-xs bst:text-muted-foreground">
              <b className="bst:text-[13px] bst:text-foreground">{messages.noElementsFound}</b>
            </div>
          )
        ) : (
          <>
            {profile.structures?.length ? (
              <Group title={messages.structures} count={profile.structures.length}>
                <div className="bst:grid bst:grid-cols-2 bst:gap-1.5">
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
                      className={TILE}
                    >
                      {structure.icon}
                      <span className="bst:max-w-full bst:truncate bst:text-[11.5px] bst:leading-tight bst:font-medium">
                        {structure.label}
                      </span>
                    </button>
                  ))}
                </div>
              </Group>
            ) : null}
            {profile.categories.map((category) => {
              const inCategory = all.filter((choice) => choice.category === category);
              if (inCategory.length === 0) return null;
              return (
                <Group
                  key={category}
                  title={messages.categories[category] ?? category}
                  count={inCategory.length}
                >
                  <Grid choices={inCategory} onInsert={insert} onPeek={onPeek} />
                </Group>
              );
            })}
          </>
        )}
        <p className="bst:px-1 bst:pt-1 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
          {messages.addHint(selected ? 'below' : 'end')}
        </p>
      </div>
      {peek ? <Peek {...peek} below={selected} /> : null}
    </div>
  );
}

/** A tile in the library: icon over name; lifts and takes the brand tint on hover. */
const TILE =
  'bst:group bst:grid bst:cursor-grab bst:justify-items-center bst:gap-1.5 bst:rounded-[10px] bst:border bst:border-border bst:bg-card bst:px-1 bst:pt-[13px] bst:pb-2.5 bst:text-center bst:text-foreground/85 bst:select-none bst:transition-[border-color,background-color,transform,box-shadow] bst:duration-200 bst:ease-[cubic-bezier(.34,1.4,.5,1)] bst:hover:-translate-y-0.5 bst:hover:border-primary/40 bst:hover:bg-primary/8 bst:hover:shadow-[0_1px_2px_rgb(20_23_30/0.06),0_8px_24px_rgb(20_23_30/0.08)] bst:active:scale-95 bst:active:cursor-grabbing';

function Chip({ choice, onInsert }: { choice: ElementChoice; onInsert: (type: string) => void }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE_MIME, choice.type);
        event.dataTransfer.effectAllowed = 'copy';
        setDragChip(event.dataTransfer, choice.name, {
          icon: choice.icon,
          detail: choice.description,
        });
        setActiveDrag({ kind: 'type', type: choice.type });
      }}
      onDragEnd={() => {
        setActiveDrag(null);
      }}
      onClick={() => {
        onInsert(choice.type);
      }}
      className="bst:inline-flex bst:h-7 bst:flex-none bst:cursor-grab bst:items-center bst:gap-1.5 bst:rounded-full bst:border bst:border-border bst:bg-card bst:px-2.5 bst:text-xs bst:whitespace-nowrap bst:text-foreground/85 bst:transition-colors bst:hover:border-primary/40 bst:hover:text-primary"
    >
      <ElementIcon name={choice.icon} className="bst:size-3.5" />
      {choice.name}
    </button>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bst:pb-3">
      <h3 className="bst:flex bst:items-center bst:gap-1.5 bst:px-1 bst:pt-2 bst:pb-1.5 bst:text-xs bst:font-semibold bst:text-foreground/85">
        {title}
        <em className="bst:font-medium bst:text-muted-foreground bst:not-italic">{count}</em>
      </h3>
      {children}
    </section>
  );
}

/** The block as it will look, filled in from the kit's sample, with its name and use. */
function Peek({
  type,
  top,
  left,
  below,
}: {
  type: string;
  top: number;
  left: number;
  below: boolean;
}) {
  const { profile, messages } = useEditorContext();
  const container = usePortalContainer();
  const sample = useMemo(() => profile.sampleOf?.(type) ?? null, [profile, type]);
  if (!container) return null;
  return createPortal(
    <div
      role="tooltip"
      style={{ top, left }}
      className="bst:pointer-events-none bst:fixed bst:z-[60] bst:w-[300px] bst:animate-[bst-zoom-in_200ms_var(--bst-ease-enter)] bst:overflow-hidden bst:rounded-[14px] bst:border bst:border-border bst:bg-card bst:text-foreground bst:shadow-[0_2px_6px_rgb(20_23_30/0.08),0_24px_60px_rgb(20_23_30/0.18)]"
    >
      {sample ? (
        <div className="bst:relative bst:h-[150px] bst:overflow-hidden bst:bg-background bst:p-4">
          <div className="bst:w-[520px] bst:origin-top-left bst:scale-[0.52]">
            <QuietBoundary>
              {renderReadOnly(profile, { doc: sample, viewport: 'desktop' })}
            </QuietBoundary>
          </div>
          <span className="bst:absolute bst:inset-x-0 bst:bottom-0 bst:h-8 bst:bg-gradient-to-t bst:from-background bst:to-transparent" />
        </div>
      ) : null}
      <div className="bst:grid bst:gap-0.5 bst:px-3 bst:pt-2.5 bst:pb-3">
        <b className="bst:text-[13px] bst:font-semibold">{messages.elements[type]?.name ?? type}</b>
        <span className="bst:text-xs bst:text-muted-foreground">
          {messages.elements[type]?.description}
        </span>
        <small className="bst:mt-1 bst:text-[11px] bst:text-muted-foreground/80">
          {messages.addHint(below ? 'below' : 'end')}
        </small>
      </div>
    </div>,
    container,
  );
}

function Grid({
  choices,
  onInsert,
  onPeek,
}: {
  choices: ElementChoice[];
  onInsert: (type: string) => void;
  onPeek?: (type: string | null, element?: HTMLElement) => void;
}) {
  return (
    <div className="bst:grid bst:grid-cols-3 bst:gap-1.5">
      {choices.map((choice, index) => (
        <button
          key={choice.type}
          type="button"
          style={{
            animation: 'bst-rise var(--bst-dur-3, 220ms) cubic-bezier(0.22, 1, 0.36, 1) both',
            animationDelay: `${String(Math.min(index, 10) * 12)}ms`,
          }}
          draggable
          onMouseEnter={(event) => {
            onPeek?.(choice.type, event.currentTarget);
          }}
          onMouseLeave={() => {
            onPeek?.(null);
          }}
          onDragStart={(event) => {
            onPeek?.(null);
            event.dataTransfer.setData(DRAG_TYPE_MIME, choice.type);
            event.dataTransfer.effectAllowed = 'copy';
            setDragChip(event.dataTransfer, choice.name, {
              icon: choice.icon,
              detail: choice.description,
            });
            setActiveDrag({ kind: 'type', type: choice.type });
          }}
          onDragEnd={() => {
            setActiveDrag(null);
          }}
          onClick={() => {
            onInsert(choice.type);
          }}
          title={choice.description}
          className={TILE}
        >
          <ElementIcon
            name={choice.icon}
            className="bst:size-5 bst:text-muted-foreground bst:transition-colors bst:group-hover:text-primary"
          />
          <span className="bst:max-w-full bst:truncate bst:text-[11.5px] bst:leading-tight bst:font-medium">
            {choice.name}
          </span>
        </button>
      ))}
    </div>
  );
}
