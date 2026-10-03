import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import type { EmailRichText } from '../rich-text';
import { v } from '../rich-text';
import { block, buildEmail, row, section, type SectionSpec } from '../sample';
import {
  bold,
  eyebrow,
  LINE,
  MIST,
  MUTED,
  ORANGE_DEEP,
  ORANGE_SOFT,
  PAPER,
  t,
  TEXT,
} from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "Your offer is ready" — sent when the office finishes valuing a pending
 * application, with the link to book the inspection.
 *
 * The offer is the point, so the two prices are the largest thing after the
 * headline — cash on the left, by bank transfer on the right — and the button
 * to book sits both in the hero and in the closing band, because the booking
 * link is the one thing the reader has to do. Then where the inspection is,
 * the car the offer is for (so a wrong plate is caught before the visit),
 * and how the day goes.
 *
 * The variables are the `application_approved` type's: the application, the
 * valuation (`cash_price`, `bank_price`, the checkpoint), the car, and the
 * signed `schedule_url` — `/offer/<token>` on the site, which shows the same
 * offer and the booking form. Transactional: no unsubscribe link.
 */
export function valuationOfferEmail(
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
        name: 'Oferta dhe rezervimi',
        subject: 'Oferta për {{ car.brand }} {{ car.model }} është gati — rezervoni takimin',
        preheader:
          'Cash {{ cash_price | money }} · me bankë {{ bank_price | money }}. Zgjidhni datën e kontrollit nga lidhja në email.',
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
      masthead([{ text: 'Oferta · ' }, v('code')]),

      hero({
        eyebrows: [heroEyebrow('✓  Vlerësimi përfundoi')],
        title: 'Oferta për makinën tuaj është gati',
        body: [
          { text: 'Ekipi ynë vlerësoi ' },
          strong('car.brand'),
          { text: ' ' },
          strong('car.model'),
          { text: ' me targë ' },
          strong('plate'),
          {
            text: '. Më poshtë gjeni dy çmimet që ju ofrojmë — zgjidhni ditën dhe orën e kontrollit dhe pjesën tjetër e kryejmë ne.',
          },
        ],
        button: { label: 'Rezervo takimin →', href: '{{ schedule_url }}' },
      }),

      prices(),

      note([
        bold('Kodi i aplikimit: '),
        strong('code'),
        { text: ' — lidhja e rezervimit vlen ' },
        strong('link_days'),
        { text: ' ditë, deri më ' },
        {
          text: '{{link_expires_at}}',
          marks: [{ type: 'bold' }, { type: 'variable', path: 'link_expires_at', format: 'date' }],
        },
        { text: '.' },
      ]),

      facts({
        label: 'Pika e kontrollit',
        rows: [
          { label: 'Pika', value: '{{ checkpoint_name }}' },
          { label: 'Adresa', value: '{{ checkpoint_address }}' },
          { label: 'Telefoni', value: '{{ checkpoint_phone }}' },
        ],
        note: t(
          'Aty bëhet kontrolli i mjetit dhe i dokumenteve. Datën dhe orën i zgjidhni vetë nga lidhja e rezervimit.',
        ),
      }),

      cards('Si vazhdon', 'Tre hapa deri te pagesa', [
        {
          icon: '📅',
          title: 'Rezervoni',
          body: 'Zgjidhni ditën dhe orën që ju përshtaten, nga lidhja në këtë email.',
        },
        {
          icon: '🔧',
          title: 'Kontrolli',
          body: 'Në pikën e kontrollit verifikojmë mjetin dhe dokumentet — rreth 30 minuta.',
        },
        {
          icon: '💶',
          title: 'Pagesa',
          body: 'Nëse gjithçka përputhet me të dhënat, nënshkruani dhe paguheni po atë ditë.',
        },
      ]),

      facts({
        label: 'Mjeti i vlerësuar',
        rows: [
          { label: 'Mjeti', value: '{{ car.brand }} {{ car.model }} {{ car.variant }}' },
          { label: 'Viti', value: '{{ year }}' },
          { label: 'Kilometrazhi', value: '{{ car.odometer | number }} km' },
          { label: 'Karburanti · Kambio', value: '{{ car.fuel }} · {{ car.transmission }}' },
          { label: 'Targa', value: '{{ plate }}' },
        ],
        note: [
          { text: 'Vlerësuar më ' },
          {
            text: '{{valuated_at}}',
            marks: [{ type: 'variable', path: 'valuated_at', format: 'date' }],
          },
          {
            text: ' · Çmimi përfundimtar konfirmohet pas kontrollit të mjetit në pikë.',
          },
        ],
      }),

      callToAction({
        title: 'Rezervoni takimin tuaj',
        body: [
          {
            text: 'Shihni ofertën dhe zgjidhni datën e kontrollit në faqen tonë. Ditën e takimit sillni lejen e qarkullimit, kolaudimin dhe siguracionin.',
          },
        ],
        button: { label: 'Zgjidh datën dhe orën', href: '{{ schedule_url }}' },
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
          { text: ' sepse aplikuat për vlerësim në ' },
          v('brand.name'),
          {
            text: '. Lidhja e rezervimit është personale — mos ia përcillni askujt.',
          },
        ],
        unsubscribe: false,
      }),
    ],
  );
}

/** One price on its card: what it is, the amount large, how it is paid. */
function price(label: string, path: string, help: string, accent: boolean) {
  const amount: EmailRichText = [
    { text: `{{${path}}}`, marks: [{ type: 'variable', path, format: 'money' }] },
  ];
  return {
    props: {
      background: accent ? ORANGE_SOFT : MIST,
      radius: 16,
      borderWidth: 1,
      borderColor: accent ? '#f3d4bd' : LINE,
      padding: pad(22, 22, 20, 22),
    },
    blocks: [
      eyebrow(label, accent ? ORANGE_DEEP : MUTED, { size: 11, padding: pad(0, 0, 8, 0) }),
      block('heading', {
        text: amount,
        level: 2,
        size: 34,
        font: 'sora',
        weight: '700',
        letterSpacing: -0.8,
        color: TEXT,
        padding: pad(0, 0, 6, 0),
      }),
      block('text', { text: t(help), size: 13, lineHeight: 1.5, color: MUTED, padding: pad(0) }),
    ],
  };
}

/** The offer: a heading, then cash and bank side by side. */
function prices(): SectionSpec {
  return section({ background: PAPER, padding: pad(36, 32, 28, 32) }, [
    row('100', [
      [
        eyebrow('Oferta jonë', ORANGE_DEEP),
        block('heading', {
          text: t('Dy mënyra pagese — ju zgjidhni'),
          level: 2,
          size: 24,
          font: 'sora',
          letterSpacing: -0.5,
          padding: pad(0, 0, 18, 0),
        }),
      ],
    ]),
    row(
      '50-50',
      [
        price('Me para në dorë', 'cash_price', 'Paguhet në vend, ditën e kontrollit.', false),
        price('Me transfertë bankare', 'bank_price', 'Kalon në llogarinë tuaj bankare.', true),
      ],
      { gap: 12 },
    ),
  ]);
}

/** Realistic data for the preview and the parity fixture. */
export const VALUATION_OFFER_SAMPLE: Record<string, unknown> = {
  recipient: { name: '', email: 'arta@example.com' },
  code: 'APP-2026-00123',
  plate: 'AA 123 BB',
  year: 2019,
  cash_price: '12500.00',
  bank_price: '13200.00',
  checkpoint_name: 'Tirana Center',
  checkpoint_address: 'Rruga e Durrësit 12, Tiranë',
  checkpoint_phone: '+355 69 000 0000',
  schedule_url: 'https://blejmauto.com/offer/sample-token',
  link_days: 14,
  link_expires_at: '2026-10-16T19:35:00Z',
  valuated_at: '2026-10-02T19:35:00Z',
  car: {
    brand: 'Volkswagen',
    model: 'Golf',
    variant: '2.0 TDI',
    odometer: 148500,
    fuel: 'Naftë',
    transmission: 'Manuale',
  },
  district: 'Tiranë',
  site: {
    contact_url: 'https://blejmauto.com/contact',
    blog_url: 'https://blejmauto.com/blog',
  },
};
