import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section, tr, type SectionSpec } from '../sample';
import {
  bold,
  eyebrow,
  inEvery,
  LINE,
  MIST,
  MUTED,
  ORANGE_DEEP,
  PAPER,
  say,
  TEXT,
  tt,
  when,
} from './palette';
import { callToAction, cards, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We have your message" — sent the moment somebody writes to us from the
 * contact form, built from the newsletter's parts.
 *
 * Their own message is quoted back, so the email is also their copy of what
 * they asked — the subject line only when they gave one. The reply itself
 * comes later, as the `contact_response` email.
 *
 * Written in Albanian, English and German: one design, sent in the language
 * the visitor wrote from.
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
        subject: tr(
          'E morëm mesazhin tuaj · {{ code }}',
          'We have your message · {{ code }}',
          'Ihre Nachricht ist eingegangen · {{ code }}',
        ),
        preheader: tr(
          'Faleminderit, {{ first_name }}! Një person nga ekipi ynë ju përgjigjet me email sa më shpejt.',
          'Thank you, {{ first_name }}! Someone from our team will reply by email as soon as possible.',
          'Vielen Dank, {{ first_name }}! Jemand aus unserem Team antwortet Ihnen so bald wie möglich per E-Mail.',
        ),
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
      masthead(
        inEvery((l) => [{ text: say(l, 'Kontakt · ', 'Contact · ', 'Kontakt · ') }, v('code')]),
      ),

      hero({
        eyebrows: [
          heroEyebrow(tr('✓  Mesazhi u mor', '✓  Message received', '✓  Nachricht eingegangen')),
        ],
        title: tr(
          'Faleminderit që na shkruat',
          'Thank you for writing to us',
          'Danke für Ihre Nachricht',
        ),
        body: inEvery((l) => [
          { text: say(l, 'Përshëndetje ', 'Hello ', 'Hallo ') },
          strong('first_name'),
          {
            text: say(
              l,
              ', mesazhi juaj arriti te ekipi ynë. Një person e lexon dhe ju përgjigjet me email në këtë adresë, sa më shpejt që të jetë e mundur.',
              ', your message has reached our team. A person reads it and replies by email to this address as soon as possible.',
              ', Ihre Nachricht ist bei unserem Team angekommen. Ein Mensch liest sie und antwortet Ihnen so bald wie möglich per E-Mail an diese Adresse.',
            ),
          },
        ]),
      }),

      note(
        inEvery((l) => [
          bold(say(l, 'Numri i referencës: ', 'Reference number: ', 'Referenznummer: ')),
          strong('code'),
          {
            text: say(
              l,
              ' — nëse na shkruani sërish për të njëjtën çështje, përmendeni.',
              ' — if you write to us again about the same matter, mention it.',
              ' — bitte angeben, wenn Sie uns erneut zum selben Anliegen schreiben.',
            ),
          },
        ]),
      ),

      message(),

      cards(
        tr('Çfarë ndodh më pas', 'What happens next', 'Wie es weitergeht'),
        tr('Nga mesazhi te përgjigjja', 'From message to answer', 'Von der Nachricht zur Antwort'),
        [
          {
            icon: '📨',
            title: tr('E lexojmë', 'We read it', 'Wir lesen sie'),
            body: tr(
              'Mesazhi shkon te personi që merret me këtë lloj pyetjeje.',
              'Your message goes to the person who handles this kind of question.',
              'Ihre Nachricht geht an die Person, die solche Fragen bearbeitet.',
            ),
          },
          {
            icon: '💬',
            title: tr('Ju përgjigjemi', 'We reply', 'Wir antworten'),
            body: tr(
              'Përgjigjen e merrni me email, në adresën nga e cila na shkruat.',
              'You get the answer by email, at the address you wrote from.',
              'Die Antwort erhalten Sie per E-Mail an die Adresse, von der Sie geschrieben haben.',
            ),
          },
          {
            icon: '📞',
            title: tr('Nëse duhet', 'If needed', 'Falls nötig'),
            body: tr(
              'Kur një çështje kërkon më shumë detaje, ju telefonojmë në numrin që latë.',
              'When a matter needs more detail, we call you on the number you left.',
              'Braucht es mehr Details, rufen wir Sie unter der angegebenen Nummer an.',
            ),
          },
        ],
      ),

      callToAction({
        title: tr(
          'Doni të dini sa vlen makina juaj?',
          'Want to know what your car is worth?',
          'Möchten Sie wissen, was Ihr Auto wert ist?',
        ),
        body: tt(
          tr(
            'Plotësoni formularin në dy minuta dhe merrni një ofertë të shkruar brenda 24 orësh — pa asnjë detyrim.',
            'Fill in the form in two minutes and get a written offer within 24 hours — with no obligation.',
            'Füllen Sie das Formular in zwei Minuten aus und erhalten Sie innerhalb von 24 Stunden ein schriftliches Angebot — unverbindlich.',
          ),
        ),
        button: {
          label: tr('Vlerëso makinën falas', 'Value your car for free', 'Auto kostenlos bewerten'),
          href: '{{ site.valuation_url }}',
        },
      }),

      siteFooter({
        links: [
          { label: 'marrimauto.com', href: '{{ brand.website }}' },
          { label: tr('Blogu', 'Blog', 'Blog'), href: '{{ site.blog_url }}' },
          { label: tr('Kontakt', 'Contact', 'Kontakt'), href: '{{ site.contact_url }}' },
        ],
        text: inEvery((l) => [
          {
            text: say(
              l,
              'Ky email u dërgua te ',
              'This email was sent to ',
              'Diese E-Mail wurde an ',
            ),
          },
          v('recipient.email'),
          {
            text: say(
              l,
              ' sepse na shkruat nga formulari i kontaktit në ',
              ' because you wrote to us from the contact form at ',
              ' gesendet, weil Sie uns über das Kontaktformular von ',
            ),
          },
          v('brand.name'),
          {
            text: say(
              l,
              '. Ju lutemi mos iu përgjigjni drejtpërdrejt.',
              '. Please do not reply to it directly.',
              ' geschrieben haben. Bitte antworten Sie nicht direkt darauf.',
            ),
          },
        ]),
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
          eyebrow(tr('Mesazhi juaj', 'Your message', 'Ihre Nachricht'), ORANGE_DEEP),
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
            text: inEvery((l) => [
              { text: say(l, 'Dërguar më ', 'Sent on ', 'Gesendet am ') },
              {
                text: '{{submitted_at}}',
                marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
              },
              { text: say(l, ' nga ', ' by ', ' von ') },
              v('full_name'),
            ]),
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
    contact_url: 'https://marrimauto.com/contact',
    valuation_url: 'https://marrimauto.com/valuation',
    blog_url: 'https://marrimauto.com/blog',
  },
};
