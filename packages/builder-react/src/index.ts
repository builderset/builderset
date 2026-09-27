/**
 * @motors/builder-react — the article builder's editor.
 *
 * `<BuilderEditor>` is the whole workspace; a host passes the document, the
 * element registry and a `BuilderHost` adapter for everything that leaves the
 * browser (uploads, saving, publishing, revisions).
 */

export { BuilderEditor, type BuilderEditorProps } from './editor';
export type { ArticleFacts } from './context';
export type {
  BuilderHost,
  OEmbedInfo,
  RevisionSummary,
  SavedSection,
  SaveReason,
  SaveResult,
  UploadResult,
} from './host';
export { editorMessages, type EditorMessages } from './messages';
export { createEditorStore, type EditorStore } from './store';
export { fromTiptap, toTiptap } from './text/convert';
