import type { BuilderNode, EditableTextField, ElementRegistry } from '@motors/engine';
import type { ArticleDocument } from '../core/document';
import type { OutlineEntry } from '../core/outline';
import type { ComponentType, ReactNode } from 'react';

import type { RenderMessages } from './messages';

/**
 * Everything the renderer needs from its host, and nothing it can decide for
 * itself. A Next.js site passes `next/link` and `next/image`; a plain React app
 * passes nothing and gets `<a>` and `<img>`.
 */

export interface LinkProps {
  href: string;
  className?: string | undefined;
  children: ReactNode;
  target?: string | undefined;
  rel?: string | undefined;
}

export interface ImageProps {
  src: string;
  alt: string;
  width?: number | undefined;
  height?: number | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  loading?: 'lazy' | 'eager' | undefined;
  sizes?: string | undefined;
}

/** A card in "Read next". */
export interface RelatedItem {
  id: string;
  title: string;
  href: string;
  cover?: string | null | undefined;
  excerpt?: string | null | undefined;
}

export interface RenderOptions {
  /** Storage key → URL. */
  resolveMedia: (key: string) => string;
  locale?: string | undefined;
  messages?: Partial<RenderMessages> | undefined;
  linkComponent?: ComponentType<LinkProps> | undefined;
  imageComponent?: ComponentType<ImageProps> | undefined;
  /** The site's own articles for a `related` element in automatic mode. */
  related?: readonly RelatedItem[] | undefined;
  /** Where a newsletter form posts. Omitted, the form is shown but inert. */
  newsletterAction?: string | undefined;
  /**
   * The editor's canvas renders through the same components, with this set:
   * links do not navigate, forms do not submit, embeds show their placeholder.
   */
  editing?: boolean | undefined;
  /** Extra renderers for a host's own elements, by type. */
  elements?: Readonly<Record<string, ElementRenderer>> | undefined;
  /**
   * Editor only: draws an editable field in place of a rich-text value. The
   * text elements name which prop they are showing (`{ nodeId, path }`), so the
   * editor can write straight back to it; everything else stays static.
   */
  editText?: ((field: EditableTextField) => ReactNode) | undefined;
}

export interface RenderContext {
  document: ArticleDocument;
  registry: ElementRegistry;
  options: RenderOptions;
  messages: RenderMessages;
  Link: ComponentType<LinkProps>;
  Image: ComponentType<ImageProps>;
  outline: OutlineEntry[];
  /** Footnote node id → its number in reading order. */
  footnotes: Map<string, number>;
  /** Render a node by id — how a container renders its children. */
  renderNode: (id: string) => ReactNode;
}

/**
 * What every element puts on its outermost element: the anchor id and the
 * node's own style, already turned into classes. An element merges its
 * defaults with `className` (the node's style wins) and spreads the rest.
 */
export interface NodeFrame {
  id?: string | undefined;
  className: string;
  style?: React.CSSProperties | undefined;
  'data-node'?: string | undefined;
  /** Editor only: set on a hidden node, which the canvas dims. */
  'data-hidden-node'?: string | undefined;
}

export interface ElementRenderProps<P = Record<string, unknown>> {
  node: BuilderNode;
  props: P;
  frame: NodeFrame;
  /** The node's children, already rendered (containers only). */
  children: ReactNode;
  context: RenderContext;
}

export type ElementRenderer<P = Record<string, unknown>> = ComponentType<ElementRenderProps<P>>;
