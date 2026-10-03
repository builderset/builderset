import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section, type SectionSpec } from '../sample';
import { bold, eyebrow, LINE, MIST, MUTED, ORANGE_DEEP, PAPER, t, TEXT, when } from './palette';
import { callToAction, cards, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We have your message" — sent the moment somebody writes to us from the
 * contact form, built from the newsletter's parts.
 *
 * Their own message is quoted back, so the email is also their copy of what
 * they asked — the subject line only when they gave one. The reply itself
 * comes later, as the `contact_response` email.
 *
 * The variables are the `contact_received` type's: `code`, the sender, the
 * message (`title`, `description`), `submitted_at` and the site's links.
 * Transactional: no unsubscribe link.
 */
export function contactReceivedEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  const strong = (path: string) => ({
    text: `{{${path}}}`,
    marks: [{ type: 'bold' as const }, { type: 'variable' as const, path }],
  });
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Mesazhi u mor',
        subject: 'E morëm mesazhin tuaj · {{ code }}',
        preheader:
          'Faleminderit, {{ first_name }}! Një person nga ekipi ynë ju përgjigjet me email sa më shpejt.',
      },
      settings: {
        width: 640,
        backdrop: '#eceef2',
        background: PAPER,
        font: 'poppins',
        fontSize: 16,
        lineHeight: 1.6,
        textColor: TEXT,
        headingColor: TEXT,
        linkColor: ORANGE_DEEP,
        darkMode: 'auto',
      },
    },
    [
      masthead([{ text: 'Kontakt · ' }, v('code')]),

      hero({
        eyebrows: [heroEyebrow('✓  Mesazhi u mor')],
        title: 'Faleminderit që na shkruat',
        body: [
          { text: 'Përshëndetje ' },
          strong('first_name'),
          {
            text: ', mesazhi juaj arriti te ekipi ynë. Një person e lexon dhe ju përgjigjet me email në këtë adresë, sa më shpejt që të jetë e mundur.',
          },
        ],
      }),

      note([
        bold('Numri i referencës: '),
        strong('code'),
        { text: ' — nëse na shkruani sërish për të njëjtën çështje, përmendeni.' },
      ]),

      message(),

      cards('Çfarë ndodh më pas', 'Nga mesazhi te përgjigjja', [
        {
          icon: '📨',
          title: 'E lexojmë',
          body: 'Mesazhi shkon te personi që merret me këtë lloj pyetjeje.',
        },
        {
          icon: '💬',
          title: 'Ju përgjigjemi',
          body: 'Përgjigjen e merrni me email, në adresën nga e cila na shkruat.',
        },
        {
          icon: '📞',
          title: 'Nëse duhet',
          body: 'Kur një çështje kërkon më shumë detaje, ju telefonojmë në numrin që latë.',
        },
      ]),

      callToAction({
        title: 'Doni të dini sa vlen makina juaj?',
        body: t(
          'Plotësoni formularin në dy minuta dhe merrni një ofertë të shkruar brenda 24 orësh — pa asnjë detyrim.',
        ),
        button: { label: 'Vlerëso makinën falas', href: '{{ site.valuation_url }}' },
      }),

      siteFooter({
        links: [
          { label: 'blejmauto.com', href: '{{ brand.website }}' },
          { label: 'Blogu', href: '{{ site.blog_url }}' },
          { label: 'Kontakt', href: '{{ site.contact_url }}' },
        ],
        text: [
          { text: 'Ky email u dërgua te ' },
          v('recipient.email'),
          { text: ' sepse na shkruat nga formulari i kontaktit në ' },
          v('brand.name'),
          { text: '. Ju lutemi mos iu përgjigjni drejtpërdrejt.' },
        ],
        unsubscribe: false,
      }),
    ],
  );
}

/** Their message, quoted back on a soft card: the subject (if any), the text, when. */
function message(): SectionSpec {
  return section({ background: PAPER, padding: pad(32, 32, 8, 32) }, [
    row('100', [
      {
        props: {
          background: MIST,
          radius: 16,
          padding: pad(24, 24, 20, 24),
          borderWidth: 1,
          borderColor: LINE,
        },
        blocks: [
          eyebrow('Mesazhi juaj', ORANGE_DEEP),
          block('heading', {
            text: [v('title')],
            level: 3,
            size: 18,
            font: 'sora',
            color: TEXT,
            padding: pad(0, 0, 8, 0),
            display: when('title', 'exists'),
          }),
          block('text', {
            text: [v('description')],
            size: 15,
            lineHeight: 1.65,
            color: TEXT,
            padding: pad(0, 0, 14, 0),
          }),
          block('text', {
            text: [
              { text: 'Dërguar më ' },
              {
                text: '{{submitted_at}}',
                marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
              },
              { text: ' nga ' },
              v('full_name'),
            ],
            size: 13,
            lineHeight: 1.5,
            color: MUTED,
            padding: pad(0),
          }),
        ],
      },
    ]),
  ]);
}

/** Realistic data for the preview and the parity fixture. */
export const CONTACT_RECEIVED_SAMPLE: Record<string, unknown> = {
  recipient: { name: 'Arta Hoxha', email: 'arta@example.com' },
  code: 'CO-2026-00042',
  first_name: 'Arta',
  full_name: 'Arta Hoxha',
  phone: '+355 69 123 4567',
  title: 'Makinë me kredi',
  description:
    'Përshëndetje, a mund ta shes makinën nëse ende kam këste për të paguar te banka?\nFaleminderit!',
  submitted_at: '2026-10-02T19:35:00Z',
  site: {
    contact_url: 'https://blejmauto.com/contact',
    valuation_url: 'https://blejmauto.com/valuation',
    blog_url: 'https://blejmauto.com/blog',
  },
};
