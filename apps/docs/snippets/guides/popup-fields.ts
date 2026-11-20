import type { PopupField } from '@builderset/popup';

/**
 * The variables your pages fill in, with an example each for the editor's
 * preview. One list for the editor (`fields`) and the server's check
 * (`variables`): a popup that uses another is refused with `variable.unknown`.
 */
export const PAGE_FIELDS: readonly PopupField[] = [
  { path: 'visitor.first_name', label: 'First name', example: 'Ana' },
  { path: 'offer.ends', label: 'Offer ends', example: '30 November' },
  { path: 'page.title', label: 'Page title', example: 'Sell your car' },
];
