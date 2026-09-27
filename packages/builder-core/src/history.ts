import { applyPatches, type Draft, type Patch } from 'immer';

import type { BuilderDocument } from './document';
import type { NodeId } from './ids';
import { LIMITS } from './limits';
import { applyChange } from './operations';

/**
 * Undo and redo, as a stack of patch pairs.
 *
 * ── What one step is ─────────────────────────────────────────────────────────
 * One thing the writer DID: an insert, a drag, a paste, a template, a colour
 * change. Typing is the exception that proves the rule — undo after a sentence
 * should not remove it letter by letter — so consecutive edits that carry the
 * same `coalesceKey` (the text node being typed in) within `coalesceMs` merge
 * into one step. A `transaction` groups several operations into one step on
 * purpose: "wrap in columns" is an insert and a move, and undoing half of it
 * would leave an empty column set on the page.
 *
 * ── Selection travels with the step ──────────────────────────────────────────
 * Each step remembers what was selected before and after it, so undoing a
 * delete puts the selection back on the node that reappeared instead of
 * leaving the writer to find it.
 */

export interface Selection {
  ids: NodeId[];
}

export interface HistoryEntry {
  label: string;
  patches: Patch[];
  inversePatches: Patch[];
  before: Selection;
  after: Selection;
  coalesceKey?: string | undefined;
  at: number;
}

export interface CommitOptions {
  /** What the undo button's tooltip says: "Move image". */
  label: string;
  coalesceKey?: string | undefined;
  /** The selection after the change; the current one is recorded as `before`. */
  selectionAfter?: Selection | undefined;
}

export interface HistoryOptions {
  limit?: number;
  coalesceMs?: number;
  now?: () => number;
}

export class History {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private pending: HistoryEntry | null = null;
  private readonly limit: number;
  private readonly coalesceMs: number;
  private readonly now: () => number;

  constructor(
    private current: BuilderDocument,
    private selection: Selection = { ids: [] },
    options: HistoryOptions = {},
  ) {
    this.limit = options.limit ?? LIMITS.historySteps;
    this.coalesceMs = options.coalesceMs ?? 750;
    this.now = options.now ?? (() => Date.now());
  }

  get doc(): BuilderDocument {
    return this.current;
  }

  get selected(): Selection {
    return this.selection;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** The label of the step `undo` would reverse — for its tooltip. */
  get undoLabel(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.label;
  }

  get redoLabel(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.label;
  }

  /** Selection changes are not steps, but the next step records them. */
  select(selection: Selection): void {
    this.selection = selection;
  }

  /**
   * Run a change and record it. Returns the change's own result. A change that
   * throws leaves the document, the stacks and the selection untouched.
   */
  commit<T>(change: (draft: Draft<BuilderDocument>) => T, options: CommitOptions): T {
    const { doc, patches, inversePatches, result } = applyChange(this.current, change);
    if (patches.length === 0) {
      if (options.selectionAfter) this.selection = options.selectionAfter;
      return result;
    }
    const entry: HistoryEntry = {
      label: options.label,
      patches,
      inversePatches,
      before: this.selection,
      after: options.selectionAfter ?? this.selection,
      coalesceKey: options.coalesceKey,
      at: this.now(),
    };
    this.current = doc;
    this.selection = entry.after;

    if (this.pending) {
      this.merge(this.pending, entry);
      return result;
    }
    this.push(entry);
    return result;
  }

  /**
   * Several changes, one undo step. The steps inside are applied as they go
   * (each sees the last one's result); if any throws, all of them are rolled
   * back and the error is rethrown.
   */
  transaction<T>(label: string, run: () => T): T {
    if (this.pending) return run();
    const start = this.current;
    const startSelection = this.selection;
    this.pending = {
      label,
      patches: [],
      inversePatches: [],
      before: this.selection,
      after: this.selection,
      at: this.now(),
    };
    try {
      const result = run();
      const entry = this.pending;
      this.pending = null;
      if (entry.patches.length > 0) this.push(entry);
      return result;
    } catch (error) {
      this.pending = null;
      this.current = start;
      this.selection = startSelection;
      throw error;
    }
  }

  undo(): { doc: BuilderDocument; selection: Selection } | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.current = applyPatches(this.current, entry.inversePatches);
    this.selection = entry.before;
    this.redoStack.push(entry);
    return { doc: this.current, selection: this.selection };
  }

  redo(): { doc: BuilderDocument; selection: Selection } | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.current = applyPatches(this.current, entry.patches);
    this.selection = entry.after;
    this.undoStack.push(entry);
    return { doc: this.current, selection: this.selection };
  }

  /** Forget every step — after loading a different document, say. */
  reset(doc: BuilderDocument, selection: Selection = { ids: [] }): void {
    this.current = doc;
    this.selection = selection;
    this.undoStack = [];
    this.redoStack = [];
    this.pending = null;
  }

  private push(entry: HistoryEntry): void {
    const last = this.undoStack[this.undoStack.length - 1];
    if (
      last &&
      entry.coalesceKey !== undefined &&
      last.coalesceKey === entry.coalesceKey &&
      this.redoStack.length === 0 &&
      entry.at - last.at <= this.coalesceMs
    ) {
      this.merge(last, entry);
      return;
    }
    this.undoStack.push(entry);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Fold `next` into `into`: forward patches append, inverse ones prepend. */
  private merge(into: HistoryEntry, next: HistoryEntry): void {
    into.patches = [...into.patches, ...next.patches];
    into.inversePatches = [...next.inversePatches, ...into.inversePatches];
    into.after = next.after;
    into.at = next.at;
    this.redoStack = [];
  }
}
