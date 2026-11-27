'use client';

import { parentOf, reidFragment, type EngineDocument, type Fragment } from '@builderset/engine';
import {
  DRAG_TYPE_MIME,
  setActiveDrag,
  setDragChip,
  TemplateGallery,
  useEditor,
  useEditorContext,
  type SavedSection,
} from '@builderset/engine/editor';
import { Button, Input, Spinner, EmptyState } from '@builderset/engine/ui';
import { BookmarkPlus, Boxes, FileCode2 } from 'lucide-react';
import { useEffect, useState, type DragEvent, type ReactNode } from 'react';

import { plainOf, ROW_LAYOUTS, type EmailRichText, type RowLayout } from '../core';
import { ColumnsIcon } from './columns-icon';
import { OPEN_IMPORT_HTML, useEmail } from './context';

/**
 * The Modules tab: ready-made pieces of email.
 *
 * - Import HTML: an email's code rebuilt as sections.
 * - Templates: whole emails by category — added to the end, or replacing it.
 * - From this email: a copy of one of its sections, dragged or clicked in.
 * - Saved modules: a section designed once (a header, a footer, a promo band)
 *   and kept through the host (`loadSections` / `saveSection`) for any email.
 *
 * Every insert gets fresh ids, so the same module can go in twice.
 */

/** A section and everything in it, as a fragment. */
function sectionFragment(doc: EngineDocument, sectionId: string): Fragment {
  const nodes: Fragment['nodes'] = {};
  const collect = (id: string) => {
    const node = doc.nodes[id];
    if (!node) return;
    nodes[id] = node;
    node.children?.forEach(collect);
  };
  collect(sectionId);
  return { roots: [sectionId], nodes };
}

/** What a fragment's first row looks like, how many blocks it holds, its first heading. */
function shapeOf(fragment: Fragment): {
  widths: readonly number[];
  blocks: number;
  heading: string;
} {
  const nodes = Object.values(fragment.nodes);
  const row = nodes.find((node) => node.type === 'row');
  const heading = nodes.find((node) => node.type === 'heading');
  return {
    widths: ROW_LAYOUTS[(row?.props.layout as RowLayout | undefined) ?? '100'],
    blocks: nodes.filter((node) => !node.children).length,
    heading: plainOf(heading?.props.text as EmailRichText | undefined).trim(),
  };
}

const CARD =
  'bld-focus bst:group bst:grid bst:w-full bst:animate-[bst-rise_300ms_var(--bst-ease-enter)] bst:cursor-grab bst:grid-cols-[auto_minmax(0,1fr)] bst:items-center bst:gap-2.5 bst:rounded-[10px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-2 bst:text-left bst:transition-[border-color,translate] bst:select-none bst:hover:translate-x-0.5 bst:hover:border-primary/40 bst:active:cursor-grabbing';

function Heading({ children, count }: { children: ReactNode; count?: number | undefined }) {
  return (
    <h3 className="bst:flex bst:items-center bst:gap-1.5 bst:px-4 bst:pt-4 bst:pb-2 bst:text-xs bst:font-semibold bst:text-muted-foreground">
      {children}
      {count !== undefined ? <em className="bst:font-medium bst:not-italic">{count}</em> : null}
    </h3>
  );
}

export function ModulesPanel() {
  const { host, store, messages } = useEditorContext();
  const { words } = useEmail();
  const w = words.email;
  const doc = useEditor((state) => state.doc);
  const selection = useEditor((state) => state.selection);
  const [modules, setModules] = useState<SavedSection[] | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!host.loadSections) {
      setModules([]);
      return;
    }
    let alive = true;
    void host.loadSections().then((rows) => {
      if (alive) setModules(rows);
    });
    return () => {
      alive = false;
    };
  }, [host]);

  /** The top-level section holding the selection — what a module is made of. */
  const selectedSection = (): string | null => {
    let current = selection[0];
    while (current) {
      const parent = parentOf(doc, current);
      if (!parent) return null;
      if (parent.id === doc.root) return current;
      current = parent.id;
    }
    return null;
  };
  const sectionId = selectedSection();
  const sections = doc.nodes[doc.root]?.children ?? [];

  const save = async () => {
    if (!host.saveSection || !sectionId || !name.trim()) return;
    setSaving(true);
    try {
      const saved = await host.saveSection(name.trim(), sectionFragment(doc, sectionId));
      if (saved) {
        setModules((current) => [...(current ?? []), saved]);
        setName('');
        host.toast('success', messages.saved);
      }
    } finally {
      setSaving(false);
    }
  };

  /** Below `after` (by default the selected section), or at the end. */
  const insert = (fragment: Fragment, label: string, after: string | null = sectionId) => {
    const index = after ? sections.indexOf(after) + 1 : sections.length;
    store.getState().insertFragment(reidFragment(fragment), { parentId: doc.root, index }, label);
  };

  /** Dragged onto the canvas, a fragment lands as a copy where it is dropped. */
  const dragProps = (fragment: Fragment, label: string) => {
    const shape = shapeOf(fragment);
    return {
      draggable: true,
      onDragStart: (event: DragEvent) => {
        // A structure's MIME type: the canvas takes the fragment from `activeDrag`.
        event.dataTransfer.setData(DRAG_TYPE_MIME, 'structure:module');
        event.dataTransfer.effectAllowed = 'copy';
        setDragChip(event.dataTransfer, label, {
          icon: 'split',
          detail: messages.blockCount(shape.blocks),
          count: shape.blocks,
        });
        setActiveDrag({
          kind: 'fragment',
          rootType: 'section',
          build: () => reidFragment(fragment),
        });
      },
      onDragEnd: () => {
        setActiveDrag(null);
      },
    };
  };

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-4">
      <div className="bst:px-3 bst:pb-3">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(OPEN_IMPORT_HTML));
          }}
          className="bld-focus bst:flex bst:w-full bst:cursor-pointer bst:items-center bst:gap-3 bst:rounded-[11px] bst:border bst:border-dashed bst:border-primary/40 bst:bg-primary/5 bst:px-3 bst:py-3 bst:text-left bst:transition-[background-color,transform] bst:hover:bg-primary/10 bst:active:scale-[0.98]"
        >
          <FileCode2 className="bst:size-5 bst:shrink-0 bst:text-primary" aria-hidden="true" />
          <span className="bst:min-w-0 bst:flex-1">
            <b className="bst:block bst:text-[13px] bst:font-semibold">{words.importHtml.open}</b>
            <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
              {w.importHint}
            </small>
          </span>
        </button>
      </div>

      <TemplateGallery look="grid" title={w.startFrom} />

      {sections.length ? (
        <section>
          <Heading count={sections.length}>{w.fromThisEmail}</Heading>
          <div className="bst:grid bst:gap-1.5 bst:px-3">
            {sections.map((id, index) => {
              const fragment = sectionFragment(doc, id);
              const shape = shapeOf(fragment);
              const label = doc.nodes[id]?.name ?? (shape.heading || w.sectionNumber(index + 1));
              return (
                <button
                  key={id}
                  type="button"
                  {...dragProps(fragment, label)}
                  onClick={() => {
                    insert(fragment, label, id);
                  }}
                  className={CARD}
                >
                  <ColumnsIcon widths={shape.widths} />
                  <span className="bst:min-w-0">
                    <b className="bst:block bst:truncate bst:text-[12.5px] bst:font-semibold">
                      {label}
                    </b>
                    <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                      {w.sectionNumber(index + 1)} · {messages.blockCount(shape.blocks)}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="bst:px-4 bst:pt-1.5 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
            {w.fromThisEmailHint}
          </p>
        </section>
      ) : null}

      <section>
        <Heading count={modules?.length}>{w.modules}</Heading>
        {host.saveSection ? (
          <form
            className="bst:flex bst:gap-1.5 bst:px-3 bst:pb-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <Input
              value={name}
              maxLength={120}
              disabled={!sectionId}
              placeholder={w.moduleName}
              aria-label={w.moduleName}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            <Button
              type="submit"
              size="icon"
              variant="outline"
              loading={saving}
              disabled={!sectionId || !name.trim()}
              aria-label={w.saveModule}
              title={w.saveModule}
            >
              <BookmarkPlus aria-hidden="true" />
            </Button>
          </form>
        ) : null}
        {modules === null ? (
          <div className="bst:flex bst:justify-center bst:py-6">
            <Spinner />
          </div>
        ) : modules.length === 0 ? (
          <EmptyState size="inline" icon={<Boxes aria-hidden="true" />} title={w.noModules} />
        ) : (
          <div className="bst:grid bst:gap-1.5 bst:px-3">
            {modules.map((module) => {
              const shape = shapeOf(module.fragment);
              return (
                <button
                  key={module.id}
                  type="button"
                  {...dragProps(module.fragment, module.name)}
                  onClick={() => {
                    insert(module.fragment, module.name);
                  }}
                  className={CARD}
                >
                  <ColumnsIcon widths={shape.widths} />
                  <span className="bst:min-w-0">
                    <b className="bst:block bst:truncate bst:text-[12.5px] bst:font-semibold">
                      {module.name}
                    </b>
                    <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                      {messages.blockCount(shape.blocks)}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
