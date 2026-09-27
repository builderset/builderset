import type { Issue } from '@motors/builder-core';
import { describe, expect, it } from 'vitest';

import { createEmailRegistry } from './blocks';
import { googleFontsUrl } from './fonts';
import { importEmailHtml } from './import-html';
import { checkEmail } from './validate';

const registry = createEmailRegistry();
const errors = (issues: Issue[]) => issues.filter((issue) => issue.severity === 'error');

/** A typical table-built marketing email, as a designer's tool exports it. */
const HTML = `<!DOCTYPE html>
<html><head><title>Spring offers</title><style>.x{color:red}</style>
<script>alert('no')</script></head>
<body style="background-color:#eef2ff" bgcolor="#eef2ff">
<table width="100%" role="presentation"><tr><td align="center">
  <table width="600">
    <tr><td align="center"><a href="https://shop.test"><img src="https://cdn.test/logo.png" alt="Shop" width="140"></a></td></tr>
    <tr><td style="background-color:#111827">
      <h1 style="color:#ffffff;font-size:32px;font-family:Montserrat, Arial;text-align:center">Hello {{ recipient.name }}!</h1>
      <p style="color:#e5e7eb">Our <strong>spring</strong> sale starts <a href="https://shop.test/sale">today</a>.<br>Don't miss it.</p>
      <table><tr><td align="center" bgcolor="#2563eb" style="border-radius:6px">
        <a href="https://shop.test/sale" style="display:inline-block;padding:12px 24px;color:#ffffff;background-color:#2563eb">Shop now</a>
      </td></tr></table>
    </td></tr>
    <tr>
      <td width="50%"><img src="https://cdn.test/a.jpg" alt="A"><p>Left column</p></td>
      <td width="50%"><img src="https://cdn.test/b.jpg" alt="B"><p>Right column</p></td>
    </tr>
    <tr><td><ul><li>One</li><li>Two <em>items</em></li></ul><hr><p onclick="evil()" style="font-size:12px">Unsubscribe <a href="javascript:alert(1)">here</a></p></td></tr>
  </table>
</td></tr></table>
</body></html>`;

describe('importEmailHtml', () => {
  const result = importEmailHtml(HTML, registry);
  const nodes = Object.values(result.document.nodes);
  const of = (type: string) => nodes.filter((node) => node.type === type);
  const first = (type: string) => {
    const found = of(type)[0];
    if (!found) throw new Error(`no ${type}`);
    return found;
  };

  it('rebuilds the email out of our blocks, valid', () => {
    expect(
      errors(
        checkEmail(
          { ...result.document, meta: { ...result.document.meta, subject: 'x' } },
          registry,
        ),
      ),
    ).toEqual([]);
    expect(result.document.meta.subject).toBe('Spring offers');
    expect(result.document.settings.backdrop).toBe('#eef2ff');
    expect(of('heading')).toHaveLength(1);
    expect(of('button')).toHaveLength(1);
    expect(of('image')).toHaveLength(3);
    expect(of('list')).toHaveLength(1);
    expect(of('divider')).toHaveLength(1);
  });

  it('keeps styles that map onto block settings', () => {
    const heading = first('heading');
    expect(heading.props.color).toBe('#ffffff');
    expect(heading.props.size).toBe(32);
    expect(heading.props.align).toBe('center');
    expect(heading.props.font).toBe('montserrat');
    const button = first('button');
    expect(button.props.label).toBe('Shop now');
    expect(button.props.background).toBe('#2563eb');
    expect(button.props.radius).toBe(6);
  });

  it('turns {{ variables }} into variable runs and keeps marks and links', () => {
    const heading = first('heading');
    const runs = heading.props.text as {
      text: string;
      marks?: { type: string; path?: string }[];
    }[];
    expect(
      runs.some((run) =>
        run.marks?.some((mark) => mark.type === 'variable' && mark.path === 'recipient.name'),
      ),
    ).toBe(true);
    const text = of('text').find((node) => JSON.stringify(node.props.text).includes('spring'));
    expect(JSON.stringify(text?.props.text)).toContain('"type":"bold"');
    expect(JSON.stringify(text?.props.text)).toContain('https://shop.test/sale');
  });

  it('keeps a font set on part of a text', () => {
    const imported = importEmailHtml(
      `<p>Plain and <span style="font-family: 'Playfair Display', serif">elegant</span></p>`,
      registry,
    );
    const text = Object.values(imported.document.nodes).find((node) => node.type === 'text');
    expect(JSON.stringify(text?.props.text)).toContain('"family":"playfair-display"');
  });

  it('lays side-by-side cells out as a row of columns', () => {
    const twoColumn = of('row').find((row) => row.props.layout === '50-50');
    expect(twoColumn?.children).toHaveLength(2);
  });

  it('keeps nothing unsafe: no scripts, handlers or javascript: links', () => {
    const serialized = JSON.stringify(result.document);
    expect(serialized).not.toContain('alert');
    expect(serialized).not.toContain('evil');
    expect(serialized).not.toContain('javascript:');
  });

  it('lists the images to bring into our storage', () => {
    expect(result.images.map((image) => image.src)).toEqual([
      'https://cdn.test/logo.png',
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
    ]);
    const logo = result.document.nodes[result.images[0]?.nodeId ?? ''];
    expect(logo?.props.href).toBe('https://shop.test');
  });
});

describe('fonts', () => {
  it('builds one Google Fonts URL for the web fonts used', () => {
    expect(googleFontsUrl(['system', 'georgia'])).toBeNull();
    const url = googleFontsUrl(['inter', 'playfair-display', 'inter']);
    expect(url).toContain('family=Inter:wght@');
    expect(url).toContain('family=Playfair+Display:wght@');
    expect(url?.match(/family=/g)).toHaveLength(2);
  });
});
