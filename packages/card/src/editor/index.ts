/**
 * @builderset/card/editor — the card builder: the shared editor
 * (`@builderset/engine/editor`) with the card profile.
 */

export { CardEditor, type CardEditorProps } from './editor';
export type { CardContextValue, CardFace } from './context';
export type { CardEditorWords, CardKitWords, CardLocale, CardMessages } from './messages';
export { cardProfile, type CardProfileOptions } from './profile';
export { MM } from './stage';
export {
  buildTemplateCard,
  CARD_TEMPLATE_CATEGORIES,
  CARD_TEMPLATES,
  defineCardTemplate,
  templateOptions,
  type CardTemplate,
  type CardTemplateCategory,
} from '../templates';
export { CSS_DPI, MM_PER_INCH, mmToPt, mmToPx, PT_MM, ptToMm, pxToMm } from '../core';
