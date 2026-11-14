// The renderer, installed as a user installs it, against the golden files the
// package ships: the same document must give the same HTML and text.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderEmail, socialIconUrl } from '@builderset/email/render';

const golden = dirname(
  fileURLToPath(import.meta.resolve('@builderset/email/fixtures/golden/edges.json')),
);
const read = (name) => readFileSync(`${golden}/${name}`, 'utf8').replace(/\r\n/g, '\n');
const cases = readdirSync(golden)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length));

test('there are golden cases to compare with', () => {
  assert.ok(cases.length >= 5, `found ${cases.length}`);
});

for (const name of cases) {
  test(`renders ${name} exactly as the golden files`, () => {
    const input = JSON.parse(read(`${name}.json`));
    const rendered = renderEmail(input.document, {
      assetUrl: (key) => `${input.assetBase}${key}`,
      socialIcon: socialIconUrl(input.iconBase),
      brand: input.brand,
      data: input.data,
      locale: input.locale,
      currency: input.currency,
    });
    assert.equal(rendered.html, read(`${name}.html`));
    assert.equal(rendered.text, read(`${name}.txt`));
    assert.equal(rendered.subject, input.expected.subject);
  });
}

test('render.mjs prints an email', () => {
  const html = execFileSync(
    process.execPath,
    [fileURLToPath(new URL('./render.mjs', import.meta.url))],
    {
      encoding: 'utf8',
    },
  );
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /Ana/);
});
