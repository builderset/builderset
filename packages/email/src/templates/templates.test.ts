import { templateFragment } from '@builderset/engine/editor';
import { describe, expect, it } from 'vitest';

import { checkEmail, createEmailRegistry, variablesOf } from '../core';
import {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATES,
  buildTemplateEmail,
  toTemplateSpec,
} from './index';

const registry = createEmailRegistry();
const system = new Set(variablesOf(null).map((variable) => variable.path));

/** What a template may still be flagged for: an image not chosen, a variable its type declares. */
const EXPECTED = new Set(['media.missing', 'variable.unknown']);

describe('email templates', () => {
  it('have unique ids', () => {
    const ids = EMAIL_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each sit in a listed category, and every category has three or more', () => {
    const listed = new Set<string>(EMAIL_TEMPLATE_CATEGORIES.map((category) => category.id));
    for (const template of EMAIL_TEMPLATES) expect(listed.has(template.category)).toBe(true);
    for (const category of EMAIL_TEMPLATE_CATEGORIES) {
      const count = EMAIL_TEMPLATES.filter((template) => template.category === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(3);
    }
  });

  describe.each(EMAIL_TEMPLATES.map((template) => [template.id, template] as const))(
    '%s',
    (_id, template) => {
      it('builds as a document: every block an element, with props its schema accepts', () => {
        expect(() => buildTemplateEmail(registry, template, { stable: true })).not.toThrow();
      });

      it('builds in the editor as the same tree', () => {
        const fragment = templateFragment(registry, toTemplateSpec(template).blocks);
        const doc = buildTemplateEmail(registry, template, { stable: true });
        expect(Object.keys(fragment.nodes).length).toBe(Object.keys(doc.nodes).length - 1);
      });

      it('passes the checks, but for its own variables and images to choose', () => {
        const doc = buildTemplateEmail(registry, template, { stable: true });
        const issues = checkEmail(doc, registry, null).filter((issue) => !EXPECTED.has(issue.code));
        expect(issues).toEqual([]);
      });

      it('lists the variables it uses beyond the system ones', () => {
        const doc = buildTemplateEmail(registry, template, { stable: true });
        const used = new Set<string>();
        const text = JSON.stringify(doc);
        for (const match of text.matchAll(/\{\{\s*([a-z_][a-z0-9_.]*)/g)) used.add(match[1] ?? '');
        // A variable run names its `path`; a line-items table or a repeat its
        // `list`; a condition the `var` it tests.
        for (const match of text.matchAll(/"(?:path|list|var)":"([a-z_][a-z0-9_.]*)"/g))
          used.add(match[1] ?? '');
        const own = [...used].filter(
          (path) => !system.has(path) && path !== 'now' && !path.startsWith('item.'),
        );
        expect(new Set(own)).toEqual(new Set(template.variables ?? []));
      });
    },
  );
});
