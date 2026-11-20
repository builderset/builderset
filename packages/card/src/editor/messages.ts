import type { DeepPartial, EditorMessages, ElementText } from '@builderset/engine/editor';

import type { CardFormat, CardPrint } from '../core';
import type { CardWords } from '../render';

/**
 * Everything the card builder says, in one language: the shared workspace's
 * words (with the card's own where it says them differently — "Approve for
 * print", "Approved"), the element names, the card's panels, and the words a
 * drawn card says to a screen reader (`viewer`).
 */
export interface CardLocale {
  code: string;
  engine: EditorMessages;
  workspace: Partial<EditorMessages>;
  elements: Record<string, ElementText>;
  categories: Record<string, string>;
  card: CardEditorWords;
  viewer: CardWords;
}

/** Replace single words, in whatever language is active. */
export type CardMessages = DeepPartial<CardLocale>;

/** What the card panels pass around. */
export interface CardKitWords {
  card: CardEditorWords;
  viewer: CardWords;
}

// #region editor-words
export interface CardEditorWords {
  // Settings tabs
  format: string;
  print: string;
  data: string;
  // Format
  name: string;
  nameHint: string;
  cardType: string;
  formats: Record<CardFormat, { name: string; description: string }>;
  width: string;
  height: string;
  orientation: string;
  landscape: string;
  portrait: string;
  sides: string;
  frontOnly: string;
  frontAndBack: string;
  corners: string;
  cornersSquare: string;
  cornersIso: string;
  cornersRound: string;
  background: (face: string) => string;
  backgroundImage: (face: string) => string;
  backgroundImageHint: string;
  bankParts: string;
  addBankParts: string;
  // Print
  printedSize: string;
  withBleed: (width: string, height: string) => string;
  pixelsAt: (width: number, height: number, dpi: number) => string;
  bleed: string;
  safeMargin: string;
  showBleed: string;
  showBleedHint: string;
  showSafe: string;
  showSafeHint: string;
  resolution: string;
  colour: string;
  colours: Record<CardPrint['colour'], string>;
  material: string;
  materials: Record<CardPrint['material'], string>;
  finish: string;
  finishes: Record<CardPrint['finish'], string>;
  quantity: string;
  cardsUnit: string;
  output: string;
  printSheet: string;
  printSheetHint: (bleed: string) => string;
  digitalCard: string;
  digitalCardHint: string;
  // Data
  showData: string;
  showDataHint: string;
  source: string;
  sourcePlaceholder: string;
  exampleMember: string;
  recordOf: (index: number, total: number) => string;
  previousMember: string;
  nextMember: string;
  fieldsOnCard: string;
  noFieldsOnCard: string;
  photoFromProfile: string;
  printAll: (count: number) => string;
  // Members tab
  members: string;
  inList: (count: number, source: string) => string;
  fields: string;
  fieldsHint: string;
  photo: string;
  // Templates tab
  designs: string;
  use: string;
  applied: string;
  // The selected element
  styleTab: string;
  layoutTab: string;
  dataTab: string;
  crumb: string;
  text: string;
  insertField: string;
  font: string;
  weight: string;
  size: string;
  lineHeight: string;
  letterSpacing: string;
  capitals: string;
  alignment: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  vertical: string;
  valignTop: string;
  valignMiddle: string;
  valignBottom: string;
  colourLabel: string;
  highlight: string;
  highlightCorners: string;
  logoText: string;
  logoFile: string;
  fill: string;
  outline: string;
  outlineWidth: string;
  opacity: string;
  image: string;
  fit: string;
  fitCover: string;
  fitContain: string;
  placeholderTone: string;
  photoHint: string;
  icon: string;
  icons: string;
  qrData: string;
  qrLevel: string;
  qrLevels: Record<'L' | 'M' | 'Q' | 'H', string>;
  qrBackground: string;
  barcodeData: string;
  barcodeHint: string;
  signLabel: string;
  signHint: string;
  chipFinish: string;
  chipGold: string;
  chipSilver: string;
  chipHint: string;
  snapToIso: string;
  stripeHint: string;
  fillFrom: string;
  fixedText: string;
  fillHint: (member: string) => string;
  photoField: string;
  codeFrom: string;
  alignToCard: string;
  // The canvas and the dock
  front: string;
  back: string;
  caption: (face: string) => string;
  singleSided: string;
  flip: string;
  flipTo: (face: string) => string;
  guides: string;
  exampleData: string;
  chipZone: string;
  // Preview
  actualSize: string;
  large: string;
  actualHint: (width: string, height: string) => string;
  largeHint: string;
  tiltHint: string;
}
// #endregion editor-words
