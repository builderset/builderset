/**
 * @motors/email/editor — the email template builder: the shared editor
 * (`@motors/engine/editor`) with the email profile, and the canvas view of an
 * email document.
 */

export { EmailCanvas, type EditableField, type EmailCanvasProps } from './canvas';
export { EmailEditor, type EmailEditorProps } from './editor';
export { emailProfile, type EmailProfileOptions } from './profile';
export { emailWords, type EmailSettingsWords, type EmailWords } from './messages';
