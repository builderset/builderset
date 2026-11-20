import type { DeepPartial, EditorMessages, ElementText } from '@builderset/engine/editor';

import type {
  InputKind,
  PopupAction,
  PopupPosition,
  PopupType,
  ENTER_MOTIONS,
  EXIT_MOTIONS,
  AUDIENCES,
  FREQUENCIES,
  PAGE_MODES,
  TRIGGERS,
} from '../core';
import type { PopupWords } from '../render';

/**
 * Everything the popup builder says, in one language: the shared workspace's
 * words (with the popup's own where it says them differently — "Publish
 * changes", "Live"), the element names, the popup's panels, and the words its
 * visitors read (`visitor`).
 */
export interface PopupLocale {
  code: string;
  engine: EditorMessages;
  workspace: Partial<EditorMessages>;
  elements: Record<string, ElementText>;
  categories: Record<string, string>;
  popup: PopupEditorWords;
  visitor: PopupWords;
}

/** Replace single words, in whatever language is active. */
export type PopupMessages = DeepPartial<PopupLocale>;

type Trigger = (typeof TRIGGERS)[number];

// #region editor-words
export interface PopupEditorWords {
  // Settings tabs
  format: string;
  display: string;
  motion: string;
  // Format
  name: string;
  nameHint: string;
  popupType: string;
  types: Record<PopupType, string>;
  typeHints: Record<PopupType, string>;
  size: string;
  width: string;
  height: string;
  fullWidth: string;
  fullHeight: string;
  position: string;
  positions: Record<PopupPosition, string>;
  alwaysCentred: string;
  background: string;
  corners: string;
  shadow: string;
  shadows: Record<'none' | 'soft' | 'strong', string>;
  pageBehind: string;
  dimmed: (percent: number) => string;
  blur: string;
  blurHint: string;
  tips: { scaledOnPhones: (width: number) => string };
  // Display
  showIt: string;
  triggers: Record<Trigger, string>;
  triggerHint: Record<Trigger, (value: string) => string>;
  delay: string;
  seconds: string;
  scrolled: string;
  selector: string;
  selectorHint: string;
  pages: string;
  pageModes: Record<(typeof PAGE_MODES)[number], string>;
  addPage: string;
  removePage: string;
  pageRule: (index: number) => string;
  wildcardHint: string;
  audience: string;
  audiences: Record<(typeof AUDIENCES)[number], string>;
  language: string;
  allLanguages: string;
  frequency: string;
  frequencies: Record<(typeof FREQUENCIES)[number], string>;
  everyDays: string;
  days: string;
  starts: string;
  ends: string;
  devices: string;
  desktop: string;
  phones: string;
  priority: string;
  priorityHint: string;
  // Motion
  appearsWith: string;
  enters: Record<(typeof ENTER_MOTIONS)[number], string>;
  duration: string;
  leavesWith: string;
  exits: Record<(typeof EXIT_MOTIONS)[number], string>;
  replayOnCanvas: string;
  closing: string;
  closeButton: string;
  closeButtonHint: string;
  outside: string;
  outsideHint: string;
  esc: string;
  autoClose: string;
  autoCloseHint: string;
  // An element
  style: string;
  layout: string;
  action: string;
  alignTo: string;
  text: string;
  font: string;
  weight: string;
  textSize: string;
  lineHeight: string;
  letterSpacing: string;
  capitals: string;
  alignment: string;
  aligns: Record<'left' | 'center' | 'right', string>;
  highlightCorners: string;
  opacity: string;
  outlineWidth: string;
  picture: string;
  pictureHint: string;
  alt: string;
  altHint: string;
  fit: string;
  fits: Record<'cover' | 'contain', string>;
  icon: string;
  iconWidth: string;
  logoText: string;
  logoFile: string;
  qrData: string;
  qrHint: string;
  countsTo: string;
  countsToHint: string;
  buttonText: string;
  placeholder: string;
  inputLabel: string;
  inputLabelHint: string;
  fieldName: string;
  fieldNameHint: string;
  required: string;
  requiredHint: string;
  inputKind: string;
  kinds: Record<InputKind, string>;
  closeHint: string;
  whenClicked: string;
  actions: Record<PopupAction, string>;
  link: string;
  newTab: string;
  submitHint: string;
  thanks: string;
  thanksHint: string;
  // Stage and dock
  workingView: (type: string) => string;
  replay: string;
  guides: string;
  exampleData: string;
  sizeOf: (width: number, height: number, fill: 'none' | 'width' | 'height' | 'both') => string;
  summary: (elements: number) => string;
  layersSummary: (count: number) => string;
  // Fields tab
  fields: string;
  personalFields: string;
  personalHint: string;
  formFields: string;
  formFieldsEmpty: string;
  optional: string;
  clickTextFirst: string;
  // Templates tab
  popupTypes: string;
  starters: string;
  use: string;
  applied: (name: string) => string;
  scaledToType: (type: string) => string;
  // Preview
  opens: Record<Trigger, (value: string) => string>;
  shortened: string;
  showAgain: string;
  site: {
    nav: readonly string[];
    cta: string;
    kicker: string;
    title: string;
    body: string;
    secondary: string;
    cards: readonly string[];
  };
}
// #endregion editor-words

/** What the popup panels pass around. */
export interface PopupKitWords {
  popup: PopupEditorWords;
  visitor: PopupWords;
}
