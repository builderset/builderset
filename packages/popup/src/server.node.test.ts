import * as popup from '@builderset/popup';
import * as host from '@builderset/popup/host';
import { popupWords } from '@builderset/popup/render';
import { describe, expect, it } from 'vitest';

/**
 * The entries a server imports load in plain Node: no `window`, no
 * `document`. The imports above are the test — a module that touched the DOM
 * while loading would fail this file before any test ran. A server decides
 * whether a popup shows and checks what a visitor sent with the same rules as
 * the popup in the browser.
 */
describe('on a server', () => {
  const registry = popup.createPopupRegistry();
  const doc = popup.buildPopup(
    registry,
    { format: { display: { pages: 'except', rules: ['/llogaria/*'] } }, stable: true },
    [
      popup.el('input', [24, 24, 272, 44], { name: 'email', label: 'Email', kind: 'email' }),
      popup.el('button', [24, 80, 272, 46], { text: 'Send', action: 'submit' }),
      popup.el('close', [478, 12, 30, 30]),
    ],
  );

  it('checks the popup and a submission', () => {
    expect(typeof window).toBe('undefined');
    expect(popup.checkPopup(doc, registry)).toEqual([]);
    const refused = popup.validateSubmission(doc, { email: 'nope' });
    expect(refused.errors.email?.code).toBe('email');
    expect(popupWords('sq').errors.required()).toBe('Plotësoni këtë fushë.');
    expect(popup.validateSubmission(doc, { email: ' ana@example.com ', extra: 1 })).toEqual({
      ok: true,
      errors: {},
      values: { email: 'ana@example.com' },
    });
  });

  it('decides where it shows', () => {
    const now = Date.UTC(2026, 10, 20);
    expect(popup.shouldShow(doc, { path: '/makina', device: 'mobile', now })).toBe(true);
    expect(popup.whyHidden(doc, { path: '/llogaria/profili', device: 'mobile', now })).toBe(
      'pages',
    );
  });

  it('loads the host entry', () => {
    expect(typeof host.createRestHost).toBe('function');
  });
});
