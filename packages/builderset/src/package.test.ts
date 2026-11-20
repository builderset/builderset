import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { generated } from '../scripts/generate.mjs';

const read = (path: string) =>
  readFileSync(new URL(`./${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('the re-export files', () => {
  let files = new Map<string, string>();
  beforeAll(async () => {
    files = await generated();
  }, 60_000);

  it('are what scripts/generate.mjs writes — none edited by hand, none stale', () => {
    expect(files.size).toBeGreaterThan(0);
    for (const [path, text] of files) expect(read(path), path).toBe(text);
  });

  it("start with 'use client' on a client door, and only there", () => {
    for (const path of files.keys()) {
      // The form's render door is the working form, with its own state.
      const client = /\/(editor|ui)\.ts$/.test(path) || path === 'form/render.ts';
      expect(/^(\/\/[^\n]*\n)*'use client';/.test(read(path)), path).toBe(client);
      expect(read(path), path).not.toMatch(/export \*/);
    }
  });
});

describe('the doors', () => {
  it('load on a server, in plain Node', async () => {
    const email = await import('builderset/email/render');
    const article = await import('builderset/article');
    const host = await import('builderset/engine/host');
    const sq = await import('builderset/email/locales/sq');
    expect(typeof email.renderEmail).toBe('function');
    expect(typeof article.createArticleRegistry).toBe('function');
    expect(typeof host.createRestHost).toBe('function');
    expect(sq.default.code).toBe('sq');
  });

  it('has no root entry: the path says which side the code is for', async () => {
    // In a variable, so the test runner resolves it when it runs, as a project would.
    const name = 'builderset';
    await expect(import(/* @vite-ignore */ name)).rejects.toThrow(/not exported|not defined/);
  });
});
