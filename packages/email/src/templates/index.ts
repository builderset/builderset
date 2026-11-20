/**
 * The email's templates, one folder per category and one file per template:
 *
 *   templates/
 *     categories.ts       the categories, in panel order, EmailTemplate and defineTemplate
 *     blocks.ts           builders for a template's blocks (heading, paragraph, code box, …)
 *     spec.ts             a template as the editor's TemplateSpec, or as a whole document
 *     newsletter/         monthly digest, product update, editorial, curated picks
 *     verification/       one-time code, confirm address, sign-in link, two-step code
 *     welcome/            welcome, getting started, account ready
 *     account/            password reset, password changed, new sign-in
 *     orders/             order confirmed, shipped, receipt, refund
 *     promotions/         sale, coupon, new arrivals, we miss you
 *     events/             invitation, reminder, booking confirmed
 *
 * To add a template: write `<category>/<name>.ts` with `defineTemplate`, and
 * list it in that folder's `index.ts`. To add a category: add it to
 * `categories.ts`, make its folder, and list the folder below.
 * `templates.test.ts` builds every template and checks it.
 */
import { ACCOUNT } from './account';
import type { EmailTemplate } from './categories';
import { EVENTS } from './events';
import { NEWSLETTER } from './newsletter';
import { ORDERS } from './orders';
import { PROMOTIONS } from './promotions';
import { VERIFICATION } from './verification';
import { WELCOME } from './welcome';

export {
  EMAIL_TEMPLATE_CATEGORIES,
  defineTemplate,
  type EmailTemplate,
  type EmailTemplateCategory,
} from './categories';
export { buildTemplateEmail, sectionBlocks, toTemplateSpec } from './spec';

/** Every email template, category by category. */
export const EMAIL_TEMPLATES: readonly EmailTemplate[] = [
  ...NEWSLETTER,
  ...VERIFICATION,
  ...WELCOME,
  ...ACCOUNT,
  ...ORDERS,
  ...PROMOTIONS,
  ...EVENTS,
];
