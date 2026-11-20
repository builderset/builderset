/**
 * @builderset/email/editor — the email template builder: the shared editor
 * (`@builderset/engine/editor`) with the email profile, and the canvas view of an
 * email document.
 */

export { EmailCanvas, type EditableField, type EmailCanvasProps } from './canvas';
export { EmailEditor, type EmailEditorProps } from './editor';
export { emailProfile, type EmailProfileOptions } from './profile';
export type { EmailView } from './context';
export {
  buildTemplateEmail,
  defineTemplate,
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATES,
  sectionBlocks,
  toTemplateSpec,
  type EmailTemplate,
  type EmailTemplateCategory,
} from '../templates';
export type {
  EmailLocale,
  EmailMessages,
  EmailSettingsWords,
  EmailWords,
  ImportHtmlWords,
} from './messages';
