/**
 * @motors/email/render — email documents into HTML every mail client shows,
 * and plain text. The React view for the builder's canvas is in
 * `@motors/email/editor`.
 */

export {
  color,
  createContext,
  DEFAULT_BRAND,
  fill,
  socialIconsAt,
  socialIconUrl,
  type BrandKit,
  type RenderContext,
  type RenderOptions,
} from './context';
export { escapeHtml, renderEmail, type RenderedEmail, type RenderWarning } from './html';
