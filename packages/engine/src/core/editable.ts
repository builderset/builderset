import type { RichText } from './rich-text';

/**
 * A piece of rich text the canvas makes editable in place: the contract
 * between the editor's workspace and whatever draws a kit's canvas. A kit's
 * renderer, in editing mode, hands each field to the editor's `editText`.
 *
 * It lives in the core, not the editor, so a renderer can name it without
 * importing the editor.
 */
export interface EditableTextField {
  nodeId: string;
  /** Dot path of the prop: `text`, `items.2.text`. */
  path: string;
  value: RichText;
  /** What an empty field shows while editing. */
  placeholder?: string | undefined;
  /** The element the text sits in — a heading's `h2`, a list's `li`. */
  multiline?: boolean | undefined;
}
