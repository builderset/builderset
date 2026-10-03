import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { v } from '../rich-text';
import { buildEmail } from '../sample';
import { bold, ORANGE_DEEP, PAPER, t, TEXT } from './palette';
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
        subject: 'E morëm aplikimin tuaj për {{ position.title }}',
        preheader:
          'Faleminderit, {{ first_name }}! Ekipi e shqyrton dhe ju kontakton brenda pak ditësh.',
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
      masthead([{ text: 'Karriera · ' }, v('code')]),

      hero({
        eyebrows: [heroEyebrow('✓  Aplikimi u mor')],
        title: 'Faleminderit që doni të punoni me ne',
        body: [
          { text: 'Përshëndetje ' },
          strong('first_name'),
          { text: ', aplikimi juaj për pozicionin ' },
          strong('position.title'),
          {
            text: ' arriti te ekipi ynë. E lexon një person, jo një filtër automatik.',
          },
        ],
        button: { label: 'Shiko pozicionin →', href: '{{ position.url }}' },
      }),

      note([
        bold('Referenca juaj: '),
        strong('code'),
        { text: ' — përmendeni nëse na shkruani për këtë aplikim.' },
      ]),

      cards('Çfarë ndodh më pas', 'Tre hapa deri te përgjigjja', [
        {
          icon: '📄',
          title: 'Shqyrtimi',
          body: 'Lexojmë CV-në dhe letrën tuaj dhe i krahasojmë me kërkesat e pozicionit.',
        },
        {
          icon: '📞',
          title: 'Biseda',
          body: 'Nëse profili përputhet, ju telefonojmë për një bisedë të shkurtër njohëse.',
        },
        {
          icon: '✉️',
          title: 'Përgjigjja',
          body: 'Ju kontaktojmë brenda pak ditësh, me email ose në telefonin që latë.',
        },
      ]),

      facts({
        label: 'Aplikimi juaj · ashtu si e dërguat',
        rows: [
          { label: 'Pozicioni', value: '{{ position.title }}' },
          { label: 'Departamenti', value: '{{ position.department }}' },
          { label: 'Vendndodhja', value: '{{ position.location }}' },
          { label: 'Orari', value: '{{ position.employment_type }}' },
          { label: 'Emri', value: '{{ full_name }}' },
          { label: 'Telefoni', value: '{{ phone }}' },
          { label: 'CV', value: '{{ cv }}' },
        ],
        note: [
          { text: 'Dërguar më ' },
          {
            text: '{{submitted_at}}',
            marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
          },
          { text: ' · Keni harruar diçka? Na shkruani dhe e shtojmë në aplikim.' },
        ],
      }),

      callToAction({
        title: 'Njihuni me ne ndërkohë',
        body: t(
          'Kush jemi, si e blejmë një makinë nga fillimi deri te pagesa dhe pse njerëzit na besojnë — gjithçka në një faqe.',
        ),
        button: { label: 'Rreth nesh', href: '{{ site.about_url }}' },
      }),

      siteFooter({
        links: [
          { label: 'blejmauto.com', href: '{{ brand.website }}' },
          { label: 'Karriera', href: '{{ site.careers_url }}' },
          { label: 'Kontakt', href: '{{ site.contact_url }}' },
        ],
        text: [
          { text: 'Ky email u dërgua te ' },
          v('recipient.email'),
          { text: ' sepse aplikuat për një pozicion pune në ' },
          v('brand.name'),
          { text: '. Ju lutemi mos iu përgjigjni drejtpërdrejt.' },
        ],
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
    url: 'https://blejmauto.com/work-with-us/vleresues-automjetesh',
  },
  cv: 'Po, u bashkëngjit',
  submitted_at: '2026-10-02T19:35:00Z',
  site: {
    careers_url: 'https://blejmauto.com/work-with-us',
    about_url: 'https://blejmauto.com/about',
    contact_url: 'https://blejmauto.com/contact',
  },
};
