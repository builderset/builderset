import type { Editor } from '@tiptap/core';

/**
 * The text field written in last, so a panel can put something where its
 * caret was — a variable clicked in an email's Variables tab — after the
 * click has moved the focus away from it.
 */
let last: Editor | null = null;

export function rememberText(editor: Editor): void {
  last = editor;
}

export function forgetText(editor: Editor): void {
  if (last === editor) last = null;
}

/**
 * Puts the variable `path` as a chip where the caret last was in the text
 * being written. `false` when no text field has been written in, or it is gone.
 */
export function insertVariableAtCaret(path: string): boolean {
  const editor = last;
  if (!editor || editor.isDestroyed) return false;
  return editor
    .chain()
    .focus()
    .insertContent([
      { type: 'text', text: `{{${path}}}`, marks: [{ type: 'variable', attrs: { path } }] },
      { type: 'text', text: ' ' },
    ])
    .run();
}

/**
 * What a variable carries while dragged: dropped into a text field, it
 * becomes a chip there (the variable mark reads `span[data-variable]`).
 */
export function setVariableDragData(data: DataTransfer, path: string): void {
  const safe = path.replace(/[^\w.]/g, '');
  data.setData('text/html', `<span data-variable path="${safe}">{{${safe}}}</span>`);
  data.setData('text/plain', `{{${safe}}}`);
  data.effectAllowed = 'copy';
}
