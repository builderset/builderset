import {
  BuilderError,
  createFragment,
  duplicate as duplicateNodes,
  History,
  indexInParent,
  insert,
  move,
  parentOf,
  remove,
  replaceType,
  update,
  wrap,
  type Breakpoint,
  type BuilderDocument,
  type DocumentMeta,
  type ElementRegistry,
  type Fragment,
  type NodeId,
  type NodePatch,
} from '@motors/builder-core';
import { createStore, type StoreApi } from 'zustand/vanilla';

/**
 * One store per editor: the document, what is selected, what the panels show,
 * and whether the work has reached the server.
 *
 * Every change to the document goes through core's operations inside the
 * core `History`, so it is validated, undoable, and labelled for the undo
 * tooltip. The store only mirrors the history's current document — it never
 * edits one itself.
 */

export type LeftTab = 'add' | 'layers' | 'templates';
export type RightTab = 'content' | 'style' | 'advanced';
export type SaveState = 'idle' | 'saving' | 'error' | 'conflict';

export interface EditorState {
  doc: BuilderDocument;
  selection: NodeId[];
  hoverId: NodeId | null;
  viewport: Breakpoint;
  zoom: number;
  leftTab: LeftTab;
  rightTab: RightTab;
  leftOpen: boolean;
  rightOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | undefined;
  redoLabel: string | undefined;
  /** Bumped on every document change; compared with `savedRevision`. */
  revision: number;
  savedRevision: number;
  saveState: SaveState;
  lastSavedAt: number | null;
  /** The node whose text is being typed into, if any. */
  editingId: NodeId | null;
  /** Element types inserted most recently, newest first. */
  recent: string[];
}

export interface InsertTarget {
  parentId: NodeId;
  index: number;
}

export interface EditorActions {
  select(ids: NodeId[]): void;
  hover(id: NodeId | null): void;
  setEditing(id: NodeId | null): void;
  setViewport(viewport: Breakpoint): void;
  setZoom(zoom: number): void;
  setLeftTab(tab: LeftTab): void;
  setRightTab(tab: RightTab): void;
  toggleLeft(open?: boolean): void;
  toggleRight(open?: boolean): void;
  undo(): void;
  redo(): void;
  /** Insert a new element; returns its id, or null when it cannot go there. */
  insertElement(
    type: string,
    target?: InsertTarget,
    props?: Record<string, unknown>,
  ): NodeId | null;
  insertFragment(fragment: Fragment, target?: InsertTarget, label?: string): NodeId[];
  updateNode(id: NodeId, patch: NodePatch, label: string, coalesceKey?: string): boolean;
  updateMeta(meta: Partial<DocumentMeta>, label: string, coalesceKey?: string): void;
  moveNodes(ids: NodeId[], parentId: NodeId, index: number): boolean;
  moveBy(id: NodeId, delta: -1 | 1): boolean;
  removeNodes(ids: NodeId[]): boolean;
  duplicateNodes(ids: NodeId[]): NodeId[];
  wrapNodes(ids: NodeId[], type: string): NodeId | null;
  turnInto(id: NodeId, type: string): boolean;
  /** Replace the document — a restored revision, the server's copy. */
  replaceDocument(doc: BuilderDocument, options?: { keepHistory?: boolean; label?: string }): void;
  /** Something outside the document changed (a row column): there is work to save. */
  touch(): void;
  markSaving(): void;
  markSaved(revision: number, at?: number): void;
  markSaveFailed(conflict?: boolean): void;
}

export type EditorStore = StoreApi<EditorState & EditorActions>;

export interface CreateEditorOptions {
  document: BuilderDocument;
  registry: ElementRegistry;
  /** Called with a core error code when an operation is refused. */
  onRefused?: ((code: string) => void) | undefined;
}

export function createEditorStore({
  document,
  registry,
  onRefused,
}: CreateEditorOptions): EditorStore {
  const history = new History(document);

  return createStore<EditorState & EditorActions>()((set, get) => {
    /** Mirror the history into the state after it changed. */
    const sync = (extra: Partial<EditorState> = {}) => {
      const changed = history.doc !== get().doc;
      set({
        doc: history.doc,
        selection: history.selected.ids.filter((id) => id in history.doc.nodes),
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        undoLabel: history.undoLabel,
        redoLabel: history.redoLabel,
        ...(changed ? { revision: get().revision + 1 } : {}),
        ...extra,
      });
    };

    /** Run one change as one undo step. Refusals are reported, not thrown. */
    const commit = <T>(
      label: string,
      change: (draft: BuilderDocument) => T,
      options: { coalesceKey?: string | undefined; select?: (result: T) => NodeId[] } = {},
    ): { ok: true; value: T } | { ok: false } => {
      try {
        let selectAfter: NodeId[] | undefined;
        const value = history.commit(
          (draft) => {
            const result = change(draft);
            if (options.select) selectAfter = options.select(result);
            return result;
          },
          { label, coalesceKey: options.coalesceKey },
        );
        if (selectAfter) history.select({ ids: selectAfter });
        sync();
        return { ok: true, value };
      } catch (error) {
        if (error instanceof BuilderError) {
          onRefused?.(error.code);
          return { ok: false };
        }
        throw error;
      }
    };

    /**
     * Where "insert" goes when the caller does not say: INTO a selected
     * container that takes this type, otherwise right after the selection,
     * otherwise at the end of the article.
     */
    const defaultTarget = (type?: string): InsertTarget => {
      const { doc, selection } = get();
      const last = selection[selection.length - 1];
      const selected = last ? doc.nodes[last] : undefined;
      if (selected && type && registry.canContain(selected.type, type)) {
        return { parentId: selected.id, index: selected.children?.length ?? 0 };
      }
      if (last) {
        const parent = parentOf(doc, last);
        if (parent) return { parentId: parent.id, index: indexInParent(doc, last) + 1 };
      }
      return { parentId: doc.root, index: doc.nodes[doc.root]?.children?.length ?? 0 };
    };

    return {
      doc: document,
      selection: [],
      hoverId: null,
      viewport: 'desktop',
      zoom: 100,
      leftTab: 'add',
      rightTab: 'content',
      leftOpen: true,
      rightOpen: true,
      canUndo: false,
      canRedo: false,
      undoLabel: undefined,
      redoLabel: undefined,
      revision: 0,
      savedRevision: 0,
      saveState: 'idle',
      lastSavedAt: null,
      editingId: null,
      recent: [],

      select(ids) {
        history.select({ ids });
        set({ selection: ids, ...(ids.length ? {} : { editingId: null }) });
      },
      hover(id) {
        if (get().hoverId !== id) set({ hoverId: id });
      },
      setEditing(id) {
        set({ editingId: id });
      },
      setViewport(viewport) {
        set({ viewport });
      },
      setZoom(zoom) {
        set({ zoom: Math.min(150, Math.max(50, zoom)) });
      },
      setLeftTab(leftTab) {
        set({ leftTab, leftOpen: true });
      },
      setRightTab(rightTab) {
        set({ rightTab });
      },
      toggleLeft(open) {
        set({ leftOpen: open ?? !get().leftOpen });
      },
      toggleRight(open) {
        set({ rightOpen: open ?? !get().rightOpen });
      },
      undo() {
        if (history.undo()) sync({ editingId: null });
      },
      redo() {
        if (history.redo()) sync({ editingId: null });
      },

      insertElement(type, target, props) {
        const where = target ?? defaultTarget(type);
        let fragment: Fragment;
        try {
          fragment = createFragment(registry, type, props);
        } catch (error) {
          if (error instanceof BuilderError) {
            onRefused?.(error.code);
            return null;
          }
          throw error;
        }
        const result = commit(
          `Add ${type}`,
          (draft) => insert(draft, registry, where.parentId, where.index, fragment),
          { select: (ids) => ids },
        );
        if (!result.ok) return null;
        set({ recent: [type, ...get().recent.filter((t) => t !== type)].slice(0, 6) });
        return result.value[0] ?? null;
      },
      insertFragment(fragment, target, label = 'Insert') {
        const where = target ?? defaultTarget();
        const result = commit(
          label,
          (draft) => insert(draft, registry, where.parentId, where.index, fragment),
          { select: (ids) => ids },
        );
        return result.ok ? result.value : [];
      },
      updateNode(id, patch, label, coalesceKey) {
        return commit(
          label,
          (draft) => {
            update(draft, registry, id, patch);
          },
          { coalesceKey },
        ).ok;
      },
      updateMeta(meta, label, coalesceKey) {
        commit(
          label,
          (draft) => {
            Object.assign(draft.meta, meta);
            for (const [key, value] of Object.entries(meta)) {
              if (value === undefined) Reflect.deleteProperty(draft.meta, key);
            }
          },
          { coalesceKey },
        );
      },
      moveNodes(ids, parentId, index) {
        return commit('Move', (draft) => move(draft, registry, ids, parentId, index), {
          select: (moved) => moved,
        }).ok;
      },
      moveBy(id, delta) {
        const { doc } = get();
        const parent = parentOf(doc, id);
        if (!parent) return false;
        const index = indexInParent(doc, id);
        const target = delta < 0 ? index - 1 : index + 2;
        if (target < 0 || target > (parent.children?.length ?? 0)) return false;
        return commit(delta < 0 ? 'Move up' : 'Move down', (draft) =>
          move(draft, registry, [id], parent.id, target),
        ).ok;
      },
      removeNodes(ids) {
        if (ids.length === 0) return false;
        const { doc } = get();
        const first = ids[0];
        const parent = first ? parentOf(doc, first) : undefined;
        const index = first ? indexInParent(doc, first) : -1;
        const result = commit('Delete', (draft) => remove(draft, registry, ids));
        if (!result.ok) return false;
        // Select what now sits where the first deleted block was — so pressing
        // Delete twice deletes two blocks rather than nothing.
        const siblings = parent ? (get().doc.nodes[parent.id]?.children ?? []) : [];
        const next = siblings[Math.min(index, siblings.length - 1)];
        get().select(next ? [next] : []);
        return true;
      },
      duplicateNodes(ids) {
        const result = commit('Duplicate', (draft) => duplicateNodes(draft, registry, ids), {
          select: (copies) => copies,
        });
        return result.ok ? result.value : [];
      },
      wrapNodes(ids, type) {
        const result = commit(`Wrap in ${type}`, (draft) => wrap(draft, registry, ids, type), {
          select: (id) => [id],
        });
        return result.ok ? result.value : null;
      },
      turnInto(id, type) {
        return commit(`Turn into ${type}`, (draft) => {
          replaceType(draft, registry, id, type);
        }).ok;
      },
      replaceDocument(doc, options = {}) {
        if (options.keepHistory) {
          commit(options.label ?? 'Restore', (draft) => {
            draft.nodes = structuredClone(doc.nodes);
            draft.root = doc.root;
            draft.meta = structuredClone(doc.meta);
          });
          return;
        }
        history.reset(doc);
        sync({ editingId: null });
      },
      touch() {
        set({ revision: get().revision + 1 });
      },
      markSaving() {
        set({ saveState: 'saving' });
      },
      markSaved(revision, at = Date.now()) {
        set({ saveState: 'idle', savedRevision: revision, lastSavedAt: at });
      },
      markSaveFailed(conflict = false) {
        set({ saveState: conflict ? 'conflict' : 'error' });
      },
    };
  });
}
