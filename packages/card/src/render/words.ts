/**
 * The words a card says that its design does not: what a screen reader hears
 * for the parts drawn as pictures (a QR code, a barcode, the photo), and the
 * sides' names. English, Albanian and German are built in; a host passes its
 * own for another language.
 */
// #region words
export interface CardWords {
  code: string;
  front: string;
  back: string;
  qr: (data: string) => string;
  barcode: (data: string) => string;
  unreadableCode: string;
  photo: string;
  image: string;
  chip: string;
  contactless: string;
  stripe: string;
  signature: string;
  /** The print sheet's page for one side of one member's card. */
  page: (side: string, record: number, records: number) => string;
}
// #endregion words

export const en: CardWords = {
  code: 'en',
  front: 'Front',
  back: 'Back',
  qr: (data) => `QR code: ${data}`,
  barcode: (data) => `Barcode: ${data}`,
  unreadableCode: 'This value cannot be encoded',
  photo: 'Photo',
  image: 'Image',
  chip: 'Chip',
  contactless: 'Contactless',
  stripe: 'Magnetic stripe',
  signature: 'Signature strip',
  page: (side, record, records) =>
    records > 1 ? `${side}, card ${String(record)} of ${String(records)}` : side,
};

export const sq: CardWords = {
  code: 'sq',
  front: 'Përpara',
  back: 'Prapa',
  qr: (data) => `Kod QR: ${data}`,
  barcode: (data) => `Barkod: ${data}`,
  unreadableCode: 'Kjo vlerë nuk mund të kodohet',
  photo: 'Fotoja',
  image: 'Figura',
  chip: 'Çipi',
  contactless: 'Pa kontakt',
  stripe: 'Shiriti magnetik',
  signature: 'Shiriti i nënshkrimit',
  page: (side, record, records) =>
    records > 1 ? `${side}, karta ${String(record)} nga ${String(records)}` : side,
};

export const de: CardWords = {
  code: 'de',
  front: 'Vorderseite',
  back: 'Rückseite',
  qr: (data) => `QR-Code: ${data}`,
  barcode: (data) => `Strichcode: ${data}`,
  unreadableCode: 'Dieser Wert lässt sich nicht codieren',
  photo: 'Foto',
  image: 'Bild',
  chip: 'Chip',
  contactless: 'Kontaktlos',
  stripe: 'Magnetstreifen',
  signature: 'Unterschriftsfeld',
  page: (side, record, records) =>
    records > 1 ? `${side}, Karte ${String(record)} von ${String(records)}` : side,
};

const BUILT_IN: Record<string, CardWords> = { en, sq, de };

/** The words for a language: a host's own, a built-in one by its code or region (`sq-AL`), or English. */
export function cardWords(
  locale = 'en',
  own: Readonly<Record<string, CardWords | undefined>> = {},
): CardWords {
  const language = locale.split('-')[0] ?? locale;
  return own[locale] ?? own[language] ?? BUILT_IN[locale] ?? BUILT_IN[language] ?? en;
}
