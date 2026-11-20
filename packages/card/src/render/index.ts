/**
 * @builderset/card/render — a card as React, for a page or a printer.
 *
 * `CardView` draws one side at any size, filled in for one member;
 * `CardPrintSheet` lays every side of every member's card out at real size
 * with bleed and crop marks, a page each. `CardElement` is one element's
 * content, for a page that places elements its own way. Load
 * `@builderset/card/card.css` beside them.
 */

export { CardView, type CardViewProps } from './card-view';
export { Barcode, QrCode } from './codes';
export { CardElement, type CardElementProps } from './element';
export { CardPrintSheet, type CardPrintSheetProps } from './print-sheet';
export { ACTUAL_SIZE, CARD_FONTS_URL, cardStyle, fontStack, frameStyle, inkOn } from './style';
export { cardWords, de, en, sq, type CardWords } from './words';
