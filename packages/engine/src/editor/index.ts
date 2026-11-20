/**
 * @builderset/engine/editor — the workspace every builder shares.
 *
 * `<BuilderEditor>` is the whole workspace; a kit passes its profile (canvas,
 * checks, panels), and a host passes the document, the element registry and a
 * `BuilderHost` adapter for everything that leaves the browser (uploads,
 * saving, publishing, revisions). Each kit wraps it: `ArticleEditor`,
 * `EmailEditor`.
 */

export { BuilderEditor, type BuilderEditorProps } from './editor';
export {
  useEditor,
  useEditorContext,
  useMessages,
  useProfile,
  useRecord,
  type EditorContextValue,
  type RecordFacts,
} from './context';
export type { EditorProfile, TemplateBlock, TemplateCategory, TemplateSpec } from './profile';
export type { EditableTextField } from '../core';
export { IssueList, ReadyCard, useIssues, useJumpToIssue } from './chrome/issues';
export {
  LanguageBar,
  LanguageSwitch,
  MultilingualToggle,
  useBaseLocale,
} from './chrome/language-switch';
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
} from '../host';
export {
  languageName,
  pickLocale,
  resolveMessages,
  type DeepPartial,
  type EditorMessages,
  type ElementText,
} from './messages';
export { useHtmlLang } from './locale';
export { createEditorStore, type EditorActions, type EditorState, type EditorStore } from './store';
export { fromTiptap, toTiptap } from './text/convert';
