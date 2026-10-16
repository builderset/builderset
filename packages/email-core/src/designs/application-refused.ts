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
  ORANGE_DEEP,
  PAPER,
  say,
  TEXT,
  tt,
  when,
} from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We can't buy your car this time" — sent when the office refuses an
 * application.
 *
 * ── Two moments, one design ─────────────────────────────────────────────────
 * An application is refused at one of two points: while it is still PENDING
 * (the request itself rules it out) or once it is SCHEDULED (an inspection was
 * already booked). `stage` carries which, and the eyebrow and the note under the
 * reason change with it — the second also tells the reader their appointment is
 * off, so nobody drives to a checkpoint for a car we have already declined.
 *
 * In the order the reader needs it: the decision, said plainly and kindly (the
 * hero); the reason, as large as the offer's prices would have been; what the
 * decision means at this stage; the application it is about; and that this is
 * not the end — ask, apply again, or read up.
 *
 * Written in Albanian, English and German: one design, sent in the language the
 * customer applied in.
 *
 * The variables are the `application_refused` type's: the application (`code`,
 * `plate`, `year`), `refusal_reason`, `stage`, `refused_at`, the car (`car.*`),
 * `district`, and the site's links. Transactional: no unsubscribe link.
 */
export function applicationRefusedEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  const strong = (path: string) => ({
    text: `{{${path}}}`,
    marks: [{ type: 'bold' as const }, { type: 'variable' as const, path }],
  });
  const beforeOffer = when('stage', 'eq', 'pending');
  const afterBooking = when('stage', 'eq', 'scheduled');

  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Aplikimi u refuzua',
        subject: tr(
          'Aplikimi {{ code }}: këtë herë nuk mund ta blejmë makinën tuaj',
          'Application {{ code }}: we can’t buy your car this time',
          'Antrag {{ code }}: Diesmal können wir Ihr Auto nicht kaufen',
        ),
        preheader: tr(
          'Faleminderit për besimin. Ja arsyeja e vendimit dhe çfarë mund të bëni më tej.',
          'Thank you for your trust. Here is the reason for our decision, and what you can do next.',
          'Danke für Ihr Vertrauen. Hier ist der Grund für unsere Entscheidung und wie es weitergehen kann.',
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
        inEvery((l) => [{ text: say(l, 'Aplikimi · ', 'Application · ', 'Antrag · ') }, v('code')]),
      ),

      hero({
        // One per stage. Neither shows for a `stage` this design does not know,
        // which leaves the hero its title — still a whole sentence.
        eyebrows: [
          heroEyebrow(
            tr(
              'Vendimi pas shqyrtimit',
              'Our decision after review',
              'Unsere Entscheidung nach Prüfung',
            ),
            beforeOffer,
          ),
          heroEyebrow(
            tr(
              'Vendimi për takimin tuaj',
              'About your booked inspection',
              'Zu Ihrem gebuchten Prüftermin',
            ),
            afterBooking,
          ),
        ],
        title: tr(
          'Na vjen keq, këtë herë nuk mund ta blejmë makinën tuaj',
          'We’re sorry — this time we can’t buy your car',
          'Es tut uns leid — diesmal können wir Ihr Auto nicht kaufen',
        ),
        body: inEvery((l) => [
          {
            text: say(
              l,
              'Faleminderit që na zgjodhët për ',
              'Thank you for choosing us for your ',
              'Danke, dass Sie uns Ihren ',
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
              '. E shqyrtuam me kujdes dhe më poshtë gjeni arsyen e vendimit tonë.',
              '. We looked at it carefully, and you will find the reason for our decision below.',
              ' anvertraut haben. Wir haben ihn sorgfältig geprüft — den Grund für unsere Entscheidung finden Sie unten.',
            ),
          },
        ]),
        button: {
          label: tr('Na shkruani →', 'Write to us →', 'Schreiben Sie uns →'),
          href: '{{ site.contact_url }}',
        },
      }),

      reason(),

      note(
        inEvery((l) => [
          bold(say(l, 'Aplikimi ', 'Application ', 'Antrag ')),
          strong('code'),
          {
            text: say(
              l,
              ' u shqyrtua nga të dhënat që na dërguat, para çdo oferte. Nuk keni nevojë të bëni asgjë tjetër.',
              ' was reviewed from the details you sent us, before any offer was made. There is nothing else you need to do.',
              ' wurde anhand Ihrer Angaben geprüft, noch bevor ein Angebot erstellt wurde. Sie müssen nichts weiter tun.',
            ),
          },
        ]),
        beforeOffer,
      ),
      note(
        inEvery((l) => [
          bold(
            say(
              l,
              'Takimi juaj anulohet. ',
              'Your appointment is cancelled. ',
              'Ihr Termin ist storniert. ',
            ),
          ),
          {
            text: say(l, 'Për aplikimin ', 'Application ', 'Für den Antrag '),
          },
          strong('code'),
          {
            text: say(
              l,
              ' kishit rezervuar një kontroll — me këtë vendim nuk keni nevojë të paraqiteni në pikë.',
              ' had an inspection booked — with this decision you don’t need to come to the checkpoint.',
              ' war eine Prüfung gebucht — nach dieser Entscheidung müssen Sie nicht zum Standort kommen.',
            ),
          },
        ]),
        afterBooking,
      ),

      facts({
        label: tr('Aplikimi juaj', 'Your application', 'Ihr Antrag'),
        rows: [
          { label: tr('Kodi', 'Code', 'Antragsnummer'), value: '{{ code }}' },
          {
            label: tr('Mjeti', 'Car', 'Fahrzeug'),
            value: '{{ car.brand }} {{ car.model }} {{ car.variant }}',
          },
          { label: tr('Viti', 'Year', 'Baujahr'), value: '{{ year }}' },
          {
            label: tr('Kilometrazhi', 'Mileage', 'Kilometerstand'),
            value: '{{ car.odometer | number }} km',
          },
          { label: tr('Targa', 'Plate', 'Kennzeichen'), value: '{{ plate }}' },
          { label: tr('Rrethi', 'District', 'Bezirk'), value: '{{ district }}' },
        ],
        note: inEvery((l) => [
          { text: say(l, 'Vendimi u mor më ', 'Decided on ', 'Entschieden am ') },
          {
            text: '{{refused_at}}',
            marks: [{ type: 'variable', path: 'refused_at', format: 'date' }],
          },
          {
            text: say(
              l,
              ' · Keni pyetje? Na shkruani dhe përmendni kodin e aplikimit.',
              ' · Questions? Write to us and mention the application code.',
              ' · Fragen? Schreiben Sie uns und nennen Sie die Antragsnummer.',
            ),
          },
        ]),
      }),

      cards(
        tr('Çfarë mund të bëni', 'What you can do', 'Was Sie tun können'),
        tr(
          'Kjo nuk është fjala e fundit',
          'This isn’t the last word',
          'Das ist nicht das letzte Wort',
        ),
        [
          {
            icon: '💬',
            title: tr('Na pyesni', 'Ask us', 'Fragen Sie uns'),
            body: tr(
              'Nëse mendoni se diçka nuk u kuptua saktë, na shkruani — e rishikojmë me kënaqësi.',
              'If you think something was misread, write to us — we are glad to take another look.',
              'Wenn Sie glauben, dass etwas falsch verstanden wurde, schreiben Sie uns — wir sehen es uns gern noch einmal an.',
            ),
          },
          {
            icon: '🔁',
            title: tr('Aplikoni sërish', 'Apply again', 'Erneut anfragen'),
            body: tr(
              'Për një makinë tjetër, ose kur të keni rregulluar atë që ndali këtë ofertë.',
              'For another car, or once you have fixed what stood in the way of this one.',
              'Für ein anderes Auto oder sobald Sie behoben haben, was diesem Angebot im Weg stand.',
            ),
          },
          {
            icon: '📚',
            title: tr('Mësoni më shumë', 'Learn more', 'Mehr erfahren'),
            body: tr(
              'Udhëzuesit tanë shpjegojnë çfarë ndikon te vlerësimi i një makine.',
              'Our guides explain what affects the valuation of a car.',
              'Unsere Ratgeber erklären, was den Wert eines Autos beeinflusst.',
            ),
          },
        ],
      ),

      callToAction({
        title: tr(
          'Keni një makinë tjetër për të shitur?',
          'Have another car to sell?',
          'Haben Sie ein anderes Auto zu verkaufen?',
        ),
        body: tt(
          tr(
            'Vlerësimi është falas dhe oferta vjen me email brenda 24 orësh.',
            'The valuation is free and the offer arrives by email within 24 hours.',
            'Die Bewertung ist kostenlos, das Angebot kommt innerhalb von 24 Stunden per E-Mail.',
          ),
        ),
        button: {
          label: tr('Kërko vlerësim të ri', 'Request a new valuation', 'Neue Bewertung anfragen'),
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
              ' sepse aplikuat për vlerësim në ',
              ' because you applied for a valuation at ',
              ' gesendet, weil Sie bei ',
            ),
          },
          v('brand.name'),
          {
            text: say(
              l,
              '. Ju lutemi mos iu përgjigjni drejtpërdrejt.',
              '. Please do not reply to it directly.',
              ' eine Bewertung angefragt haben. Bitte antworten Sie nicht direkt darauf.',
            ),
          },
        ]),
        unsubscribe: false,
      }),
    ],
  );
}

/**
 * The reason, as the one thing the reader came for.
 *
 * Its own band rather than a row in the facts box: in the offer this place
 * holds the two prices, and a refusal's answer deserves the same weight. The
 * sentence is whatever the office chose or wrote — the card it picked in the
 * refuse form, or its own words under "other".
 */
function reason(): SectionSpec {
  return section({ background: PAPER, padding: pad(36, 32, 24, 32) }, [
    row('100', [
      {
        props: {
          background: MIST,
          radius: 16,
          borderWidth: 1,
          borderColor: LINE,
          padding: pad(24, 24, 22, 24),
        },
        blocks: [
          eyebrow(tr('Arsyeja', 'The reason', 'Der Grund'), ORANGE_DEEP),
          block('text', {
            text: [
              {
                text: '{{refusal_reason}}',
                marks: [{ type: 'bold' }, { type: 'variable', path: 'refusal_reason' }],
              },
            ],
            size: 19,
            lineHeight: 1.5,
            color: TEXT,
            padding: pad(0),
          }),
        ],
      },
    ]),
  ]);
}

/** Realistic data for the preview and the parity fixture — refused while pending. */
export const APPLICATION_REFUSED_SAMPLE: Record<string, unknown> = {
  recipient: { name: '', email: 'arta@example.com' },
  code: 'APP-2026-00123',
  plate: 'AA 123 BB',
  year: 2019,
  refusal_reason: 'Mjeti është më i vjetër se 15 vjet.',
  stage: 'pending',
  refused_at: '2026-10-03T09:15:00Z',
  car: {
    brand: 'Volkswagen',
    model: 'Golf',
    variant: '2.0 TDI',
    odometer: 148500,
    fuel: 'Naftë',
    transmission: 'Manuale',
    color: 'Gri',
  },
  district: 'Tiranë',
  site: {
    contact_url: 'https://marrimauto.com/contact',
    blog_url: 'https://marrimauto.com/blog',
    valuation_url: 'https://marrimauto.com/valuation',
  },
};

/** The same application refused once its inspection was booked. */
export const APPLICATION_REFUSED_AFTER_BOOKING_SAMPLE: Record<string, unknown> = {
  ...APPLICATION_REFUSED_SAMPLE,
  refusal_reason: 'Gjendja e mjetit nuk përputhet me të dhënat e aplikimit.',
  stage: 'scheduled',
};
