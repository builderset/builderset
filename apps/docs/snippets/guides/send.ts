import type { EmailDocument } from '@builderset/email';
import { renderEmail, socialIconsAt } from '@builderset/email/render';

import { brand } from './brand';

/** What your mailer calls: the published template, this one recipient's data. Server only, no React. */
export function shippedEmail(
  template: EmailDocument,
  order: { number: string; trackingUrl: string },
) {
  const { subject, html, text, warnings } = renderEmail(template, {
    brand,
    // The variables of the email's type, filled for this one recipient.
    data: { order: { number: order.number }, tracking_url: order.trackingUrl },
    locale: 'en',
    assetUrl: (key) => `https://cdn.example.com/${key}`,
    // The social block's icons: copy the package's icons/social folder somewhere public.
    socialIcon: socialIconsAt('https://acme.example/email/social'),
  });
  // A variable with no value, an image with no address: worth a log line, not a failed send.
  for (const warning of warnings) console.warn(warning);
  return { subject, html, text };
}
