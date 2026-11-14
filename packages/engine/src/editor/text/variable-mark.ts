import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * A variable in the text — `{{ recipient.name }}` — drawn as a chip.
 *
 * Not inclusive: typing right after a chip writes plain text, not more of the
 * variable. The chip's text is only a label; what is sent is the value.
 */
export const VariableMark = Mark.create({
  name: 'variable',
  inclusive: false,
  excludes: '_',
  addAttributes() {
    return {
      path: { default: null },
      format: { default: null },
      fallback: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable': '',
        class:
          'bst:rounded bst:bg-blue-500/12 bst:px-1 bst:font-medium bst:text-[light-dark(var(--bst-color-blue-700),var(--bst-color-blue-300))] bst:whitespace-nowrap',
      }),
      0,
    ];
  },
});
