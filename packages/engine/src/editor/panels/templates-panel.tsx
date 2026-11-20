'use client';

import { createFragment, reidFragment, type ElementRegistry, type Fragment } from '../../core';
import { Button, Input, Spinner, EmptyState } from '../ui';
import { Bookmark, BookmarkPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DRAG_TYPE_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { useEditor, useEditorContext } from '../context';
import type { SavedSection } from '../../host';
import type { TemplateCategory, TemplateSpec } from '../profile';

/** A template's blocks as one fragment, skipping types this registry does not have. */
function templateFragment(registry: ElementRegistry, template: TemplateSpec): Fragment {
  const nodes: Fragment['nodes'] = {};
  const roots: string[] = [];
  for (const block of template.blocks) {
    if (!registry.has(block.type)) continue;
    const part = createFragment(registry, block.type, block.props ?? {});
    Object.assign(nodes, part.nodes);
    roots.push(...part.roots);
  }
  return { roots, nodes };
}

/**
 * The templates under their categories, in the categories' order; any whose
 * category is not listed come last, under their category's id.
 */
function groupByCategory(
  templates: readonly TemplateSpec[],
  categories: readonly TemplateCategory[],
): (TemplateCategory & { templates: TemplateSpec[] })[] {
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

export function TemplatesPanel() {
  const { registry, messages, store, host, profile, locale } = useEditorContext();
  const templates = profile.templates ?? [];
  const selection = useEditor((state) => state.selection);
  const [sections, setSections] = useState<SavedSection[] | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const [only, setOnly] = useState<string | null>(null);
  const summary = useSummary();
  const groups = useMemo(
    () => groupByCategory(templates, profile.templateCategories ?? []),
    [templates, profile.templateCategories],
  );
  const local = (names: Record<string, string> | undefined) =>
    names ? (names[locale] ?? names[locale.split('-')[0] ?? ''] ?? names.en) : undefined;

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

  const nameOf = (template: TemplateSpec) => local(template.name) ?? template.id;

  const addToEnd = (fragment: Fragment, label: string) => {
    const { doc } = store.getState();
    const children = doc.nodes[doc.root]?.children ?? [];
    store
      .getState()
      .insertFragment(fragment, { parentId: doc.root, index: children.length }, label);
  };

  /** The page becomes the template: one undo step brings the old one back. */
  const replace = (fragment: Fragment, label: string) => {
    const { doc } = store.getState();
    const root = doc.nodes[doc.root];
    if (!root) return;
    store
      .getState()
      .replaceDocument(
        { ...doc, nodes: { ...fragment.nodes, [doc.root]: { ...root, children: fragment.roots } } },
        { keepHistory: true, label },
      );
  };

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

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-4">
      {templates.length ? (
        <section>
          <h3 className="bst:px-4 bst:pt-1 bst:pb-2 bst:text-xs bst:font-semibold bst:text-muted-foreground">
            {messages.templatesStart}
          </h3>
          {groups.length > 1 ? (
            <div className="bst:flex bst:flex-wrap bst:gap-1.5 bst:px-3 bst:pb-3">
              {[
                { id: null, label: messages.all },
                ...groups.map((group) => ({ id: group.id, label: local(group.name) ?? group.id })),
              ].map((chip) => (
                <button
                  key={chip.id ?? 'all'}
                  type="button"
                  aria-pressed={only === chip.id}
                  onClick={() => {
                    setOnly(chip.id);
                  }}
                  className={
                    only === chip.id
                      ? 'bst:h-7 bst:cursor-pointer bst:rounded-full bst:border bst:border-foreground bst:bg-foreground bst:px-[11px] bst:text-xs bst:font-semibold bst:text-background'
                      : 'bst:h-7 bst:cursor-pointer bst:rounded-full bst:border bst:border-border bst:px-[11px] bst:text-xs bst:font-semibold bst:text-muted-foreground bst:transition-colors bst:hover:border-border-strong bst:hover:text-foreground'
                  }
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : null}
          {groups
            .filter((group) => only === null || group.id === only)
            .map((group) => (
              <div key={group.id} className="bst:pb-3">
                {groups.length > 1 ? (
                  <h4 className="bst:flex bst:items-center bst:gap-1.5 bst:px-4 bst:pb-1.5 bst:text-xs bst:font-semibold bst:text-foreground/85">
                    {local(group.name) ?? group.id}
                    <em className="bst:font-medium bst:text-muted-foreground bst:not-italic">
                      {group.templates.length}
                    </em>
                  </h4>
                ) : null}
                <div className="bst:grid bst:gap-2 bst:px-3">
                  {group.templates.map((template) => {
                    const types = template.blocks.map((block) => block.type);
                    const label = nameOf(template);
                    return (
                      <div key={template.id} className={CARD}>
                        <Sketch types={types} />
                        <span className="bst:min-w-0">
                          <b className="bst:block bst:truncate bst:text-[13px] bst:font-semibold">
                            {label}
                          </b>
                          <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                            {local(template.description) ?? summary(types)}
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
                        {asking === template.id ? (
                          <div className="bst:col-span-3 bst:flex bst:animate-[bst-rise_250ms_var(--bst-ease-enter)] bst:items-center bst:gap-1.5 bst:pt-1.5 bst:text-xs bst:text-muted-foreground">
                            <span className="bst:flex-1">{messages.blockCount(types.length)}.</span>
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
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setAsking(null);
                                addToEnd(templateFragment(registry, template), label);
                                host.toast('success', `${label} · ${messages.addToEnd}`);
                              }}
                            >
                              {messages.addToEnd}
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => {
                                setAsking(null);
                                replace(templateFragment(registry, template), label);
                                host.toast('success', `${label} · ${messages.replaceAll}`);
                              }}
                            >
                              {messages.replaceAll}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </section>
      ) : null}

      {host.loadSections ? (
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
              size="compact"
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
      ) : null}
    </div>
  );
}
