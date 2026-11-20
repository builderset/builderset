/**
 * @builderset/form/editor — the form builder: the shared editor
 * (`@builderset/engine/editor`) with the form profile.
 */

export { FormCanvas } from './canvas';
export type { FormResponseSummary, FormResponses } from './context';
export { FormEditor, type FormEditorProps } from './editor';
export type { FormEditorWords, FormKitWords, FormLocale, FormMessages } from './messages';
export { formProfile, type FormProfileOptions } from './profile';
export {
  buildTemplateForm,
  defineTemplate,
  FORM_TEMPLATE_CATEGORIES,
  FORM_TEMPLATES,
  stepBlocks,
  toTemplateSpec,
  type FormTemplate,
  type FormTemplateCategory,
} from '../templates';
