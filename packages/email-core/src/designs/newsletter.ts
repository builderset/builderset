import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section } from '../sample';
import { bold, eyebrow, INK, LINE, MUTED, ORANGE_DEEP, PAPER, t, TEXT, when } from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

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
      masthead([{ text: 'Newsletter · ' }, v('edition.label')]),

      hero({
        eyebrows: [
          heroEyebrow('Mirë se erdhe në listë', when('is_welcome', 'exists')),
          heroEyebrow('Përmbledhja e muajit', when('is_welcome', 'missing')),
        ],
        title: 'Çmimet e tregut, një herë në muaj',
        body: t(
          'Si lëvizën çmimet e makinave, çfarë ndryshoi në ligj dhe disa këshilla praktike për ta shitur makinën tuaj me kokë të ftohtë. Shkurt, një herë në muaj — pa reklama.',
        ),
        button: { label: 'Merr një ofertë për makinën →', href: '{{ site.valuation_url }}' },
      }),

      // The welcome note — only on the email sent right after signing up.
      note(
        [
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
        when('is_welcome', 'exists'),
      ),

      cards('Çfarë gjeni në çdo numër', 'Tre gjëra, të shpjeguara qartë', [
        {
          icon: '📈',
          title: 'Lëvizjet e çmimeve',
          body: 'Si ndryshuan çmimet sipas markës dhe vitit gjatë muajit të fundit.',
        },
        {
          icon: '⚖️',
          title: 'Ndryshimet ligjore',
          body: 'Taksa, kontroll teknik dhe rregulla që prekin shitjen e një automjeti.',
        },
        {
          icon: '💡',
          title: 'Këshilla praktike',
          body: 'Si ta përgatisni makinën dhe dokumentet për një shitje të shpejtë.',
        },
      ]),

      // The market in numbers — only when there were valuations.
      facts({
        label: 'Tregu në shifra · 30 ditët e fundit',
        rows: [
          { label: 'Makina të vlerësuara', value: '{{ market.valuations | number }}' },
          { label: 'Oferta mesatare (cash)', value: '{{ market.average_offer | money }}' },
          { label: 'Marka më e kërkuar', value: '{{ market.top_brand }}' },
        ],
        note: t(
          'Shifrat vijnë nga vlerësimet që ekipi ynë ka bërë këtë muaj — jo nga shpallje me çmime të fryra.',
        ),
        display: when('market.valuations', 'gt', '0'),
      }),

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

      callToAction({
        title: 'Po mendoni ta shisni makinën?',
        body: t(
          'Plotësoni formularin në dy minuta dhe merrni një ofertë reale, me pagesë të menjëhershme pas kontrollit.',
        ),
        button: { label: 'Vlerëso makinën falas', href: '{{ site.valuation_url }}' },
      }),

      siteFooter({
        links: [
          { label: 'Blogu', href: '{{ site.blog_url }}' },
          { label: 'Vlerëso makinën', href: '{{ site.valuation_url }}' },
          { label: 'Kontakt', href: '{{ site.contact_url }}' },
        ],
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
        unsubscribe: true,
      }),
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
