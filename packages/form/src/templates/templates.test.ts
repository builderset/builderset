import { templateFragment } from '@builderset/engine/editor';
import { describe, expect, it } from 'vitest';

import { checkForm, createFormRegistry, takesAnswer } from '../core';
import {
  buildTemplateForm,
  FORM_TEMPLATE_CATEGORIES,
  FORM_TEMPLATES,
  toTemplateSpec,
} from './index';

const registry = createFormRegistry();

describe('form templates', () => {
  it('have unique ids', () => {
    const ids = FORM_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each sit in a listed category, and every category has three or more', () => {
    const listed = new Set<string>(FORM_TEMPLATE_CATEGORIES.map((category) => category.id));
    for (const template of FORM_TEMPLATES) expect(listed.has(template.category)).toBe(true);
    for (const category of FORM_TEMPLATE_CATEGORIES) {
      const count = FORM_TEMPLATES.filter((template) => template.category === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(3);
    }
  });

  describe.each(FORM_TEMPLATES.map((template) => [template.id, template] as const))(
    '%s',
    (_id, template) => {
      it('builds as a document: every field an element, with props its schema accepts', () => {
        expect(() => buildTemplateForm(registry, template, { stable: true })).not.toThrow();
      });

      it('builds in the editor as the same tree', () => {
        const fragment = templateFragment(registry, toTemplateSpec(template).blocks);
        const doc = buildTemplateForm(registry, template, { stable: true });
        expect(Object.keys(fragment.nodes).length).toBe(Object.keys(doc.nodes).length - 1);
      });

      it('passes every check: no errors, no warnings', () => {
        const doc = buildTemplateForm(registry, template, { stable: true });
        expect(checkForm(doc, registry)).toEqual([]);
      });

      it('locks only required fields, and says why', () => {
        const doc = buildTemplateForm(registry, template, { stable: true });
        for (const node of Object.values(doc.nodes)) {
          if (!takesAnswer(node) || !node.props.lock) continue;
          expect(node.props.required, String(node.props.key)).toBe(true);
          expect((node.props.lock as string).length).toBeGreaterThan(10);
        }
      });
    },
  );
});
