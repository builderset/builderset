import type { EngineDocument, Fragment, MediaKind } from '../core';
import type {
  BuilderHost,
  OEmbedInfo,
  RevisionSummary,
  SavedSection,
  SaveResult,
  UploadResult,
} from './types';

/**
 * A host for an API of the shape in `BACKEND.md`: the document at one address,
 * its draft, publishing and versions beside it. For a project that has no API
 * yet; one that has its own writes its own adapter.
 *
 * Field names are snake_case on the wire and camelCase here; only the fields
 * this adapter reads and writes are converted, never the document. Every
 * method that answers with a `SaveResult` turns a failure — a refusal, a
 * conflict, a lost connection — into `{ ok: false, message }`: the editor
 * shows it and retries, and nothing throws into it.
 */

/**
 * Each path, relative to `baseUrl` (`'../sections'` is a sibling of the
 * document). `null` leaves the method out, and the editor hides the feature.
 */
export interface RestPaths {
  /** `GET` — the document, its draft and where it is in publishing. */
  document: string | null;
  /** `PUT` — the draft. */
  draft: string;
  publish: string | null;
  unpublish: string | null;
  /** `GET` the list, `GET {revisions}/{id}`, `POST` a named version. */
  revisions: string | null;
  preview: string | null;
  oembed: string | null;
  sections: string | null;
}

export const DEFAULT_REST_PATHS: RestPaths = {
  document: '',
  draft: 'draft',
  publish: 'publish',
  unpublish: 'unpublish',
  revisions: 'revisions',
  preview: 'preview',
  oembed: '../oembed',
  sections: '../sections',
};

/** What the server said about the record — for the editor's `record` prop. */
export interface RestRecord {
  status?: string | undefined;
  savedAt?: string | undefined;
  publishedAt?: string | null | undefined;
  scheduledAt?: string | null | undefined;
}

export interface RestHostOptions<TDoc extends EngineDocument> {
  /** The document's address: `/api/emails/42`. */
  baseUrl: string;
  /** Extra headers on every request: an Authorization header, a CSRF token. */
  headers?: (() => Record<string, string> | Promise<Record<string, string>>) | undefined;
  /** Passed to fetch. Default `'same-origin'`. */
  credentials?: RequestCredentials | undefined;
  /** Where files are posted. Omit it and pass `upload` to do uploads yourself. */
  uploadUrl?: string | undefined;
  upload?: BuilderHost<TDoc>['upload'] | undefined;
  resolveMedia: (key: string) => string;
  toast: BuilderHost<TDoc>['toast'];
  /** Change a path when the API differs from the default shape. */
  paths?: Partial<RestPaths> | undefined;
  /** The `saved_at` the page was loaded with, sent back as `expected_saved_at`. */
  savedAt?: string | null | undefined;
  /** Called with what the server says about the record after each write. */
  onRecord?: ((record: RestRecord) => void) | undefined;
  /** For tests. Default: the global fetch. */
  fetch?: typeof fetch | undefined;
}

type Json = Record<string, unknown>;

interface Answer {
  ok: boolean;
  status: number;
  body: unknown;
}

/** `base` + a relative path, `..` going up one segment. */
export function joinPath(base: string, path: string): string {
  const [head = '', query] = base.split('?', 2);
  const segments = head.replace(/\/+$/, '').split('/');
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  return segments.join('/') + (query === undefined ? '' : `?${query}`);
}

const asObject = (value: unknown): Json =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

/** The first issue's message, the server's message, or the status. */
function messageOf(answer: Answer): string {
  const body = asObject(answer.body);
  const issues = Array.isArray(body.issues) ? body.issues : [];
  const first = asObject(issues[0]);
  return (
    asString(first.message) ??
    asString(first.code) ??
    asString(body.message) ??
    asString(body.detail) ??
    `The server answered ${String(answer.status)}.`
  );
}

function uploadResult(body: unknown): UploadResult {
  const value = asObject(body);
  const key = asString(value.key);
  const url = asString(value.url);
  if (!key || !url) throw new Error('The server did not say where the file is.');
  return {
    key,
    url,
    width: asNumber(value.width),
    height: asNumber(value.height),
    mime: asString(value.mime),
    size: asNumber(value.size),
    name: asString(value.name),
  };
}

export function createRestHost<TDoc extends EngineDocument = EngineDocument>(
  options: RestHostOptions<TDoc>,
): BuilderHost<TDoc> {
  const paths: RestPaths = { ...DEFAULT_REST_PATHS, ...options.paths };
  const at = (path: string) => joinPath(options.baseUrl, path);
  let savedAt = options.savedAt ?? null;

  const headers = async (json: boolean): Promise<Record<string, string>> => ({
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(await options.headers?.()),
  });

  /** One request; a lost connection answers with status 0 rather than throwing. */
  const request = async (method: string, url: string, body?: unknown): Promise<Answer> => {
    const send = options.fetch ?? globalThis.fetch;
    try {
      const response = await send(url, {
        method,
        headers: await headers(body !== undefined),
        credentials: options.credentials ?? 'same-origin',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = response.status === 204 ? '' : await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { message: text };
      }
      return { ok: response.ok, status: response.status, body: parsed };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        body: {
          message: error instanceof Error ? error.message : 'The server could not be reached.',
        },
      };
    }
  };

  /** The answer to a write, as the editor wants it; remembers the new `saved_at`. */
  const result = (answer: Answer): SaveResult => {
    if (!answer.ok) {
      return answer.status === 409
        ? { ok: false, conflict: true, message: messageOf(answer) }
        : { ok: false, message: messageOf(answer) };
    }
    const body = asObject(answer.body);
    savedAt = asString(body.saved_at) ?? new Date().toISOString();
    options.onRecord?.({
      savedAt,
      ...(typeof body.status === 'string' ? { status: body.status } : {}),
      ...('published_at' in body ? { publishedAt: asString(body.published_at) ?? null } : {}),
      ...('scheduled_at' in body ? { scheduledAt: asString(body.scheduled_at) ?? null } : {}),
    });
    return { ok: true, savedAt };
  };

  const upload: BuilderHost<TDoc>['upload'] | undefined =
    options.upload ??
    (options.uploadUrl
      ? (
          file: File,
          kind: MediaKind,
          onProgress: (fraction: number) => void,
          signal: AbortSignal,
        ) =>
          xhrUpload(options.uploadUrl ?? '', file, kind, onProgress, signal, {
            headers: () => headers(false),
            credentials: options.credentials ?? 'same-origin',
          })
      : undefined);

  const host: BuilderHost<TDoc> = {
    upload:
      upload ??
      (() => Promise.reject(new Error('Uploads are not set up: pass `uploadUrl` or `upload`.'))),
    resolveMedia: options.resolveMedia,
    toast: options.toast,

    async save(document, reason, saveOptions) {
      const force = saveOptions?.force === true;
      return result(
        await request('PUT', at(paths.draft), {
          document,
          reason,
          expected_saved_at: savedAt,
          ...(force ? { force: true } : {}),
        }),
      );
    },
  };

  if (paths.document !== null) {
    const documentPath = paths.document;
    host.reload = async () => {
      const answer = await request('GET', at(documentPath));
      if (!answer.ok) throw new Error(messageOf(answer));
      const body = asObject(answer.body);
      savedAt = asString(body.saved_at) ?? savedAt;
      options.onRecord?.({
        ...(savedAt ? { savedAt } : {}),
        ...(typeof body.status === 'string' ? { status: body.status } : {}),
      });
      return (body.draft_document ?? body.document) as TDoc;
    };
  }

  if (paths.publish !== null) {
    const publishPath = paths.publish;
    host.publish = async (document, scheduledAt) =>
      result(
        await request('POST', at(publishPath), { document, scheduled_at: scheduledAt ?? null }),
      );
  }

  if (paths.unpublish !== null) {
    const unpublishPath = paths.unpublish;
    host.unpublish = async () => result(await request('POST', at(unpublishPath)));
  }

  if (paths.revisions !== null) {
    const revisions = paths.revisions;
    host.loadRevisions = async () => {
      const answer = await request('GET', at(revisions));
      if (!answer.ok || !Array.isArray(answer.body)) {
        options.toast('error', messageOf(answer));
        return [];
      }
      return answer.body.map((raw): RevisionSummary => {
        const row = asObject(raw);
        const kind = asString(row.kind);
        return {
          id: String(row.id),
          kind: kind === 'manual' || kind === 'publish' ? kind : 'autosave',
          label: asString(row.label) ?? null,
          createdAt: asString(row.created_at) ?? '',
          author: asString(row.author) ?? null,
        };
      });
    };
    host.loadRevision = async (id) => {
      const answer = await request('GET', at(`${revisions}/${encodeURIComponent(id)}`));
      if (!answer.ok) throw new Error(messageOf(answer));
      return asObject(answer.body).document as TDoc;
    };
    host.saveRevision = async (document, label) => {
      const answer = await request('POST', at(revisions), { document, label });
      if (!answer.ok) options.toast('error', messageOf(answer));
      return answer.ok;
    };
  }

  if (paths.preview !== null) {
    const previewPath = paths.preview;
    host.previewUrl = async (document, locale) => {
      const answer = await request('POST', at(previewPath), { document, locale: locale ?? null });
      const url = asString(asObject(answer.body).url);
      if (!answer.ok || !url) {
        options.toast('error', messageOf(answer));
        return '';
      }
      return url;
    };
  }

  if (paths.oembed !== null) {
    const oembedPath = paths.oembed;
    host.oembed = async (url): Promise<OEmbedInfo | null> => {
      const answer = await request('GET', `${at(oembedPath)}?url=${encodeURIComponent(url)}`);
      const body = asObject(answer.body);
      const provider = asString(body.provider);
      if (!answer.ok || answer.status === 204 || !provider) return null;
      return {
        provider,
        title: asString(body.title) ?? null,
        thumbnail: asString(body.thumbnail) ?? null,
      };
    };
  }

  if (options.uploadUrl) {
    const importUrl = joinPath(options.uploadUrl, 'import');
    host.importImage = async (url) => {
      const answer = await request('POST', importUrl, { url });
      if (!answer.ok) throw new Error(messageOf(answer));
      return uploadResult(answer.body);
    };
  }

  if (paths.sections !== null) {
    const sectionsPath = paths.sections;
    const section = (raw: unknown): SavedSection => {
      const row = asObject(raw);
      return {
        id: String(row.id),
        name: asString(row.name) ?? '',
        fragment: row.fragment as Fragment,
      };
    };
    host.loadSections = async () => {
      const answer = await request('GET', at(sectionsPath));
      return answer.ok && Array.isArray(answer.body) ? answer.body.map(section) : [];
    };
    host.saveSection = async (name, fragment) => {
      const answer = await request('POST', at(sectionsPath), { name, fragment });
      if (!answer.ok) {
        options.toast('error', messageOf(answer));
        return null;
      }
      return section(answer.body);
    };
  }

  return host;
}

/**
 * A multipart upload with progress: `fetch` cannot report how much of a
 * request body has gone, `XMLHttpRequest` can.
 */
function xhrUpload(
  url: string,
  file: File,
  kind: MediaKind,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
  options: {
    headers: () => Promise<Record<string, string>>;
    credentials: RequestCredentials;
  },
): Promise<UploadResult> {
  return options.headers().then(
    (headers) =>
      new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.withCredentials = options.credentials === 'include';
        for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
        };
        xhr.onload = () => {
          let body: unknown = null;
          try {
            body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          } catch {
            body = { message: xhr.responseText };
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              onProgress(1);
              resolve(uploadResult(body));
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
            return;
          }
          const fallback =
            xhr.status === 413
              ? 'The file is too large.'
              : xhr.status === 415
                ? 'This kind of file is not accepted.'
                : `The server answered ${String(xhr.status)}.`;
          const answer = asObject(body);
          reject(new Error(asString(answer.message) ?? asString(answer.detail) ?? fallback));
        };
        xhr.onerror = () => {
          reject(new Error('The file could not be sent.'));
        };
        xhr.onabort = () => {
          reject(new DOMException('The upload was cancelled.', 'AbortError'));
        };
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
        const form = new FormData();
        form.append('file', file);
        form.append('kind', kind);
        xhr.send(form);
      }),
  );
}
