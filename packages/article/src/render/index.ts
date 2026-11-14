/**
 * @builderset/article/render — an article, rendered.
 *
 * Framework-agnostic React (Server Component safe); hosts inject their link
 * and image components, media resolver, locale and messages. See the README
 * for the theme contract the classes rely on.
 */

export * from './context';
export type { EditableTextField } from '@builderset/engine';
export { embedSource, PROVIDER_NAMES, type EmbedSource } from './embed-source';
export { fill, messagesFor, RENDER_EN, type RenderMessages } from './messages';
export { styleClasses, styleInline } from './node-style';
export { ButtonLink, frameProps, Picture } from './parts';
export {
  ArticleRenderer,
  createRenderContext,
  frameFor,
  renderDocument,
  renderNode,
  standardRenderers,
  type ArticleRendererProps,
} from './render';
export { RichTextView } from './rich-text';
export { jsonLdString, structuredData, type StructuredDataOptions } from './structured-data';
