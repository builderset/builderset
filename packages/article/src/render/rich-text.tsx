import { isExternalUrl, isSafeUrl, type Mark, type RichText } from '@builderset/engine';
import type { ReactNode } from 'react';

import type { RenderContext } from './context';

/**
 * Rich text → JSX. Marks become elements, text stays text — React escapes it,
 * so nothing a writer types is ever read as markup.
 *
 * Marks are applied innermost-first in a fixed order (the order
 * `normalizeRichText` sorts them into), so `bold + link` is always
 * `<a><strong>…</strong></a>` and never the other way round, and the DOM for
 * two identical runs is identical.
 */

function wrap(node: ReactNode, mark: Mark, context: RenderContext, key: string): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong key={key}>{node}</strong>;
    case 'italic':
      return <em key={key}>{node}</em>;
    case 'underline':
      return (
        <span key={key} className="bst:underline bst:underline-offset-2">
          {node}
        </span>
      );
    case 'strike':
      return <s key={key}>{node}</s>;
    case 'code':
      return (
        <code
          key={key}
          className="bst:rounded-control bst:bg-muted bst:px-1.5 bst:py-0.5 bst:font-mono bst:text-[0.9em]"
        >
          {node}
        </code>
      );
    case 'highlight':
      return (
        <mark key={key} className="bst:rounded-sm bst:bg-primary/15 bst:px-0.5 bst:text-foreground">
          {node}
        </mark>
      );
    case 'sub':
      return <sub key={key}>{node}</sub>;
    case 'sup':
      return <sup key={key}>{node}</sup>;
    case 'link': {
      // Checked again at render: a document from somewhere else must not be
      // able to put a `javascript:` URL on the page even if it slipped past
      // an older validator.
      if (!isSafeUrl(mark.href)) return node;
      const external = isExternalUrl(mark.href);
      const { Link } = context;
      return (
        <Link
          key={key}
          href={context.options.editing ? '#' : mark.href}
          className="bst:font-medium bst:text-primary bst:underline bst:decoration-primary/40 bst:underline-offset-2 bst:transition-colors bst:hover:decoration-primary"
          {...(mark.newTab || external ? { target: '_blank' } : {})}
          {...(external ? { rel: 'noopener noreferrer' } : {})}
        >
          {node}
        </Link>
      );
    }
    case 'footnote': {
      const number = context.footnotes.get(mark.ref);
      if (number === undefined) return node;
      return (
        <sup key={key} className="bst:ml-0.5">
          <a
            href={`#fn-${mark.ref}`}
            id={`fnref-${mark.ref}`}
            className="bst:font-semibold bst:text-primary bst:no-underline"
            aria-describedby="footnotes-heading"
          >
            {number}
          </a>
        </sup>
      );
    }
  }
}

export function RichTextView({
  value,
  context,
  field,
}: {
  /** The text. Empty draws nothing, unless the editor is editing it in place. */
  value: RichText | undefined | null;
  /** The render context, for links, footnote numbers and editing in place. */
  context: RenderContext;
  /** Which prop this is — lets the editor edit it in place. */
  field?: { node: string; path: string; placeholder?: string } | undefined;
}) {
  const { editText } = context.options;
  if (editText && field) {
    return editText({
      nodeId: field.node,
      path: field.path,
      value: value ?? [],
      placeholder: field.placeholder,
    });
  }
  if (!value?.length) return null;
  return (
    <>
      {value.map((run, index) => {
        const key = String(index);
        // Innermost first: reverse the stored order so the first mark (a
        // link) ends up outermost.
        return [...(run.marks ?? [])]
          .reverse()
          .reduce<ReactNode>(
            (node, mark, depth) => wrap(node, mark, context, `${key}-${String(depth)}`),
            run.text,
          );
      })}
    </>
  );
}
