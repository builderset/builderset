import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { afterAll, describe, expect, it } from 'vitest';

import { POST as create } from '@/app/api/emails/route';
import { GET as read } from '@/app/api/emails/[id]/route';
import { PUT as saveDraft } from '@/app/api/emails/[id]/draft/route';
import { POST as publish } from '@/app/api/emails/[id]/publish/route';
import { POST as unpublish } from '@/app/api/emails/[id]/unpublish/route';
import { POST as send } from '@/app/api/emails/[id]/send/route';
import { POST as upload } from '@/app/api/uploads/route';
import { GET as download } from '@/app/api/uploads/[...key]/route';
import { db } from '@/lib/db';

// The email kit's own fixtures: a valid starter, and invalid documents with
// the issue code each must be refused with.
const fixture = createRequire(import.meta.url);
const readFixture = (name: string): unknown =>
  JSON.parse(readFileSync(fixture.resolve(`@builderset/email/fixtures/${name}`), 'utf8'));
const starter = readFixture('valid/starter.json') as { meta: Record<string, string> };
const invalid = readFixture('invalid/manifest.json') as Record<string, string>;

const call = (body: unknown, method = 'POST') =>
  new Request('http://localhost/api', { method, body: JSON.stringify(body) });
const at = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

afterAll(() => db.$client.end());

describe('an email template, through the routes the editor calls', () => {
  it('is created, saved, conflicts, published and sent', async () => {
    const created = await create(call({ name: 'Welcome', document: starter }));
    expect(created.status).toBe(201);
    const { id, saved_at: firstSave } = (await created.json()) as { id: number; saved_at: string };

    const edited = {
      ...starter,
      meta: { ...starter.meta, subject: 'Welcome, {{ recipient.name }}' },
    };
    const saved = await saveDraft(
      call({ document: edited, reason: 'autosave', expected_saved_at: firstSave }, 'PUT'),
      at(id),
    );
    expect(saved.status).toBe(200);
    const { saved_at: secondSave } = (await saved.json()) as { saved_at: string };
    expect(secondSave).not.toBe(firstSave);

    // Another editor still holding the first save's time.
    const stale = await saveDraft(
      call({ document: edited, reason: 'manual', expected_saved_at: firstSave }, 'PUT'),
      at(id),
    );
    expect(stale.status).toBe(409);

    // Not published yet: nothing is sent.
    expect((await send(call({ data: {} }), at(id))).status).toBe(409);

    const published = await publish(call({ document: edited, scheduled_at: null }), at(id));
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ status: 'published' });

    const record = await (await read(new Request('http://localhost'), at(id))).json();
    expect(record).toMatchObject({ status: 'published', draft_document: null });
    expect(record.document.meta.subject).toBe('Welcome, {{ recipient.name }}');

    const sent = await send(call({ data: { recipient: { name: 'Ana' } } }), at(id));
    expect(sent.status).toBe(200);
    const email = (await sent.json()) as { subject: string; html: string; text: string };
    expect(email.subject).toBe('Welcome, Ana');
    expect(email.html).toContain('Hello Ana');
    expect(email.text).toMatch(/hello ana/i);

    const unpublished = await unpublish(new Request('http://localhost'), at(id));
    expect(await unpublished.json()).toMatchObject({ status: 'draft' });
  });

  it.each(Object.entries(invalid))('refuses %s with %s', async (file, code) => {
    const created = await create(call({ name: 'Refused', document: starter }));
    const { id } = (await created.json()) as { id: number };
    const refused = await saveDraft(
      call({ document: readFixture(`invalid/${file}`), expected_saved_at: null }, 'PUT'),
      at(id),
    );
    expect(refused.status).toBe(422);
    const { issues } = (await refused.json()) as { issues: { code: string }[] };
    expect(issues.map((issue) => issue.code)).toContain(code);
  });

  it('saves an unfinished draft, but does not publish it', async () => {
    const created = await create(call({ name: 'Unfinished', document: starter }));
    const { id } = (await created.json()) as { id: number };
    const unfinished = { ...starter, meta: { ...starter.meta, subject: '' } };
    expect((await saveDraft(call({ document: unfinished }, 'PUT'), at(id))).status).toBe(200);
    const refused = await publish(call({ document: unfinished }), at(id));
    expect(refused.status).toBe(422);
    expect(await refused.json()).toMatchObject({ issues: [{ code: 'meta.subjectMissing' }] });
  });

  it('answers 404 for a template that does not exist', async () => {
    expect((await read(new Request('http://localhost'), at(999_999_999))).status).toBe(404);
    expect((await read(new Request('http://localhost'), at('not-a-number'))).status).toBe(404);
  });
});

describe('uploads', () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const form = (bytes: BlobPart, name: string) => {
    const body = new FormData();
    body.append('file', new File([bytes], name));
    body.append('kind', 'image');
    return new Request('http://localhost/api/uploads', { method: 'POST', body });
  };

  it('stores an image under a key of its own and serves it', async () => {
    const answer = await upload(form(PNG, 'logo.png'));
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
    const answer = await upload(form(new TextEncoder().encode('<script>'), 'photo.png'));
    expect(answer.status).toBe(415);
  });
});
