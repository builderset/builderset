import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { wrapChain, type Issue } from '@builderset/engine';
import { describe, expect, it } from 'vitest';

import { createEmailRegistry } from './blocks';
import { createEmailDocument, type EmailDocument } from './document';
import { EMAIL_DRAFT_TOLERATES, isDraftBlocking, isPublishBlocking } from './draft';
import { toEmailJSONSchema } from './json-schema';
import { v } from './rich-text';
import { block, buildEmail, kitchenSinkEmail, row, section, starterEmail } from './sample';
import { checkEmail } from './validate';
import type { EmailType } from './variables';

const registry = createEmailRegistry();
const errors = (issues: Issue[]) => issues.filter((issue) => issue.severity === 'error');
const codes = (issues: Issue[]) => errors(issues).map((issue) => issue.code);

const orderType: EmailType = {
  key: 'order_confirmation',
  label: { en: 'Order confirmation' },
  category: 'commerce',
  kind: 'transactional',
  variables: [
    {
      name: 'order',
      label: { en: 'Order' },
      type: 'string',
      children: [
        { name: 'total', label: { en: 'Total' }, type: 'money' },
        {
          name: 'items',
          label: { en: 'Items' },
          type: 'list',
          fields: [
            { name: 'name', label: { en: 'Name' }, type: 'string' },
            { name: 'quantity', label: { en: 'Qty' }, type: 'number' },
            { name: 'price', label: { en: 'Price' }, type: 'money' },
          ],
        },
      ],
    },
  ],
  samples: { default: {} },
};

const newsletterType: EmailType = {
  key: 'newsletter',
  label: { en: 'Newsletter' },
  category: 'marketing',
  kind: 'marketing',
  variables: [],
  samples: { default: {} },
};

describe('the email model', () => {
  it('builds a starter email with no errors', () => {
    const doc = starterEmail(registry, { subject: 'Welcome', preheader: 'Hi' });
    expect(errors(checkEmail(doc, registry))).toEqual([]);
  });

  it('accepts every standard block in the kitchen sink', () => {
    expect(errors(checkEmail(kitchenSinkEmail(registry), registry, orderType))).toEqual([]);
  });

  it('knows what to wrap a block in', () => {
    expect(wrapChain(registry, 'root', 'text')).toEqual(['section', 'row', 'column']);
    expect(wrapChain(registry, 'section', 'text')).toEqual(['row', 'column']);
    expect(wrapChain(registry, 'column', 'text')).toEqual([]);
  });

  it('refuses a row whose columns do not match its layout', () => {
    const doc = starterEmail(registry, { subject: 'x' }, true);
    const rowNode = Object.values(doc.nodes).find((node) => node.type === 'row');
    if (!rowNode) throw new Error('no row');
    rowNode.props.layout = '50-50';
    expect(codes(checkEmail(doc, registry))).toContain('row.columnsMismatch');
  });

  it('refuses variables the type does not have', () => {
    const doc = buildEmail(registry, { meta: { subject: 'Hi {{ nope.nothing }}' } }, [
      section({}, [row('100', [[block('text', { text: [v('order.total'), v('secret.key')] })]])]),
    ]);
    const found = checkEmail(doc, registry, orderType).filter(
      (issue) => issue.code === 'variable.unknown',
    );
    expect(found.map((issue) => issue.params?.variable).sort()).toEqual([
      'nope.nothing',
      'secret.key',
    ]);
  });

  it('requires a way to unsubscribe from marketing mail', () => {
    const doc = buildEmail(registry, { meta: { subject: 'News' } }, [
      section({}, [row('100', [[block('text')]])]),
    ]);
    expect(codes(checkEmail(doc, registry, newsletterType))).toContain(
      'compliance.unsubscribeMissing',
    );
  });
});

// ── The server contract, as files ─────────────────────────────────────────────

const root = join(
  dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
  '..',
);
const update = process.env.UPDATE_FIXTURES === '1';
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function expectFile(relative: string, content: string) {
  const path = join(root, relative);
  if (update) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return;
  }
  let committed = '';
  try {
    committed = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    throw new Error(`${relative} is missing — run with UPDATE_FIXTURES=1 and commit it.`);
  }
  expect(committed, `${relative} is stale — run with UPDATE_FIXTURES=1`).toBe(content);
}

/** This package's alone: a backend in another language keeps a copy of them. */
function expectFixture(relative: string, content: string) {
  expectFile(`fixtures/${relative}`, content);
}

function base(): EmailDocument {
  return buildEmail(registry, { meta: { subject: 'Broken on purpose' }, stable: true }, [
    section({}, [row('100', [[block('text')]])]),
  ]);
}

const INVALID: Record<string, { code: string; build: () => EmailDocument }> = {
  'unsafe-link': {
    code: 'url.unsafe',
    build: () => {
      const doc = base();
      const text = doc.nodes.n1;
      if (!text) throw new Error('no text');
      doc.nodes.n1 = {
        ...text,
        type: 'button',
        props: { ...registry.require('button').defaults(), href: 'javascript:alert(1)' },
      };
      return doc;
    },
  },
  'block-in-section': {
    code: 'placement.notAllowed',
    build: () => {
      const doc = base();
      doc.nodes.n4?.children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'text', v: 1, props: registry.require('text').defaults() };
      return doc;
    },
  },
  'unknown-block': {
    code: 'element.unknown',
    build: () => {
      const doc = base();
      doc.nodes.n2?.children?.push('n9');
      doc.nodes.n9 = { id: 'n9', type: 'marquee', v: 1, props: {} };
      return doc;
    },
  },
  orphan: {
    code: 'document.orphan',
    build: () => {
      const doc = base();
      doc.nodes.n9 = {
        id: 'n9',
        type: 'spacer',
        v: 1,
        props: registry.require('spacer').defaults(),
      };
      return doc;
    },
  },
};

describe('the server contract', () => {
  it('commits the JSON Schema', () => {
    const schema = stable(toEmailJSONSchema(registry));
    expectFile('schema/email.schema.json', schema);
  });

  it('commits the codes a draft may still carry', () => {
    // An unfinished design saves; an unsafe one never does.
    const draft = base();
    const unfinished = checkEmail({ ...draft, meta: { ...draft.meta, subject: '' } }, registry);
    expect(unfinished.some(isDraftBlocking)).toBe(false);
    expect(unfinished.some(isPublishBlocking)).toBe(true);
    const unsafe = checkEmail(INVALID['unsafe-link']?.build() ?? base(), registry);
    expect(unsafe.some(isDraftBlocking)).toBe(true);
    expectFixture('draft.json', stable({ tolerates: EMAIL_DRAFT_TOLERATES }));
  });

  it('commits valid fixtures', () => {
    const valid: Record<string, EmailDocument> = {
      'kitchen-sink': kitchenSinkEmail(registry),
      starter: starterEmail(registry, { name: 'Starter', subject: 'Hello', preheader: 'Hi' }, true),
      empty: { ...createEmailDocument({ subject: 'Empty' }) },
    };
    for (const [name, doc] of Object.entries(valid)) {
      expect(errors(checkEmail(doc, registry)), name).toEqual([]);
      expectFixture(`valid/${name}.json`, stable(doc));
    }
  });

  it('commits invalid fixtures, each refused with its code', () => {
    const manifest: Record<string, string> = {};
    for (const [name, { code, build }] of Object.entries(INVALID)) {
      const doc = build();
      expect(codes(checkEmail(doc, registry)), name).toContain(code);
      manifest[`${name}.json`] = code;
      expectFixture(`invalid/${name}.json`, stable(doc));
    }
    expectFixture('invalid/manifest.json', stable(manifest));
  });
});
