import { describe, expect, it } from 'vitest';

import { checkCard, createCardRegistry, formatOf, formatSpec } from '../core';
import { buildTemplateCard, CARD_TEMPLATE_CATEGORIES, CARD_TEMPLATES } from './index';

const registry = createCardRegistry();

describe('card templates', () => {
  it('have unique ids, twelve or more', () => {
    const ids = CARD_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(12);
  });

  it('each sit in a listed category, and every category has two or more', () => {
    const listed = new Set<string>(CARD_TEMPLATE_CATEGORIES.map((category) => category.id));
    for (const template of CARD_TEMPLATES) expect(listed.has(template.category)).toBe(true);
    for (const category of CARD_TEMPLATE_CATEGORIES) {
      const count = CARD_TEMPLATES.filter((template) => template.category === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(2);
    }
  });

  describe.each(CARD_TEMPLATES.map((template) => [template.id, template] as const))(
    '%s',
    (_id, template) => {
      it('builds: every element known, with props its schema accepts', () => {
        expect(() => buildTemplateCard(registry, template, { stable: true })).not.toThrow();
      });

      it('passes every check: no errors, no warnings', () => {
        expect(
          checkCard(buildTemplateCard(registry, template, { stable: true }), registry),
        ).toEqual([]);
      });

      it('has the size of its format, and words in three languages', () => {
        const doc = buildTemplateCard(registry, template, { stable: true });
        const format = formatOf(doc);
        const spec = formatSpec(template.format);
        expect([format.width, format.height, format.radius]).toEqual([
          spec.width,
          spec.height,
          spec.radius,
        ]);
        for (const words of [template.name, template.description]) {
          expect(Object.values(words).every((word) => word.trim().length > 2)).toBe(true);
        }
      });
    },
  );
});
