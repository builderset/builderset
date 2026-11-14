/**
 * @builderset/article — the article kit's model.
 *
 * Pure TypeScript on top of `@builderset/engine`: the article document and its
 * meta, the standard element library, the article's checks, parsing with
 * migrations, the JSON Schema the server validates with, the outline, and
 * import from HTML and Markdown.
 */

export { ARTICLE_CATEGORIES, type ArticleCategory } from './categories';
export { articleSchema, checkArticle, type CheckArticleOptions } from './check';
export {
  articleMetaSchema,
  articleShapeSchema,
  createArticleDocument,
  DOCUMENT_SCHEMA,
  DOCUMENT_VERSION,
  seoSchema,
  type ArticleDocument,
  type ArticleMeta,
  type SeoMeta,
} from './document';
export { ARTICLE_DRAFT_TOLERATES, isDraftBlocking, isPublishBlocking } from './draft';
export {
  accordionElement,
  accordionItemElement,
  articleElements,
  audioElement,
  authorElement,
  beforeAfterElement,
  BUTTON_ICONS,
  buttonIssues,
  buttonSchema,
  buttonsElement,
  CALLOUT_TONES,
  calloutElement,
  CODE_LANGUAGES,
  codeElement,
  COLUMN_LAYOUTS,
  columnElement,
  columnsElement,
  containerElement,
  createArticleRegistry,
  ctaElement,
  definitionListElement,
  disclaimerElement,
  dividerElement,
  embedElement,
  engagementElements,
  faqElement,
  fileElement,
  footnoteElement,
  galleryElement,
  groupElement,
  headingElement,
  howToElement,
  imageElement,
  joinLinks,
  joinPlain,
  layoutElements,
  linkSchema,
  listElement,
  listOf,
  longText,
  media,
  mediaElements,
  mediaTextElement,
  newsletterElement,
  paragraphElement,
  present,
  prosConsElement,
  pullQuoteElement,
  quoteElement,
  ratingElement,
  relatedElement,
  richText,
  rootElement,
  safeUrl,
  sectionElement,
  shortText,
  spacerElement,
  standardElements,
  statsElement,
  tabItemElement,
  tableElement,
  tabsElement,
  takeawaysElement,
  textElements,
  timelineElement,
  tocElement,
  videoElement,
  type ButtonSpec,
  type ColumnLayout,
  type Link,
} from './elements';
export {
  detectEmbedProvider,
  EMBED_ASPECT,
  EMBED_PATTERNS,
  EMBED_PROVIDERS,
  type EmbedProvider,
} from './embeds';
export { fragmentFromBlocks, importHTML, inlineOf, type ImportedBlock } from './import-html';
export { importMarkdown, inlineMarkdown, looksLikeMarkdown } from './import-markdown';
export { kitchenSinkDocument, renumber } from './kitchen-sink';
export { ARTICLE_LIMITS, type ArticleLimits } from './limits';
export { outline, type OutlineEntry } from './outline';
export { parseArticle, serializeArticle } from './parse';
export { readClipboard } from './paste';
export { toArticleJSONSchema } from './schema';
