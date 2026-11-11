import type { ElementRegistry } from '@motors/engine';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import type { EmailRichText } from '../rich-text';
import { v } from '../rich-text';
import { block, buildEmail, row, section, tr, type SectionSpec, type Words } from '../sample';
import {
  bold,
  eyebrow,
  inEvery,
  LINE,
  MIST,
  MUTED,
  ORANGE_DEEP,
  ORANGE_SOFT,
  PAPER,
  say,
  TEXT,
  tt,
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
 * Written in Albanian, English and German: one design, sent in the language
 * the customer applied in.
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
        subject: tr(
          'Oferta për {{ car.brand }} {{ car.model }} është gati — rezervoni takimin',
          'Your offer for the {{ car.brand }} {{ car.model }} is ready — book your appointment',
          'Ihr Angebot für den {{ car.brand }} {{ car.model }} ist da — buchen Sie Ihren Termin',
        ),
        preheader: tr(
          'Cash {{ cash_price | money }} · me bankë {{ bank_price | money }}. Zgjidhni datën e kontrollit nga lidhja në email.',
          'Cash {{ cash_price | money }} · by bank {{ bank_price | money }}. Pick the inspection date from the link in this email.',
          'Bar {{ cash_price | money }} · per Überweisung {{ bank_price | money }}. Wählen Sie den Prüftermin über den Link in dieser E-Mail.',
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
        inEvery((l) => [{ text: say(l, 'Oferta · ', 'Offer · ', 'Angebot · ') }, v('code')]),
      ),

      hero({
        eyebrows: [
          heroEyebrow(
            tr('✓  Vlerësimi përfundoi', '✓  Valuation complete', '✓  Bewertung abgeschlossen'),
          ),
        ],
        title: tr(
          'Oferta për makinën tuaj është gati',
          'The offer for your car is ready',
          'Das Angebot für Ihr Auto ist da',
        ),
        body: inEvery((l) => [
          {
            text: say(
              l,
              'Ekipi ynë vlerësoi ',
              'Our team has valued your ',
              'Unser Team hat Ihren ',
            ),
          },
          strong('car.brand'),
          { text: ' ' },
          strong('car.model'),
          { text: say(l, ' me targë ', ' with plate ', ' mit dem Kennzeichen ') },
          strong('plate'),
          {
            text: say(
              l,
              '. Më poshtë gjeni dy çmimet që ju ofrojmë — zgjidhni ditën dhe orën e kontrollit dhe pjesën tjetër e kryejmë ne.',
              '. Below are the two prices we offer — choose the day and time of the inspection and we take care of the rest.',
              ' bewertet. Unten finden Sie unsere zwei Preise — wählen Sie Tag und Uhrzeit der Prüfung, um den Rest kümmern wir uns.',
            ),
          },
        ]),
        button: {
          label: tr('Rezervo takimin →', 'Book the appointment →', 'Termin buchen →'),
          href: '{{ schedule_url }}',
        },
      }),

      prices(),

      note(
        inEvery((l) => [
          bold(say(l, 'Kodi i aplikimit: ', 'Application code: ', 'Antragsnummer: ')),
          strong('code'),
          {
            text: say(
              l,
              ' — lidhja e rezervimit vlen ',
              ' — the booking link is valid for ',
              ' — der Buchungslink gilt ',
            ),
          },
          strong('link_days'),
          { text: say(l, ' ditë, deri më ', ' days, until ', ' Tage, bis zum ') },
          {
            text: '{{link_expires_at}}',
            marks: [
              { type: 'bold' },
              { type: 'variable', path: 'link_expires_at', format: 'date' },
            ],
          },
          { text: '.' },
        ]),
      ),

      facts({
        label: tr('Pika e kontrollit', 'Inspection point', 'Prüfstandort'),
        rows: [
          { label: tr('Pika', 'Location', 'Standort'), value: '{{ checkpoint_name }}' },
          { label: tr('Adresa', 'Address', 'Adresse'), value: '{{ checkpoint_address }}' },
          { label: tr('Telefoni', 'Phone', 'Telefon'), value: '{{ checkpoint_phone }}' },
        ],
        note: tt(
          tr(
            'Aty bëhet kontrolli i mjetit dhe i dokumenteve. Datën dhe orën i zgjidhni vetë nga lidhja e rezervimit.',
            'This is where the car and its documents are checked. You choose the date and time yourself from the booking link.',
            'Hier werden das Fahrzeug und die Unterlagen geprüft. Datum und Uhrzeit wählen Sie selbst über den Buchungslink.',
          ),
        ),
      }),

      cards(
        tr('Si vazhdon', 'How it continues', 'Wie es weitergeht'),
        tr('Tre hapa deri te pagesa', 'Three steps to payment', 'Drei Schritte bis zur Zahlung'),
        [
          {
            icon: '📅',
            title: tr('Rezervoni', 'Book', 'Buchen'),
            body: tr(
              'Zgjidhni ditën dhe orën që ju përshtaten, nga lidhja në këtë email.',
              'Choose the day and time that suit you, from the link in this email.',
              'Wählen Sie Tag und Uhrzeit, die Ihnen passen, über den Link in dieser E-Mail.',
            ),
          },
          {
            icon: '🔧',
            title: tr('Kontrolli', 'Inspection', 'Prüfung'),
            body: tr(
              'Në pikën e kontrollit verifikojmë mjetin dhe dokumentet — rreth 30 minuta.',
              'At the inspection point we check the car and the documents — about 30 minutes.',
              'Am Prüfstandort prüfen wir Fahrzeug und Unterlagen — etwa 30 Minuten.',
            ),
          },
          {
            icon: '💶',
            title: tr('Pagesa', 'Payment', 'Zahlung'),
            body: tr(
              'Nëse gjithçka përputhet me të dhënat, nënshkruani dhe paguheni po atë ditë.',
              'If everything matches your details, you sign and are paid the same day.',
              'Stimmt alles mit Ihren Angaben überein, unterschreiben Sie und werden am selben Tag bezahlt.',
            ),
          },
        ],
      ),

      facts({
        label: tr('Mjeti i vlerësuar', 'The car valued', 'Das bewertete Fahrzeug'),
        rows: [
          {
            label: tr('Mjeti', 'Car', 'Fahrzeug'),
            value: '{{ car.brand }} {{ car.model }} {{ car.variant }}',
          },
          { label: tr('Viti', 'Year', 'Baujahr'), value: '{{ year }}' },
          {
            label: tr('Kilometrazhi', 'Mileage', 'Kilometerstand'),
            value: '{{ car.odometer | number }} km',
          },
          {
            label: tr('Karburanti · Kambio', 'Fuel · Gearbox', 'Kraftstoff · Getriebe'),
            value: '{{ car.fuel }} · {{ car.transmission }}',
          },
          { label: tr('Targa', 'Plate', 'Kennzeichen'), value: '{{ plate }}' },
        ],
        note: inEvery((l) => [
          { text: say(l, 'Vlerësuar më ', 'Valued on ', 'Bewertet am ') },
          {
            text: '{{valuated_at}}',
            marks: [{ type: 'variable', path: 'valuated_at', format: 'date' }],
          },
          {
            text: say(
              l,
              ' · Çmimi përfundimtar konfirmohet pas kontrollit të mjetit në pikë.',
              ' · The final price is confirmed after the car is inspected at the point.',
              ' · Der endgültige Preis wird nach der Prüfung des Fahrzeugs vor Ort bestätigt.',
            ),
          },
        ]),
      }),

      callToAction({
        title: tr('Rezervoni takimin tuaj', 'Book your appointment', 'Buchen Sie Ihren Termin'),
        body: tt(
          tr(
            'Shihni ofertën dhe zgjidhni datën e kontrollit në faqen tonë. Ditën e takimit sillni lejen e qarkullimit, kolaudimin dhe siguracionin.',
            'See the offer and choose the inspection date on our site. On the day, bring the registration certificate, the roadworthiness test and the insurance.',
            'Sehen Sie das Angebot und wählen Sie den Prüftermin auf unserer Website. Bringen Sie am Termin Zulassungsbescheinigung, technische Prüfung und Versicherung mit.',
          ),
        ),
        button: {
          label: tr(
            'Zgjidh datën dhe orën',
            'Choose the date and time',
            'Datum und Uhrzeit wählen',
          ),
          href: '{{ schedule_url }}',
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
              ' sepse aplikuat për vlerësim në ',
              ' because you applied for a valuation at ',
              ' gesendet, weil Sie bei ',
            ),
          },
          v('brand.name'),
          {
            text: say(
              l,
              '. Lidhja e rezervimit është personale — mos ia përcillni askujt.',
              '. The booking link is personal — please do not forward it.',
              ' eine Bewertung angefragt haben. Der Buchungslink ist persönlich — bitte nicht weiterleiten.',
            ),
          },
        ]),
        unsubscribe: false,
      }),
    ],
  );
}

/** One price on its card: what it is, the amount large, how it is paid. */
function price(label: Words, path: string, help: Words, accent: boolean) {
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
      block('text', { text: tt(help), size: 13, lineHeight: 1.5, color: MUTED, padding: pad(0) }),
    ],
  };
}

/** The offer: a heading, then cash and bank side by side. */
function prices(): SectionSpec {
  return section({ background: PAPER, padding: pad(36, 32, 28, 32) }, [
    row('100', [
      [
        eyebrow(tr('Oferta jonë', 'Our offer', 'Unser Angebot'), ORANGE_DEEP),
        block('heading', {
          text: tt(
            tr(
              'Dy mënyra pagese — ju zgjidhni',
              'Two ways to be paid — you choose',
              'Zwei Zahlungswege — Sie wählen',
            ),
          ),
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
        price(
          tr('Me para në dorë', 'Cash in hand', 'In bar'),
          'cash_price',
          tr(
            'Paguhet në vend, ditën e kontrollit.',
            'Paid on the spot, on the day of the inspection.',
            'Bar vor Ort, am Tag der Prüfung.',
          ),
          false,
        ),
        price(
          tr('Me transfertë bankare', 'By bank transfer', 'Per Überweisung'),
          'bank_price',
          tr(
            'Kalon në llogarinë tuaj bankare.',
            'Paid into your bank account.',
            'Auf Ihr Bankkonto überwiesen.',
          ),
          true,
        ),
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
  schedule_url: 'https://marrimauto.com/offer/sample-token',
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
    contact_url: 'https://marrimauto.com/contact',
    blog_url: 'https://marrimauto.com/blog',
  },
};
