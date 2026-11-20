'use client';

/**
 * @builderset/popup/editor — the popup builder: the shared editor
 * (`@builderset/engine/editor`) with the popup profile.
 */

export { PopupEditor, type PopupEditorProps } from './editor';
export type { PopupEditorWords, PopupKitWords, PopupLocale, PopupMessages } from './messages';
export { popupProfile, type PopupProfileOptions } from './profile';
export { PopupPreview } from './preview';
export {
  buildTemplatePopup,
  defineTemplate,
  POPUP_TEMPLATE_CATEGORIES,
  POPUP_TEMPLATES,
  type PopupTemplate,
  type PopupTemplateCategory,
} from '../templates';
