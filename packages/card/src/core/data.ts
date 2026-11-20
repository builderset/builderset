import { z } from 'zod';

/**
 * Member data: what a printed card is filled in with.
 *
 * A card is designed once and printed many times — one per member — so its
 * words may hold variables, `{{member.name}}`, that each printed card fills
 * from its own record. Which variables exist is the HOST's to say (a gym's
 * members have other facts than a car club's), as an email type declares its
 * own: a list of fields, each with a label and an example. Without one, the
 * card uses the member fields below. There is no expression language: a
 * variable is a dotted path, and a record is a flat map from path to text.
 */

/** A variable's path: `member.name`, `member.valid_until`. */
export const FIELD_PATH = /^[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*){0,4}$/;

/** `{{ path }}`, spaces optional. */
export const VARIABLE_TOKEN = /\{\{\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*){0,4})\s*\}\}/;
const VARIABLE_TOKENS = new RegExp(VARIABLE_TOKEN.source, 'g');

/**
 * What a field holds, which decides where it may go: `text` in any words, a
 * QR code or a barcode; `photo` only in a photo frame.
 */
export const FIELD_KINDS = ['text', 'photo'] as const;
export type CardFieldKind = (typeof FIELD_KINDS)[number];

export const cardFieldSchema = z.object({
  path: z.string().regex(FIELD_PATH),
  /** By language code; English is the fallback. */
  label: z.record(z.string(), z.string()),
  kind: z.enum(FIELD_KINDS),
});

export interface CardField {
  path: string;
  label: Record<string, string>;
  kind: CardFieldKind;
}

/** A member as the card sees it: each field's value by its path. A photo is an image address. */
export type CardRecord = Readonly<Record<string, string>>;

/** The fields a card may use when the host names none: a member's. */
export const CARD_FIELDS: readonly CardField[] = [
  {
    path: 'member.name',
    label: { en: 'Name', sq: 'Emri', de: 'Name' },
    kind: 'text',
  },
  {
    path: 'member.number',
    label: { en: 'Member number', sq: 'Numri i anëtarësisë', de: 'Mitgliedsnummer' },
    kind: 'text',
  },
  {
    path: 'member.tier',
    label: { en: 'Tier', sq: 'Niveli', de: 'Stufe' },
    kind: 'text',
  },
  {
    path: 'member.since',
    label: { en: 'Member since', sq: 'Anëtar që nga', de: 'Mitglied seit' },
    kind: 'text',
  },
  {
    path: 'member.valid_until',
    label: { en: 'Valid until', sq: 'Vlen deri', de: 'Gültig bis' },
    kind: 'text',
  },
  {
    path: 'member.qr',
    label: { en: 'QR code value', sq: 'Vlera e kodit QR', de: 'Wert des QR-Codes' },
    kind: 'text',
  },
  {
    path: 'member.photo',
    label: { en: 'Photo', sq: 'Fotoja', de: 'Foto' },
    kind: 'photo',
  },
];

/** Three members to design with: the editor's example data and the preview's switch. */
export const EXAMPLE_MEMBERS: readonly CardRecord[] = [
  {
    'member.name': 'Arben Hoxha',
    'member.number': 'MA 0248 1173',
    'member.tier': 'Gold',
    'member.since': '2024',
    'member.valid_until': '11/2027',
    'member.qr': 'MA02481173',
    'member.photo': '',
  },
  {
    'member.name': 'Elira Daci',
    'member.number': 'MA 0192 0456',
    'member.tier': 'Silver',
    'member.since': '2025',
    'member.valid_until': '03/2028',
    'member.qr': 'MA01920456',
    'member.photo': '',
  },
  {
    'member.name': 'Klajdi Mema',
    'member.number': 'MA 0311 2280',
    'member.tier': 'Platinum',
    'member.since': '2023',
    'member.valid_until': '08/2027',
    'member.qr': 'MA03112280',
    'member.photo': '',
  },
];

/** Every variable path in a piece of text, in order, repeats included. */
export function variablesIn(text: string): string[] {
  return [...text.matchAll(VARIABLE_TOKENS)].map((match) => match[1] ?? '');
}

/**
 * The text with each variable replaced by the record's value. A variable the
 * record has no value for is left as it was written, so a design shown without
 * data still says what goes where.
 */
export function fillText(text: string, record: CardRecord | null | undefined): string {
  if (!record) return text;
  return text.replace(VARIABLE_TOKENS, (whole, path: string) =>
    Object.hasOwn(record, path) ? (record[path] ?? '') : whole,
  );
}

/** A field's label in a language, English as the fallback. */
export function fieldLabel(field: CardField, locale: string): string {
  const language = locale.split('-')[0] ?? locale;
  return field.label[locale] ?? field.label[language] ?? field.label.en ?? field.path;
}
