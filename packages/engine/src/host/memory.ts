import type { EngineDocument, Fragment } from '../core';
import type {
  BuilderHost,
  RevisionSummary,
  SavedSection,
  SaveReason,
  SaveResult,
  UploadResult,
} from './types';

/**
 * A host that keeps everything in memory — for tests, demos and a playground.
 *
 * Uploads become object URLs (`URL.createObjectURL`), which work only in the
 * tab that made them: a document saved here and opened elsewhere has dead
 * images. Nothing survives a reload unless `onSave` keeps it somewhere.
 */

export interface MemoryHostOptions<TDoc extends EngineDocument> {
  /** The document the host holds before the first save — what `reload` returns. */
  document?: TDoc | undefined;
  /** Wait this long, in ms, before answering, to see loading states. Default 0. */
  latency?: number | undefined;
  /** Called on every save and publish: log it, or keep it in localStorage. */
  onSave?: ((document: TDoc, reason: SaveReason) => void) | undefined;
  /** Where the editor's messages go. Default: `console.info`. */
  toast?: BuilderHost<TDoc>['toast'] | undefined;
}

/** What a memory host holds, for a test to look at. */
export interface MemoryHostState<TDoc extends EngineDocument> {
  document: TDoc | null;
  status: 'draft' | 'published' | 'scheduled';
  savedAt: string | null;
  scheduledAt: string | null;
  revisions: (RevisionSummary & { document: TDoc })[];
  sections: SavedSection[];
}

export type MemoryHost<TDoc extends EngineDocument> = Required<
  Pick<
    BuilderHost<TDoc>,
    | 'reload'
    | 'publish'
    | 'unpublish'
    | 'loadRevisions'
    | 'loadRevision'
    | 'saveRevision'
    | 'loadSections'
    | 'saveSection'
  >
> &
  BuilderHost<TDoc> & { readonly state: MemoryHostState<TDoc> };

export function createMemoryHost<TDoc extends EngineDocument = EngineDocument>(
  options: MemoryHostOptions<TDoc> = {},
): MemoryHost<TDoc> {
  const state: MemoryHostState<TDoc> = {
    document: options.document ? structuredClone(options.document) : null,
    status: 'draft',
    savedAt: null,
    scheduledAt: null,
    revisions: [],
    sections: [],
  };
  const media = new Map<string, string>();
  let counter = 0;
  const nextId = (prefix: string) => {
    counter += 1;
    return `${prefix}-${String(counter)}`;
  };
  const wait = () =>
    options.latency
      ? new Promise<void>((resolve) => setTimeout(resolve, options.latency))
      : Promise.resolve();
  const now = () => new Date().toISOString();
  const keep = (document: TDoc, reason: SaveReason): SaveResult => {
    state.document = structuredClone(document);
    state.savedAt = now();
    options.onSave?.(document, reason);
    return { ok: true, savedAt: state.savedAt };
  };
  const record = (document: TDoc, kind: RevisionSummary['kind'], label?: string) => {
    state.revisions.unshift({
      id: nextId('revision'),
      kind,
      label: label ?? null,
      createdAt: now(),
      author: null,
      document: structuredClone(document),
    });
  };

  return {
    state,

    async upload(file, _kind, onProgress, signal): Promise<UploadResult> {
      for (const fraction of [1 / 3, 2 / 3, 1]) {
        if (signal.aborted) throw new DOMException('The upload was cancelled.', 'AbortError');
        await wait();
        onProgress(fraction);
      }
      const key = `memory/${nextId('file')}/${file.name}`;
      const url = URL.createObjectURL(file);
      media.set(key, url);
      return { key, url, mime: file.type, size: file.size, name: file.name };
    },

    resolveMedia: (key) => media.get(key) ?? key,

    async save(document, reason) {
      await wait();
      const result = keep(document, reason);
      if (reason === 'manual') record(document, 'manual');
      return result;
    },

    async reload() {
      await wait();
      if (!state.document) throw new Error('Nothing has been saved yet.');
      return structuredClone(state.document);
    },

    async publish(document, scheduledAt) {
      await wait();
      const result = keep(document, 'publish');
      state.status = scheduledAt ? 'scheduled' : 'published';
      state.scheduledAt = scheduledAt ?? null;
      record(document, 'publish');
      return result;
    },

    async unpublish() {
      await wait();
      state.status = 'draft';
      state.scheduledAt = null;
      state.savedAt = now();
      return { ok: true, savedAt: state.savedAt };
    },

    async loadRevisions() {
      await wait();
      return state.revisions.map(({ id, kind, label, createdAt, author }): RevisionSummary => ({
        id,
        kind,
        label,
        createdAt,
        author,
      }));
    },

    async loadRevision(id) {
      await wait();
      const revision = state.revisions.find((entry) => entry.id === id);
      if (!revision) throw new Error(`No version "${id}".`);
      return structuredClone(revision.document);
    },

    async saveRevision(document, label) {
      await wait();
      record(document, 'manual', label);
      return true;
    },

    async loadSections() {
      await wait();
      return [...state.sections];
    },

    async saveSection(name: string, fragment: Fragment) {
      await wait();
      const section = { id: nextId('section'), name, fragment: structuredClone(fragment) };
      state.sections.push(section);
      return section;
    },

    toast:
      options.toast ??
      ((kind, message) => {
        console.info(`[${kind}] ${message}`);
      }),
  };
}
