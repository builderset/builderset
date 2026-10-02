/**
 * @motors/builder-react — the article builder's editor.
 *
 * `<BuilderEditor>` is the whole workspace; a host passes the document, the
 * element registry and a `BuilderHost` adapter for everything that leaves the
 * browser (uploads, saving, publishing, revisions).
 */

export { BuilderEditor, type BuilderEditorProps } from './editor';
export type { ArticleFacts } from './context';
export { useEditor, useEditorContext, useMessages, useProfile } from './context';
export type { EditorProfile } from './profile';
export { MediaField } from './inspector/media-field';
export { ColorField, SpacingField } from './inspector/special-fields';
export { AlignButtons, FontField } from './inspector/type-fields';
export { NumberStepper, type NumberStepperProps } from './inspector/number-stepper';
export { RichTextInput } from './text/rich-text-input';
export type {
  BuilderHost,
  OEmbedInfo,
  RevisionSummary,
  SavedSection,
  SaveReason,
  SaveResult,
  UploadResult,
} from './host';
export { editorMessages, type EditorMessages, type ElementText } from './messages';
export { createEditorStore, type EditorStore } from './store';
export { fromTiptap, toTiptap } from './text/convert';
