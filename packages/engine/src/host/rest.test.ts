import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EngineDocument } from '../core';
import { createRestHost, joinPath, type RestHostOptions } from './rest';

const doc: EngineDocument = {
  schema: 'test/document',
  version: 1,
  root: 'root',
  nodes: { root: { id: 'root', type: 'root', v: 1, props: {}, children: [] } },
  meta: { title: 'A document' },
};

interface Call {
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  credentials: RequestCredentials | undefined;
}

/** A fetch that answers from a table and remembers what it was asked. */
function fakeFetch(answers: Record<string, [number, unknown?]>) {
  const calls: Call[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({
      method,
      url,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
      credentials: init?.credentials,
    });
    const answer = answers[`${method} ${url}`];
    if (!answer) return Promise.reject(new TypeError('Failed to fetch'));
    const [status, body] = answer;
    return Promise.resolve(
      new Response(status === 204 || body === undefined ? null : JSON.stringify(body), { status }),
    );
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

function host(
  answers: Record<string, [number, unknown?]>,
  options: Partial<RestHostOptions<EngineDocument>> = {},
) {
  const { fetch, calls } = fakeFetch(answers);
  const toast = vi.fn();
  const onRecord = vi.fn();
  const adapter = createRestHost({
    baseUrl: '/api/emails/42',
    resolveMedia: (key) => `https://cdn.test/${key}`,
    toast,
    fetch,
    onRecord,
    savedAt: '2026-01-01T00:00:00Z',
    ...options,
  });
  return { adapter, calls, toast, onRecord };
}

describe('joinPath', () => {
  it('goes up with `..` and keeps a query', () => {
    expect(joinPath('/api/emails/42', 'draft')).toBe('/api/emails/42/draft');
    expect(joinPath('/api/emails/42/', '../sections')).toBe('/api/emails/sections');
    expect(joinPath('https://x.test/a/b?v=1', '')).toBe('https://x.test/a/b?v=1');
  });
});

describe('createRestHost', () => {
  it('save: PUT {base}/draft with the saved_at it last received', async () => {
    const { adapter, calls, onRecord } = host({
      'PUT /api/emails/42/draft': [200, { saved_at: '2026-01-02T00:00:00Z' }],
    });
    expect(await adapter.save(doc, 'autosave')).toEqual({
      ok: true,
      savedAt: '2026-01-02T00:00:00Z',
    });
    expect(calls[0]?.body).toEqual({
      document: doc,
      reason: 'autosave',
      expected_saved_at: '2026-01-01T00:00:00Z',
    });
    expect(calls[0]?.credentials).toBe('same-origin');
    expect(onRecord).toHaveBeenCalledWith({ savedAt: '2026-01-02T00:00:00Z' });
    await adapter.save(doc, 'manual');
    expect(calls[1]?.body).toMatchObject({ expected_saved_at: '2026-01-02T00:00:00Z' });
  });

  it('save: a 409 is a conflict, and "keep mine" sends force', async () => {
    const { adapter, calls } = host({
      'PUT /api/emails/42/draft': [409, { message: 'Someone else saved it.' }],
    });
    expect(await adapter.save(doc, 'autosave')).toEqual({
      ok: false,
      conflict: true,
      message: 'Someone else saved it.',
    });
    await adapter.save(doc, 'autosave', { force: true });
    expect(calls[1]?.body).toMatchObject({ force: true });
  });

  it('save: a 422 says the first issue', async () => {
    const { adapter } = host({
      'PUT /api/emails/42/draft': [
        422,
        { issues: [{ code: 'url.unsafe', message: 'A link is not safe.' }, { code: 'other' }] },
      ],
    });
    expect(await adapter.save(doc, 'autosave')).toEqual({
      ok: false,
      message: 'A link is not safe.',
    });
  });

  it('save: a lost connection is a failed save, never a throw', async () => {
    const { adapter } = host({});
    expect(await adapter.save(doc, 'autosave')).toEqual({ ok: false, message: 'Failed to fetch' });
  });

  it('sends the extra headers on every request', async () => {
    const { adapter, calls } = host(
      { 'PUT /api/emails/42/draft': [200, { saved_at: 'x' }] },
      { headers: () => Promise.resolve({ Authorization: 'Bearer t' }), credentials: 'include' },
    );
    await adapter.save(doc, 'autosave');
    expect(calls[0]?.headers).toMatchObject({
      Authorization: 'Bearer t',
      'Content-Type': 'application/json',
    });
    expect(calls[0]?.credentials).toBe('include');
  });

  it('reload: GET {base}, the draft before the live document', async () => {
    const draft = { ...doc, meta: { title: 'Draft' } };
    const { adapter, onRecord } = host({
      'GET /api/emails/42': [
        200,
        { document: doc, draft_document: draft, saved_at: '2026-01-03T00:00:00Z', status: 'draft' },
      ],
    });
    expect(await adapter.reload?.()).toEqual(draft);
    expect(onRecord).toHaveBeenCalledWith({ savedAt: '2026-01-03T00:00:00Z', status: 'draft' });
  });

  it('publish: POST {base}/publish with the schedule; 422 says why', async () => {
    const { adapter, calls, onRecord } = host({
      'POST /api/emails/42/publish': [
        200,
        { saved_at: 's', status: 'published', published_at: '2026-01-04T00:00:00Z' },
      ],
    });
    expect(await adapter.publish?.(doc, null)).toEqual({ ok: true, savedAt: 's' });
    expect(calls[0]?.body).toEqual({ document: doc, scheduled_at: null });
    expect(onRecord).toHaveBeenCalledWith({
      savedAt: 's',
      status: 'published',
      publishedAt: '2026-01-04T00:00:00Z',
    });
    const refused = host({
      'POST /api/emails/42/publish': [422, { issues: [{ code: 'meta.titleMissing' }] }],
    });
    expect(await refused.adapter.publish?.(doc)).toEqual({
      ok: false,
      message: 'meta.titleMissing',
    });
  });

  it('unpublish: POST {base}/unpublish', async () => {
    const { adapter, calls } = host({
      'POST /api/emails/42/unpublish': [200, { saved_at: 'u', status: 'draft' }],
    });
    expect(await adapter.unpublish?.()).toEqual({ ok: true, savedAt: 'u' });
    expect(calls[0]?.body).toBeUndefined();
  });

  it('revisions: list, open and save by name', async () => {
    const { adapter, calls } = host({
      'GET /api/emails/42/revisions': [
        200,
        [{ id: 7, kind: 'manual', label: 'Before', created_at: 't', author: 'Arta' }],
      ],
      'GET /api/emails/42/revisions/7': [200, { document: doc }],
      'POST /api/emails/42/revisions': [201, {}],
    });
    expect(await adapter.loadRevisions?.()).toEqual([
      { id: '7', kind: 'manual', label: 'Before', createdAt: 't', author: 'Arta' },
    ]);
    expect(await adapter.loadRevision?.('7')).toEqual(doc);
    expect(await adapter.saveRevision?.(doc, 'Named')).toBe(true);
    expect(calls[2]?.body).toEqual({ document: doc, label: 'Named' });
  });

  it('a list that fails is empty, with a toast', async () => {
    const { adapter, toast } = host({ 'GET /api/emails/42/revisions': [500, { message: 'Down' }] });
    expect(await adapter.loadRevisions?.()).toEqual([]);
    expect(toast).toHaveBeenCalledWith('error', 'Down');
  });

  it('oembed: GET {base}/../oembed?url=…, nothing on 204', async () => {
    const url = 'https://youtu.be/x';
    const query = `/api/emails/oembed?url=${encodeURIComponent(url)}`;
    const found = host({
      [`GET ${query}`]: [200, { provider: 'youtube', title: 'T', thumbnail: null }],
    });
    expect(await found.adapter.oembed?.(url)).toEqual({
      provider: 'youtube',
      title: 'T',
      thumbnail: null,
    });
    const none = host({ [`GET ${query}`]: [204] });
    expect(await none.adapter.oembed?.(url)).toBeNull();
  });

  it('sections: GET and POST {base}/../sections', async () => {
    const section = { id: 3, name: 'Hero', fragment: { roots: [], nodes: {} } };
    const { adapter, calls } = host({
      'GET /api/emails/sections': [200, [section]],
      'POST /api/emails/sections': [201, section],
    });
    expect(await adapter.loadSections?.()).toEqual([{ ...section, id: '3' }]);
    expect(await adapter.saveSection?.('Hero', section.fragment)).toEqual({ ...section, id: '3' });
    expect(calls[1]?.body).toEqual({ name: 'Hero', fragment: section.fragment });
  });

  it('previewUrl: POST {base}/preview with the language', async () => {
    const { adapter, calls } = host({
      'POST /api/emails/42/preview': [200, { url: 'https://x.test/preview/1' }],
    });
    expect(await adapter.previewUrl?.(doc, 'de')).toBe('https://x.test/preview/1');
    expect(calls[0]?.body).toEqual({ document: doc, locale: 'de' });
  });

  it('importImage: POST {uploadUrl}/import, answered like an upload', async () => {
    const { adapter, calls } = host(
      {
        'POST /api/uploads/import': [
          201,
          {
            key: 'k',
            url: 'https://cdn.test/k',
            width: 10,
            height: 5,
            mime: 'image/png',
            size: 9,
            name: 'a.png',
          },
        ],
      },
      { uploadUrl: '/api/uploads' },
    );
    expect(await adapter.importImage?.('https://elsewhere.test/a.png')).toEqual({
      key: 'k',
      url: 'https://cdn.test/k',
      width: 10,
      height: 5,
      mime: 'image/png',
      size: 9,
      name: 'a.png',
    });
    expect(calls[0]?.body).toEqual({ url: 'https://elsewhere.test/a.png' });
  });

  it('leaves out what the API does not have', () => {
    const { adapter } = host({}, { paths: { revisions: null, sections: null, preview: null } });
    expect(adapter).not.toHaveProperty('loadRevisions');
    expect(adapter).not.toHaveProperty('saveSection');
    expect(adapter).not.toHaveProperty('previewUrl');
    expect(adapter).toHaveProperty('publish');
    expect(adapter).not.toHaveProperty('importImage');
  });

  describe('upload', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** An XMLHttpRequest that answers with `status` and `body` once sent. */
    function stubXhr(status: number, body: unknown) {
      const sent: { url?: string; form?: FormData; headers: Record<string, string> } = {
        headers: {},
      };
      class FakeXhr {
        status = 0;
        responseText = '';
        withCredentials = false;
        upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onabort: (() => void) | null = null;
        open(_method: string, url: string) {
          sent.url = url;
        }
        setRequestHeader(name: string, value: string) {
          sent.headers[name] = value;
        }
        abort() {
          this.onabort?.();
        }
        send(form: FormData) {
          sent.form = form;
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 50,
            total: 100,
          } as ProgressEvent);
          this.status = status;
          this.responseText = JSON.stringify(body);
          this.onload?.();
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr);
      return sent;
    }

    it('POST {uploadUrl} as multipart, with progress', async () => {
      const sent = stubXhr(201, { key: 'email-image/a.png', url: 'https://cdn.test/a.png' });
      const { adapter } = host({}, { uploadUrl: '/api/uploads' });
      const progress: number[] = [];
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      const result = await adapter.upload(
        file,
        'image',
        (fraction) => progress.push(fraction),
        new AbortController().signal,
      );
      expect(result).toMatchObject({ key: 'email-image/a.png', url: 'https://cdn.test/a.png' });
      expect(sent.url).toBe('/api/uploads');
      expect(sent.form?.get('kind')).toBe('image');
      expect((sent.form?.get('file') as File).name).toBe('a.png');
      expect(progress).toEqual([0.5, 1]);
    });

    it('413 and 415 become a message', async () => {
      stubXhr(413, {});
      const { adapter } = host({}, { uploadUrl: '/api/uploads' });
      await expect(
        adapter.upload(
          new File(['x'], 'big.png'),
          'image',
          () => undefined,
          new AbortController().signal,
        ),
      ).rejects.toThrow('too large');
      stubXhr(415, { message: 'Only pictures.' });
      await expect(
        adapter.upload(
          new File(['x'], 'a.exe'),
          'image',
          () => undefined,
          new AbortController().signal,
        ),
      ).rejects.toThrow('Only pictures.');
    });

    it('without uploadUrl or upload, says how to set it up', async () => {
      const { adapter } = host({});
      await expect(
        adapter.upload(
          new File(['x'], 'a.png'),
          'image',
          () => undefined,
          new AbortController().signal,
        ),
      ).rejects.toThrow('uploadUrl');
    });
  });
});
