import type { ElementRegistry } from '@builderset/engine';

import { buildPopup, type PopupDocument, type PopupMeta } from '../core';
import type { PopupTemplate } from './categories';

/**
 * A whole popup from a template — for a host's "New popup from template",
 * and for the editor, which puts its format and elements in place of the
 * current ones in one undo step.
 */
export function buildTemplatePopup(
  registry: ElementRegistry,
  template: PopupTemplate,
  options: { meta?: Partial<PopupMeta>; stable?: boolean } = {},
): PopupDocument {
  return buildPopup(
    registry,
    {
      meta: { name: template.name.sq, ...options.meta },
      format: template.format,
      ...(options.stable ? { stable: true } : {}),
    },
    template.elements,
  );
}
