import * as email from '@builderset/email';
import * as host from '@builderset/email/host';
import { renderEmail } from '@builderset/email/render';
import { describe, expect, it } from 'vitest';

/**
 * The entries a server imports load in plain Node: no `window`, no
 * `document`, no `DOMParser` (docs/plan/steps/07). The imports
 * above are the test — a module that touched the DOM while loading would fail
 * this file before any test ran.
 */
describe('on a server', () => {
  it('renders an email', () => {
    expect(typeof window).toBe('undefined');
    const registry = email.createEmailRegistry();
    const doc = email.starterEmail(registry, { subject: 'Hi {{ recipient.name }}' }, true);
    const rendered = renderEmail(doc, {
      assetUrl: (key) => `https://cdn.test/${key}`,
      data: { recipient: { name: 'Arta' } },
      locale: 'en',
    });
    expect(rendered.subject).toBe('Hi Arta');
    expect(rendered.html).toContain('<!DOCTYPE html>');
  });

  it('refuses to guess a parser for imported HTML', () => {
    expect(() => email.importEmailHtml('<p>Hi</p>', email.createEmailRegistry())).toThrow(
      '{ parser }',
    );
  });

  it('loads the host entry', () => {
    expect(typeof host.createRestHost).toBe('function');
  });
});
