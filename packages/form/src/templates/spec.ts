import type { ElementRegistry } from '@builderset/engine';
import type { TemplateBlock, TemplateSpec } from '@builderset/engine/editor';

import { buildForm, settingsWith, type FormDocument, type FormMeta } from '../core';
import type { FormTemplate } from './categories';

/**
 * A form template in the two forms it is used in: as the editor's
 * `TemplateSpec` (what the Templates tab adds or replaces the form with), and
 * as a whole document (a new form started from it).
 */

/** The outline as the nested blocks the editor builds: step › fields. */
export function stepBlocks(template: FormTemplate): TemplateBlock[] {
  return template.steps.map((spec) => ({
    type: 'step',
    props: { title: spec.title },
    children: spec.fields.map((field) => ({
      type: field.type,
      ...(field.props ? { props: field.props } : {}),
    })),
  }));
}

/**
 * For the editor: its steps and fields, and — when it replaces the form — its
 * title, intro and settings. The form keeps its own name and address.
 */
export function toTemplateSpec(template: FormTemplate): TemplateSpec<FormDocument> {
  return {
    id: template.id,
    category: template.category,
    name: template.name,
    description: template.description,
    blocks: stepBlocks(template),
    apply: (draft) => {
      draft.meta.title = template.title;
      draft.meta.intro = template.intro;
      draft.settings = settingsWith(template.settings);
    },
  };
}

/** A whole new form from a template — for a host's "New form from template". */
export function buildTemplateForm(
  registry: ElementRegistry,
  template: FormTemplate,
  options: { meta?: Partial<FormMeta>; stable?: boolean } = {},
): FormDocument {
  return buildForm(
    registry,
    {
      meta: {
        name: template.name.en,
        title: template.title,
        intro: template.intro,
        ...options.meta,
      },
      ...(template.settings ? { settings: template.settings } : {}),
      ...(options.stable ? { stable: true } : {}),
    },
    [...template.steps],
  );
}
