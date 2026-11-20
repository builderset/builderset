/**
 * @builderset/popup — the popup builder's model.
 *
 * Pure TypeScript on top of `@builderset/engine`'s tree, operations and
 * history: the popup document (its type, size, display rules and motion, and
 * the elements placed on it), the publishing checks — and the two functions a
 * server shares with the page: `shouldShow`, the display rules, and
 * `validateSubmission`, which checks what a visitor sends exactly as the
 * popup in the browser did.
 */

export * from './elements';
export {
  AUDIENCES,
  createPopupDocument,
  defaultDisplay,
  defaultFormat,
  defaultMotion,
  displaySchema,
  ENTER_MOTIONS,
  EXIT_MOTIONS,
  formatOf,
  FREQUENCIES,
  motionSchema,
  PAGE_MODES,
  POPUP_FONTS,
  POPUP_ROOT,
  POPUP_SCHEMA,
  POPUP_TYPE_KEYS,
  POPUP_TYPES,
  POPUP_VERSION,
  popupFormatSchema,
  popupMetaSchema,
  popupShapeSchema,
  positionOf,
  POSITIONS,
  TRIGGERS,
  type PopupDisplay,
  type PopupDocument,
  type PopupFont,
  type PopupFormat,
  type PopupMeta,
  type PopupMotion,
  type PopupPosition,
  type PopupType,
} from './document';
export {
  displayHides,
  HIDE_REASONS,
  languageMatches,
  localDay,
  normalisePath,
  pathMatches,
  pickPopup,
  shouldShow,
  whyHidden,
  type HideReason,
  type SeenRecord,
  type ShowContext,
} from './display';
export {
  checkSubmissionValue,
  inputsOf,
  SUBMISSION_FORMATS,
  SUBMISSION_MAX_LENGTH,
  validateSubmission,
  type Submission,
  type SubmissionError,
  type SubmissionErrorCode,
  type SubmissionResult,
} from './submission';
export {
  canClose,
  checkPopup,
  elementsOf,
  hasOverlay,
  isDraftBlocking,
  isPublishBlocking,
  parsePopup,
  PHONE_WIDTH,
  POPUP_DRAFT_TOLERATES,
  popupSchema,
  popupTips,
  type CheckPopupOptions,
  type PopupTip,
} from './validate';
export {
  exampleData,
  fillVariables,
  lookup,
  POPUP_FIELDS,
  VARIABLE_TOKEN,
  variablesIn,
  type PopupField,
} from './variables';
export { toPopupJSONSchema } from './json-schema';
export {
  buildPopup,
  el,
  formatWith,
  type ElementSpec,
  type FormatPatch,
  type FrameTuple,
} from './build';
