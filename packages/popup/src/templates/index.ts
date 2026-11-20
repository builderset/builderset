/**
 * The popup's templates, one folder per category and one file per template:
 *
 *   templates/
 *     categories.ts       the categories, in panel order, PopupTemplate and defineTemplate
 *     spec.ts             a template as a whole document
 *     leads/              valuation offer as a modal and as a side drawer
 *     offers/             exit offer, countdown sale
 *     announcements/      announcement bar, inline "how it works" card
 *     newsletter/         newsletter slide-in, newsletter modal
 *     consent/            cookie bar, cookie card
 *     feedback/           feedback slide-in, survey drawer
 *     app/                app download modal, "open in the app" bar
 *
 * To add a template: write `<category>/<name>.ts` with `defineTemplate`, and
 * list it in that folder's `index.ts`. To add a category: add it to
 * `categories.ts`, make its folder, and list the folder below.
 * `templates.test.ts` builds every template and checks it.
 */
import { ANNOUNCEMENTS } from './announcements';
import { APP } from './app';
import type { PopupTemplate } from './categories';
import { CONSENT } from './consent';
import { FEEDBACK } from './feedback';
import { LEADS } from './leads';
import { NEWSLETTER } from './newsletter';
import { OFFERS } from './offers';

export {
  defineTemplate,
  POPUP_TEMPLATE_CATEGORIES,
  type PopupTemplate,
  type PopupTemplateCategory,
} from './categories';
export { buildTemplatePopup } from './spec';

/** Every popup template, category by category. */
export const POPUP_TEMPLATES: readonly PopupTemplate[] = [
  ...LEADS,
  ...OFFERS,
  ...ANNOUNCEMENTS,
  ...NEWSLETTER,
  ...CONSENT,
  ...FEEDBACK,
  ...APP,
];
