'use client';

import {
  createFragment,
  reidFragment,
  type ElementRegistry,
  type EngineDocument,
  type Fragment,
  type NodeId,
} from '../../core';
import { Button, Input, Spinner, EmptyState } from '../ui';
import { Bookmark, BookmarkPlus } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { QuietBoundary, renderReadOnly } from '../chrome/read-only';
import { DRAG_TYPE_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { useEditor, useEditorContext } from '../context';
import type { SavedSection } from '../../host';
import type { TemplateBlock, TemplateCategory, TemplateSpec } from '../profile';

/**
 * A template's blocks as one fragment, nested as the template nests them.
 * Types this registry does not have are skipped, with what is inside them; a
 * container the template gives no `children` gets its usual first ones.
 */
export function templateFragment(
  registry: ElementRegistry,
  blocks: readonly TemplateBlock[],
): Fragment {
  const nodes: Fragment['nodes'] = {};
  const build = (block: TemplateBlock): NodeId | null => {
    if (!registry.has(block.type)) return null;
    const part = createFragment(registry, block.type, block.props ?? {});
    const id = part.roots[0];
    const node = id ? part.nodes[id] : undefined;
    if (!id || !node) return null;
    if (!block.children) {
      Object.assign(nodes, part.nodes);
      return id;
    }
    // Only the node itself: its first children are the template's, not the defaults.
    nodes[id] = { ...node, children: buildAll(block.children) };
    return id;
  };
  const buildAll = (list: readonly TemplateBlock[]): NodeId[] =>
    list.map(build).filter((id): id is NodeId => id !== null);
  return { roots: buildAll(blocks), nodes };
}

/** The page as it would be after the template replaced it: its blocks, and what `apply` sets. */
export function templateDocument<TDoc extends EngineDocument>(
  doc: TDoc,
  registry: ElementRegistry,
  template: TemplateSpec<TDoc>,
): TDoc {
  const fragment = templateFragment(registry, template.blocks);
  const root = doc.nodes[doc.root] ?? { id: doc.root, type: 'root', v: 1, props: {} };
  const next = structuredClone({
    ...doc,
    nodes: { ...fragment.nodes, [doc.root]: { ...root, children: fragment.roots } },
  });
  template.apply?.(next);
  return next;
}

/** The leaf blocks of a template, in reading order: what its sketch and summary show. */
function leafTypes(blocks: readonly TemplateBlock[]): string[] {
  return blocks.flatMap((block) => (block.children ? leafTypes(block.children) : [block.type]));
}

/**
 * The templates under their categories, in the categories' order; any whose
 * category is not listed come last, under their category's id.
 */
function groupByCategory<T extends { category: string }>(
  templates: readonly T[],
  categories: readonly TemplateCategory[],
): (TemplateCategory & { templates: T[] })[] {
  const known = categories.map((category) => ({
    ...category,
    templates: templates.filter((template) => template.category === category.id),
  }));
  const listed = new Set(categories.map((category) => category.id));
  const rest = [...new Set(templates.map((template) => template.category))]
    .filter((id) => !listed.has(id))
    .map((id) => ({
      id,
      name: { en: id },
      templates: templates.filter((template) => template.category === id),
    }));
  return [...known, ...rest].filter((group) => group.templates.length > 0);
}

/** Kinds of block the thumbnail draws as a filled bar rather than a line of text. */
const SOLID = new Set([
  'image',
  'gallery',
  'video',
  'cta',
  'takeaways',
  'stats',
  'rating',
  'callout',
  'proscons',
  'faq',
  'howto',
  'button',
  'buttons',
]);

/** A template's first blocks, sketched: a title line, text lines, solid blocks. */
function Sketch({ types }: { types: readonly string[] }) {
  return (
    <span
      aria-hidden="true"
      className="bst:grid bst:h-14 bst:content-start bst:gap-[3px] bst:rounded-[7px] bst:border bst:border-border bst:bg-background bst:px-2 bst:py-[7px]"
    >
      {types.slice(0, 6).map((type, index) => (
        <i
          key={`${type}-${String(index)}`}
          className={
            type === 'heading'
              ? 'bst:block bst:h-[5px] bst:w-[70%] bst:rounded-sm bst:bg-foreground/45'
              : SOLID.has(type)
                ? 'bst:block bst:h-[9px] bst:rounded-sm bst:bg-primary/35'
                : 'bst:block bst:h-[3px] bst:rounded-sm bst:bg-foreground/15'
          }
        />
      ))}
    </span>
  );
}

/**
 * The top of a template as readers would see it, scaled down to the card:
 * drawn at the canvas's desktop width, then shrunk to fit.
 */
function Thumbnail({ doc }: { doc: EngineDocument }) {
  const { profile } = useEditorContext();
  const width = profile.canvasWidths?.desktop ?? 760;
  const box = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0.2);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      setScale(element.clientWidth / width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [width]);
  return (
    <span
      ref={box}
      aria-hidden="true"
      inert
      className="bst:pointer-events-none bst:relative bst:block bst:h-[150px] bst:overflow-hidden bst:rounded-[8px] bst:border bst:border-border bst:bg-background bst:select-none"
    >
      <span
        className="bst:absolute bst:top-0 bst:left-0 bst:block bst:origin-top-left"
        style={{ width, transform: `scale(${String(scale)})` }}
      >
        <QuietBoundary>{renderReadOnly(profile, { doc, viewport: 'desktop' })}</QuietBoundary>
      </span>
    </span>
  );
}

/** "3 blocks · Heading, Paragraph, Image": what a template or section holds. */
function useSummary() {
  const { messages } = useEditorContext();
  return (types: readonly string[]) => {
    const names = [...new Set(types)]
      .slice(0, 3)
      .map((type) => messages.elements[type]?.name ?? type);
    return `${messages.blockCount(types.length)} · ${names.join(', ')}`;
  };
}

const CARD =
  'bst:group bst:grid bst:w-full bst:grid-cols-[66px_minmax(0,1fr)_auto] bst:items-center bst:gap-3 bst:rounded-[11px] bst:border bst:border-border bst:bg-card bst:p-2 bst:text-left bst:transition-[border-color,transform] bst:duration-200 bst:ease-[cubic-bezier(.34,1.4,.5,1)] bst:hover:translate-x-0.5 bst:hover:border-primary/40';

const TILE =
  'bst:group bst:relative bst:grid bst:content-start bst:gap-2 bst:rounded-[12px] bst:border bst:border-border bst:bg-card bst:p-1.5 bst:pb-2 bst:text-left bst:transition-[border-color,translate,box-shadow] bst:duration-200 bst:ease-[cubic-bezier(.34,1.4,.5,1)] bst:hover:-translate-y-0.5 bst:hover:border-primary/40 bst:hover:shadow-[0_10px_24px_rgb(20_23_30/0.1)]';

export interface TemplateGalleryProps {
  /**
   * `list`: a row per template with a sketch of its blocks (an article's).
   * `grid`: two columns of cards showing the template itself, scaled down
   * (an email's, where the look is the point). Default: `list`.
   */
  look?: 'list' | 'grid' | undefined;
  /** Above the gallery. Default: the editor's "Start from a template". */
  title?: string | undefined;
}

/**
 * The profile's templates under their categories' headings: each
 * one is added to the end of the page or replaces it ("Use", then which).
 * Either way it is one step that one undo takes back.
 */
export function TemplateGallery({ look = 'list', title }: TemplateGalleryProps) {
  const { registry, messages, store, host, profile, locale } = useEditorContext();
  const templates = useMemo(() => profile.templates ?? [], [profile.templates]);
  const [asking, setAsking] = useState<string | null>(null);
  const summary = useSummary();
  const groups = useMemo(
    () => groupByCategory(templates, profile.templateCategories ?? []),
    [templates, profile.templateCategories],
  );
  // The thumbnails are drawn once, from the page as it was when the tab opened.
  const base = useMemo(() => store.getState().doc, [store]);
  const thumbnails = useMemo(
    () =>
      look === 'grid'
        ? new Map(
            templates.map((template) => [template.id, templateDocument(base, registry, template)]),
          )
        : null,
    [look, templates, base, registry],
  );
  const local = (names: Record<string, string> | undefined) =>
    names ? (names[locale] ?? names[locale.split('-')[0] ?? ''] ?? names.en) : undefined;

  if (!templates.length) return null;

  const addToEnd = (template: TemplateSpec, label: string) => {
    const { doc } = store.getState();
    const children = doc.nodes[doc.root]?.children ?? [];
    store
      .getState()
      .insertFragment(
        templateFragment(registry, template.blocks),
        { parentId: doc.root, index: children.length },
        label,
      );
    host.toast('success', `${label} · ${messages.addToEnd}`);
  };

  /** The page becomes the template: one undo step brings the old one back. */
  const replace = (template: TemplateSpec, label: string) => {
    const { doc } = store.getState();
    store
      .getState()
      .replaceDocument(templateDocument(doc, registry, template), { keepHistory: true, label });
    host.toast('success', `${label} · ${messages.replaceAll}`);
  };

  const ask = (template: TemplateSpec, label: string, count: number) =>
    asking === template.id ? (
      <div
        className={
          look === 'grid'
            ? 'bst:grid bst:animate-[bst-rise_250ms_var(--bst-ease-enter)] bst:gap-1 bst:px-0.5'
            : 'bst:col-span-3 bst:flex bst:animate-[bst-rise_250ms_var(--bst-ease-enter)] bst:items-center bst:gap-1.5 bst:pt-1.5 bst:text-xs bst:text-muted-foreground'
        }
      >
        {look === 'list' ? (
          <>
            <span className="bst:flex-1">{messages.blockCount(count)}.</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setAsking(null);
              }}
            >
              {messages.cancel}
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => {
            setAsking(null);
            addToEnd(template, label);
          }}
        >
          {messages.addToEnd}
        </Button>
        <Button
          type="button"
          size="xs"
          onClick={() => {
            setAsking(null);
            replace(template, label);
          }}
        >
          {messages.replaceAll}
        </Button>
      </div>
    ) : null;

  return (
    <section>
      <h3 className="bst:px-4 bst:pt-1 bst:pb-2 bst:text-xs bst:font-semibold bst:text-muted-foreground">
        {title ?? messages.templatesStart}
      </h3>
      {groups.map((group) => (
        <div key={group.id} className="bst:pb-3">
          {groups.length > 1 ? (
            <h4 className="bst:flex bst:items-center bst:gap-1.5 bst:px-4 bst:pb-1.5 bst:text-xs bst:font-semibold bst:text-foreground/85">
              {local(group.name) ?? group.id}
              <em className="bst:font-medium bst:text-muted-foreground bst:not-italic">
                {group.templates.length}
              </em>
            </h4>
          ) : null}
          <div
            className={
              look === 'grid'
                ? 'bst:grid bst:grid-cols-2 bst:items-start bst:gap-2 bst:px-3'
                : 'bst:grid bst:gap-2 bst:px-3'
            }
          >
            {group.templates.map((template) => {
              const types = leafTypes(template.blocks);
              const label = local(template.name) ?? template.id;
              const line = local(template.description) ?? summary(types);
              const thumbnail = thumbnails?.get(template.id);
              if (look === 'grid') {
                return (
                  <div key={template.id} className={TILE}>
                    <button
                      type="button"
                      aria-expanded={asking === template.id}
                      title={line}
                      onClick={() => {
                        setAsking(asking === template.id ? null : template.id);
                      }}
                      className="bld-focus bst:grid bst:cursor-pointer bst:gap-2 bst:rounded-[8px] bst:text-left"
                    >
                      {thumbnail ? <Thumbnail doc={thumbnail} /> : <Sketch types={types} />}
                      <span className="bst:min-w-0 bst:px-1">
                        <b className="bst:block bst:truncate bst:text-[12.5px] bst:font-semibold">
                          {label}
                        </b>
                        <small className="bst:line-clamp-2 bst:text-[11px] bst:leading-snug bst:text-muted-foreground">
                          {line}
                        </small>
                      </span>
                    </button>
                    {ask(template, label, types.length)}
                  </div>
                );
              }
              return (
                <div key={template.id} className={CARD}>
                  <Sketch types={types} />
                  <span className="bst:min-w-0">
                    <b className="bst:block bst:truncate bst:text-[13px] bst:font-semibold">
                      {label}
                    </b>
                    <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                      {line}
                    </small>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="bst:opacity-0 bst:transition-opacity bst:group-hover:opacity-100 bst:focus-visible:opacity-100"
                    onClick={() => {
                      setAsking(asking === template.id ? null : template.id);
                    }}
                  >
                    {messages.useTemplate}
                  </Button>
                  {ask(template, label, types.length)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/** The left rail's third tab, by default: the templates, then the saved sections. */
export function TemplatesPanel() {
  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-4">
      <TemplateGallery />
      <SavedSections />
    </div>
  );
}

/** Sections saved through the host, to drag or click onto the page; saving the selection as one. */
function SavedSections() {
  const { messages, store, host } = useEditorContext();
  const selection = useEditor((state) => state.selection);
  const [sections, setSections] = useState<SavedSection[] | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const summary = useSummary();

  useEffect(() => {
    if (!host.loadSections) return;
    let alive = true;
    void host.loadSections().then((rows) => {
      if (alive) setSections(rows);
    });
    return () => {
      alive = false;
    };
  }, [host]);

  const saveSection = async () => {
    if (!host.saveSection || !name.trim() || selection.length === 0) return;
    setSaving(true);
    try {
      const { doc } = store.getState();
      const nodes: Fragment['nodes'] = {};
      const collect = (id: string) => {
        const node = doc.nodes[id];
        if (!node) return;
        nodes[id] = node;
        node.children?.forEach(collect);
      };
      selection.forEach(collect);
      const saved = await host.saveSection(name.trim(), { roots: [...selection], nodes });
      if (saved) {
        setSections((current) => [saved, ...(current ?? [])]);
        setName('');
        host.toast('success', messages.saved);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!host.loadSections) return null;
  return (
    <section>
      <h3 className="bst:flex bst:items-center bst:justify-between bst:px-4 bst:pt-4 bst:pb-2 bst:text-xs bst:font-semibold bst:text-muted-foreground">
        {messages.savedSections}
        {selection.length ? (
          <span className="bst:font-medium">{messages.multipleSelected(selection.length)}</span>
        ) : null}
      </h3>
      {host.saveSection ? (
        <form
          className="bst:flex bst:gap-1.5 bst:px-3 bst:pb-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection();
          }}
        >
          <Input
            value={name}
            maxLength={120}
            disabled={selection.length === 0}
            placeholder={messages.sectionName}
            aria-label={messages.sectionName}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Button
            type="submit"
            size="icon"
            variant="outline"
            loading={saving}
            disabled={selection.length === 0 || !name.trim()}
            aria-label={messages.saveSection}
          >
            <BookmarkPlus aria-hidden="true" />
          </Button>
        </form>
      ) : null}
      {sections === null ? (
        <div className="bst:flex bst:justify-center bst:py-4">
          <Spinner />
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          size="inline"
          icon={<BookmarkPlus aria-hidden="true" />}
          title={messages.noSections}
        />
      ) : (
        <div className="bst:grid bst:gap-1.5 bst:px-3">
          {sections.map((section) => {
            const types = section.fragment.roots.map(
              (id) => section.fragment.nodes[id]?.type ?? 'box',
            );
            return (
              <button
                key={section.id}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_TYPE_MIME, `section:${section.id}`);
                  event.dataTransfer.effectAllowed = 'copy';
                  setDragChip(event.dataTransfer, section.name, {
                    icon: 'bookmark',
                    detail: summary(types),
                    count: types.length,
                  });
                  setActiveDrag({
                    kind: 'fragment',
                    rootType: types[0] ?? 'paragraph',
                    build: () => reidFragment(section.fragment),
                  });
                }}
                onDragEnd={() => {
                  setActiveDrag(null);
                }}
                onClick={() => {
                  store
                    .getState()
                    .insertFragment(reidFragment(section.fragment), undefined, section.name);
                }}
                className="bst:flex bst:w-full bst:animate-[bst-rise_300ms_var(--bst-ease-enter)] bst:cursor-grab bst:items-center bst:gap-2.5 bst:rounded-[10px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-[9px] bst:text-left bst:transition-colors bst:select-none bst:hover:border-primary/40 bst:active:cursor-grabbing"
              >
                <Bookmark
                  className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="bst:min-w-0 bst:flex-1">
                  <b className="bst:block bst:truncate bst:text-[12.5px] bst:font-semibold">
                    {section.name}
                  </b>
                  <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                    {summary(types)}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
