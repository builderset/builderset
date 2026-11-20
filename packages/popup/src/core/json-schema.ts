import { elementRules, LIMITS, toDraft2020, type ElementRegistry } from '@builderset/engine';

import { HIDE_REASONS } from './display';
import { POPUP_TYPES } from './document';
import { SUBMISSION_FORMATS, SUBMISSION_MAX_LENGTH } from './submission';
import { PHONE_WIDTH, popupSchema } from './validate';
import { POPUP_FIELDS } from './variables';

/**
 * The popup document as a JSON Schema — the contract a server in another
 * language reads. As with the other kits, what JSON Schema cannot express is
 * published as data rather than restated there:
 *
 * - `x-elements`: which element may hold which (`container`, `parents`)
 * - `x-limits`: the tree's ceilings (nodes, depth, bytes)
 * - `x-popup-types`: per type, the sides it stretches, whether it dims the
 *   page and whether it is modal — what the close check reads
 * - `x-variables`: the variable paths a popup has when the project names none
 * - `x-submission-formats`, `x-submission-max-length`: what an email, a phone
 *   number or a plate must look like, as JavaScript regular expressions
 * - `x-hide-reasons`: the display rules, in the order `whyHidden` applies them
 * - `x-phone-width`: the widest a popup is drawn on a phone unscaled
 */
export function toPopupJSONSchema(registry: ElementRegistry): Record<string, unknown> {
  return {
    ...toDraft2020(popupSchema(registry)),
    $id: 'https://schemas.builder/popup.v1.json',
    title: 'Popup document',
    'x-elements': elementRules(registry),
    'x-limits': { nodes: LIMITS.nodes, depth: LIMITS.depth, bytes: LIMITS.bytes },
    'x-popup-types': Object.fromEntries(
      Object.entries(POPUP_TYPES).map(([type, spec]) => [
        type,
        { fill: spec.fill, overlay: spec.overlay, modal: spec.modal, positions: spec.positions },
      ]),
    ),
    'x-variables': POPUP_FIELDS.map((field) => field.path),
    'x-submission-formats': Object.fromEntries(
      Object.entries(SUBMISSION_FORMATS).map(([name, format]) => [
        name,
        { source: format.source, flags: format.flags },
      ]),
    ),
    'x-submission-max-length': SUBMISSION_MAX_LENGTH,
    'x-hide-reasons': HIDE_REASONS,
    'x-phone-width': PHONE_WIDTH,
  };
}
