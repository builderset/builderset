import * as form from '@builderset/form';
import * as host from '@builderset/form/host';
import { formWords } from '@builderset/form/render';
import { describe, expect, it } from 'vitest';

/**
 * The entries a server imports load in plain Node: no `window`, no
 * `document`. The imports above are the test — a module that touched the DOM
 * while loading would fail this file before any test ran. A server checks
 * what a visitor sent with the same rules as the form in the browser.
 */
describe('on a server', () => {
  const registry = form.createFormRegistry();
  const doc = form.buildForm(registry, { stable: true }, [
    form.step('Contact', [
      form.field('email', { label: 'Email', key: 'email', required: true }),
      form.field('consent', { label: 'Consent', key: 'consent' }),
    ]),
  ]);

  it('checks a submission', () => {
    expect(typeof window).toBe('undefined');
    const refused = form.validateAnswers(doc, { email: 'nope' });
    expect(refused.ok).toBe(false);
    expect(refused.errors.email?.code).toBe('email');
    expect(formWords('sq').errors.required()).toBe('Plotësoni këtë fushë.');

    const accepted = form.validateAnswers(doc, {
      email: 'ana@example.com',
      consent: true,
      extra: 1,
    });
    expect(accepted).toEqual({
      ok: true,
      errors: {},
      values: { email: 'ana@example.com', consent: true },
    });
  });

  it('loads the host entry', () => {
    expect(typeof host.createRestHost).toBe('function');
  });
});
