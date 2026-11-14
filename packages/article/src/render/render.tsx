import {
  localize,
  walk,
  type ElementRegistry,
  type RichText,
  type ThemeMode,
} from '@builderset/engine';
import type { ArticleDocument } from '../core/document';
import { outline as buildOutline } from '../core/outline';
import { Fragment, type ReactNode } from 'react';

import type {
  ElementRenderer,
  ImageProps,
  LinkProps,
  NodeFrame,
  RenderContext,
  RenderOptions,
} from './context';
import {
  AuthorView,
  FaqView,
  HowToView,
  ProsConsView,
  RatingView,
  StatsView,
  TimelineView,
  TocView,
} from './elements/article';
import {
  AccordionItemView,
  AccordionView,
  ButtonsView,
  CtaView,
  DisclaimerView,
  NewsletterView,
  RelatedView,
  TabItemView,
  TabsView,
} from './elements/engagement';
import {
  ColumnsView,
  ColumnView,
  ContainerView,
  DividerView,
  GroupView,
  SectionView,
  SpacerView,
} from './elements/layout';
import {
  AudioView,
  BeforeAfterView,
  EmbedView,
  FileView,
  GalleryView,
  ImageView,
  MediaTextView,
  VideoView,
} from './elements/media';
import {
  CalloutView,
  CodeView,
  DefinitionsView,
  FootnoteView,
  HeadingView,
  ListView,
  ParagraphView,
  PullQuoteView,
  QuoteView,
  TableView,
  TakeawaysView,
} from './elements/text';
import { cn } from './cn';
import { messagesFor } from './messages';
import { styleClasses, styleInline } from './node-style';
import { RichTextView } from './rich-text';

/**
 * Document → React. A Server Component in a Next.js app: nothing here uses a
 * hook, so the page ships no JavaScript for the static elements; only the
 * small islands (`./client/*`) hydrate.
 *
 * ── A node renders only if its props pass its schema ─────────────────────────
 * The server validated the document on the way in, but the renderer does not
 * assume it: a node whose props fail (a document from an older validator, a
 * hand-edited row) renders NOTHING rather than half of itself. Unknown element
 * types are skipped the same way.
 */

// Element props are checked against their schema before a renderer sees them,
// so each renderer can declare the exact props type of its element.
type AnyRenderer = ElementRenderer<never>;

export const standardRenderers: Readonly<Record<string, AnyRenderer>> = {
  section: SectionView,
  container: ContainerView,
  columns: ColumnsView,
  column: ColumnView,
  group: GroupView,
  spacer: SpacerView,
  divider: DividerView,
  heading: HeadingView,
  paragraph: ParagraphView,
  list: ListView,
  quote: QuoteView,
  'pull-quote': PullQuoteView,
  callout: CalloutView,
  code: CodeView,
  table: TableView,
  footnote: FootnoteView,
  takeaways: TakeawaysView,
  definitions: DefinitionsView,
  image: ImageView,
  gallery: GalleryView,
  'before-after': BeforeAfterView,
  'media-text': MediaTextView,
  video: VideoView,
  audio: AudioView,
  embed: EmbedView,
  file: FileView,
  toc: TocView,
  faq: FaqView,
  howto: HowToView,
  timeline: TimelineView,
  'pros-cons': ProsConsView,
  stats: StatsView,
  rating: RatingView,
  author: AuthorView,
  cta: CtaView,
  buttons: ButtonsView,
  related: RelatedView,
  newsletter: NewsletterView,
  accordion: AccordionView,
  'accordion-item': AccordionItemView,
  tabs: TabsView,
  'tab-item': TabItemView,
  disclaimer: DisclaimerView,
};

function DefaultLink({ href, className, children, target, rel }: LinkProps) {
  return (
    <a href={href} className={className} target={target} rel={rel}>
      {children}
    </a>
  );
}

function DefaultImage({ src, alt, width, height, className, style, loading, sizes }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={loading ?? 'lazy'}
      decoding="async"
      sizes={sizes}
    />
  );
}

/** Footnote node ids numbered in reading order, hidden ones skipped. */
function numberFootnotes(document: ArticleDocument): Map<string, number> {
  const numbers = new Map<string, number>();
  walk(document, (node) => {
    if (node.hidden) return false;
    if (node.type === 'footnote') numbers.set(node.id, numbers.size + 1);
    return undefined;
  });
  return numbers;
}

export function createRenderContext(
  document: ArticleDocument,
  registry: ElementRegistry,
  options: RenderOptions,
): RenderContext {
  const context: RenderContext = {
    document,
    registry,
    options,
    messages: messagesFor(options.messages),
    Link: options.linkComponent ?? DefaultLink,
    Image: options.imageComponent ?? DefaultImage,
    outline: buildOutline(document),
    footnotes: numberFootnotes(document),
    renderNode: () => null,
  };
  context.renderNode = (id) => renderNode(id, context);
  return context;
}

/** The frame every element puts on its root: anchor, style classes, style. */
export function frameFor(id: string, context: RenderContext): NodeFrame {
  const node = context.document.nodes[id];
  const style = styleInline(node?.style, context.options.resolveMedia);
  return {
    ...(node?.anchor ? { id: node.anchor } : {}),
    className: styleClasses(node?.style),
    ...(style ? { style } : {}),
    ...(context.options.editing ? { 'data-node': id } : {}),
    ...(context.options.editing && node?.hidden ? { 'data-hidden-node': '' } : {}),
  };
}

export function renderNode(id: string, context: RenderContext): ReactNode {
  const node = context.document.nodes[id];
  if (!node || (node.hidden && !context.options.editing)) return null;
  const definition = context.registry.get(node.type);
  const Renderer = (context.options.elements?.[node.type] ?? standardRenderers[node.type]) as
    ElementRenderer | undefined;
  if (!definition || !Renderer) return null;
  const parsed = definition.schema.safeParse(node.props);
  if (!parsed.success) return null;

  const children = node.children?.map((childId) => (
    <Fragment key={childId}>{renderNode(childId, context)}</Fragment>
  ));
  return (
    <Renderer node={node} props={parsed.data} frame={frameFor(id, context)} context={context}>
      {children}
    </Renderer>
  );
}

/** The numbered notes under the article, when it has any. */
function Footnotes({ context }: { context: RenderContext }) {
  if (context.footnotes.size === 0 || context.options.editing) return null;
  const entries = [...context.footnotes.entries()].sort((a, b) => a[1] - b[1]);
  return (
    <section
      aria-labelledby="footnotes-heading"
      className="bst:mt-12 bst:border-t bst:border-border bst:pt-6"
    >
      <h2
        id="footnotes-heading"
        className="bst:mb-3 bst:text-sm bst:font-semibold bst:tracking-wide bst:text-foreground bst:uppercase"
      >
        {context.messages.notes}
      </h2>
      <ol className="bst:space-y-2 bst:text-sm bst:text-muted-foreground">
        {entries.map(([id, number]) => {
          const text = context.document.nodes[id]?.props.text as RichText | undefined;
          return (
            <li key={id} id={`fn-${id}`} className="bst:flex bst:gap-2">
              <span className="bst:font-semibold bst:text-primary bst:tabular-nums">{number}.</span>
              <span className="bst:min-w-0 bst:flex-1">
                <RichTextView value={text} context={context} />{' '}
                <a
                  href={`#fnref-${id}`}
                  className="bst:text-primary bst:no-underline"
                  aria-label="↩"
                >
                  ↩
                </a>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The whole body of a document. */
export function renderDocument(
  document: ArticleDocument,
  registry: ElementRegistry,
  options: RenderOptions,
): ReactNode {
  // A multi-language article reads in the visitor's language; the rest falls back.
  const doc = localize(document, options.locale);
  const context = createRenderContext(doc, registry, options);
  const root = doc.nodes[doc.root];
  return (
    <>
      {root?.children?.map((id) => (
        <Fragment key={id}>{renderNode(id, context)}</Fragment>
      ))}
      <Footnotes context={context} />
    </>
  );
}

export interface ArticleRendererProps extends RenderOptions {
  /** The article to render. */
  document: ArticleDocument;
  /**
   * The elements it may hold — usually `createArticleRegistry()`. A node whose
   * type is missing here, or whose props do not pass its schema, is left out.
   */
  registry: ElementRegistry;
  /** Applied to the wrapping `<div>`, beside `builderset builderset-content`. */
  className?: string | undefined;
  /**
   * 'auto' (the default) follows the site: an ancestor marked `dark` or
   * `light` (a class, or `data-theme`), else the operating system. 'light'
   * and 'dark' pin it.
   */
  theme?: ThemeMode | undefined;
}

/**
 * `renderDocument` as a component. Its root carries the stylesheet's scope
 * (`@builderset/article/content.css`) and the theme.
 */
export function ArticleRenderer({
  document,
  registry,
  className,
  theme,
  ...options
}: ArticleRendererProps) {
  return (
    <div
      className={cn('builderset builderset-content', className)}
      data-builderset-theme={theme ?? 'auto'}
    >
      {renderDocument(document, registry, options)}
    </div>
  );
}
