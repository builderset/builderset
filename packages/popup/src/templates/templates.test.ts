import { describe, expect, it } from 'vitest';

import { checkPopup, createPopupRegistry, formatOf, POPUP_TYPE_KEYS } from '../core';
import { buildTemplatePopup, POPUP_TEMPLATE_CATEGORIES, POPUP_TEMPLATES } from './index';

const registry = createPopupRegistry();

describe('popup templates', () => {
  it('have unique ids, fourteen or more', () => {
    const ids = POPUP_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(14);
  });

  it('each sit in a listed category, and every category has two or more', () => {
    const listed = new Set<string>(POPUP_TEMPLATE_CATEGORIES.map((category) => category.id));
    for (const template of POPUP_TEMPLATES) expect(listed.has(template.category)).toBe(true);
    for (const category of POPUP_TEMPLATE_CATEGORIES) {
      const count = POPUP_TEMPLATES.filter((template) => template.category === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('use every type of popup', () => {
    const used = new Set(POPUP_TEMPLATES.map((template) => template.format.type));
    expect([...used].sort()).toEqual([...POPUP_TYPE_KEYS].sort());
  });

  describe.each(POPUP_TEMPLATES.map((template) => [template.id, template] as const))(
    '%s',
    (_id, template) => {
      const doc = buildTemplatePopup(registry, template, { stable: true });

      it('passes every check: no errors, no warnings', () => {
        expect(checkPopup(doc, registry)).toEqual([]);
      });

      it('keeps every element inside the popup', () => {
        const { width, height } = formatOf(doc);
        for (const id of doc.nodes[doc.root]?.children ?? []) {
          const frame = doc.nodes[id]?.props.frame as {
            x: number;
            y: number;
            w: number;
            h: number;
          };
          expect(frame.x, id).toBeGreaterThanOrEqual(0);
          expect(frame.y, id).toBeGreaterThanOrEqual(0);
          expect(frame.x + frame.w, id).toBeLessThanOrEqual(width);
          expect(frame.y + frame.h, id).toBeLessThanOrEqual(height);
        }
      });

      it('is named in three languages', () => {
        for (const words of [template.name, template.description]) {
          expect(Object.keys(words).sort()).toEqual(['de', 'en', 'sq']);
          for (const word of Object.values(words)) expect(word.trim()).not.toBe('');
        }
      });
    },
  );
});
