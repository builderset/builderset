import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { v, type EmailRichText } from '../rich-text';
import { buildEmail } from '../sample';
import { bold, ORANGE_DEEP, PAPER, t, TEXT, when } from './palette';
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
  const sent: EmailRichText = [
    { text: 'Dërguar më ' },
    {
      text: '{{submitted_at}}',
      marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
    },
    { text: ' · Diçka nuk është e saktë? Na shkruani dhe e rregullojmë.' },
  ];
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Kërkesa për partneritet u mor',
        subject: 'E morëm kërkesën tuaj për partneritet · {{ code }}',
        preheader:
          'Faleminderit, {{ first_name }}! Ekipi e shqyrton dhe ju kontakton brenda pak ditësh pune.',
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
      masthead([{ text: 'Partneritet · ' }, v('code')]),

      hero({
        eyebrows: [heroEyebrow('✓  Kërkesa u mor')],
        title: 'Faleminderit që doni të bashkëpunoni me ne',
        body: [
          { text: 'Përshëndetje ' },
          strong('first_name'),
          { text: ', kërkesa juaj si ' },
          strong('role'),
          {
            text: ' në rrjetin e blejmauto.com arriti te ekipi ynë. E shqyrtojmë me kujdes dhe ju kontaktojmë brenda pak ditësh pune.',
          },
        ],
        button: { label: 'Rilexo kushtet e bashkëpunimit →', href: '{{ role_url }}' },
      }),

      note([
        bold('Referenca juaj: '),
        strong('code'),
        { text: ' — përmendeni nëse na shkruani për këtë kërkesë.' },
      ]),

      cards('Çfarë ndodh më pas', 'Tre hapa deri te bashkëpunimi', [
        {
          icon: '🔍',
          title: 'Shqyrtimi',
          body: 'Verifikojmë të dhënat dhe zonën ku do të ofroni shërbimin.',
        },
        {
          icon: '📞',
          title: 'Njohja',
          body: 'Ju telefonojmë për një bisedë — dhe për pikat e kontrollit, një vizitë në ambient.',
        },
        {
          icon: '🤝',
          title: 'Marrëveshja',
          body: 'Nëse përputhemi, nënshkruajmë kontratën dhe ju shtojmë në rrjet.',
        },
      ]),

      // A workshop: the business it trades as and where vehicles would go.
      facts({
        label: 'Kërkesa juaj · ashtu si e dërguat',
        rows: [
          { label: 'Roli', value: '{{ role }}' },
          { label: 'Biznesi', value: '{{ business_name }}' },
          { label: 'NIPT', value: '{{ identification_number }}' },
          { label: 'Rrethi', value: '{{ district }}' },
          { label: 'Adresa', value: '{{ address }}' },
          { label: 'Kontakti', value: '{{ full_name }} · {{ phone }}' },
        ],
        note: sent,
        display: when('is_checkpoint', 'exists'),
      }),

      // A valuer: a person — experience and getting about instead.
      facts({
        label: 'Kërkesa juaj · ashtu si e dërguat',
        rows: [
          { label: 'Roli', value: '{{ role }}' },
          { label: 'Rrethi', value: '{{ district }}' },
          { label: 'Përvoja', value: '{{ experience }}' },
          { label: 'Mjet personal', value: '{{ has_vehicle }}' },
          { label: 'Kontakti', value: '{{ full_name }} · {{ phone }}' },
        ],
        note: sent,
        display: when('is_checkpoint', 'missing'),
      }),

      callToAction({
        title: 'Keni një pyetje?',
        body: t(
          'Për kushtet, tarifat ose zonën e mbuluar, na shkruani — ju përgjigjet i njëjti ekip që shqyrton kërkesën.',
        ),
        button: { label: 'Na kontaktoni', href: '{{ site.contact_url }}' },
      }),

      siteFooter({
        links: [
          { label: 'blejmauto.com', href: '{{ brand.website }}' },
          { label: 'Puno me ne', href: '{{ site.partners_url }}' },
          { label: 'Kontakt', href: '{{ site.contact_url }}' },
        ],
        text: [
          { text: 'Ky email u dërgua te ' },
          v('recipient.email'),
          { text: ' sepse kërkuat të bëheni partner i ' },
          v('brand.name'),
          { text: '. Ju lutemi mos iu përgjigjni drejtpërdrejt.' },
        ],
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
  role_url: 'https://blejmauto.com/work-with-us/partner/pike-kontrolli',
  business_name: 'Auto Servis Leka',
  identification_number: 'L12345678A',
  district: 'Durrës',
  address: 'Rruga Tregtare 45, Durrës',
  experience: '—',
  has_vehicle: '—',
  submitted_at: '2026-10-02T19:35:00Z',
  site: {
    partners_url: 'https://blejmauto.com/work-with-us',
    contact_url: 'https://blejmauto.com/contact',
  },
};
