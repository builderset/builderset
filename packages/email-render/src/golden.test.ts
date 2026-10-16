import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  block,
  buildEmail,
  createEmailRegistry,
  EMAIL_FONTS,
  kitchenSinkEmail,
  APPLICATION_RECEIVED_SAMPLE,
  applicationReceivedEmail,
  APPLICATION_REFUSED_AFTER_BOOKING_SAMPLE,
  APPLICATION_REFUSED_SAMPLE,
  applicationRefusedEmail,
  CONTACT_RECEIVED_SAMPLE,
  contactReceivedEmail,
  JOB_APPLICATION_RECEIVED_SAMPLE,
  jobApplicationReceivedEmail,
  PARTNER_APPLICATION_RECEIVED_SAMPLE,
  partnerApplicationReceivedEmail,
  VALUATION_OFFER_SAMPLE,
  valuationOfferEmail,
  STAFF_NOTIFICATION_SAMPLE,
  staffNotificationEmail,
  NEWSLETTER_SAMPLE,
  newsletterEmail,
  VERIFICATION_CODE_SAMPLE,
  verificationCodeEmail,
  pad,
  row,
  ROW_LAYOUTS,
  section,
  starterEmail,
  v,
  type EmailDocument,
} from '@motors/email-core';
import { describe, expect, it } from 'vitest';

import { DEFAULT_BRAND, socialIconUrl, type BrandKit } from './context';
import { renderEmail } from './html';

/**
 * The golden fixtures: what the API's Python port of this renderer must
 * reproduce byte for byte (`api/tests/unit/test_email_render_parity.py`).
 *
 * Each case is written under `api/tests/fixtures/email/golden/` as its input
 * (`<name>.json`) and its output (`<name>.html`, `<name>.txt`); the font stacks
 * and row layouts the Python side needs are written beside its renderer. Run
 * with `UPDATE_FIXTURES=1` after changing the renderer, and commit the files —
 * a stale fixture fails here first, and the Python test then says exactly where
 * the port diverged.
 */

const registry = createEmailRegistry();
const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const update = process.env.UPDATE_FIXTURES === '1';
const ASSET_BASE = 'https://cdn.test/';
const ICON_BASE = 'https://site.test/';
/** Fixed, so the output does not change with the day the test runs. */
const NOW = { now: '2026-10-02T19:35:00.000Z', current_year: 2026 };

/** The kit the API falls back to — what a real send uses until one is saved. */
const SITE_BRAND: BrandKit = {
  ...DEFAULT_BRAND,
  name: 'marrimauto.com',
  website: 'https://marrimauto.com',
  address: 'Tiranë, Albania',
};

function expectFile(relative: string, content: string) {
  const path = join(root, relative);
  if (update) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return;
  }
  let committed = '';
  try {
    committed = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    throw new Error(`${relative} is missing — run with UPDATE_FIXTURES=1 and commit it.`);
  }
  expect(committed, `${relative} is stale — run with UPDATE_FIXTURES=1`).toBe(content);
}

interface GoldenCase {
  name: string;
  document: EmailDocument;
  data: Record<string, unknown>;
  locale: string;
  brand: BrandKit;
  currency?: string;
}

const image = { key: 'email-image/2026/01/sample0000000000.jpg', width: 1200, height: 600 };

/** Every edge the port has to get exactly right, in one email. */
function edgesEmail(): EmailDocument {
  return buildEmail(
    registry,
    {
      stable: true,
      meta: { name: 'Edges', subject: 'Hi {{ recipient.name }} <&>', preheader: '' },
      settings: {
        darkMode: 'custom',
        font: 'playfair-display',
        utm: { enabled: true, source: 'news letter', medium: 'email', campaign: 'oct & nov' },
      },
    },
    [
      section(
        {
          fullWidth: true,
          backgroundImage: image,
          radius: 12,
          backdrop: '#101010',
          padding: pad(10, 20, 30, 40),
        },
        [
          row(
            '67-33',
            [
              {
                props: { background: '#fafafa', radius: 8, borderWidth: 2, padding: pad(5) },
                blocks: [
                  block('logo', { media: image, width: 120 }),
                  block('heading', {
                    level: 2,
                    size: 30,
                    weight: '800',
                    letterSpacing: 1.5,
                    transform: 'uppercase',
                    text: [
                      { text: 'Fonts ', marks: [{ type: 'font', family: 'inter' }] },
                      { text: 'and ', marks: [{ type: 'italic' }, { type: 'underline' }] },
                      {
                        text: 'marks',
                        marks: [{ type: 'link', href: 'https://example.com/a?b=1' }],
                      },
                    ],
                  }),
                  block('text', {
                    text: [
                      { text: 'Line one\nline two ', marks: [{ type: 'bold' }] },
                      { text: 'strike ', marks: [{ type: 'strike' }] },
                      { text: 'code ', marks: [{ type: 'code' }] },
                      { text: 'mark ', marks: [{ type: 'highlight' }] },
                      { text: 'sub', marks: [{ type: 'sub' }] },
                      { text: 'sup', marks: [{ type: 'sup' }] },
                      v('recipient.name', 'friend'),
                      { text: ' / ' },
                      v('missing.value'),
                    ],
                    align: 'justify',
                    lineHeight: 1.75,
                  }),
                ],
              },
              [
                block('image', {
                  media: image,
                  alt: 'Wide {{ recipient.name }}',
                  href: '{{ unsafe }}',
                  radius: 6,
                  width: 300,
                }),
                block('spacer', { height: 24, mobileHeight: 8 }),
                block('spacer', { height: 12, mobileHeight: 8 }),
                block('text', {
                  text: [{ text: 'Mobile only' }],
                  display: { hideOn: 'desktop', when: [] },
                }),
                block('text', {
                  text: [{ text: 'Desktop only' }],
                  display: { hideOn: 'mobile', when: [] },
                }),
              ],
            ],
            { reverseOnMobile: true, gap: 20, verticalAlign: 'middle', background: '#eeeeee' },
          ),
        ],
      ),
      section(
        { display: { hideOn: 'none', when: [{ var: 'show_more', op: 'eq', value: 'yes' }] } },
        [
          row('25-25-25-25', [
            [
              block('text', {
                text: [{ text: 'gt' }],
                display: { hideOn: 'none', when: [{ var: 'count', op: 'gt', value: '2' }] },
              }),
            ],
            [
              block('text', {
                text: [{ text: 'lt' }],
                display: { hideOn: 'none', when: [{ var: 'count', op: 'lt', value: '2' }] },
              }),
            ],
            [
              block('text', {
                text: [{ text: 'contains' }],
                display: { hideOn: 'none', when: [{ var: 'tag', op: 'contains', value: 'VIP' }] },
              }),
            ],
            [
              block('text', {
                text: [{ text: 'neq' }],
                display: {
                  hideOn: 'none',
                  when: [
                    { var: 'tag', op: 'neq', value: 'x' },
                    { var: 'nothing', op: 'missing' },
                  ],
                },
              }),
            ],
          ]),
        ],
      ),
      section({}, [
        row('100', [
          [
            block('list', { style: 'number', align: 'center' }),
            block('list', { style: 'check' }),
            block('menu', {
              separator: 'bar',
              items: [
                { label: 'Home', href: '{{ brand.website }}' },
                { label: 'Bad', href: '{{ unsafe }}' },
                { label: 'Plain', href: '' },
              ],
            }),
            block('button', {
              label: 'Go 🚗 {{ recipient.name }}',
              href: 'https://example.com/go?x=1',
              borderWidth: 2,
              borderColor: '#ff0000',
              radius: 20,
              paddingX: 30,
              paddingY: 10,
              size: 17,
              align: 'right',
              fullWidthMobile: false,
              letterSpacing: 0.5,
            }),
            block('product', {
              image,
              alt: 'Side',
              layout: 'side',
              href: 'https://example.com/p',
              buttonLabel: 'Buy',
              oldPrice: '€99',
            }),
            block('line-items', {
              list: 'order.items',
              totalLabel: 'Total',
              totalValue: '{{ order.total | money }}',
            }),
            block('divider', { align: 'left', width: 60, style: 'dashed', thickness: 2 }),
            block('divider', { align: 'right' }),
            block('quote', { cite: '', background: '#f0f0f0' }),
            block('social', { appearance: 'text', style: 'light', gap: 7 }),
            block('social', { appearance: 'icons', style: 'color', size: 36, gap: 12 }),
            block('survey', { scale: 10 }),
            block('footer', { showPreferences: true, showViewInBrowser: true, align: 'left' }),
          ],
        ]),
      ]),
    ],
  );
}

/** Every format, in a text block and in a key-value table. */
function formatsEmail(): EmailDocument {
  const fmt = (label: string, token: string) => ({ label, value: token });
  return buildEmail(
    registry,
    {
      stable: true,
      meta: {
        name: 'Formats',
        subject: 'Formats {{ when | date }}',
        preheader: '{{ amount | money }}',
      },
    },
    [
      section({}, [
        row('100', [
          [
            block('key-value', {
              rows: [
                fmt('date', '{{ when | date }}'),
                fmt('date_long', '{{ when | date_long }}'),
                fmt('time', '{{ when | time }}'),
                fmt('datetime', '{{ when | datetime }}'),
                fmt('morning', '{{ morning | datetime }}'),
                fmt('day only', '{{ day | date_long }}'),
                fmt('money', '{{ amount | money }}'),
                fmt('money negative', '{{ refund | money }}'),
                fmt('money small', '{{ small | money }}'),
                fmt('number', '{{ big | number }}'),
                fmt('number 4', '{{ four | number }}'),
                fmt('number half', '{{ half | number }}'),
                fmt('number string', '{{ numeric_text | number }}'),
                fmt('upper', '{{ word | upper }}'),
                fmt('lower', '{{ word | lower }}'),
                fmt('capitalize', '{{ word | capitalize }}'),
                fmt('bool', '{{ flag }}'),
                fmt('float', '{{ ratio }}'),
                fmt('length', '{{ things.length }}'),
                fmt('bad date', '{{ word | date }}'),
              ],
            }),
            block('text', {
              text: [
                {
                  text: '{{when}}',
                  marks: [{ type: 'variable', path: 'when', format: 'date_long' }],
                },
              ],
            }),
          ],
        ]),
      ]),
    ],
  );
}

const FORMAT_DATA = {
  when: '2026-10-02T19:35:00Z',
  morning: '2026-01-15T07:05:00Z',
  day: '2026-09-15',
  amount: 12500.5,
  refund: -950,
  small: 0.4,
  big: 1234567.891,
  four: 1234.5,
  half: 1.0005,
  numeric_text: '  42.5 ',
  word: 'élan vital',
  flag: true,
  ratio: 0.1 + 0.2,
  things: [1, 2, 3],
};

const ORDER = {
  recipient: { name: 'Arta <b>' },
  order: {
    total: 120,
    items: [
      { name: 'Filter', quantity: 1, price: '€20' },
      { name: 'Oil & co', quantity: 2.5, price: 50 },
    ],
  },
};

const CASES: GoldenCase[] = [
  {
    name: 'kitchen-sink',
    document: kitchenSinkEmail(registry),
    data: { ...NOW, ...ORDER },
    locale: 'en',
    brand: DEFAULT_BRAND,
  },
  {
    name: 'starter-sq',
    document: starterEmail(
      registry,
      { subject: 'Hi {{ recipient.name }}', preheader: 'Hello' },
      true,
    ),
    data: { ...NOW, recipient: { name: 'Arta' }, links: { unsubscribe: 'https://x.test/u/1' } },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'edges',
    document: edgesEmail(),
    data: {
      ...NOW,
      ...ORDER,
      unsafe: 'javascript:alert(1)',
      show_more: 'yes',
      count: '3',
      tag: 'a vip customer',
      links: {
        unsubscribe: 'https://x.test/u?id=1',
        preferences: 'https://x.test/p',
        view_in_browser: '',
      },
    },
    locale: 'de',
    brand: { ...SITE_BRAND, logo: image, colors: { ...SITE_BRAND.colors, primary: '#ba5702' } },
  },
  ...(['sq', 'de', 'en'] as const).map((locale) => ({
    name: `formats-${locale}`,
    document: formatsEmail(),
    data: { ...NOW, ...FORMAT_DATA },
    locale,
    brand: DEFAULT_BRAND,
  })),
  {
    name: 'newsletter-welcome',
    document: newsletterEmail(registry, { stable: true }),
    data: { ...NOW, ...NEWSLETTER_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'application-received',
    document: applicationReceivedEmail(registry, { stable: true }),
    data: { ...NOW, ...APPLICATION_RECEIVED_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'valuation-offer',
    document: valuationOfferEmail(registry, { stable: true }),
    data: { ...NOW, ...VALUATION_OFFER_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'application-refused',
    document: applicationRefusedEmail(registry, { stable: true }),
    data: { ...NOW, ...APPLICATION_REFUSED_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  // The other refusal moment: the stage switches the eyebrow and the note.
  {
    name: 'application-refused-after-booking',
    document: applicationRefusedEmail(registry, { stable: true }),
    data: { ...NOW, ...APPLICATION_REFUSED_AFTER_BOOKING_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'job-application-received',
    document: jobApplicationReceivedEmail(registry, { stable: true }),
    data: { ...NOW, ...JOB_APPLICATION_RECEIVED_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'partner-application-received',
    document: partnerApplicationReceivedEmail(registry, { stable: true }),
    data: { ...NOW, ...PARTNER_APPLICATION_RECEIVED_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'partner-application-received-valuer',
    document: partnerApplicationReceivedEmail(registry, { stable: true }),
    data: {
      ...NOW,
      ...PARTNER_APPLICATION_RECEIVED_SAMPLE,
      role: 'Vlerësues i pavarur',
      is_checkpoint: false,
      role_url: 'https://marrimauto.com/work-with-us/partner/vleresues-i-pavarur',
      business_name: '',
      identification_number: '',
      address: '',
      experience: '6 vite',
      has_vehicle: 'Po',
    },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'contact-received',
    document: contactReceivedEmail(registry, { stable: true }),
    data: { ...NOW, ...CONTACT_RECEIVED_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'contact-received-untitled',
    document: contactReceivedEmail(registry, { stable: true }),
    data: { ...NOW, ...CONTACT_RECEIVED_SAMPLE, title: '' },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'verification-code',
    document: verificationCodeEmail(registry, { stable: true }),
    data: { ...NOW, ...VERIFICATION_CODE_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  // Every ready-made design in its other two languages.
  ...(['en', 'de'] as const).flatMap((locale) =>
    (
      [
        ['application-received', applicationReceivedEmail, APPLICATION_RECEIVED_SAMPLE],
        ['valuation-offer', valuationOfferEmail, VALUATION_OFFER_SAMPLE],
        ['application-refused', applicationRefusedEmail, APPLICATION_REFUSED_SAMPLE],
        ['job-application-received', jobApplicationReceivedEmail, JOB_APPLICATION_RECEIVED_SAMPLE],
        [
          'partner-application-received',
          partnerApplicationReceivedEmail,
          PARTNER_APPLICATION_RECEIVED_SAMPLE,
        ],
        ['contact-received', contactReceivedEmail, CONTACT_RECEIVED_SAMPLE],
        ['verification-code', verificationCodeEmail, VERIFICATION_CODE_SAMPLE],
        ['newsletter-welcome', newsletterEmail, NEWSLETTER_SAMPLE],
        ['staff-notification', staffNotificationEmail, STAFF_NOTIFICATION_SAMPLE],
      ] as const
    ).map(([name, design, sample]) => ({
      name: `${name}-${locale}`,
      document: design(registry, { stable: true }),
      data: { ...NOW, ...sample },
      locale,
      brand: SITE_BRAND,
    })),
  ),
  {
    name: 'staff-notification',
    document: staffNotificationEmail(registry, { stable: true }),
    data: { ...NOW, ...STAFF_NOTIFICATION_SAMPLE },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'verification-code-bare',
    document: verificationCodeEmail(registry, { stable: true }),
    data: { ...NOW, recipient: { email: 'arta@example.com' }, code: '073150', expires_minutes: 5 },
    locale: 'sq',
    brand: SITE_BRAND,
  },
  {
    name: 'newsletter-monthly',
    document: newsletterEmail(registry, { stable: true }),
    data: {
      ...NOW,
      ...NEWSLETTER_SAMPLE,
      is_welcome: false,
      market: { valuations: 0, average_offer: null, top_brand: null },
      articles_count: 0,
      articles: [],
    },
    locale: 'sq',
    brand: SITE_BRAND,
  },
];

describe('golden fixtures for the Python port', () => {
  it('writes the data the port reads instead of re-typing it', () => {
    const fonts = Object.fromEntries(
      Object.entries(EMAIL_FONTS).map(([key, font]) => [
        key,
        { stack: font.stack, google: 'google' in font ? (font.google ?? null) : null },
      ]),
    );
    expectFile(
      '../../api/app/domains/email_builder/render/render_data.json',
      `${JSON.stringify({ fonts, rowLayouts: ROW_LAYOUTS }, null, 2)}\n`,
    );
  });

  it('writes the staff notification email the API sends until one is designed', () => {
    // `app/domains/notifications/delivery.py` renders this when no ACTIVE
    // `staff_notification` template exists, so the email channel works the
    // day it ships rather than the day somebody designs one.
    expectFile(
      '../../api/app/domains/notifications/staff_email.json',
      `${JSON.stringify(staffNotificationEmail(registry, { stable: true }), null, 2)}\n`,
    );
  });

  for (const golden of CASES) {
    it(`renders ${golden.name}`, () => {
      const rendered = renderEmail(golden.document, {
        assetUrl: (key) => `${ASSET_BASE}${key}`,
        socialIcon: socialIconUrl(ICON_BASE),
        brand: golden.brand,
        data: golden.data,
        locale: golden.locale,
        currency: golden.currency ?? 'EUR',
      });
      const input = {
        document: golden.document,
        data: golden.data,
        locale: golden.locale,
        brand: golden.brand,
        currency: golden.currency ?? 'EUR',
        assetBase: ASSET_BASE,
        iconBase: ICON_BASE,
        expected: { subject: rendered.subject, preheader: rendered.preheader },
      };
      const base = `../../api/tests/fixtures/email/golden/${golden.name}`;
      expectFile(`${base}.json`, `${JSON.stringify(input, null, 2)}\n`);
      expectFile(`${base}.html`, rendered.html);
      expectFile(`${base}.txt`, rendered.text);
    });
  }
});
