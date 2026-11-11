'use client';

import { createFragment, reidFragment, type ElementRegistry, type Fragment } from '../../core';
import { Button, Input, Spinner, EmptyState } from '../ui';
import { BookmarkPlus, LayoutTemplate, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useEditor, useEditorContext } from '../context';
import type { SavedSection } from '../host';
import type { TemplateSpec } from '../profile';

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

export function TemplatesPanel() {
  const { registry, messages, store, host, profile, locale } = useEditorContext();
  const templates = profile.templates ?? [];
  const selection = useEditor((state) => state.selection);
  const [sections, setSections] = useState<SavedSection[] | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

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

  const insert = (fragment: Fragment, label: string) => {
    store.getState().insertFragment(fragment, undefined, label);
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
        setSections((current) => [...(current ?? []), saved]);
        setName('');
        host.toast('success', messages.saved);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full space-y-6 overflow-y-auto p-3">
      {templates.length ? (
        <section className="space-y-2">
          <h3 className="text-muted-foreground px-1 text-[11px] font-semibold tracking-wider uppercase">
            {messages.templates}
          </h3>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                insert(templateFragment(registry, template), template.name.en ?? template.id);
              }}
              className="border-border bg-card hover:border-primary/50 flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-[colors,transform] active:scale-[0.98]"
            >
              <LayoutTemplate
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {template.name[locale] ??
                  template.name[locale.split('-')[0] ?? ''] ??
                  template.name.en}
              </span>
              <Plus className="text-muted-foreground size-4" aria-hidden="true" />
            </button>
          ))}
        </section>
      ) : null}

      {host.loadSections ? (
        <section className="space-y-2">
          <h3 className="text-muted-foreground px-1 text-[11px] font-semibold tracking-wider uppercase">
            {messages.savedSections}
          </h3>
          {host.saveSection ? (
            <form
              className="flex gap-2"
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
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : sections.length === 0 ? (
            <EmptyState
              size="compact"
              icon={<BookmarkPlus aria-hidden="true" />}
              title={messages.noSections}
            />
          ) : (
            sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  insert(reidFragment(section.fragment), section.name);
                }}
                className="border-border bg-card hover:border-primary/50 flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors"
              >
                <BookmarkPlus
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm">{section.name}</span>
              </button>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}
