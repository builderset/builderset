/**
 * The form's templates, one folder per category and one file per template:
 *
 *   templates/
 *     categories.ts       the categories, in panel order, FormTemplate and defineTemplate
 *     fields.ts           builders for a template's fields (name, email, consent, …)
 *     spec.ts             a template as the editor's TemplateSpec, or as a whole document
 *     contact/            contact, quote request, call me back
 *     bookings/           appointment, event registration, table reservation
 *     feedback/           NPS survey, customer satisfaction, product feedback
 *     signup/             newsletter, account, waitlist
 *     applications/       job application, volunteer, partnership
 *     orders/             order request, return request, support ticket
 *
 * To add a template: write `<category>/<name>.ts` with `defineTemplate`, and
 * list it in that folder's `index.ts`. To add a category: add it to
 * `categories.ts`, make its folder, and list the folder below.
 * `templates.test.ts` builds every template and checks it.
 */
import { APPLICATIONS } from './applications';
import { BOOKINGS } from './bookings';
import type { FormTemplate } from './categories';
import { CONTACT } from './contact';
import { FEEDBACK } from './feedback';
import { ORDERS } from './orders';
import { SIGNUP } from './signup';

export {
  defineTemplate,
  FORM_TEMPLATE_CATEGORIES,
  type FormTemplate,
  type FormTemplateCategory,
} from './categories';
export { buildTemplateForm, stepBlocks, toTemplateSpec } from './spec';

/** Every form template, category by category. */
export const FORM_TEMPLATES: readonly FormTemplate[] = [
  ...CONTACT,
  ...BOOKINGS,
  ...FEEDBACK,
  ...SIGNUP,
  ...APPLICATIONS,
  ...ORDERS,
];
