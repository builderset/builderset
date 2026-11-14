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
        <span key={key} className="underline underline-offset-2">
          {node}
        </span>
      );
    case 'strike':
      return <s key={key}>{node}</s>;
    case 'code':
      return (
        <code
          key={key}
          className="bg-muted rounded-[var(--radius-control,0.4rem)] px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {node}
        </code>
      );
    case 'highlight':
      return (
        <mark key={key} className="bg-primary/15 text-foreground rounded-sm px-0.5">
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
          className="text-primary decoration-primary/40 hover:decoration-primary font-medium underline underline-offset-2 transition-colors"
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
        <sup key={key} className="ml-0.5">
          <a
            href={`#fn-${mark.ref}`}
            id={`fnref-${mark.ref}`}
            className="text-primary font-semibold no-underline"
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
  value: RichText | undefined | null;
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
