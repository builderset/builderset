import {
  BuilderError,
  createFragment,
  createWrappedFragment,
  duplicate as duplicateNodes,
  History,
  indexInParent,
  insert,
  move,
  parentOf,
  remove,
  replaceType,
  update,
  isTranslating,
  localize,
  withValueAt,
  wrap,
  wrapChain,
  type Breakpoint,
  type EngineDocument,
  type ContentLocale,
  type ElementRegistry,
  type Fragment,
  type NodeId,
  type NodePatch,
} from '../core';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { propsSchema } from './inspector/schema';
import { splitEdit, splitMeta } from './translate';

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

export interface EditorState<TDoc extends EngineDocument = EngineDocument> {
  doc: TDoc;
  /**
   * The language being written, when the document is multi-language and it is
   * not the base one; `null` otherwise. Text typed now goes to its translation.
   */
  lang: ContentLocale | null;
  /** The document as it reads in `lang` — what the canvas and inspector show. */
  view: TDoc;
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

export interface EditorActions<TDoc extends EngineDocument = EngineDocument> {
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
  /** The document's own fields — an article's title and SEO, an email's subject. */
  updateMeta(meta: Record<string, unknown>, label: string, coalesceKey?: string): void;
  /** Write in another language of a multi-language document (`null`: the base). */
  setLang(lang: ContentLocale | null): void;
  /** Turn multi-language on or off; its translations are kept either way. */
  setMultilingual(enabled: boolean, base: ContentLocale): void;
  /** Any other change to the document itself (an email's settings). */
  updateDocument(label: string, recipe: (draft: TDoc) => void, coalesceKey?: string): void;
  moveNodes(ids: NodeId[], parentId: NodeId, index: number): boolean;
  moveBy(id: NodeId, delta: -1 | 1): boolean;
  removeNodes(ids: NodeId[]): boolean;
  duplicateNodes(ids: NodeId[]): NodeId[];
  wrapNodes(ids: NodeId[], type: string): NodeId | null;
  turnInto(id: NodeId, type: string): boolean;
  /** Replace the document — a restored revision, the server's copy. */
  replaceDocument(doc: TDoc, options?: { keepHistory?: boolean; label?: string }): void;
  /** Something outside the document changed (a row column): there is work to save. */
  touch(): void;
  markSaving(): void;
  markSaved(revision: number, at?: number): void;
  markSaveFailed(conflict?: boolean): void;
}

export type EditorStore<TDoc extends EngineDocument = EngineDocument> = StoreApi<
  EditorState<TDoc> & EditorActions<TDoc>
>;

export interface CreateEditorOptions<TDoc extends EngineDocument> {
  document: TDoc;
  registry: ElementRegistry;
  /** Called with a core error code when an operation is refused. */
  onRefused?: ((code: string) => void) | undefined;
  /** See `EditorProfile.onNodeUpdated`. */
  onNodeUpdated?: ((draft: TDoc, nodeId: NodeId, registry: ElementRegistry) => void) | undefined;
}

/** What the canvas and the inspector show: the document in the language being written. */
function viewOf<TDoc extends EngineDocument>(doc: TDoc, lang: ContentLocale | null): TDoc {
  return lang ? localize(doc, lang, { keepEmpty: true }) : doc;
}

export function createEditorStore<TDoc extends EngineDocument>({
  document,
  registry,
  onRefused,
  onNodeUpdated,
}: CreateEditorOptions<TDoc>): EditorStore<TDoc> {
  const history = new History<TDoc>(document);

  return createStore<EditorState<TDoc> & EditorActions<TDoc>>()((set, get) => {
    /** Mirror the history into the state after it changed. */
    const sync = (extra: Partial<EditorState<TDoc>> = {}) => {
      const changed = history.doc !== get().doc;
      const lang = isTranslating(history.doc, get().lang) ? get().lang : null;
      set({
        doc: history.doc,
        lang,
        view: viewOf(history.doc, lang),
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
      change: (draft: TDoc) => T,
      options: { coalesceKey?: string | undefined; select?: (result: T) => NodeId[] } = {},
    ): { ok: true; value: T } | { ok: false } => {
      try {
        let selectAfter: NodeId[] | undefined;
        const value = history.commit(
          (draft) => {
            // An immer draft of a document type with no readonly parts is that type.
            const result = change(draft as TDoc);
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

    /** The language being written, if it is a translation; with its words so far. */
    const translating = (): ContentLocale | null => {
      const { doc, lang } = get();
      return isTranslating(doc, lang) ? lang : null;
    };

    /** Write `words` into `lang`'s translation of node `id` (or of the meta when `id` is null). */
    const writeWords = (
      draft: TDoc,
      lang: ContentLocale,
      id: NodeId | null,
      words: [string, unknown][],
    ) => {
      if (!words.length || !draft.i18n) return;
      const translation = (draft.i18n.translations[lang] ??= {});
      const fields = id ? ((translation.nodes ??= {})[id] ??= {}) : (translation.meta ??= {});
      for (const [path, value] of words) fields[path] = value;
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
      lang: null,
      view: document,
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
          // Build whatever the target needs around the block: a text block
          // dropped on an email's empty body arrives in a section, a row and
          // a column, as in every email builder.
          const parent = get().doc.nodes[where.parentId];
          const chain = parent ? wrapChain(registry, parent.type, type) : [];
          fragment = chain?.length
            ? createWrappedFragment(registry, chain, type, props)
            : createFragment(registry, type, props);
        } catch (error) {
          if (error instanceof BuilderError) {
            onRefused?.(error.code);
            return null;
          }
          throw error;
        }
        // The block itself — inside any containers built around it — is what
        // gets selected and returned, so typing starts where the writer expects.
        let block = fragment.roots[0];
        while (block && fragment.nodes[block]?.type !== type) {
          block = fragment.nodes[block]?.children?.[0];
        }
        const result = commit(
          `Add ${type}`,
          (draft) => insert(draft, registry, where.parentId, where.index, fragment),
          { select: (ids) => (block ? [block] : ids) },
        );
        if (!result.ok) return null;
        set({ recent: [type, ...get().recent.filter((t) => t !== type)].slice(0, 6) });
        return block ?? result.value[0] ?? null;
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
        const lang = translating();
        const { doc, view } = get();
        const node = doc.nodes[id];
        if (!lang || !patch.props || !node) {
          return commit(
            label,
            (draft) => {
              update(draft, registry, id, patch);
              if (patch.props) onNodeUpdated?.(draft, id, registry);
            },
            { coalesceKey },
          ).ok;
        }

        // Translating: the words to this language, the rest to the shared base.
        const split = splitEdit(
          propsSchema(registry, node.type),
          view.nodes[id]?.props ?? node.props,
          node.props,
          patch.props,
        );
        if (split.structural) {
          onRefused?.('i18n.structureInBase');
          return false;
        }
        let props = node.props;
        for (const [path, value] of split.shared) props = withValueAt(props, path, value);
        return commit(
          label,
          (draft) => {
            const rest = { ...patch };
            Reflect.deleteProperty(rest, 'props');
            if (props !== node.props || Object.keys(rest).length) {
              update(draft, registry, id, { ...rest, ...(props !== node.props ? { props } : {}) });
            }
            writeWords(draft, lang, id, split.words);
            // The language, read on its own, must still be a valid block.
            const shown = localize(draft, lang, { keepEmpty: true }).nodes[id];
            const definition = registry.get(node.type);
            if (shown && definition && !definition.schema.safeParse(shown.props).success) {
              throw new BuilderError('props.invalid');
            }
            if (props !== node.props) onNodeUpdated?.(draft, id, registry);
          },
          { coalesceKey },
        ).ok;
      },
      updateMeta(meta, label, coalesceKey) {
        const lang = translating();
        const { doc, view } = get();
        const split = lang ? splitMeta(view.meta, doc.meta, meta) : { words: [], shared: meta };
        commit(
          label,
          (draft) => {
            Object.assign(draft.meta, split.shared);
            for (const [key, value] of Object.entries(split.shared)) {
              if (value === undefined) Reflect.deleteProperty(draft.meta, key);
            }
            if (lang) writeWords(draft, lang, null, split.words);
          },
          { coalesceKey },
        );
      },
      setLang(lang) {
        const { doc } = get();
        const next = isTranslating(doc, lang) ? lang : null;
        if (next === get().lang) return;
        set({ lang: next, view: viewOf(doc, next), editingId: null });
      },
      setMultilingual(enabled, base) {
        commit(enabled ? 'Multi-language on' : 'Multi-language off', (draft) => {
          if (draft.i18n) draft.i18n.enabled = enabled;
          else draft.i18n = { enabled, base, translations: {} };
        });
      },
      updateDocument(label, recipe, coalesceKey) {
        commit(label, recipe, { coalesceKey });
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
            // Everything else the document carries: its translations, an
            // email's settings.
            const target = draft as unknown as Record<string, unknown>;
            const source = doc as unknown as Record<string, unknown>;
            for (const key of ['i18n', 'settings']) {
              if (key in source) target[key] = structuredClone(source[key]);
              else Reflect.deleteProperty(target, key);
            }
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
