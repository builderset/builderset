import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { v } from '../rich-text';
import { buildEmail, tr } from '../sample';
import { bold, inEvery, ORANGE_DEEP, PAPER, say, TEXT, tt } from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We have your job application" — sent the moment somebody applies for an
 * open position on /work-with-us, built from the newsletter's parts.
 *
 * It answers what an applicant wonders right after pressing send: did it
 * arrive (the hero), how do I refer to it (the reference), what happens now
 * (three cards), and did it go in as I meant it — the position, the phone we
 * will call, whether the CV made it.
 *
 * Written in Albanian, English and German: one design, sent in the language
 * the candidate had the site in.
 *
 * The variables are the `job_application_received` type's: `code`, the
 * applicant, the position, `cv`, `submitted_at` and the site's links.
 * Transactional: no unsubscribe link.
 */
export function jobApplicationReceivedEmail(
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
        name: 'Aplikimi për punë u mor',
        subject: tr(
          'E morëm aplikimin tuaj për {{ position.title }}',
          'We have your application for {{ position.title }}',
          'Ihre Bewerbung als {{ position.title }} ist eingegangen',
        ),
        preheader: tr(
          'Faleminderit, {{ first_name }}! Ekipi e shqyrton dhe ju kontakton brenda pak ditësh.',
          'Thank you, {{ first_name }}! The team reviews it and gets back to you within a few days.',
          'Vielen Dank, {{ first_name }}! Das Team prüft sie und meldet sich innerhalb weniger Tage.',
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
        inEvery((l) => [{ text: say(l, 'Karriera · ', 'Careers · ', 'Karriere · ') }, v('code')]),
      ),

      hero({
        eyebrows: [
          heroEyebrow(
            tr('✓  Aplikimi u mor', '✓  Application received', '✓  Bewerbung eingegangen'),
          ),
        ],
        title: tr(
          'Faleminderit që doni të punoni me ne',
          'Thank you for wanting to work with us',
          'Danke, dass Sie mit uns arbeiten möchten',
        ),
        body: inEvery((l) => [
          { text: say(l, 'Përshëndetje ', 'Hello ', 'Hallo ') },
          strong('first_name'),
          {
            text: say(
              l,
              ', aplikimi juaj për pozicionin ',
              ', your application for the position of ',
              ', Ihre Bewerbung als ',
            ),
          },
          strong('position.title'),
          {
            text: say(
              l,
              ' arriti te ekipi ynë. E lexon një person, jo një filtër automatik.',
              ' has reached our team. A person reads it, not an automatic filter.',
              ' ist bei unserem Team angekommen. Ein Mensch liest sie, kein automatischer Filter.',
            ),
          },
        ]),
        button: {
          label: tr('Shiko pozicionin →', 'View the position →', 'Zur Stelle →'),
          href: '{{ position.url }}',
        },
      }),

      note(
        inEvery((l) => [
          bold(say(l, 'Referenca juaj: ', 'Your reference: ', 'Ihre Referenz: ')),
          strong('code'),
          {
            text: say(
              l,
              ' — përmendeni nëse na shkruani për këtë aplikim.',
              ' — mention it if you write to us about this application.',
              ' — bitte angeben, wenn Sie uns zu dieser Bewerbung schreiben.',
            ),
          },
        ]),
      ),

      cards(
        tr('Çfarë ndodh më pas', 'What happens next', 'Wie es weitergeht'),
        tr(
          'Tre hapa deri te përgjigjja',
          'Three steps to an answer',
          'Drei Schritte bis zur Antwort',
        ),
        [
          {
            icon: '📄',
            title: tr('Shqyrtimi', 'Review', 'Prüfung'),
            body: tr(
              'Lexojmë CV-në dhe letrën tuaj dhe i krahasojmë me kërkesat e pozicionit.',
              'We read your CV and letter and compare them with what the position asks for.',
              'Wir lesen Ihren Lebenslauf und Ihr Anschreiben und gleichen sie mit der Stelle ab.',
            ),
          },
          {
            icon: '📞',
            title: tr('Biseda', 'A conversation', 'Gespräch'),
            body: tr(
              'Nëse profili përputhet, ju telefonojmë për një bisedë të shkurtër njohëse.',
              'If your profile fits, we call you for a short introductory conversation.',
              'Passt Ihr Profil, rufen wir Sie für ein kurzes Kennenlerngespräch an.',
            ),
          },
          {
            icon: '✉️',
            title: tr('Përgjigjja', 'The answer', 'Die Antwort'),
            body: tr(
              'Ju kontaktojmë brenda pak ditësh, me email ose në telefonin që latë.',
              'We contact you within a few days, by email or on the phone number you left.',
              'Wir melden uns innerhalb weniger Tage, per E-Mail oder unter der angegebenen Nummer.',
            ),
          },
        ],
      ),

      facts({
        label: tr(
          'Aplikimi juaj · ashtu si e dërguat',
          'Your application · as you sent it',
          'Ihre Bewerbung · wie Sie sie gesendet haben',
        ),
        rows: [
          { label: tr('Pozicioni', 'Position', 'Stelle'), value: '{{ position.title }}' },
          {
            label: tr('Departamenti', 'Department', 'Abteilung'),
            value: '{{ position.department }}',
          },
          { label: tr('Vendndodhja', 'Location', 'Standort'), value: '{{ position.location }}' },
          {
            label: tr('Orari', 'Hours', 'Arbeitszeit'),
            value: '{{ position.employment_type }}',
          },
          { label: tr('Emri', 'Name', 'Name'), value: '{{ full_name }}' },
          { label: tr('Telefoni', 'Phone', 'Telefon'), value: '{{ phone }}' },
          { label: tr('CV', 'CV', 'Lebenslauf'), value: '{{ cv }}' },
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
              ' · Keni harruar diçka? Na shkruani dhe e shtojmë në aplikim.',
              ' · Forgot something? Write to us and we will add it to your application.',
              ' · Etwas vergessen? Schreiben Sie uns, und wir ergänzen Ihre Bewerbung.',
            ),
          },
        ]),
      }),

      callToAction({
        title: tr(
          'Njihuni me ne ndërkohë',
          'Get to know us in the meantime',
          'Lernen Sie uns schon kennen',
        ),
        body: tt(
          tr(
            'Kush jemi, si e blejmë një makinë nga fillimi deri te pagesa dhe pse njerëzit na besojnë — gjithçka në një faqe.',
            'Who we are, how we buy a car from first form to payment, and why people trust us — all on one page.',
            'Wer wir sind, wie wir ein Auto vom ersten Formular bis zur Zahlung kaufen und warum man uns vertraut — alles auf einer Seite.',
          ),
        ),
        button: { label: tr('Rreth nesh', 'About us', 'Über uns'), href: '{{ site.about_url }}' },
      }),

      siteFooter({
        links: [
          { label: 'marrimauto.com', href: '{{ brand.website }}' },
          { label: tr('Karriera', 'Careers', 'Karriere'), href: '{{ site.careers_url }}' },
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
              ' sepse aplikuat për një pozicion pune në ',
              ' because you applied for a position at ',
              ' gesendet, weil Sie sich bei ',
            ),
          },
          v('brand.name'),
          {
            text: say(
              l,
              '. Ju lutemi mos iu përgjigjni drejtpërdrejt.',
              '. Please do not reply to it directly.',
              ' beworben haben. Bitte antworten Sie nicht direkt darauf.',
            ),
          },
        ]),
        unsubscribe: false,
      }),
    ],
  );
}

/** Realistic data for the preview and the parity fixture. */
export const JOB_APPLICATION_RECEIVED_SAMPLE: Record<string, unknown> = {
  recipient: { name: 'Arta Hoxha', email: 'arta@example.com' },
  code: 'JA-2026-00042',
  first_name: 'Arta',
  full_name: 'Arta Hoxha',
  phone: '+355 69 123 4567',
  position: {
    title: 'Vlerësues automjetesh',
    department: 'Operacionet',
    location: 'Tiranë',
    employment_type: 'Kohë e plotë',
    url: 'https://marrimauto.com/work-with-us/vleresues-automjetesh',
  },
  cv: 'Po, u bashkëngjit',
  submitted_at: '2026-10-02T19:35:00Z',
  site: {
    careers_url: 'https://marrimauto.com/work-with-us',
    about_url: 'https://marrimauto.com/about',
    contact_url: 'https://marrimauto.com/contact',
  },
};
