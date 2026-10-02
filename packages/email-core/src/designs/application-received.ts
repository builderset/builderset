import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { v } from '../rich-text';
import { buildEmail } from '../sample';
import { bold, ORANGE_DEEP, PAPER, t, TEXT } from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * "We have your application" — sent the moment a valuation request arrives,
 * built from the newsletter's own parts so the two read as one family.
 *
 * In the order the reader needs it: it arrived and a person is on it (the
 * hero), the application code to keep (the orange note), what happens next
 * (three cards), the car exactly as they sent it — so a wrong plate or
 * mileage is caught now rather than at the inspection — and something useful
 * to do while they wait.
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
        subject: 'Aplikimi {{ code }} është në proces vlerësimi',
        preheader:
          'Faleminderit! Po e vlerësojmë {{ car.brand }} {{ car.model }} — oferta vjen me email brenda 24 orësh.',
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
      masthead([{ text: 'Aplikimi · ' }, v('code')]),

      hero({
        eyebrows: [heroEyebrow('✓  Aplikimi u pranua')],
        title: 'Faleminderit! Po e vlerësojmë makinën tuaj',
        body: [
          { text: 'Aplikimi për ' },
          strong('car.brand'),
          { text: ' ' },
          strong('car.model'),
          { text: ' me targë ' },
          strong('plate'),
          {
            text: ' është në proces vlerësimi. Ekipi ynë krahason tregun dhe ju dërgon një ofertë me email sapo të jetë gati.',
          },
        ],
        button: { label: 'Na shkruani për aplikimin →', href: '{{ site.contact_url }}' },
      }),

      note([
        bold('Kodi i aplikimit: '),
        strong('code'),
        { text: ' — ruajeni, do t’ju duhet kur të flisni me ekipin tonë.' },
      ]),

      cards('Çfarë ndodh më pas', 'Tre hapa deri te pagesa', [
        {
          icon: '🔍',
          title: 'Vlerësimi',
          body: 'Ekipi ynë shqyrton të dhënat dhe i krahason me çmimet e tregut.',
        },
        {
          icon: '💶',
          title: 'Oferta',
          body: 'Brenda 24 orësh merrni me email dy çmime: cash dhe me bankë.',
        },
        {
          icon: '🤝',
          title: 'Kontrolli & pagesa',
          body: 'Nëse e pranoni, caktoni datën dhe pikën e kontrollit — paguheni në vend.',
        },
      ]),

      facts({
        label: 'Mjeti juaj · ashtu si e dërguat',
        rows: [
          { label: 'Mjeti', value: '{{ car.brand }} {{ car.model }} {{ car.variant }}' },
          { label: 'Viti', value: '{{ year }}' },
          { label: 'Kilometrazhi', value: '{{ car.odometer | number }} km' },
          { label: 'Karburanti · Kambio', value: '{{ car.fuel }} · {{ car.transmission }}' },
          { label: 'Targa', value: '{{ plate }}' },
          { label: 'Rrethi', value: '{{ district }}' },
        ],
        note: [
          { text: 'Dërguar më ' },
          {
            text: '{{submitted_at}}',
            marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
          },
          {
            text: ' · Diçka nuk është e saktë? Na shkruani dhe e rregullojmë para vlerësimit.',
          },
        ],
      }),

      callToAction({
        title: 'Ndërkohë, përgatitni dokumentet',
        body: t(
          'Leja e qarkullimit, kolaudimi dhe siguracioni: ja çfarë t’ju duhet ditën e kontrollit, që pagesa të bëhet në vend.',
        ),
        button: { label: 'Lexo udhëzuesin', href: '{{ site.blog_url }}' },
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
          { text: '. Ju lutemi mos iu përgjigjni drejtpërdrejt.' },
        ],
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
    contact_url: 'https://blejmauto.com/contact',
    blog_url: 'https://blejmauto.com/blog',
  },
};
