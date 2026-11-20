import { defineElement, warning } from '@builderset/engine';
import { z } from 'zod';

/**
 * A form's skeleton: the root holds steps, a step holds fields. A form of one
 * step is a plain form; with more, visitors see them one at a time.
 */

export const formRootElement = defineElement({
  type: 'root',
  version: 1,
  category: 'structure',
  icon: 'file-text',
  internal: true,
  schema: z.object({}),
  defaults: () => ({}),
  container: { only: ['step'], min: 1, initial: () => [{ type: 'step' }] },
});

export const stepElement = defineElement({
  type: 'step',
  version: 1,
  category: 'structure',
  icon: 'footprints',
  internal: true,
  keywords: ['page', 'section'],
  schema: z.object({ title: z.string().max(80) }),
  defaults: () => ({ title: 'Step' }),
  parents: ['root'],
  container: {},
  toPlainText: (props) => props.title,
  check: (_props, { node }) =>
    node.children?.length ? [] : [warning('step.empty', { nodeId: node.id })],
});

export const structureElements = [formRootElement, stepElement];
