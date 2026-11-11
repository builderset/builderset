import { Mark, mergeAttributes } from '@tiptap/core';

export interface FontMarkOptions {
  /** A font key → its CSS stack, so the editor draws the text in it. */
  stackOf: (family: string) => string | undefined;
}

/**
 * A font on part of a text — Word's font box. Stored as a `font` mark with
 * the font's KEY (never a CSS string), so what the text may be set in is the
 * catalogue's choice, not whatever was typed.
 */
export const FontMark = Mark.create<FontMarkOptions>({
  name: 'font',
  addOptions() {
    return { stackOf: () => undefined };
  },
  addAttributes() {
    return { family: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-font]',
        getAttrs: (element) => ({ family: element.getAttribute('data-font') }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const family = typeof HTMLAttributes.family === 'string' ? HTMLAttributes.family : '';
    const stack = this.options.stackOf(family);
    const rest = Object.fromEntries(
      Object.entries(HTMLAttributes).filter(([key]) => key !== 'family'),
    );
    return [
      'span',
      mergeAttributes(rest, {
        'data-font': family,
        ...(stack ? { style: `font-family: ${stack}` } : {}),
      }),
      0,
    ];
  },
});
