/**
 * @builderset/engine — what every builder shares.
 *
 * Pure TypeScript: the node tree, the element registry, every editing
 * operation with undo, the structural and translation checks, reading stored
 * documents with element migrations, rich text, styles, media references and
 * languages. No React and no elements of its own — each kit (`@builderset/article`,
 * `@builderset/email`) brings its document type, its elements and its checks.
 */

export {
  CLIPBOARD_MIME,
  copyNodes,
  fragmentToHtml,
  fragmentToPlainText,
  readFragmentJson,
  type ClipboardPayload,
} from './clipboard';
export {
  nodeShapeSchema,
  type BuilderNode,
  type EngineDocument,
  type Fragment,
  type NodeTree,
} from './document';
export { domParser } from './dom-parser';
export { type EditableTextField } from './editable';
export {
  frameBounds,
  frameOf,
  freeFrameSchema,
  isPlaced,
  normalizeAngle,
  UNPLACED_FRAME,
  type FreeFrame,
  type FreeRect,
} from './frame';
export {
  History,
  type CommitOptions,
  type HistoryEntry,
  type HistoryOptions,
  type Selection,
} from './history';
export {
  documentLocales,
  hasWords,
  i18nSchema,
  isLocaleCode,
  isTranslating,
  LOCALE_CODE,
  localize,
  TRANSLATABLE_META,
  unknownLocaleIssues,
  valueAt,
  withValueAt,
  type ContentLocale,
  type DocumentI18n,
  type Localizable,
  type Translation,
} from './i18n';
export { createId, ROOT_ID, type NodeId } from './ids';
export { error, warning, type Issue } from './issues';
export { elementRules, toDraft2020 } from './json-schema';
export { LIMITS, type Limits } from './limits';
export { MEDIA_KINDS, mediaRefSchema, type MediaKind, type MediaRef } from './media';
export {
  applyChange,
  BuilderError,
  createFragment,
  createWrappedFragment,
  duplicate,
  extractFragment,
  insert,
  move,
  reidFragment,
  remove,
  replaceableTypes,
  replaceType,
  TEXT_FAMILY,
  unwrap,
  update,
  wrap,
  wrapChain,
  type Change,
  type NodePatch,
} from './operations';
export {
  defineElement,
  ElementRegistry,
  type CheckContext,
  type ContainerRule,
  type ElementCategory,
  type ElementDefinition,
  type PropsOf,
} from './registry';
export {
  footnoteRefsOf,
  hasMarkEverywhere,
  isRichTextEmpty,
  linksOf,
  markSchema,
  normalizeRichText,
  richTextSchema,
  richTextToPlain,
  rt,
  textRunSchema,
  type Mark,
  type MarkType,
  type RichText,
  type TextRun,
} from './rich-text';
export { migrateElements, readStored, type ParseResult } from './serialize';
export {
  BREAKPOINTS,
  isHiddenAt,
  nodeStyleSchema,
  resolveStyle,
  setStyleValue,
  SPACE,
  styleValuesSchema,
  SURFACES,
  type Breakpoint,
  type NodeStyle,
  type Space,
  type StyleValues,
  type Surface,
} from './style';
export { countWords, plainText, readingMinutes } from './text-stats';
export {
  themeVariables,
  TOKEN_NAMES,
  type ThemeMode,
  type ThemeTokens,
  type TokenName,
} from './theme';
export {
  ancestors,
  contains,
  depthOf,
  descendants,
  findNodes,
  getNode,
  indexInParent,
  inOrder,
  parentOf,
  siblingInOrder,
  subtreeHeight,
  topLevelIds,
  walk,
} from './tree';
export { isAnchor, isExternalUrl, isSafeUrl, slugifyAnchor } from './url';
export { hasErrors, structuralIssues, translationIssues } from './validate';
export { ENGINE_VERSION } from './version';

/**
 * The zod the engine validates with. A project's own elements declare their
 * props with this one, so the editor's inspector and the checks see the same
 * copy (two copies of zod do not recognise each other's schemas).
 */
export { z } from 'zod';
