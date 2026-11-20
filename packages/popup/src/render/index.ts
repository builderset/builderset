/**
 * @builderset/popup/render — a popup as React, for a public page.
 *
 * `PopupView` is the working popup: display rules, trigger, motion, closing,
 * inputs and the thank-you. `PopupPicture` draws one still, and the pieces
 * both are drawn from (`PopupElementContent`, `popupStyle`, …) are exported
 * for a page that lays one out its own way. Load
 * `@builderset/popup/popup.css` beside it. On the server, decide with
 * `shouldShow` and check what arrives with `validateSubmission` from
 * `@builderset/popup`.
 */

export {
  frameStyle,
  POPUP_ICON_COMPONENTS,
  PopupElementContent,
  RichTextView,
  timeLeft,
  type ElementContext,
  type LiveElement,
  type PopupElementProps,
} from './elements';
export { PopupPicture, type PopupPictureProps } from './picture';
export {
  EXIT_MS,
  PopupView,
  type CloseReason,
  type PopupClick,
  type PopupEvent,
  type PopupViewProps,
} from './popup-view';
export { qrModules, qrPath } from './qr';
export { browserStore, memoryStore, type PopupStore } from './store';
export {
  EDGE,
  inkOn,
  popupClassName,
  popupScale,
  popupStyle,
  SHADOWS,
  type PopupViewport,
} from './style';
export { de, en, errorText, popupWords, sq, type PopupWords } from './words';
