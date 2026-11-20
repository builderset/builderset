import { CARD_FIELDS, type CardField } from '@builderset/card';

/**
 * What your members have, beyond the defaults (name, number, tier, since,
 * valid until, QR value, photo). One list, for the editor and the server:
 * `kind: 'photo'` may only go in a photo frame.
 */
export const MEMBER_FIELDS: readonly CardField[] = [
  ...CARD_FIELDS,
  { path: 'member.plan', label: { en: 'Plan', sq: 'Paketa', de: 'Tarif' }, kind: 'text' },
  { path: 'club.branch', label: { en: 'Branch', sq: 'Dega', de: 'Filiale' }, kind: 'text' },
];
