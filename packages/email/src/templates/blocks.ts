import {
  block,
  et,
  pad,
  row,
  section,
  type BlockSpec,
  type EmailRichText,
  type EmailRun,
  type RowSpec,
  type SectionSpec,
  type VariableFormat,
  v,
} from '../core';

/*
 * Small builders for a template's blocks, so a template file reads as the
 * email it lays out. Each gives only the props that differ from the block's
 * defaults; `buildEmail` fills in the rest and checks them against the
 * block's schema when the template is used (`templates.test.ts` does the same
 * for every template).
 *
 * Words are a plain string, or runs that mix words with variables:
 *
 *   paragraph(['Hi ', v('recipient.name', 'there'), ', your order ', bold(v('order.number')), ' is on its way.'])
 *
 * A variable inside rich text must be a variable run (`v`, `formatted`): only
 * those are filled in at send time. Short props — a button's label or link, a
 * detail's value — take `{{ variable }}` strings instead.
 */

export { v };

type Props = Record<string, unknown>;
type Align = 'left' | 'center' | 'right';
type Column = RowSpec['columns'][number];

/** Words for a rich-text prop: a plain string, or runs of words and variables. */
export type Line = string | readonly (string | EmailRun)[];

const rich = (line: Line): EmailRichText =>
  typeof line === 'string'
    ? et(line)
    : line.map((part) => (typeof part === 'string' ? { text: part } : part));

// ── words ────────────────────────────────────────────────────────────────────

/** Words, or a variable, in bold. */
export const bold = (part: string | EmailRun): EmailRun =>
  typeof part === 'string'
    ? { text: part, marks: [{ type: 'bold' }] }
    : { ...part, marks: [...(part.marks ?? []), { type: 'bold' }] };

/** A variable shown in a format: `formatted('order.total', 'money')`. */
export const formatted = (path: string, format: VariableFormat): EmailRun => ({
  text: `{{${path}}}`,
  marks: [{ type: 'variable', path, format }],
});

// ── content ──────────────────────────────────────────────────────────────────

/** The email's headline. */
export const heading = (text: Line, props: Props = {}): BlockSpec =>
  block('heading', { text: rich(text), ...props });

/** A smaller heading for one part of the email. */
export const subheading = (text: Line, props: Props = {}): BlockSpec =>
  block('heading', { text: rich(text), level: 2, size: 20, ...props });

/** A short line above a heading, in spaced capitals and the brand colour. */
export const eyebrow = (text: Line, props: Props = {}): BlockSpec =>
  block('text', {
    text: rich(text),
    size: 12,
    weight: '700',
    letterSpacing: 2,
    transform: 'uppercase',
    color: 'brand.primary',
    padding: pad(0, 0, 4),
    ...props,
  });

/** Body text. */
export const paragraph = (text: Line, props: Props = {}): BlockSpec =>
  block('text', { text: rich(text), ...props });

/** Small print in the muted colour: an expiry, a "did not ask for this?". */
export const note = (text: Line, props: Props = {}): BlockSpec =>
  block('text', { text: rich(text), size: 13, color: 'brand.muted', ...props });

/** A list of points, with bullets, numbers or ticks. */
export const bullets = (
  items: readonly Line[],
  style: 'bullet' | 'number' | 'check' = 'bullet',
  props: Props = {},
): BlockSpec =>
  block('list', { style, items: items.map((item) => ({ text: rich(item) })), ...props });

/** A button; a `{{ variable }}` link is filled in at send time. */
export const button = (label: string, href: string, props: Props = {}): BlockSpec =>
  block('button', { label, href, ...props });

/** A quieter, outlined button for the second thing the reader may do. */
export const outlineButton = (label: string, href: string, props: Props = {}): BlockSpec =>
  button(label, href, {
    background: '#ffffff',
    textColor: 'brand.primary',
    borderColor: 'brand.primary',
    borderWidth: 1,
    ...props,
  });

/** A picture the writer chooses in the editor; `alt` says what it shows. */
export const image = (alt: string, props: Props = {}): BlockSpec =>
  block('image', { alt, ...props });

/** A video's picture with a play button, linked to where it plays. */
export const video = (alt: string, href: string, props: Props = {}): BlockSpec =>
  block('video', { alt, href, ...props });

/** A thin line between two parts. */
export const divider = (props: Props = {}): BlockSpec => block('divider', props);

/** A quotation and who said it. */
export const quote = (text: Line, cite: string, props: Props = {}): BlockSpec =>
  block('quote', { text: rich(text), cite, ...props });

// ── data and commerce ────────────────────────────────────────────────────────

/** Label–value rows: an order's number, an appointment's time and place. */
export const details = (
  rows: readonly (readonly [label: string, value: string])[],
  props: Props = {},
): BlockSpec =>
  block('key-value', { rows: rows.map(([label, value]) => ({ label, value })), ...props });

/** A list variable as a table, one column per field of its items, with an optional total. */
export const lineItems = (
  list: string,
  columns: readonly (readonly [header: string, field: string, align?: Align])[],
  total: readonly [label: string, value: string] | null,
  props: Props = {},
): BlockSpec =>
  block('line-items', {
    list,
    columns: columns.map(([header, field, align = 'left']) => ({ header, field, align })),
    totalLabel: total?.[0] ?? '',
    totalValue: total?.[1] ?? '',
    ...props,
  });

/** A product card: picture, name, price, a line about it and a button. */
export const product = (
  title: string,
  price: string,
  description: Line,
  href: string,
  props: Props = {},
): BlockSpec => block('product', { title, price, description: rich(description), href, ...props });

/** A discount code in a dashed box, with a line under it. */
export const coupon = (code: string, caption: string, props: Props = {}): BlockSpec =>
  block('coupon', { code, caption, ...props });

/** A one-click question; `{score}` in the link becomes each button's number. */
export const survey = (question: string, href: string, props: Props = {}): BlockSpec =>
  block('survey', { question, href, ...props });

// ── logic ────────────────────────────────────────────────────────────────────

/** Blocks shown only when a variable has a value — a tracking link, a note. */
export const whenPresent = (path: string, blocks: BlockSpec[]): BlockSpec =>
  block(
    'conditional',
    { display: { hideOn: 'none', when: [{ var: path, op: 'exists' }] } },
    blocks,
  );

/** Blocks repeated for each item of a list variable; inside, `item.*` is that item. */
export const forEach = (list: string, blocks: BlockSpec[], max = 20): BlockSpec =>
  block('repeat', { list, max }, blocks);

// ── layout ───────────────────────────────────────────────────────────────────

/** A column with its own background, padding and corners — a card or a tinted box. */
export const panel = (blocks: BlockSpec[], props: Props = {}): Column => ({
  props: { background: 'brand.background', padding: pad(24), radius: 12, ...props },
  blocks,
});

/** A one-time code, large and spaced in a monospaced font, on a tinted panel of its own. */
export const codeBox = (
  code: Line,
  {
    background = 'brand.background',
    color = null,
  }: { background?: string; color?: string | null } = {},
): RowSpec =>
  row('100', [
    panel(
      [
        heading(code, {
          font: 'jetbrains-mono',
          size: 40,
          letterSpacing: 10,
          align: 'center',
          color,
          padding: pad(0),
        }),
      ],
      { background, padding: pad(24, 16) },
    ),
  ]);

/** The brand's logo, alone at the top. */
export const logoHeader = (align: Align = 'center', props: Props = {}): SectionSpec =>
  section({ padding: pad(32, 32, 8), ...props }, [row('100', [[block('logo', { align })]])]);

/** The logo with a few links beside it — a newsletter's masthead. */
export const masthead = (
  links: readonly (readonly [label: string, href: string])[],
  props: Props = {},
): SectionSpec =>
  section({ padding: pad(20, 24), ...props }, [
    row(
      '33-67',
      [
        [block('logo', { align: 'left', width: 120, padding: pad(0) })],
        [
          block('menu', {
            items: links.map(([label, href]) => ({ label, href })),
            align: 'right',
            separator: 'none',
            padding: pad(0),
          }),
        ],
      ],
      { verticalAlign: 'middle' },
    ),
  ]);

const TRANSACTIONAL_FOOTER: Line = [
  'You received this email because of activity on your ',
  v('brand.name'),
  ' account.',
];
const MARKETING_FOOTER: Line = [
  'You are receiving this because you signed up for news from ',
  v('brand.name'),
  '.',
];

/**
 * The last band: the footer with the sender's address. A marketing email also
 * gets the social links, and the unsubscribe and preferences links the law
 * asks for.
 */
export const footerSection = ({
  marketing = false,
  text,
  ...props
}: { marketing?: boolean; text?: Line } & Props = {}): SectionSpec =>
  section({ padding: pad(24, 24, 32), ...props }, [
    row('100', [
      [
        ...(marketing ? [block('social', { size: 24 })] : []),
        block('footer', {
          text: rich(text ?? (marketing ? MARKETING_FOOTER : TRANSACTIONAL_FOOTER)),
          showUnsubscribe: marketing,
          showPreferences: marketing,
          showViewInBrowser: marketing,
        }),
      ],
    ]),
  ]);
