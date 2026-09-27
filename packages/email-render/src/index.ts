/**
 * @motors/email-render — email documents into HTML every mail client shows,
 * plain text, and a React view for the builder's canvas.
 */

export { EmailCanvas, type EditableField, type EmailCanvasProps } from './canvas';
export {
  color,
  createContext,
  DEFAULT_BRAND,
  fill,
  type BrandKit,
  type RenderContext,
  type RenderOptions,
} from './context';
export { escapeHtml, renderEmail, type RenderedEmail, type RenderWarning } from './html';
