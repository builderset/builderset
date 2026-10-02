import type { ElementRegistry } from '@motors/builder-core';

import { pad } from '../fields';
import { v, type EmailRichText } from '../rich-text';
import { block, buildEmail, row, section } from '../sample';
import type { EmailDocument } from '../document';

/**
 * The monthly newsletter, in the site's own look: the near-black hero and the
 * orange of blejmauto.com, Sora for display type and Poppins for reading, as
 * on the web.
 *
 * Everything that changes is a variable of the `newsletter` email type (see
 * `api/app/domains/email_builder/types.py`), filled at send time from the
 * database: the edition, the latest articles in the reader's language, the
 * last 30 days of valuations, and the subscriber's own details. Blocks that
 * would be empty — no articles yet, no valuations this month — hide on a
 * condition rather than showing a hollow box, and the welcome note shows only
 * on the email sent right after signing up.
 */

const INK = '#0b1018';
const ORANGE = '#da6c1e';
const ORANGE_DEEP = '#ba5702';
const ORANGE_SOFT = '#fff4ec';
const TEXT = '#1b1e22';
const MUTED = '#626569';
const LINE = '#e6e8eb';
const PAPER = '#ffffff';
const MIST = '#f6f7f9';

const t = (text: string): EmailRichText => [{ text }];
const bold = (text: string) => ({ text, marks: [{ type: 'bold' as const }] });
const when = (variable: string, op: 'exists' | 'missing' | 'gt', value?: string) => ({
  hideOn: 'none' as const,
  when: [{ var: variable, op, ...(value === undefined ? {} : { value }) }],
});

const eyebrow = (text: string, color: string, extra: Record<string, unknown> = {}) =>
  block('text', {
    text: t(text),
    size: 12,
    weight: '600',
    letterSpacing: 2,
    transform: 'uppercase',
    color,
    padding: pad(0, 0, 10, 0),
    ...extra,
  });

/** The three things every issue carries — the same promise the signup form makes. */
const promise = (icon: string, title: string, body: string) => ({
  props: {
    background: MIST,
    radius: 14,
    padding: pad(20, 18, 18, 18),
  },
  blocks: [
    block('text', { text: t(icon), size: 26, lineHeight: 1, padding: pad(0, 0, 10, 0) }),
    block('heading', {
      text: t(title),
      level: 3,
      size: 16,
      font: 'sora',
      color: TEXT,
      padding: pad(0, 0, 6, 0),
    }),
    block('text', { text: t(body), size: 14, lineHeight: 1.55, color: MUTED, padding: pad(0) }),
  ],
});

export function newsletterEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Newsletter — tregu i makinave',
        subject: 'Tregu i makinave · {{ edition.label }}',
        preheader:
          'Çmimet, ndryshimet ligjore dhe këshilla praktike — përmbledhja e muajit nga blejmauto.com.',
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
        utm: { enabled: true, source: 'newsletter', medium: 'email', campaign: 'monthly' },
      },
    },
    [
      // ── Masthead ────────────────────────────────────────────────────────
      section({ background: INK, padding: pad(22, 32, 18, 32), radius: 0 }, [
        row(
          '50-50',
          [
            [
              block('text', {
                text: [{ text: 'blejmauto', marks: [{ type: 'bold' }] }, { text: '.com' }],
                font: 'sora',
                size: 22,
                lineHeight: 1.2,
                letterSpacing: -0.5,
                color: PAPER,
                padding: pad(0),
              }),
            ],
            [
              block('text', {
                text: [{ text: 'Newsletter · ' }, v('edition.label')],
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
      section({ background: INK, padding: pad(28, 32, 44, 32) }, [
        row('100', [
          [
            eyebrow('Mirë se erdhe në listë', ORANGE, { display: when('is_welcome', 'exists') }),
            eyebrow('Përmbledhja e muajit', ORANGE, { display: when('is_welcome', 'missing') }),
            block('heading', {
              text: t('Çmimet e tregut, një herë në muaj'),
              level: 1,
              size: 38,
              font: 'sora',
              weight: '700',
              letterSpacing: -1,
              color: PAPER,
              padding: pad(0, 0, 14, 0),
            }),
            block('text', {
              text: t(
                'Si lëvizën çmimet e makinave, çfarë ndryshoi në ligj dhe disa këshilla praktike për ta shitur makinën tuaj me kokë të ftohtë. Shkurt, një herë në muaj — pa reklama.',
              ),
              size: 16,
              lineHeight: 1.65,
              color: '#c6ccd4',
              padding: pad(0, 0, 26, 0),
            }),
            block('button', {
              label: 'Merr një ofertë për makinën →',
              href: '{{ site.valuation_url }}',
              background: ORANGE,
              textColor: PAPER,
              radius: 40,
              paddingX: 26,
              paddingY: 14,
              size: 15,
              weight: '600',
              align: 'left',
              padding: pad(0),
            }),
          ],
        ]),
      ]),

      // ── Welcome note (the email right after signing up only) ────────────
      section(
        {
          background: ORANGE_SOFT,
          padding: pad(22, 32, 22, 32),
          display: when('is_welcome', 'exists'),
        },
        [
          row('100', [
            [
              block('text', {
                text: [
                  bold('Faleminderit që u abonuat! '),
                  { text: 'Adresa ' },
                  {
                    text: '{{subscriber.email}}',
                    marks: [{ type: 'bold' }, { type: 'variable', path: 'subscriber.email' }],
                  },
                  {
                    text: ' është në listë. Newsletter-i vjen në fillim të çdo muaji — asgjë tjetër, dhe adresën nuk ia japim askujt.',
                  },
                ],
                size: 15,
                lineHeight: 1.6,
                color: '#5a2a07',
                padding: pad(0),
              }),
            ],
          ]),
        ],
      ),

      // ── What every issue carries ────────────────────────────────────────
      section({ background: PAPER, padding: pad(36, 32, 12, 32) }, [
        row('100', [
          [
            eyebrow('Çfarë gjeni në çdo numër', ORANGE_DEEP),
            block('heading', {
              text: t('Tre gjëra, të shpjeguara qartë'),
              level: 2,
              size: 24,
              font: 'sora',
              letterSpacing: -0.5,
              padding: pad(0, 0, 18, 0),
            }),
          ],
        ]),
        row(
          '33-33-33',
          [
            promise(
              '📈',
              'Lëvizjet e çmimeve',
              'Si ndryshuan çmimet sipas markës dhe vitit gjatë muajit të fundit.',
            ),
            promise(
              '⚖️',
              'Ndryshimet ligjore',
              'Taksa, kontroll teknik dhe rregulla që prekin shitjen e një automjeti.',
            ),
            promise(
              '💡',
              'Këshilla praktike',
              'Si ta përgatisni makinën dhe dokumentet për një shitje të shpejtë.',
            ),
          ],
          { gap: 12, padding: pad(0, 0, 24, 0) },
        ),
      ]),

      // ── The market in numbers (only when there were valuations) ─────────
      section(
        {
          background: PAPER,
          padding: pad(12, 32, 28, 32),
          display: when('market.valuations', 'gt', '0'),
        },
        [
          row('100', [
            {
              props: {
                background: MIST,
                radius: 16,
                padding: pad(24, 24, 18, 24),
                borderWidth: 1,
                borderColor: LINE,
              },
              blocks: [
                eyebrow('Tregu në shifra · 30 ditët e fundit', ORANGE_DEEP),
                block('key-value', {
                  rows: [
                    { label: 'Makina të vlerësuara', value: '{{ market.valuations | number }}' },
                    {
                      label: 'Oferta mesatare (cash)',
                      value: '{{ market.average_offer | money }}',
                    },
                    { label: 'Marka më e kërkuar', value: '{{ market.top_brand }}' },
                  ],
                  size: 15,
                  labelColor: MUTED,
                  valueColor: TEXT,
                  borderColor: LINE,
                  background: null,
                  padding: pad(0, 0, 10, 0),
                }),
                block('text', {
                  text: [
                    {
                      text: 'Shifrat vijnë nga vlerësimet që ekipi ynë ka bërë këtë muaj — jo nga shpallje me çmime të fryra.',
                    },
                  ],
                  size: 13,
                  lineHeight: 1.5,
                  color: MUTED,
                  padding: pad(4, 0, 0, 0),
                }),
              ],
            },
          ]),
        ],
      ),

      // ── From the blog (only when there is something to read) ──────────
      section(
        {
          background: PAPER,
          padding: pad(8, 32, 12, 32),
          display: when('articles_count', 'gt', '0'),
        },
        [
          row('100', [
            [
              block('divider', { color: LINE, padding: pad(0, 0, 24, 0) }),
              eyebrow('Nga blogu', ORANGE_DEEP),
              block('heading', {
                text: t('Lexo këtë muaj'),
                level: 2,
                size: 24,
                font: 'sora',
                letterSpacing: -0.5,
                padding: pad(0, 0, 8, 0),
              }),
              block('repeat', { list: 'articles', max: 3 }, [
                block('text', {
                  text: [
                    v('item.category'),
                    { text: ' · ' },
                    v('item.reading_minutes'),
                    { text: ' min lexim' },
                  ],
                  size: 12,
                  weight: '600',
                  letterSpacing: 1,
                  transform: 'uppercase',
                  color: ORANGE_DEEP,
                  padding: pad(18, 0, 6, 0),
                }),
                block('heading', {
                  text: [v('item.title')],
                  level: 3,
                  size: 20,
                  font: 'sora',
                  letterSpacing: -0.3,
                  padding: pad(0, 0, 8, 0),
                }),
                block('text', {
                  text: [v('item.excerpt')],
                  size: 15,
                  lineHeight: 1.6,
                  color: MUTED,
                  padding: pad(0, 0, 12, 0),
                }),
                block('button', {
                  label: 'Lexo artikullin →',
                  href: '{{ item.url }}',
                  background: PAPER,
                  textColor: ORANGE_DEEP,
                  borderColor: '#f0c9ab',
                  borderWidth: 1,
                  radius: 40,
                  paddingX: 18,
                  paddingY: 9,
                  size: 14,
                  weight: '600',
                  fullWidthMobile: false,
                  padding: pad(0, 0, 18, 0),
                }),
                block('divider', { color: LINE, padding: pad(0) }),
              ]),
              block('button', {
                label: 'Të gjithë artikujt',
                href: '{{ site.blog_url }}',
                background: INK,
                textColor: PAPER,
                radius: 40,
                paddingX: 22,
                paddingY: 12,
                size: 14,
                align: 'center',
                fullWidthMobile: false,
                padding: pad(24, 0, 8, 0),
              }),
            ],
          ]),
        ],
      ),

      // ── Selling? ────────────────────────────────────────────────────────
      section({ background: PAPER, padding: pad(16, 32, 36, 32) }, [
        row('100', [
          {
            props: { background: INK, radius: 18, padding: pad(30, 28, 30, 28) },
            blocks: [
              block('heading', {
                text: t('Po mendoni ta shisni makinën?'),
                level: 2,
                size: 24,
                font: 'sora',
                letterSpacing: -0.5,
                color: PAPER,
                align: 'center',
                padding: pad(0, 0, 10, 0),
              }),
              block('text', {
                text: t(
                  'Plotësoni formularin në dy minuta dhe merrni një ofertë reale, me pagesë të menjëhershme pas kontrollit.',
                ),
                size: 15,
                lineHeight: 1.6,
                color: '#c6ccd4',
                align: 'center',
                padding: pad(0, 0, 20, 0),
              }),
              block('button', {
                label: 'Vlerëso makinën falas',
                href: '{{ site.valuation_url }}',
                background: ORANGE,
                textColor: PAPER,
                radius: 40,
                paddingX: 26,
                paddingY: 14,
                size: 15,
                align: 'center',
                padding: pad(0),
              }),
            ],
          },
        ]),
      ]),

      // ── Footer ──────────────────────────────────────────────────────────
      section({ background: MIST, padding: pad(28, 32, 30, 32) }, [
        row('100', [
          [
            block('menu', {
              items: [
                { label: 'Blogu', href: '{{ site.blog_url }}' },
                { label: 'Vlerëso makinën', href: '{{ site.valuation_url }}' },
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
              size: 32,
              gap: 10,
              align: 'center',
              padding: pad(0, 0, 18, 0),
            }),
            block('footer', {
              text: [
                { text: 'Ju e merrni këtë email sepse u abonuat në ' },
                v('brand.name'),
                { text: ' më ' },
                {
                  text: '{{subscriber.since}}',
                  marks: [{ type: 'variable', path: 'subscriber.since', format: 'date' }],
                },
                { text: ' me adresën ' },
                v('subscriber.email'),
                { text: '.' },
              ],
              showAddress: true,
              showUnsubscribe: true,
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
export const NEWSLETTER_SAMPLE: Record<string, unknown> = {
  recipient: { name: '', email: 'arta@example.com' },
  subscriber: {
    email: 'arta@example.com',
    since: '2026-09-28T09:14:00Z',
    source: 'home',
  },
  is_welcome: true,
  edition: { label: 'Tetor 2026' },
  site: {
    blog_url: 'https://blejmauto.com/blog',
    valuation_url: 'https://blejmauto.com/valuation',
    contact_url: 'https://blejmauto.com/contact',
  },
  market: { valuations: 184, average_offer: 8650, top_brand: 'Volkswagen' },
  articles_count: 2,
  articles: [
    {
      title: 'Sa vlen realisht makina ime?',
      excerpt:
        "Pesë gjërat që e ngrenë ose e ulin çmimin më shumë sesa kilometrat — dhe si t'i kontrolloni vetë para se të kërkoni një ofertë.",
      category: 'Çmimet',
      reading_minutes: 6,
      url: 'https://blejmauto.com/blog/sa-vlen-makina-ime',
    },
    {
      title: 'Dokumentet që ju duhen për ta shitur makinën',
      excerpt:
        'Leja e qarkullimit, siguracioni, kolaudimi: çfarë duhet të keni gati dhe çfarë mund të zgjidhet ditën e shitjes.',
      category: 'Këshilla',
      reading_minutes: 4,
      url: 'https://blejmauto.com/blog/dokumentet-per-shitje',
    },
  ],
  links: { unsubscribe: 'https://blejmauto.com/newsletter/unsubscribe/sample-token' },
};
