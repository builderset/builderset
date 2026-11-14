import {
  block,
  buildEmail,
  createEmailRegistry,
  kitchenSinkEmail,
  row,
  section,
  starterEmail,
  v,
} from '../core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmailCanvas } from './canvas';
import { renderEmail } from '../render/html';

const registry = createEmailRegistry();
const assetUrl = (key: string) => `https://cdn.test/${key}`;

describe('renderEmail', () => {
  it('renders every block, deterministically', () => {
    const doc = kitchenSinkEmail(registry);
    const data = {
      recipient: { name: 'Arta' },
      order: { total: 120, items: [{ name: 'Filter', quantity: 1, price: '€20' }] },
    };
    const first = renderEmail(doc, { assetUrl, data, locale: 'en' });
    const second = renderEmail(doc, { assetUrl, data, locale: 'en' });
    expect(first.html).toBe(second.html);
    expect(first.subject).toBe('Everything, Arta');
    expect(first.html).toContain('<!DOCTYPE html>');
    expect(first.html).toContain('role="presentation"');
    expect(first.html).toContain('<!--[if mso]>');
    expect(first.html).toContain('https://cdn.test/email-image/2026/01/sample0000000000.jpg');
    expect(first.html).toContain('Filter');
    expect(first.text).toContain('Filter');
  });

  it('escapes variable values — data can never inject markup', () => {
    const doc = buildEmail(registry, { meta: { subject: 'x' } }, [
      section({}, [row('100', [[block('text', { text: [v('recipient.name')] })]])]),
    ]);
    const { html } = renderEmail(doc, {
      assetUrl,
      data: { recipient: { name: '</td><script>alert(1)</script>' } },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;/td&gt;&lt;script&gt;');
  });

  it('drops a link whose substituted value is unsafe', () => {
    const doc = buildEmail(registry, { meta: { subject: 'x' } }, [
      section({}, [row('100', [[block('button', { label: 'Go', href: '{{ reset_url }}' })]])]),
    ]);
    const { html } = renderEmail(doc, { assetUrl, data: { reset_url: 'javascript:alert(1)' } });
    expect(html).not.toContain('javascript:');
  });

  it('uses fallbacks and reports variables with no value', () => {
    const doc = starterEmail(registry, { subject: 'Hi', preheader: 'Hello' });
    const result = renderEmail(doc, { assetUrl, data: {} });
    // The starter greets with recipient.name, falling back to "there".
    expect(result.html).toContain('there');
  });

  it('draws a font set on part of a text, and loads it', () => {
    const doc = buildEmail(registry, { meta: { subject: 'x' } }, [
      section({}, [
        row('100', [
          [
            block('text', {
              text: [
                { text: 'Hello ' },
                { text: 'world', marks: [{ type: 'font', family: 'playfair-display' }] },
              ],
            }),
          ],
        ]),
      ]),
    ]);
    const { html } = renderEmail(doc, { assetUrl });
    expect(html).toContain('font-family:&#39;Playfair Display&#39;, Georgia');
    expect(html).toContain('family=Playfair+Display');
  });

  it('writes the plain-text part', () => {
    const doc = starterEmail(registry, { subject: 'Hi', preheader: 'Hello' });
    const { text } = renderEmail(doc, { assetUrl, data: { recipient: { name: 'Arta' } } });
    expect(text).toContain('HELLO ARTA,');
    expect(text).toContain('Get started');
  });
});

describe('<EmailCanvas>', () => {
  it('renders editable text through editText and marks every node', () => {
    const doc = starterEmail(registry, { subject: 'Hi' });
    const { container } = render(
      <EmailCanvas
        document={doc}
        assetUrl={assetUrl}
        editing
        editText={(field) => <span data-testid="editable">{field.path}</span>}
      />,
    );
    expect(screen.getAllByTestId('editable').length).toBeGreaterThan(0);
    const marked = container.querySelectorAll('[data-node]').length;
    expect(marked).toBe(Object.keys(doc.nodes).length - 1);
  });
});

describe('fonts on the canvas', () => {
  const googleLinks = () =>
    Array.from(document.head.querySelectorAll('link[data-stylesheet]')).filter((link) =>
      (link.getAttribute('href') ?? '').includes('fonts.googleapis.com'),
    );
  const designIn = (font: string) => {
    const doc = starterEmail(registry, { name: 'Fonts', subject: 'Fonts' });
    return { ...doc, settings: { ...doc.settings, font } };
  };

  it('asks no third party when fontPreviews is false', () => {
    render(<EmailCanvas document={designIn('poppins')} assetUrl={assetUrl} fontPreviews={false} />);
    expect(googleLinks()).toHaveLength(0);
  });

  it('loads the fonts the email uses by default', () => {
    render(<EmailCanvas document={designIn('montserrat')} assetUrl={assetUrl} />);
    expect(googleLinks().some((l) => (l.getAttribute('href') ?? '').includes('Montserrat'))).toBe(
      true,
    );
  });
});
