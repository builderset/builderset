/**
 * @builderset/card — the card builder's model.
 *
 * Pure TypeScript on top of `@builderset/engine`'s tree, operations and
 * history: the card document (a format, a front and a back, elements placed
 * in millimetres), the formats and the measurements the standards fix, member
 * data and its variables, the print checks, and the QR and Code 128 encoders
 * the renderer draws with.
 */

export * from './elements';
export {
  BACK_ID,
  CARD_FONT_KEYS,
  CARD_FONTS,
  CARD_ROOT,
  CARD_SCHEMA,
  CARD_VERSION,
  cardFormatSchema,
  cardMetaSchema,
  cardPrintSchema,
  cardShapeSchema,
  createCardDocument,
  defaultPrint,
  formatProps,
  FRONT_ID,
  hexColor,
  optionalColor,
  type CardDocument,
  type CardFont,
  type CardFormatProps,
  type CardMeta,
  type CardPrint,
} from './document';
export {
  CARD_FORMAT_IDS,
  CARD_FORMATS,
  CHIP_ZONE,
  formatSpec,
  ISO_ID1,
  STRIPE_ZONE,
  type CardFormat,
  type CardFormatSpec,
} from './formats';
export {
  CARD_FIELDS,
  cardFieldSchema,
  EXAMPLE_MEMBERS,
  FIELD_KINDS,
  FIELD_PATH,
  fieldLabel,
  fillText,
  VARIABLE_TOKEN,
  variablesIn,
  type CardField,
  type CardFieldKind,
  type CardRecord,
} from './data';
export { CSS_DPI, MM_PER_INCH, mmToPt, mmToPx, PT_MM, ptToMm, pxToMm, roundTo } from './units';
export { CARD_RULES, isUnsafeCodeLink, unencodableChars } from './rules';
export {
  CARD_DRAFT_TOLERATES,
  cardSchema,
  checkCard,
  elementsOf,
  formatOf,
  isDraftBlocking,
  isPrintBlocking,
  parseCard,
  printedFaces,
  sideOf,
  type CheckCardOptions,
} from './validate';
export { fieldsUsed, fillCard, VARIABLE_PROPS } from './fill';
export { changeFormat, resizeCard } from './resize';
export { toCardJSONSchema } from './json-schema';
export {
  buildCard,
  el,
  side,
  type BuildCardOptions,
  type CardPatch,
  type ElementSpec,
  type SideSpec,
} from './build';
export { encodeQr, type QrLevel } from './codes/qr';
export { encodeCode128 } from './codes/code128';
