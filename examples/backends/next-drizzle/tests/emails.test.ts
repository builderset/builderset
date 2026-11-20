import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as list, POST as create } from '@/app/api/emails/route';
import { DELETE as remove, GET as read } from '@/app/api/emails/[id]/route';
import { GET as activity } from '@/app/api/emails/[id]/activity/route';
import { PUT as saveDraft } from '@/app/api/emails/[id]/draft/route';
import { POST as publish } from '@/app/api/emails/[id]/publish/route';
import { POST as restore } from '@/app/api/emails/[id]/restore/route';
import { GET as revisions, POST as nameRevision } from '@/app/api/emails/[id]/revisions/route';
import { GET as revision } from '@/app/api/emails/[id]/revisions/[rid]/route';
import { POST as send } from '@/app/api/emails/[id]/send/route';
import { POST as unpublish } from '@/app/api/emails/[id]/unpublish/route';
import { POST as upload } from '@/app/api/uploads/route';
import { GET as download } from '@/app/api/uploads/[...key]/route';
import { appUser, type AppUser } from '@/db/schema';
import { db } from '@/lib/db';

// The email kit's own fixtures: a valid starter, and invalid documents with
// the issue code each must be refused with.
const fixture = createRequire(import.meta.url);
const readFixture = (name: string): unknown =>
  JSON.parse(readFileSync(fixture.resolve(`@builderset/email/fixtures/${name}`), 'utf8'));
const starter = readFixture('valid/starter.json') as { meta: Record<string, string> };
const invalid = readFixture('invalid/manifest.json') as Record<string, string>;

/** The starter with other meta: a name, a subject. */
const documentWith = (meta: Record<string, string>) => ({
  ...starter,
  meta: { ...starter.meta, ...meta },
});

// The signed-in user, sent in the stand-in auth's X-User-Id header.
let ana: AppUser;
beforeAll(async () => {
  [ana] = (await db
    .insert(appUser)
    .values({ email: `ana-${randomUUID()}@example.com`, name: 'Ana' })
    .returning()) as [AppUser];
});
afterAll(() => db.$client.end());

const call = (body?: unknown, method = 'POST', search = '', user: AppUser | null = ana) =>
  new Request(`http://localhost/api${search}`, {
    method,
    headers: user ? { 'x-user-id': user.uuid } : {},
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const get = (search = '') => call(undefined, 'GET', search);
const root = { params: Promise.resolve({}) };
const at = (id: string) => ({ params: Promise.resolve({ id }) });

interface Row {
  id: string;
  saved_at: string;
  status: string;
  [field: string]: unknown;
}

async function newTemplate(meta: Record<string, string>, typeKey: string | null = null) {
  const created = await create(call({ document: documentWith(meta), type_key: typeKey }), root);
  expect(created.status).toBe(201);
  return (await created.json()) as Row;
}

const timelineOf = async (id: string) =>
  ((await (await activity(get(), at(id))).json()) as { action: string }[]).map(
    (entry) => entry.action,
  );

describe('an email template, through the routes the editor calls', () => {
  it('is created, saved, conflicts, published and sent', async () => {
    const created = await newTemplate({ name: 'Welcome' });
    expect(created).toMatchObject({
      name: 'Welcome',
      status: 'draft',
      version: 0,
      created_by: { id: ana.uuid, name: 'Ana' },
    });
    const { id, saved_at: firstSave } = created;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const edited = documentWith({ name: 'Welcome', subject: 'Welcome, {{ recipient.name }}' });
    const saved = await saveDraft(
      call({ document: edited, reason: 'autosave', expected_saved_at: firstSave }, 'PUT'),
      at(id),
    );
    expect(saved.status).toBe(200);
    const { saved_at: secondSave } = (await saved.json()) as { saved_at: string };
    expect(secondSave).not.toBe(firstSave);

    // A save that names no saved_at cannot tell what it overwrites.
    const blind = await saveDraft(call({ document: edited, reason: 'manual' }, 'PUT'), at(id));
    expect(blind.status).toBe(409);

    // Another editor still holding the first save's time.
    const stale = await saveDraft(
      call({ document: edited, reason: 'manual', expected_saved_at: firstSave }, 'PUT'),
      at(id),
    );
    expect(stale.status).toBe(409);

    const manual = await saveDraft(
      call({ document: edited, reason: 'manual', expected_saved_at: secondSave }, 'PUT'),
      at(id),
    );
    expect(manual.status).toBe(200);

    // Not published yet: nothing is sent.
    expect((await send(call({ data: {} }), at(id))).status).toBe(409);

    const published = await publish(call({ document: edited, scheduled_at: null }), at(id));
    expect(published.status).toBe(200);
    const { saved_at: publishedAt } = (await published.json()) as Row;

    const record = (await (await read(get(), at(id))).json()) as Row & {
      document: { meta: { subject: string } };
    };
    expect(record).toMatchObject({
      status: 'published',
      draft_document: null,
      version: 1,
      published_by: { id: ana.uuid, name: 'Ana' },
      updated_by: { id: ana.uuid, name: 'Ana' },
    });
    expect(record.document.meta.subject).toBe('Welcome, {{ recipient.name }}');
    // updated_at follows every write by itself.
    expect(record.updated_at).not.toBe(record.created_at);

    const sent = await send(call({ data: { recipient: { name: 'Ana' } } }), at(id));
    expect(sent.status).toBe(200);
    const email = (await sent.json()) as { subject: string; html: string; text: string };
    expect(email.subject).toBe('Welcome, Ana');
    expect(email.html).toContain('Hello Ana');
    expect(email.text).toMatch(/hello ana/i);

    // Only the status changes: the document, and so saved_at, stay.
    const unpublished = await unpublish(call(), at(id));
    expect(await unpublished.json()).toMatchObject({ status: 'draft', saved_at: publishedAt });
  });

  it('records a revision and an activity for every manual save and publish', async () => {
    const { id, saved_at: savedAt } = await newTemplate({ name: 'Receipt' });
    const document = documentWith({ name: 'Receipt', subject: 'Your receipt' });
    const autosave = { document, reason: 'autosave', expected_saved_at: savedAt };
    expect((await saveDraft(call(autosave, 'PUT'), at(id))).status).toBe(200);
    // "Keep mine": saved over the autosave, whose saved_at it never saw.
    const keepMine = { document, reason: 'manual', expected_saved_at: savedAt, force: true };
    expect((await saveDraft(call(keepMine, 'PUT'), at(id))).status).toBe(200);
    expect((await publish(call({ document }), at(id))).status).toBe(200);

    // The autosave left no trace but the draft.
    const versions = (await (await revisions(get(), at(id))).json()) as Row[];
    expect(versions).toMatchObject([
      { kind: 'publish', version: 1, author: 'Ana' },
      { kind: 'manual', version: 0, author: 'Ana' },
    ]);
    const one = await revision(get(), {
      params: Promise.resolve({ id, rid: versions[0].id }),
    });
    expect(await one.json()).toMatchObject({ document: { meta: { subject: 'Your receipt' } } });

    const timeline = (await (await activity(get(), at(id))).json()) as Row[];
    expect(timeline).toMatchObject([
      { action: 'published', from_status: 'draft', to_status: 'published', actor: { name: 'Ana' } },
      { action: 'saved', details: { revision: versions[1].id } },
      { action: 'created', to_status: 'draft' },
    ]);
  });

  it('keeps a named version', async () => {
    const { id } = await newTemplate({ name: 'Newsletter' });
    const named = await nameRevision(
      call({ document: documentWith({ name: 'Newsletter' }), label: 'Before the legal review' }),
      at(id),
    );
    expect(named.status).toBe(201);
    expect(await (await revisions(get(), at(id))).json()).toMatchObject([
      { kind: 'manual', label: 'Before the legal review', author: 'Ana' },
    ]);
  });

  it('publishes one active design per email type', async () => {
    const first = await newTemplate({ name: 'Reset, old' }, 'password_reset');
    const second = await newTemplate({ name: 'Reset, new' }, 'password_reset');
    await publish(call({ document: documentWith({ name: 'Reset, old' }) }), at(first.id));
    await publish(call({ document: documentWith({ name: 'Reset, new' }) }), at(second.id));
    expect(await (await read(get(), at(first.id))).json()).toMatchObject({ status: 'draft' });
    const [latest] = (await (await activity(get(), at(first.id))).json()) as Row[];
    expect(latest).toMatchObject({ action: 'unpublished', details: { replaced_by: second.id } });
  });

  it.each(Object.entries(invalid))('refuses %s with %s', async (file, code) => {
    const { id } = await newTemplate({ name: 'Refused' });
    const refused = await saveDraft(
      call({ document: readFixture(`invalid/${file}`), expected_saved_at: null }, 'PUT'),
      at(id),
    );
    expect(refused.status).toBe(422);
    const { issues } = (await refused.json()) as { issues: { code: string }[] };
    expect(issues.map((issue) => issue.code)).toContain(code);
  });

  it('saves an unfinished draft, but does not publish it', async () => {
    const { id, saved_at: savedAt } = await newTemplate({ name: 'Unfinished' });
    const unfinished = documentWith({ subject: '' });
    const draft = { document: unfinished, expected_saved_at: savedAt };
    expect((await saveDraft(call(draft, 'PUT'), at(id))).status).toBe(200);
    const refused = await publish(call({ document: unfinished }), at(id));
    expect(refused.status).toBe(422);
    expect(await refused.json()).toMatchObject({ issues: [{ code: 'meta.subjectMissing' }] });
  });

  it('answers 404 for a template that does not exist, and 401 to nobody', async () => {
    expect((await read(get(), at(randomUUID()))).status).toBe(404);
    expect((await read(get(), at('42'))).status).toBe(404);
    const { id } = await newTemplate({ name: 'Private' });
    expect((await read(call(undefined, 'GET', '', null), at(id))).status).toBe(401);
  });
});

describe('the trash', () => {
  it('takes a draft, not a published template, and gives it back', async () => {
    const { id } = await newTemplate({ name: 'Farewell' });
    await publish(call({ document: documentWith({ name: 'Farewell' }) }), at(id));
    expect((await remove(call(undefined, 'DELETE'), at(id))).status).toBe(409);

    await unpublish(call(), at(id));
    expect((await remove(call(undefined, 'DELETE'), at(id))).status).toBe(204);

    // Deleted: a 404 everywhere but restore, and in the trash instead of the list.
    expect((await read(get(), at(id))).status).toBe(404);
    expect((await saveDraft(call({ document: starter }, 'PUT'), at(id))).status).toBe(404);
    const live = (await (await list(get('?q=Farewell'), root)).json()) as { items: Row[] };
    expect(live.items.map((item) => item.id)).not.toContain(id);
    const trash = (await (await list(get('?deleted=true&q=Farewell'), root)).json()) as {
      items: Row[];
    };
    expect(trash.items.find((item) => item.id === id)).toMatchObject({
      deleted_by: { id: ana.uuid, name: 'Ana' },
    });

    const restored = await restore(call(), at(id));
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ id, deleted_at: null, deleted_by: null });
    expect((await restore(call(), at(id))).status).toBe(404);
    expect(await timelineOf(id)).toEqual([
      'restored',
      'deleted',
      'unpublished',
      'published',
      'created',
    ]);
  });
});

describe('the list', () => {
  it('finds by name, a page at a time, with the total', async () => {
    const tag = randomUUID().slice(0, 8);
    for (const n of [1, 2, 3]) await newTemplate({ name: `Promo ${tag} ${String(n)}` });
    const page = (await (await list(get(`?q=${tag}&limit=2`), root)).json()) as {
      items: Row[];
      total: number;
    };
    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.name)).toEqual([`Promo ${tag} 3`, `Promo ${tag} 2`]);
    expect(page.items[0]).toMatchObject({ status: 'draft', updated_by: { name: 'Ana' } });
  });
});

describe('uploads', () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const form = (bytes: BlobPart, name: string) => {
    const body = new FormData();
    body.append('file', new File([bytes], name));
    body.append('kind', 'image');
    return new Request('http://localhost/api/uploads', {
      method: 'POST',
      headers: { 'x-user-id': ana.uuid },
      body,
    });
  };

  it('stores an image under a key of its own and serves it', async () => {
    const answer = await upload(form(PNG, 'logo.png'), root);
    expect(answer.status).toBe(201);
    const { key, mime } = (await answer.json()) as { key: string; mime: string };
    expect(key).toMatch(/^emails\/[0-9a-f-]+\.png$/);
    expect(mime).toBe('image/png');
    const served = await download(new Request('http://localhost'), {
      params: Promise.resolve({ key: key.split('/') }),
    });
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG);
  });

  it('knows a file by its bytes, not its name', async () => {
    const answer = await upload(form(new TextEncoder().encode('<script>'), 'photo.png'), root);
    expect(answer.status).toBe(415);
  });
});
