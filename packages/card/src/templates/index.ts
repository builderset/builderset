/**
 * The card's designs, one folder per category and one file per design:
 *
 *   templates/
 *     categories.ts   the categories, in panel order, CardTemplate and defineCardTemplate
 *     spec.ts         a design as a whole new document
 *     membership/     gold, clean white, brand orange
 *     id/             photo ID, workshop pass
 *     bank/           payment card, gift card
 *     business/       sales advisor, inspector
 *     event/          member badge, fair visitor
 *     wallet/         wallet membership, loyalty card
 *
 * To add a design: write `<category>/<name>.ts` with `defineCardTemplate`, and
 * list it in that folder's `index.ts`. `templates.test.ts` builds every design
 * and checks it.
 */
import { BANK } from './bank';
import { BUSINESS } from './business';
import type { CardTemplate } from './categories';
import { EVENT } from './event';
import { ID } from './id';
import { MEMBERSHIP } from './membership';
import { WALLET } from './wallet';

export {
  CARD_TEMPLATE_CATEGORIES,
  defineCardTemplate,
  templateOptions,
  type CardTemplate,
  type CardTemplateCategory,
} from './categories';
export { buildTemplateCard } from './spec';

/** Every card design, category by category. */
export const CARD_TEMPLATES: readonly CardTemplate[] = [
  ...MEMBERSHIP,
  ...ID,
  ...BANK,
  ...BUSINESS,
  ...EVENT,
  ...WALLET,
];
