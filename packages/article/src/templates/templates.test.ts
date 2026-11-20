import { createFragment } from '@builderset/engine';
import { describe, expect, it } from 'vitest';

import { createArticleRegistry } from '../core';
import { ARTICLE_TEMPLATE_CATEGORIES, ARTICLE_TEMPLATES } from './index';

const registry = createArticleRegistry();

describe('article templates', () => {
  it('have unique ids', () => {
    const ids = ARTICLE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each sit in a listed category, and every category has some', () => {
    const listed = new Set<string>(ARTICLE_TEMPLATE_CATEGORIES.map((category) => category.id));
    for (const template of ARTICLE_TEMPLATES) expect(listed.has(template.category)).toBe(true);
    for (const category of ARTICLE_TEMPLATE_CATEGORIES) {
      expect(ARTICLE_TEMPLATES.some((template) => template.category === category.id)).toBe(true);
    }
  });

  it.each(ARTICLE_TEMPLATES.map((template) => [template.id, template] as const))(
    '%s builds: every block is an element, with props its schema accepts',
    (_id, template) => {
      for (const block of template.blocks) {
        expect(registry.has(block.type), block.type).toBe(true);
        expect(() => createFragment(registry, block.type, block.props ?? {})).not.toThrow();
      }
    },
  );
});
