import type { BuilderDocument, BuilderNode, Fragment } from './document';
import type { NodeId } from './ids';
import { fragmentFromBlocks, importHTML } from './import-html';
import { importMarkdown, looksLikeMarkdown } from './import-markdown';
import { extractFragment, reidFragment } from './operations';
import type { ElementRegistry } from './registry';
import { richTextToPlain, type RichText } from './rich-text';

/**
 * Copy and paste between builders, and out to everything else.
 *
 * A copy puts three things on the clipboard: the fragment as JSON under the
 * builder's own MIME type (a paste inside a builder restores it exactly), the
 * plain text (a paste into a chat), and a small, escaped HTML version (a paste
 * into an email or a document keeps its headings and lists). A paste reads
 * them in the same order of fidelity: our JSON, then HTML, then Markdown, then
 * text.
 */

export const CLIPBOARD_MIME = 'application/x-builder-fragment+json';

interface Envelope {
  schema: 'builder/fragment';
  version: 1;
  fragment: Fragment;
}

export interface ClipboardPayload {
  [CLIPBOARD_MIME]: string;
  'text/plain': string;
  'text/html': string;
}

export function copyNodes(
  doc: BuilderDocument,
  ids: readonly NodeId[],
  registry: ElementRegistry,
): ClipboardPayload {
  const fragment = extractFragment(doc, ids);
  const envelope: Envelope = { schema: 'builder/fragment', version: 1, fragment };
  return {
    [CLIPBOARD_MIME]: JSON.stringify(envelope),
    'text/plain': fragmentToPlainText(fragment, registry),
    'text/html': fragmentToHtml(fragment),
  };
}

/**
 * A fragment from whatever the clipboard holds, or `null` when it holds
 * nothing the builder can use. Nodes of unknown types, or whose props fail
 * their schema, are dropped — a paste from a builder with more plugins must
 * not smuggle in elements this one cannot render.
 */
export function readClipboard(
  data: { json?: string | null; html?: string | null; text?: string | null },
  registry: ElementRegistry,
): Fragment | null {
  if (data.json) {
    const fragment = parseEnvelope(data.json, registry);
    if (fragment?.roots.length) return fragment;
  }
  if (data.html?.trim()) {
    const fragment = importHTML(data.html, registry);
    if (fragment.roots.length) return fragment;
  }
  if (data.text?.trim()) {
    // Plain text is paragraphs split on blank lines — unless it reads as
    // Markdown, in which case its structure is worth keeping.
    const fragment = looksLikeMarkdown(data.text)
      ? importMarkdown(data.text, registry)
      : fragmentFromBlocks(
          data.text
            .split(/\n\s*\n/)
            .map((part) => part.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .map((text) => ({ type: 'paragraph', props: { text: [{ text }] } })),
          registry,
        );
    if (fragment.roots.length) return fragment;
  }
  return null;
}

function parseEnvelope(json: string, registry: ElementRegistry): Fragment | null {
  // Parsed as `unknown` and checked, not cast: the clipboard is whatever some
  // other program last put there.
  let envelope: unknown;
  try {
    envelope = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isEnvelope(envelope)) return null;
  const { roots, nodes } = envelope.fragment;

  const kept: Record<NodeId, BuilderNode> = {};
  const keep = (id: NodeId): boolean => {
    const node = nodes[id];
    const definition = node ? registry.get(node.type) : undefined;
    if (!node || !definition) return false;
    const props = definition.schema.safeParse(node.props);
    if (!props.success) return false;
    const children = (node.children ?? []).filter((child) => {
      const childNode = nodes[child];
      return childNode && registry.canContain(node.type, childNode.type) && keep(child);
    });
    const rest: BuilderNode = { ...node };
    delete rest.children;
    kept[id] = {
      ...rest,
      v: definition.version,
      props: props.data,
      ...(definition.container ? { children } : {}),
    };
    return true;
  };
  const keptRoots = roots.filter((id) => keep(id));
  return reidFragment({ roots: keptRoots, nodes: kept });
}

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Envelope>;
  return (
    candidate.schema === 'builder/fragment' &&
    typeof candidate.fragment === 'object' &&
    Array.isArray(candidate.fragment.roots) &&
    typeof candidate.fragment.nodes === 'object'
  );
}

function textOfNode(node: BuilderNode, registry: ElementRegistry): string {
  return registry.get(node.type)?.toPlainText?.(node.props) ?? '';
}

export function fragmentToPlainText(fragment: Fragment, registry: ElementRegistry): string {
  const parts: string[] = [];
  const visit = (id: NodeId) => {
    const node = fragment.nodes[id];
    if (!node) return;
    const text = textOfNode(node, registry).trim();
    if (text) parts.push(text);
    for (const child of node.children ?? []) visit(child);
  };
  fragment.roots.forEach(visit);
  return parts.join('\n\n');
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${String(char.charCodeAt(0))};`);

function inlineHtml(value: RichText | undefined): string {
  return (value ?? [])
    .map((run) => {
      let html = escape(run.text);
      for (const mark of run.marks ?? []) {
        if (mark.type === 'bold') html = `<strong>${html}</strong>`;
        else if (mark.type === 'italic') html = `<em>${html}</em>`;
        else if (mark.type === 'underline') html = `<u>${html}</u>`;
        else if (mark.type === 'strike') html = `<s>${html}</s>`;
        else if (mark.type === 'code') html = `<code>${html}</code>`;
        else if (mark.type === 'link') html = `<a href="${escape(mark.href)}">${html}</a>`;
      }
      return html;
    })
    .join('');
}

/** A conservative HTML rendering for pasting OUT — every string escaped. */
export function fragmentToHtml(fragment: Fragment): string {
  const out: string[] = [];
  const visit = (id: NodeId) => {
    const node = fragment.nodes[id];
    if (!node) return;
    const props = node.props;
    switch (node.type) {
      case 'heading':
        out.push(
          `<h${String(props.level)}>${inlineHtml(props.text as RichText)}</h${String(props.level)}>`,
        );
        break;
      case 'paragraph':
      case 'callout':
      case 'disclaimer':
      case 'footnote':
        out.push(`<p>${inlineHtml(props.text as RichText)}</p>`);
        break;
      case 'quote':
        out.push(`<blockquote>${inlineHtml(props.text as RichText)}</blockquote>`);
        break;
      case 'list': {
        const tag = props.style === 'number' ? 'ol' : 'ul';
        const items = (props.items as { text: RichText }[]).map(
          (item) => `<li>${inlineHtml(item.text)}</li>`,
        );
        out.push(`<${tag}>${items.join('')}</${tag}>`);
        break;
      }
      case 'code':
        out.push(`<pre><code>${escape(String(props.code))}</code></pre>`);
        break;
      case 'divider':
        out.push('<hr>');
        break;
      default: {
        const caption = props.caption;
        if (Array.isArray(caption) && richTextToPlain(caption as RichText)) {
          out.push(`<p>${inlineHtml(caption as RichText)}</p>`);
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  fragment.roots.forEach(visit);
  return out.join('');
}
