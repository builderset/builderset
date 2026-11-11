import type { ElementRegistry } from '@motors/engine';

import type { EmailDocument } from '../document';
import { v } from '../rich-text';
import { buildEmail, tr } from '../sample';
import { bold, inEvery, ORANGE_DEEP, PAPER, say, TEXT, tt } from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We have your application" — sent the moment a valuation request arrives,
 * built from the newsletter's parts so the two read as one family.
 *
 * In the order the reader needs it: it arrived and a person is on it (the
 * hero), the application code to keep (the orange note), what happens next
 * (three cards), the car exactly as they sent it — so a wrong plate or
 * mileage is caught now rather than at the inspection — and something useful
 * to do while they wait.
 *
 * Written in Albanian, English and German: one design, sent in the language
 * the customer had the site in.
 *
 * The variables are the `application_received` type's: the application
 * (`code`, `plate`, `year`), the car (`car.*`), `district`, `submitted_at`,
 * and the site's links. Transactional: no unsubscribe link.
 */
export function applicationReceivedEmail(
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
        name: 'Aplikimi u pranua',
        subject: tr(
          'Aplikimi {{ code }} është në proces vlerësimi',
          'Application {{ code }} is being valued',
          'Antrag {{ code }} wird bewertet',
        ),
        preheader: tr(
          'Faleminderit! Po e vlerësojmë {{ car.brand }} {{ car.model }} — oferta vjen me email brenda 24 orësh.',
          'Thank you! We are valuing your {{ car.brand }} {{ car.model }} — the offer arrives by email within 24 hours.',
          'Vielen Dank! Wir bewerten Ihren {{ car.brand }} {{ car.model }} — das Angebot kommt innerhalb von 24 Stunden per E-Mail.',
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
        eyebrows: [
          heroEyebrow(
            tr('✓  Aplikimi u pranua', '✓  Application received', '✓  Antrag eingegangen'),
          ),
        ],
        title: tr(
          'Faleminderit! Po e vlerësojmë makinën tuaj',
          'Thank you! We are valuing your car',
          'Vielen Dank! Wir bewerten Ihr Auto',
        ),
        body: inEvery((l) => [
          { text: say(l, 'Aplikimi për ', 'The application for ', 'Der Antrag für Ihren ') },
          strong('car.brand'),
          { text: ' ' },
          strong('car.model'),
          { text: say(l, ' me targë ', ' with plate ', ' mit dem Kennzeichen ') },
          strong('plate'),
          {
            text: say(
              l,
              ' është në proces vlerësimi. Ekipi ynë krahason tregun dhe ju dërgon një ofertë me email sapo të jetë gati.',
              ' is being valued. Our team compares the market and emails you an offer as soon as it is ready.',
              ' wird gerade bewertet. Unser Team vergleicht den Markt und schickt Ihnen ein Angebot per E-Mail, sobald es fertig ist.',
            ),
          },
        ]),
        button: {
          label: tr(
            'Na shkruani për aplikimin →',
            'Write to us about your application →',
            'Schreiben Sie uns zu Ihrem Antrag →',
          ),
          href: '{{ site.contact_url }}',
        },
      }),

      note(
        inEvery((l) => [
          bold(say(l, 'Kodi i aplikimit: ', 'Application code: ', 'Antragsnummer: ')),
          strong('code'),
          {
            text: say(
              l,
              ' — ruajeni, do t’ju duhet kur të flisni me ekipin tonë.',
              ' — keep it, you will need it when you talk to our team.',
              ' — bitte aufbewahren, Sie brauchen sie im Gespräch mit unserem Team.',
            ),
          },
        ]),
      ),

      cards(
        tr('Çfarë ndodh më pas', 'What happens next', 'Wie es weitergeht'),
        tr('Tre hapa deri te pagesa', 'Three steps to payment', 'Drei Schritte bis zur Zahlung'),
        [
          {
            icon: '🔍',
            title: tr('Vlerësimi', 'Valuation', 'Bewertung'),
            body: tr(
              'Ekipi ynë shqyrton të dhënat dhe i krahason me çmimet e tregut.',
              'Our team reviews your details and compares them with market prices.',
              'Unser Team prüft Ihre Angaben und vergleicht sie mit den Marktpreisen.',
            ),
          },
          {
            icon: '💶',
            title: tr('Oferta', 'The offer', 'Das Angebot'),
            body: tr(
              'Brenda 24 orësh merrni me email dy çmime: cash dhe me bankë.',
              'Within 24 hours you get two prices by email: cash and by bank transfer.',
              'Innerhalb von 24 Stunden erhalten Sie zwei Preise per E-Mail: bar und per Überweisung.',
            ),
          },
          {
            icon: '🤝',
            title: tr('Kontrolli & pagesa', 'Inspection & payment', 'Prüfung & Zahlung'),
            body: tr(
              'Nëse e pranoni, caktoni datën dhe pikën e kontrollit — paguheni në vend.',
              'If you accept, pick the date and the inspection point — you are paid on the spot.',
              'Wenn Sie annehmen, wählen Sie Termin und Prüfstandort — bezahlt wird vor Ort.',
            ),
          },
        ],
      ),

      facts({
        label: tr(
          'Mjeti juaj · ashtu si e dërguat',
          'Your car · as you sent it',
          'Ihr Fahrzeug · wie Sie es gesendet haben',
        ),
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
          { label: tr('Rrethi', 'District', 'Bezirk'), value: '{{ district }}' },
        ],
        note: inEvery((l) => [
          { text: say(l, 'Dërguar më ', 'Sent on ', 'Gesendet am ') },
          {
            text: '{{submitted_at}}',
            marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
          },
          {
            text: say(
              l,
              ' · Diçka nuk është e saktë? Na shkruani dhe e rregullojmë para vlerësimit.',
              ' · Something not right? Write to us and we will fix it before the valuation.',
              ' · Stimmt etwas nicht? Schreiben Sie uns, und wir korrigieren es vor der Bewertung.',
            ),
          },
        ]),
      }),

      callToAction({
        title: tr(
          'Ndërkohë, përgatitni dokumentet',
          'Meanwhile, get your documents ready',
          'Legen Sie schon die Unterlagen bereit',
        ),
        body: tt(
          tr(
            'Leja e qarkullimit, kolaudimi dhe siguracioni: ja çfarë t’ju duhet ditën e kontrollit, që pagesa të bëhet në vend.',
            'Registration certificate, roadworthiness test and insurance: what you need on the day of the inspection, so payment happens on the spot.',
            'Zulassungsbescheinigung, technische Prüfung und Versicherung: Das brauchen Sie am Tag der Prüfung, damit vor Ort bezahlt werden kann.',
          ),
        ),
        button: {
          label: tr('Lexo udhëzuesin', 'Read the guide', 'Zum Ratgeber'),
          href: '{{ site.blog_url }}',
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

/** Realistic data for the preview and the parity fixture. */
export const APPLICATION_RECEIVED_SAMPLE: Record<string, unknown> = {
  recipient: { name: '', email: 'arta@example.com' },
  code: 'APP-2026-00123',
  plate: 'AA 123 BB',
  year: 2019,
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
  submitted_at: '2026-10-02T19:35:00Z',
  site: {
    contact_url: 'https://marrimauto.com/contact',
    blog_url: 'https://marrimauto.com/blog',
  },
};
