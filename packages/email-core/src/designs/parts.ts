import { pad } from '../fields';
import type { EmailRichText } from '../rich-text';
import { block, row, section, type BlockSpec, type SectionSpec } from '../sample';
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
 * The newsletter's bands, as parts — so every ready-made email is built from
 * the same masthead, hero, note, cards, data box, call to action and footer,
 * and looks like one family rather than several designers' work.
 *
 * Each returns a whole section. The newsletter is assembled from these too;
 * its golden fixture not moving is what proves a part was extracted exactly.
 */

interface Display {
  hideOn: 'none';
  when: { var: string; op: string; value?: string }[];
}

const withDisplay = (props: Record<string, unknown>, display?: Display) =>
  display ? { ...props, display } : props;

/** The dark bar: the wordmark left, a small label (the month, the code) right. */
export function masthead(label: EmailRichText): SectionSpec {
  return section({ background: INK, padding: pad(22, 32, 18, 32), radius: 0 }, [
    row(
      '50-50',
      [
        [wordmark()],
        [
          block('text', {
            text: label,
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
  ]);
}

export interface HeroOptions {
  /** One or more eyebrows — several when they show on different conditions. */
  eyebrows: BlockSpec[];
  title: string;
  body: EmailRichText;
  button?: { label: string; href: string } | undefined;
}

/** The dark hero: eyebrow, a large Sora headline, a line of copy, an orange button. */
export function hero({ eyebrows, title, body, button }: HeroOptions): SectionSpec {
  return section({ background: INK, padding: pad(28, 32, 44, 32) }, [
    row('100', [
      [
        ...eyebrows,
        block('heading', {
          text: t(title),
          level: 1,
          size: 38,
          font: 'sora',
          weight: '700',
          letterSpacing: -1,
          color: PAPER,
          padding: pad(0, 0, 14, 0),
        }),
        block('text', {
          text: body,
          size: 16,
          lineHeight: 1.65,
          color: ON_INK,
          padding: pad(0, 0, button ? 26 : 0, 0),
        }),
        ...(button
          ? [
              block('button', {
                label: button.label,
                href: button.href,
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
            ]
          : []),
      ],
    ]),
  ]);
}

export const heroEyebrow = (text: string, display?: Display) =>
  eyebrow(text, ORANGE, display ? { display } : {});

/** The soft orange band right under the hero: a thank-you, a code to keep. */
export function note(text: EmailRichText, display?: Display): SectionSpec {
  return section(withDisplay({ background: ORANGE_SOFT, padding: pad(22, 32, 22, 32) }, display), [
    row('100', [
      [
        block('text', {
          text,
          size: 15,
          lineHeight: 1.6,
          color: '#5a2a07',
          padding: pad(0),
        }),
      ],
    ]),
  ]);
}

export interface Card {
  icon: string;
  title: string;
  body: string;
}

const card = ({ icon, title, body }: Card) => ({
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

/** An eyebrow, a heading, and three soft cards with an emoji each. */
export function cards(
  label: string,
  title: string,
  items: readonly [Card, Card, Card],
): SectionSpec {
  return section({ background: PAPER, padding: pad(36, 32, 12, 32) }, [
    row('100', [
      [
        eyebrow(label, ORANGE_DEEP),
        block('heading', {
          text: t(title),
          level: 2,
          size: 24,
          font: 'sora',
          letterSpacing: -0.5,
          padding: pad(0, 0, 18, 0),
        }),
      ],
    ]),
    row('33-33-33', items.map(card), { gap: 12, padding: pad(0, 0, 24, 0) }),
  ]);
}

export interface FactsOptions {
  label: string;
  rows: { label: string; value: string }[];
  note?: EmailRichText | undefined;
  display?: Display | undefined;
}

/** The grey box of label/value rows — the market in numbers, a car as received. */
export function facts({ label, rows, note: footnote, display }: FactsOptions): SectionSpec {
  return section(withDisplay({ background: PAPER, padding: pad(12, 32, 28, 32) }, display), [
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
          eyebrow(label, ORANGE_DEEP),
          block('key-value', {
            rows,
            size: 15,
            labelColor: MUTED,
            valueColor: TEXT,
            borderColor: LINE,
            background: null,
            padding: pad(0, 0, 10, 0),
          }),
          ...(footnote
            ? [
                block('text', {
                  text: footnote,
                  size: 13,
                  lineHeight: 1.5,
                  color: MUTED,
                  padding: pad(4, 0, 0, 0),
                }),
              ]
            : []),
        ],
      },
    ]),
  ]);
}

export interface CallOptions {
  title: string;
  body: EmailRichText;
  button: { label: string; href: string };
}

/** The dark rounded box near the end: one question, one line, one orange button. */
export function callToAction({ title, body, button }: CallOptions): SectionSpec {
  return section({ background: PAPER, padding: pad(16, 32, 36, 32) }, [
    row('100', [
      {
        props: { background: INK, radius: 18, padding: pad(30, 28, 30, 28) },
        blocks: [
          block('heading', {
            text: t(title),
            level: 2,
            size: 24,
            font: 'sora',
            letterSpacing: -0.5,
            color: PAPER,
            align: 'center',
            padding: pad(0, 0, 10, 0),
          }),
          block('text', {
            text: body,
            size: 15,
            lineHeight: 1.6,
            color: ON_INK,
            align: 'center',
            padding: pad(0, 0, 20, 0),
          }),
          block('button', {
            label: button.label,
            href: button.href,
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
  ]);
}

export interface FooterOptions {
  links: { label: string; href: string }[];
  text: EmailRichText;
  /** Marketing mail must carry it; a transactional email must not pretend to. */
  unsubscribe: boolean;
}

/** Links, the social icons, why this email came, the address. */
export function siteFooter({ links, text, unsubscribe }: FooterOptions): SectionSpec {
  return section({ background: MIST, padding: pad(28, 32, 30, 32) }, [
    row('100', [
      [
        block('menu', {
          items: links,
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
          text,
          showAddress: true,
          showUnsubscribe: unsubscribe,
          showPreferences: false,
          showViewInBrowser: false,
          color: MUTED,
          size: 12,
          align: 'center',
          padding: pad(0),
        }),
      ],
    ]),
  ]);
}
