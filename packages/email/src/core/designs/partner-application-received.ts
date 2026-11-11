import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { v, type EmailRichText } from '../rich-text';
import { buildEmail, tr, type Tr } from '../sample';
import { bold, inEvery, ORANGE_DEEP, PAPER, say, TEXT, tt, when } from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We have your partnership request" — sent when a workshop offers to be an
 * inspection point, or a valuer offers to work with us, from
 * /work-with-us/partner/<role>. Built from the newsletter's parts.
 *
 * The two roles are asked different things, so the "as you sent it" box comes
 * in two versions and shows the one that fits: a checkpoint sees its trading
 * name, tax number and address; a valuer sees experience and whether they
 * have a vehicle. `is_checkpoint` decides.
 *
 * Written in Albanian, English and German: one design, sent in the language
 * the applicant had the site in.
 *
 * The variables are the `partner_application_received` type's: `code`, the
 * applicant, the role, its answers, `submitted_at` and the site's links.
 * Transactional: no unsubscribe link.
 */
export function partnerApplicationReceivedEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  const strong = (path: string) => ({
    text: `{{${path}}}`,
    marks: [{ type: 'bold' as const }, { type: 'variable' as const, path }],
  });
  const sent = (): Tr<EmailRichText> =>
    inEvery((l) => [
      { text: say(l, 'Dërguar më ', 'Sent on ', 'Gesendet am ') },
      {
        text: '{{submitted_at}}',
        marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
      },
      {
        text: say(
          l,
          ' · Diçka nuk është e saktë? Na shkruani dhe e rregullojmë.',
          ' · Something not right? Write to us and we will fix it.',
          ' · Stimmt etwas nicht? Schreiben Sie uns, und wir korrigieren es.',
        ),
      },
    ]);
  const asSent = tr(
    'Kërkesa juaj · ashtu si e dërguat',
    'Your request · as you sent it',
    'Ihre Anfrage · wie Sie sie gesendet haben',
  );
  const role = tr('Roli', 'Role', 'Rolle');
  const district = tr('Rrethi', 'District', 'Bezirk');
  const contact = tr('Kontakti', 'Contact', 'Kontakt');
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Kërkesa për partneritet u mor',
        subject: tr(
          'E morëm kërkesën tuaj për partneritet · {{ code }}',
          'We have your partnership request · {{ code }}',
          'Ihre Partneranfrage ist eingegangen · {{ code }}',
        ),
        preheader: tr(
          'Faleminderit, {{ first_name }}! Ekipi e shqyrton dhe ju kontakton brenda pak ditësh pune.',
          'Thank you, {{ first_name }}! The team reviews it and contacts you within a few working days.',
          'Vielen Dank, {{ first_name }}! Das Team prüft sie und meldet sich innerhalb weniger Werktage.',
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
        inEvery((l) => [
          { text: say(l, 'Partneritet · ', 'Partnership · ', 'Partnerschaft · ') },
          v('code'),
        ]),
      ),

      hero({
        eyebrows: [
          heroEyebrow(tr('✓  Kërkesa u mor', '✓  Request received', '✓  Anfrage eingegangen')),
        ],
        title: tr(
          'Faleminderit që doni të bashkëpunoni me ne',
          'Thank you for wanting to work with us',
          'Danke, dass Sie mit uns zusammenarbeiten möchten',
        ),
        body: inEvery((l) => [
          { text: say(l, 'Përshëndetje ', 'Hello ', 'Hallo ') },
          strong('first_name'),
          {
            text: say(l, ', kërkesa juaj si ', ', your request to join as ', ', Ihre Anfrage als '),
          },
          strong('role'),
          {
            text: say(
              l,
              ' në rrjetin e marrimauto.com arriti te ekipi ynë. E shqyrtojmë me kujdes dhe ju kontaktojmë brenda pak ditësh pune.',
              ' in the marrimauto.com network has reached our team. We review it carefully and contact you within a few working days.',
              ' im Netzwerk von marrimauto.com ist bei unserem Team angekommen. Wir prüfen sie sorgfältig und melden uns innerhalb weniger Werktage.',
            ),
          },
        ]),
        button: {
          label: tr(
            'Rilexo kushtet e bashkëpunimit →',
            'Read the partnership terms again →',
            'Partnerschaftsbedingungen lesen →',
          ),
          href: '{{ role_url }}',
        },
      }),

      note(
        inEvery((l) => [
          bold(say(l, 'Referenca juaj: ', 'Your reference: ', 'Ihre Referenz: ')),
          strong('code'),
          {
            text: say(
              l,
              ' — përmendeni nëse na shkruani për këtë kërkesë.',
              ' — mention it if you write to us about this request.',
              ' — bitte angeben, wenn Sie uns zu dieser Anfrage schreiben.',
            ),
          },
        ]),
      ),

      cards(
        tr('Çfarë ndodh më pas', 'What happens next', 'Wie es weitergeht'),
        tr(
          'Tre hapa deri te bashkëpunimi',
          'Three steps to working together',
          'Drei Schritte zur Zusammenarbeit',
        ),
        [
          {
            icon: '🔍',
            title: tr('Shqyrtimi', 'Review', 'Prüfung'),
            body: tr(
              'Verifikojmë të dhënat dhe zonën ku do të ofroni shërbimin.',
              'We check your details and the area you would serve.',
              'Wir prüfen Ihre Angaben und das Gebiet, das Sie abdecken würden.',
            ),
          },
          {
            icon: '📞',
            title: tr('Njohja', 'Getting to know you', 'Kennenlernen'),
            body: tr(
              'Ju telefonojmë për një bisedë — dhe për pikat e kontrollit, një vizitë në ambient.',
              'We call you for a conversation — and, for inspection points, visit the premises.',
              'Wir rufen Sie für ein Gespräch an — und besuchen bei Prüfstandorten die Räumlichkeiten.',
            ),
          },
          {
            icon: '🤝',
            title: tr('Marrëveshja', 'The agreement', 'Die Vereinbarung'),
            body: tr(
              'Nëse përputhemi, nënshkruajmë kontratën dhe ju shtojmë në rrjet.',
              'If we are a match, we sign the contract and add you to the network.',
              'Wenn es passt, unterschreiben wir den Vertrag und nehmen Sie ins Netzwerk auf.',
            ),
          },
        ],
      ),

      // A workshop: the business it trades as and where vehicles would go.
      facts({
        label: asSent,
        rows: [
          { label: role, value: '{{ role }}' },
          { label: tr('Biznesi', 'Business', 'Unternehmen'), value: '{{ business_name }}' },
          { label: tr('NIPT', 'Tax number', 'Steuernummer'), value: '{{ identification_number }}' },
          { label: district, value: '{{ district }}' },
          { label: tr('Adresa', 'Address', 'Adresse'), value: '{{ address }}' },
          { label: contact, value: '{{ full_name }} · {{ phone }}' },
        ],
        note: sent(),
        display: when('is_checkpoint', 'exists'),
      }),

      // A valuer: a person — experience and getting about instead.
      facts({
        label: asSent,
        rows: [
          { label: role, value: '{{ role }}' },
          { label: district, value: '{{ district }}' },
          { label: tr('Përvoja', 'Experience', 'Erfahrung'), value: '{{ experience }}' },
          {
            label: tr('Mjet personal', 'Own vehicle', 'Eigenes Fahrzeug'),
            value: '{{ has_vehicle }}',
          },
          { label: contact, value: '{{ full_name }} · {{ phone }}' },
        ],
        note: sent(),
        display: when('is_checkpoint', 'missing'),
      }),

      callToAction({
        title: tr('Keni një pyetje?', 'Have a question?', 'Haben Sie eine Frage?'),
        body: tt(
          tr(
            'Për kushtet, tarifat ose zonën e mbuluar, na shkruani — ju përgjigjet i njëjti ekip që shqyrton kërkesën.',
            'About the terms, the fees or the area covered, write to us — the same team that reviews your request answers.',
            'Zu Bedingungen, Vergütung oder Einsatzgebiet schreiben Sie uns — es antwortet dasselbe Team, das Ihre Anfrage prüft.',
          ),
        ),
        button: {
          label: tr('Na kontaktoni', 'Contact us', 'Kontakt aufnehmen'),
          href: '{{ site.contact_url }}',
        },
      }),

      siteFooter({
        links: [
          { label: 'marrimauto.com', href: '{{ brand.website }}' },
          {
            label: tr('Puno me ne', 'Work with us', 'Mitarbeiten'),
            href: '{{ site.partners_url }}',
          },
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
              ' sepse kërkuat të bëheni partner i ',
              ' because you asked to become a partner of ',
              ' gesendet, weil Sie Partner von ',
            ),
          },
          v('brand.name'),
          {
            text: say(
              l,
              '. Ju lutemi mos iu përgjigjni drejtpërdrejt.',
              '. Please do not reply to it directly.',
              ' werden möchten. Bitte antworten Sie nicht direkt darauf.',
            ),
          },
        ]),
        unsubscribe: false,
      }),
    ],
  );
}

/** Realistic data for the preview and the parity fixture — a checkpoint. */
export const PARTNER_APPLICATION_RECEIVED_SAMPLE: Record<string, unknown> = {
  recipient: { name: 'Arben Leka', email: 'arben@example.com' },
  code: 'PA-2026-00017',
  first_name: 'Arben',
  full_name: 'Arben Leka',
  phone: '+355 68 222 3344',
  role: 'Pikë kontrolli',
  is_checkpoint: true,
  role_url: 'https://marrimauto.com/work-with-us/partner/pike-kontrolli',
  business_name: 'Auto Servis Leka',
  identification_number: 'L12345678A',
  district: 'Durrës',
  address: 'Rruga Tregtare 45, Durrës',
  experience: '—',
  has_vehicle: '—',
  submitted_at: '2026-10-02T19:35:00Z',
  site: {
    partners_url: 'https://marrimauto.com/work-with-us',
    contact_url: 'https://marrimauto.com/contact',
  },
};
