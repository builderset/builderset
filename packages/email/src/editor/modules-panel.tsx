'use client';

import { parentOf, reidFragment, type Fragment } from '@builderset/engine';
import { useEditor, useEditorContext, type SavedSection } from '@builderset/engine/editor';
import { Button, Input, Spinner, EmptyState } from '@builderset/engine/ui';
import { BookmarkPlus, Boxes, FileCode2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { OPEN_IMPORT_HTML, useEmail } from './context';

/**
 * Saved modules: a section designed once — a header, a footer, a promo band —
 * and dropped into any email. Stored through the host (`loadSections` /
 * `saveSection`), inserted with fresh ids so the same module can go in twice.
 */
export function ModulesPanel() {
  const { host, store } = useEditorContext();
  const { words } = useEmail();
  const w = words.email;
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
    const { doc } = store.getState();
    let current = selection[0];
    while (current) {
      const parent = parentOf(doc, current);
      if (!parent) return null;
      if (parent.id === doc.root) return current;
      current = parent.id;
    }
    return null;
  };

  const save = async () => {
    const sectionId = selectedSection();
    if (!host.saveSection || !sectionId || !name.trim()) return;
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
      collect(sectionId);
      const saved = await host.saveSection(name.trim(), { roots: [sectionId], nodes });
      if (saved) {
        setModules((current) => [...(current ?? []), saved]);
        setName('');
      }
    } finally {
      setSaving(false);
    }
  };

  const insert = (fragment: Fragment, label: string) => {
    const state = store.getState();
    const { doc } = state;
    const after = selectedSection();
    const children = doc.nodes[doc.root]?.children ?? [];
    const index = after ? children.indexOf(after) + 1 : children.length;
    state.insertFragment(reidFragment(fragment), { parentId: doc.root, index }, label);
  };

  return (
    <div className="bst:h-full bst:space-y-4 bst:overflow-y-auto bst:p-3">
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent(OPEN_IMPORT_HTML));
        }}
        className="bst:flex bst:w-full bst:cursor-pointer bst:items-center bst:gap-3 bst:rounded-control bst:border bst:border-dashed bst:border-primary/40 bst:bg-primary/5 bst:px-3 bst:py-3 bst:text-left bst:transition-[colors,transform] bst:hover:bg-primary/10 bst:active:scale-[0.98]"
      >
        <FileCode2 className="bst:size-5 bst:shrink-0 bst:text-primary" aria-hidden="true" />
        <span className="bst:min-w-0 bst:flex-1">
          <span className="bst:block bst:text-sm bst:font-medium">{words.importHtml.open}</span>
          <span className="bst:block bst:truncate bst:text-xs bst:text-muted-foreground">
            .html
          </span>
        </span>
      </button>
      <h3 className="bst:px-1 bst:text-[11px] bst:font-semibold bst:tracking-wider bst:text-muted-foreground bst:uppercase">
        {w.modules}
      </h3>
      {host.saveSection ? (
        <form
          className="bst:flex bst:gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Input
            value={name}
            maxLength={120}
            disabled={!selectedSection()}
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
            disabled={!selectedSection() || !name.trim()}
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
        <EmptyState size="compact" icon={<Boxes aria-hidden="true" />} title={w.noModules} />
      ) : (
        <div className="bst:space-y-2">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => {
                insert(module.fragment, module.name);
              }}
              className="bst:flex bst:w-full bst:cursor-pointer bst:items-center bst:gap-3 bst:rounded-control bst:border bst:border-border bst:bg-card bst:px-3 bst:py-2.5 bst:text-left bst:transition-[colors,transform] bst:hover:border-primary/50 bst:active:scale-[0.98]"
            >
              <Boxes
                className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
                aria-hidden="true"
              />
              <span className="bst:min-w-0 bst:flex-1 bst:truncate bst:text-sm">{module.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
