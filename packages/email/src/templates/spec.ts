import type { ElementRegistry } from '@builderset/engine';
import type { TemplateBlock, TemplateSpec } from '@builderset/engine/editor';

import {
  buildEmail,
  defaultSettings,
  type BlockSpec,
  type EmailDocument,
  type EmailMeta,
  type SectionSpec,
} from '../core';
import type { EmailTemplate } from './categories';

/**
 * An email template in the two forms it is used in: as the editor's
 * `TemplateSpec` (what the Modules tab adds or replaces the email with), and
 * as a whole document (a new design started from it).
 */

function blockOf(spec: BlockSpec): TemplateBlock {
  return {
    type: spec.type,
    ...(spec.props ? { props: spec.props } : {}),
    ...(spec.children ? { children: spec.children.map(blockOf) } : {}),
  };
}

/** The outline as the nested blocks the editor builds: section › row › column › blocks. */
export function sectionBlocks(sections: readonly SectionSpec[]): TemplateBlock[] {
  return sections.map((section) => ({
    type: 'section',
    props: section.props ?? {},
    children: section.rows.map((row) => ({
      type: 'row',
      props: { ...row.props, layout: row.layout },
      children: row.columns.map((column) =>
        Array.isArray(column)
          ? { type: 'column', children: column.map(blockOf) }
          : { type: 'column', props: column.props, children: column.blocks.map(blockOf) },
      ),
    })),
  }));
}

/**
 * For the editor: its blocks, and — when it replaces the email — its subject,
 * preheader and look. The design keeps its own name.
 */
export function toTemplateSpec(template: EmailTemplate): TemplateSpec<EmailDocument> {
  return {
    id: template.id,
    category: template.category,
    name: template.name,
    description: template.description,
    blocks: sectionBlocks(template.sections),
    apply: (draft) => {
      draft.meta.subject = template.subject;
      draft.meta.preheader = template.preheader;
      draft.settings = { ...defaultSettings(), ...template.settings };
    },
  };
}

/** A whole new design from a template — for a host's "New email from template". */
export function buildTemplateEmail(
  registry: ElementRegistry,
  template: EmailTemplate,
  options: { meta?: Partial<EmailMeta>; stable?: boolean } = {},
): EmailDocument {
  return buildEmail(
    registry,
    {
      meta: {
        name: template.name.en,
        subject: template.subject,
        preheader: template.preheader,
        ...options.meta,
      },
      ...(template.settings ? { settings: template.settings } : {}),
      ...(options.stable ? { stable: true } : {}),
    },
    [...template.sections],
  );
}
