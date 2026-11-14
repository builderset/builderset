// Renders welcome.json to email HTML on stdout: plain Node, no bundler, no React.
import { readFileSync } from 'node:fs';

import { checkEmail, createEmailRegistry, isPublishBlocking, parseEmail } from '@builderset/email';
import { renderEmail } from '@builderset/email/render';

const registry = createEmailRegistry();
const stored = JSON.parse(readFileSync(new URL('./welcome.json', import.meta.url), 'utf8'));

const document = parseEmail(stored, registry); // null: not an email at all
if (!document) throw new Error('welcome.json is not an email');

const blocking = checkEmail(document, registry, null).filter(isPublishBlocking);
if (blocking.length) throw new Error(`Not ready to send: ${JSON.stringify(blocking)}`);

const { html } = renderEmail(document, {
  data: { recipient: { name: 'Ana' } },
  locale: 'en',
  assetUrl: (key) => `https://cdn.example.com/${key}`,
});
process.stdout.write(html);
