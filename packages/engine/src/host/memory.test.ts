import { describe, expect, it, vi } from 'vitest';

import type { EngineDocument } from '../core';
import { createMemoryHost } from './memory';

const doc = (title: string): EngineDocument => ({
  schema: 'test/document',
  version: 1,
  root: 'root',
  nodes: { root: { id: 'root', type: 'root', v: 1, props: {}, children: [] } },
  meta: { title },
});

describe('createMemoryHost', () => {
  it('gives back what was saved, as a copy', async () => {
    const onSave = vi.fn<(document: EngineDocument, reason: string) => void>();
    const host = createMemoryHost({ onSave });
    const saved = doc('First');
    const result = await host.save(saved, 'autosave');
    expect(result.ok).toBe(true);
    expect(onSave).toHaveBeenCalledWith(saved, 'autosave');
    const loaded = await host.reload();
    expect(loaded).toEqual(saved);
    expect(loaded).not.toBe(saved);
  });

  it('lists a version saved by name, newest first, and opens it', async () => {
    const host = createMemoryHost();
    await host.saveRevision(doc('One'), 'First draft');
    await host.saveRevision(doc('Two'), 'Second draft');
    const revisions = await host.loadRevisions();
    expect(revisions.map((revision) => revision.label)).toEqual(['Second draft', 'First draft']);
    expect(revisions[0]).not.toHaveProperty('document');
    const id = revisions[1]?.id ?? '';
    expect((await host.loadRevision(id)).meta).toEqual({ title: 'One' });
  });

  it('records a version on a manual save and on publishing, and flips the status', async () => {
    const host = createMemoryHost();
    await host.save(doc('Draft'), 'manual');
    await host.publish(doc('Live'));
    expect(host.state.status).toBe('published');
    await host.publish(doc('Later'), '2030-01-01T09:00:00.000Z');
    expect(host.state).toMatchObject({
      status: 'scheduled',
      scheduledAt: '2030-01-01T09:00:00.000Z',
    });
    await host.unpublish();
    expect(host.state.status).toBe('draft');
    expect((await host.loadRevisions()).map((revision) => revision.kind)).toEqual([
      'publish',
      'publish',
      'manual',
    ]);
  });

  it('keeps saved sections', async () => {
    const host = createMemoryHost();
    const section = await host.saveSection('Hero', { roots: [], nodes: {} });
    expect(await host.loadSections()).toEqual([section]);
  });

  it('turns an upload into an object URL in three steps, and resolves only its own keys', async () => {
    const createObjectURL = vi.fn(() => 'blob:memory/1');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }));
    const host = createMemoryHost();
    const progress: number[] = [];
    const file = new File(['x'], 'car.jpg', { type: 'image/jpeg' });
    const uploaded = await host.upload(
      file,
      'image',
      (fraction) => progress.push(fraction),
      new AbortController().signal,
    );
    expect(progress).toEqual([1 / 3, 2 / 3, 1]);
    expect(uploaded).toMatchObject({ url: 'blob:memory/1', mime: 'image/jpeg', name: 'car.jpg' });
    expect(host.resolveMedia(uploaded.key)).toBe('blob:memory/1');
    expect(host.resolveMedia('elsewhere/a.jpg')).toBe('elsewhere/a.jpg');
    vi.unstubAllGlobals();
  });

  it('stops an upload that was cancelled', async () => {
    const host = createMemoryHost();
    const controller = new AbortController();
    controller.abort();
    await expect(
      host.upload(new File(['x'], 'a.png'), 'image', () => undefined, controller.signal),
    ).rejects.toThrow('cancelled');
  });

  it('says so when there is nothing to reload, and toasts to the console by default', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const host = createMemoryHost();
    await expect(host.reload()).rejects.toThrow('Nothing has been saved');
    host.toast('success', 'Saved');
    expect(info).toHaveBeenCalledWith('[success] Saved');
    info.mockRestore();
  });
});
