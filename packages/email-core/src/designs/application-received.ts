import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section } from '../sample';
import {
  eyebrow,
  INK,
  LINE,
  MIST,
  MUTED,
  ON_INK,
  ORANGE,
  ORANGE_DEEP,
  ORANGE_SOFT,
  PAPER,
  t,
  TEXT,
  wordmark,
} from './palette';

/**
 * "We have your application" — sent the moment a valuation request arrives.
 *
 * Three jobs, in the order the reader has them: reassure (it arrived, a
 * person will look at it), hand over the application code (the one thing
 * they will need on the phone later — so it gets the card), and say what
 * happens next, in the same three steps the site's success page lists.
 * The car's details are repeated back so a typo in the plate or the mileage
 * is caught now rather than at the inspection.
 *
 * The variables are the `application_received` type's: the application
 * (`code`, `plate`, `year`), the car (`car.*`), `district`, `submitted_at`,
 * and the site's links. Transactional: no unsubscribe link.
 */

const step = (number: string, title: string, body: string) => ({
  props: { background: MIST, radius: 14, padding: pad(18, 16, 16, 16) },
  blocks: [
    block('heading', {
      text: t(number),
      level: 3,
      size: 22,
      font: 'sora',
      weight: '700',
      color: ORANGE,
      padding: pad(0, 0, 6, 0),
    }),
    block('heading', {
      text: t(title),
      level: 3,
      size: 15,
      font: 'sora',
      color: TEXT,
      padding: pad(0, 0, 6, 0),
    }),
    block('text', { text: t(body), size: 13, lineHeight: 1.55, color: MUTED, padding: pad(0) }),
  ],
});

export function applicationReceivedEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
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
        width: 620,
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
      // ── Masthead ────────────────────────────────────────────────────────
      section({ background: INK, padding: pad(22, 32, 18, 32) }, [
        row(
          '50-50',
          [
            [wordmark()],
            [
              block('text', {
                text: [{ text: 'Aplikimi · ' }, v('code')],
                size: 12,
                weight: '500',
                letterSpacing: 1,
                transform: 'uppercase',
                align: 'right',
                color: '#9aa3ae',
                padding: pad(6, 0, 0, 0),
              }),
            ],
          ],
          { verticalAlign: 'middle', gap: 12 },
        ),
      ]),

      // ── Hero ────────────────────────────────────────────────────────────
      section({ background: INK, padding: pad(26, 32, 40, 32) }, [
        row('100', [
          [
            eyebrow('✓  Aplikimi u pranua', ORANGE),
            block('heading', {
              text: t('Faleminderit! Po e vlerësojmë makinën tuaj'),
              level: 1,
              size: 34,
              font: 'sora',
              letterSpacing: -0.8,
              color: PAPER,
              padding: pad(0, 0, 14, 0),
            }),
            block('text', {
              text: [
                { text: 'Aplikimi për ' },
                {
                  text: '{{car.brand}}',
                  marks: [{ type: 'bold' }, { type: 'variable', path: 'car.brand' }],
                },
                { text: ' ' },
                {
                  text: '{{car.model}}',
                  marks: [{ type: 'bold' }, { type: 'variable', path: 'car.model' }],
                },
                { text: ' me targë ' },
                {
                  text: '{{plate}}',
                  marks: [{ type: 'bold' }, { type: 'variable', path: 'plate' }],
                },
                {
                  text: ' është në proces vlerësimi. Ekipi ynë krahason tregun dhe ju dërgon një ofertë me email sapo vlerësimi të përfundojë.',
                },
              ],
              size: 16,
              lineHeight: 1.65,
              color: ON_INK,
              padding: pad(0),
            }),
          ],
        ]),
      ]),

      // ── The code, and the car as we received it ────────────────────────
      section({ background: PAPER, padding: pad(32, 32, 8, 32) }, [
        row('100', [
          {
            props: {
              background: ORANGE_SOFT,
              radius: 16,
              borderWidth: 1,
              borderColor: '#f3d4bd',
              padding: pad(20, 20, 18, 20),
            },
            blocks: [
              block('text', {
                text: t('Kodi i aplikimit'),
                size: 11,
                weight: '600',
                letterSpacing: 1.5,
                transform: 'uppercase',
                color: '#8a4a17',
                align: 'center',
                padding: pad(0, 0, 8, 0),
              }),
              block('heading', {
                text: [v('code')],
                level: 2,
                size: 28,
                font: 'sora',
                weight: '700',
                letterSpacing: 2,
                align: 'center',
                color: INK,
                padding: pad(0, 0, 8, 0),
              }),
              block('text', {
                text: t('Ruajeni — do t’ju duhet kur të flisni me ekipin tonë.'),
                size: 12,
                lineHeight: 1.5,
                color: '#8a4a17',
                align: 'center',
                padding: pad(0),
              }),
            ],
          },
        ]),
        row(
          '100',
          [
            {
              props: {
                background: PAPER,
                radius: 16,
                borderWidth: 1,
                borderColor: LINE,
                padding: pad(16, 18, 12, 18),
              },
              blocks: [
                eyebrow('Mjeti juaj', MUTED, { size: 11, padding: pad(0, 0, 4, 0) }),
                block('key-value', {
                  rows: [
                    { label: 'Mjeti', value: '{{ car.brand }} {{ car.model }} {{ car.variant }}' },
                    { label: 'Viti', value: '{{ year }}' },
                    { label: 'Kilometrazhi', value: '{{ car.odometer | number }} km' },
                    {
                      label: 'Karburanti · Kambio',
                      value: '{{ car.fuel }} · {{ car.transmission }}',
                    },
                    { label: 'Targa', value: '{{ plate }}' },
                    { label: 'Rrethi', value: '{{ district }}' },
                  ],
                  size: 14,
                  labelColor: MUTED,
                  valueColor: TEXT,
                  borderColor: LINE,
                  background: null,
                  padding: pad(0),
                }),
              ],
            },
          ],
          { padding: pad(14, 0, 0, 0) },
        ),
        row('100', [
          [
            block('text', {
              text: [
                { text: 'Dërguar më ' },
                {
                  text: '{{submitted_at}}',
                  marks: [{ type: 'variable', path: 'submitted_at', format: 'datetime' }],
                },
                {
                  text: ' · Diçka nuk është e saktë? Na shkruani dhe e rregullojmë para vlerësimit.',
                },
              ],
              size: 12,
              lineHeight: 1.5,
              color: MUTED,
              padding: pad(12, 0, 0, 0),
            }),
          ],
        ]),
      ]),

      // ── What happens next ──────────────────────────────────────────────
      section({ background: PAPER, padding: pad(28, 32, 32, 32) }, [
        row('100', [
          [
            eyebrow('Çfarë ndodh më pas', ORANGE_DEEP),
            block('heading', {
              text: t('Tre hapa deri te pagesa'),
              level: 2,
              size: 22,
              font: 'sora',
              letterSpacing: -0.5,
              padding: pad(0, 0, 16, 0),
            }),
          ],
        ]),
        row(
          '33-33-33',
          [
            step(
              '01',
              'Vlerësimi',
              'Ekipi ynë shqyrton të dhënat dhe i krahason me çmimet e tregut.',
            ),
            step('02', 'Oferta', 'Brenda 24 orësh merrni me email dy çmime: cash dhe me bankë.'),
            step(
              '03',
              'Kontrolli & pagesa',
              'Nëse e pranoni, caktoni datën dhe pikën e kontrollit — paguheni në vend.',
            ),
          ],
          { gap: 12 },
        ),
      ]),

      // ── Questions ──────────────────────────────────────────────────────
      section({ background: PAPER, padding: pad(0, 32, 36, 32) }, [
        row('100', [
          {
            props: { background: INK, radius: 18, padding: pad(26, 26, 26, 26) },
            blocks: [
              block('heading', {
                text: t('Keni pyetje për aplikimin?'),
                level: 2,
                size: 20,
                font: 'sora',
                color: PAPER,
                align: 'center',
                padding: pad(0, 0, 8, 0),
              }),
              block('text', {
                text: [
                  { text: 'Përmendni kodin ' },
                  {
                    text: '{{code}}',
                    marks: [{ type: 'bold' }, { type: 'variable', path: 'code' }],
                  },
                  { text: ' dhe ju përgjigjemi shpejt.' },
                ],
                size: 14,
                lineHeight: 1.6,
                color: ON_INK,
                align: 'center',
                padding: pad(0, 0, 18, 0),
              }),
              block('button', {
                label: 'Na kontaktoni',
                href: '{{ site.contact_url }}',
                background: ORANGE,
                textColor: PAPER,
                radius: 40,
                paddingX: 24,
                paddingY: 12,
                size: 15,
                align: 'center',
                padding: pad(0),
              }),
            ],
          },
        ]),
      ]),

      // ── Footer ──────────────────────────────────────────────────────────
      section({ background: MIST, padding: pad(26, 32, 28, 32) }, [
        row('100', [
          [
            block('menu', {
              items: [
                { label: 'blejmauto.com', href: '{{ brand.website }}' },
                { label: 'Blogu', href: '{{ site.blog_url }}' },
                { label: 'Kontakt', href: '{{ site.contact_url }}' },
              ],
              color: TEXT,
              size: 13,
              separator: 'dot',
              align: 'center',
              padding: pad(0, 0, 14, 0),
            }),
            block('social', {
              items: [
                { network: 'instagram', href: 'https://www.instagram.com/blejmauto' },
                { network: 'facebook', href: 'https://www.facebook.com/blejmauto' },
                { network: 'tiktok', href: 'https://www.tiktok.com/@blejmauto' },
              ],
              appearance: 'icons',
              style: 'dark',
              size: 30,
              gap: 10,
              align: 'center',
              padding: pad(0, 0, 16, 0),
            }),
            block('footer', {
              text: [
                { text: 'Ky email u dërgua te ' },
                v('recipient.email'),
                { text: ' sepse aplikuat për vlerësim në ' },
                v('brand.name'),
                { text: '. Ju lutemi mos iu përgjigjni drejtpërdrejt.' },
              ],
              showAddress: true,
              showUnsubscribe: false,
              showPreferences: false,
              showViewInBrowser: false,
              color: MUTED,
              size: 12,
              align: 'center',
              padding: pad(0),
            }),
          ],
        ]),
      ]),
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
