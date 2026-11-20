/**
 * @builderset/form — the form builder's model.
 *
 * Pure TypeScript on top of `@builderset/engine`'s tree, operations and
 * history: the form document (steps of fields, its settings), the field types
 * and their rules, logic, the publishing checks — and `validateAnswers`, which
 * checks a submission on the server exactly as the form in the browser does.
 */

export * from './fields';
export {
  createFormDocument,
  defaultSettings,
  FORM_FONTS,
  FORM_ROOT,
  FORM_SCHEMA,
  FORM_VERSION,
  formMetaSchema,
  formSettingsSchema,
  formShapeSchema,
  type FormDocument,
  type FormFont,
  type FormMeta,
  type FormSettings,
} from './document';
export {
  ANSWER_FORMATS,
  answerOf,
  checkAnswer,
  formFields,
  isEmpty,
  isShown,
  ruleMatches,
  stepsOf,
  validateAnswers,
  type AnswerError,
  type AnswerErrorCode,
  type Answers,
  type AnswersResult,
  type FormField,
} from './answers';
export {
  checkForm,
  FORM_DRAFT_TOLERATES,
  formSchema,
  isDraftBlocking,
  isPublishBlocking,
  parseForm,
  PERSONAL_FIELD_TYPES,
  type CheckFormOptions,
} from './validate';
export { toFormJSONSchema } from './json-schema';
export {
  buildForm,
  field,
  settingsWith,
  step,
  type FieldSpec,
  type SettingsPatch,
  type StepSpec,
} from './build';
