import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section, tr } from '../sample';
import {
  bold,
  eyebrow,
  inEvery,
  INK,
  LINE,
  MUTED,
  ORANGE_DEEP,
  PAPER,
  say,
  TEXT,
  tt,
  when,
} from './palette';
import { callToAction, cards, facts, hero, heroEyebrow, masthead, note, siteFooter } from './parts';

/**
 * The monthly newsletter, in the site's own look: the near-black hero and the
 * orange of marrimauto.com, Sora for display type and Poppins for reading, as
 * on the web.
 *
 * Everything that changes is a variable of the `newsletter` email type (see
 * `api/app/domains/email_builder/types.py`), filled at send time from the
 * database: the edition, the latest articles in the reader's language, the
 * last 30 days of valuations, and the subscriber's own details. Blocks that
 * would be empty — no articles yet, no valuations this month — hide on a
 * condition rather than showing a hollow box, and the welcome note shows only
 * on the email sent right after signing up.
 *
 * Written in Albanian, English and German: one design, sent in the language
 * the subscriber signed up in.
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
        subject: tr(
          'Tregu i makinave · {{ edition.label }}',
          'The car market · {{ edition.label }}',
          'Der Automarkt · {{ edition.label }}',
        ),
        preheader: tr(
          'Çmimet, ndryshimet ligjore dhe këshilla praktike — përmbledhja e muajit nga marrimauto.com.',
          'Prices, changes in the law and practical advice — the month in brief from marrimauto.com.',
          'Preise, Gesetzesänderungen und praktische Tipps — der Monat im Überblick von marrimauto.com.',
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
        utm: { enabled: true, source: 'newsletter', medium: 'email', campaign: 'monthly' },
      },
    },
    [
      masthead([{ text: 'Newsletter · ' }, v('edition.label')]),

      hero({
        eyebrows: [
          heroEyebrow(
            tr('Mirë se erdhe në listë', 'Welcome to the list', 'Willkommen auf der Liste'),
            when('is_welcome', 'exists'),
          ),
          heroEyebrow(
            tr('Përmbledhja e muajit', 'The month in brief', 'Der Monat im Überblick'),
            when('is_welcome', 'missing'),
          ),
        ],
        title: tr(
          'Çmimet e tregut, një herë në muaj',
          'Market prices, once a month',
          'Marktpreise, einmal im Monat',
        ),
        body: tt(
          tr(
            'Si lëvizën çmimet e makinave, çfarë ndryshoi në ligj dhe disa këshilla praktike për ta shitur makinën tuaj me kokë të ftohtë. Shkurt, një herë në muaj — pa reklama.',
            'How car prices moved, what changed in the law, and practical advice for selling your car with a cool head. Short, once a month — no adverts.',
            'Wie sich die Autopreise bewegt haben, was sich im Gesetz geändert hat, und praktische Tipps, um Ihr Auto mit kühlem Kopf zu verkaufen. Kurz, einmal im Monat — ohne Werbung.',
          ),
        ),
        button: {
          label: tr(
            'Merr një ofertë për makinën →',
            'Get an offer for your car →',
            'Angebot für Ihr Auto erhalten →',
          ),
          href: '{{ site.valuation_url }}',
        },
      }),

      // The welcome note — only on the email sent right after signing up.
      note(
        inEvery((l) => [
          bold(
            say(
              l,
              'Faleminderit që u abonuat! ',
              'Thank you for subscribing! ',
              'Danke für Ihre Anmeldung! ',
            ),
          ),
          { text: say(l, 'Adresa ', 'The address ', 'Die Adresse ') },
          {
            text: '{{subscriber.email}}',
            marks: [{ type: 'bold' }, { type: 'variable', path: 'subscriber.email' }],
          },
          {
            text: say(
              l,
              ' është në listë. Newsletter-i vjen në fillim të çdo muaji — asgjë tjetër, dhe adresën nuk ia japim askujt.',
              ' is on the list. The newsletter arrives at the start of every month — nothing else, and we never share your address.',
              ' steht auf der Liste. Der Newsletter kommt am Anfang jedes Monats — sonst nichts, und Ihre Adresse geben wir an niemanden weiter.',
            ),
          },
        ]),
        when('is_welcome', 'exists'),
      ),

      cards(
        tr('Çfarë gjeni në çdo numër', 'In every issue', 'In jeder Ausgabe'),
        tr(
          'Tre gjëra, të shpjeguara qartë',
          'Three things, clearly explained',
          'Drei Dinge, klar erklärt',
        ),
        [
          {
            icon: '📈',
            title: tr('Lëvizjet e çmimeve', 'Price movements', 'Preisentwicklung'),
            body: tr(
              'Si ndryshuan çmimet sipas markës dhe vitit gjatë muajit të fundit.',
              'How prices changed by make and year over the last month.',
              'Wie sich die Preise nach Marke und Baujahr im letzten Monat verändert haben.',
            ),
          },
          {
            icon: '⚖️',
            title: tr('Ndryshimet ligjore', 'Changes in the law', 'Gesetzesänderungen'),
            body: tr(
              'Taksa, kontroll teknik dhe rregulla që prekin shitjen e një automjeti.',
              'Taxes, roadworthiness tests and rules that affect selling a vehicle.',
              'Steuern, technische Prüfung und Regeln, die den Verkauf eines Fahrzeugs betreffen.',
            ),
          },
          {
            icon: '💡',
            title: tr('Këshilla praktike', 'Practical advice', 'Praktische Tipps'),
            body: tr(
              'Si ta përgatisni makinën dhe dokumentet për një shitje të shpejtë.',
              'How to get your car and documents ready for a quick sale.',
              'Wie Sie Auto und Unterlagen für einen schnellen Verkauf vorbereiten.',
            ),
          },
        ],
      ),

      // The market in numbers — only when there were valuations.
      facts({
        label: tr(
          'Tregu në shifra · 30 ditët e fundit',
          'The market in numbers · last 30 days',
          'Der Markt in Zahlen · letzte 30 Tage',
        ),
        rows: [
          {
            label: tr('Makina të vlerësuara', 'Cars valued', 'Bewertete Autos'),
            value: '{{ market.valuations | number }}',
          },
          {
            label: tr(
              'Oferta mesatare (cash)',
              'Average offer (cash)',
              'Durchschnittsangebot (bar)',
            ),
            value: '{{ market.average_offer | money }}',
          },
          {
            label: tr('Marka më e kërkuar', 'Most requested make', 'Gefragteste Marke'),
            value: '{{ market.top_brand }}',
          },
        ],
        note: tt(
          tr(
            'Shifrat vijnë nga vlerësimet që ekipi ynë ka bërë këtë muaj — jo nga shpallje me çmime të fryra.',
            'These figures come from the valuations our team made this month — not from listings with inflated prices.',
            'Die Zahlen stammen aus den Bewertungen unseres Teams in diesem Monat — nicht aus Anzeigen mit überhöhten Preisen.',
          ),
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
              eyebrow(tr('Nga blogu', 'From the blog', 'Aus dem Blog'), ORANGE_DEEP),
              block('heading', {
                text: tt(tr('Lexo këtë muaj', 'Read this month', 'Diesen Monat lesen')),
                level: 2,
                size: 24,
                font: 'sora',
                letterSpacing: -0.5,
                padding: pad(0, 0, 8, 0),
              }),
              block('repeat', { list: 'articles', max: 3 }, [
                block('text', {
                  text: inEvery((l) => [
                    v('item.category'),
                    { text: ' · ' },
                    v('item.reading_minutes'),
                    { text: say(l, ' min lexim', ' min read', ' Min. Lesezeit') },
                  ]),
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
                  label: tr('Lexo artikullin →', 'Read the article →', 'Artikel lesen →'),
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
                label: tr('Të gjithë artikujt', 'All articles', 'Alle Artikel'),
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
        title: tr(
          'Po mendoni ta shisni makinën?',
          'Thinking of selling your car?',
          'Denken Sie über den Verkauf Ihres Autos nach?',
        ),
        body: tt(
          tr(
            'Plotësoni formularin në dy minuta dhe merrni një ofertë reale, me pagesë të menjëhershme pas kontrollit.',
            'Fill in the form in two minutes and get a real offer, with immediate payment after the inspection.',
            'Füllen Sie das Formular in zwei Minuten aus und erhalten Sie ein echtes Angebot, mit sofortiger Zahlung nach der Prüfung.',
          ),
        ),
        button: {
          label: tr('Vlerëso makinën falas', 'Value your car for free', 'Auto kostenlos bewerten'),
          href: '{{ site.valuation_url }}',
        },
      }),

      siteFooter({
        links: [
          { label: tr('Blogu', 'Blog', 'Blog'), href: '{{ site.blog_url }}' },
          {
            label: tr('Vlerëso makinën', 'Value your car', 'Auto bewerten'),
            href: '{{ site.valuation_url }}',
          },
          { label: tr('Kontakt', 'Contact', 'Kontakt'), href: '{{ site.contact_url }}' },
        ],
        text: inEvery((l) => [
          {
            text: say(
              l,
              'Ju e merrni këtë email sepse u abonuat në ',
              'You are receiving this email because you subscribed at ',
              'Sie erhalten diese E-Mail, weil Sie sich bei ',
            ),
          },
          v('brand.name'),
          { text: say(l, ' më ', ' on ', ' am ') },
          {
            text: '{{subscriber.since}}',
            marks: [{ type: 'variable', path: 'subscriber.since', format: 'date' }],
          },
          { text: say(l, ' me adresën ', ' with the address ', ' mit der Adresse ') },
          v('subscriber.email'),
          { text: say(l, '.', '.', ' angemeldet haben.') },
        ]),
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
    blog_url: 'https://marrimauto.com/blog',
    valuation_url: 'https://marrimauto.com/valuation',
    contact_url: 'https://marrimauto.com/contact',
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
      url: 'https://marrimauto.com/blog/sa-vlen-makina-ime',
    },
    {
      title: 'Dokumentet që ju duhen për ta shitur makinën',
      excerpt:
        'Leja e qarkullimit, siguracioni, kolaudimi: çfarë duhet të keni gati dhe çfarë mund të zgjidhet ditën e shitjes.',
      category: 'Këshilla',
      reading_minutes: 4,
      url: 'https://marrimauto.com/blog/dokumentet-per-shitje',
    },
  ],
  links: { unsubscribe: 'https://marrimauto.com/newsletter/unsubscribe/sample-token' },
};
