import type {
  calloutElement,
  codeElement,
  definitionListElement,
  footnoteElement,
  headingElement,
  listElement,
  paragraphElement,
  PropsOf,
  pullQuoteElement,
  quoteElement,
  RichText,
  tableElement,
  takeawaysElement,
} from '../../core';
import {
  CircleCheck,
  Info,
  Lightbulb,
  OctagonAlert,
  Quote,
  Square,
  SquareCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Prism } from 'prism-react-renderer';

import { CopyButton } from '../client/copy-button';
import { cn } from '../cn';
import type { ElementRenderProps, RenderContext } from '../context';
import { frameProps, parseLineSpec } from '../parts';
import { RichTextView } from '../rich-text';

export function HeadingView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof headingElement>>) {
  // The anchor the table of contents links to — the outline already made it
  // unique across the document.
  const anchor = context.outline.find((entry) => entry.id === node.id)?.anchor;
  const Tag = `h${String(props.level)}` as 'h2' | 'h3' | 'h4';
  const size = {
    2: 'mt-12 mb-4 text-xl font-semibold tracking-tight sm:text-2xl',
    3: 'mt-10 mb-3 text-lg font-semibold tracking-tight',
    4: 'mt-8 mb-2 text-base font-semibold',
  }[props.level];
  return (
    <Tag
      {...frameProps({ ...frame, id: frame.id ?? anchor }, cn('scroll-mt-24 text-balance', size))}
    >
      <RichTextView
        value={props.text}
        context={context}
        field={{ node: node.id, path: 'text', placeholder: context.messages.headingPlaceholder }}
      />
    </Tag>
  );
}

export function ParagraphView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof paragraphElement>>) {
  return (
    <p
      {...frameProps(
        frame,
        cn(
          'text-muted-foreground mb-5 leading-[1.75]',
          props.lead && 'text-foreground/85 text-lg leading-relaxed sm:text-xl',
          props.dropCap &&
            'first-letter:text-primary first-letter:float-left first-letter:mt-1 first-letter:mr-2.5 first-letter:text-[3.4em] first-letter:leading-[0.8] first-letter:font-semibold',
        ),
      )}
    >
      <RichTextView
        value={props.text}
        context={context}
        field={{ node: node.id, path: 'text', placeholder: context.messages.paragraphPlaceholder }}
      />
    </p>
  );
}

function Bullet() {
  return (
    <span className="bg-primary mt-[0.7em] size-1.5 shrink-0 rounded-full" aria-hidden="true" />
  );
}

function CheckMark({ checked }: { checked: boolean | undefined }) {
  const Icon = checked ? SquareCheck : Square;
  return (
    <Icon
      className={cn(
        'mt-[0.2em] size-[1.15em] shrink-0',
        checked ? 'text-primary' : 'text-muted-foreground',
      )}
      aria-hidden="true"
    />
  );
}

type ListItem = PropsOf<typeof listElement>['items'][number];

function ItemBody({
  item,
  style,
  context,
  field,
}: {
  item: { text: RichText; checked?: boolean | undefined };
  style: PropsOf<typeof listElement>['style'];
  context: RenderContext;
  field?: { node: string; path: string } | undefined;
}) {
  return (
    <>
      {style === 'bullet' ? (
        <Bullet />
      ) : style === 'check' ? (
        <CheckMark checked={item.checked} />
      ) : null}
      <span
        className={cn(
          'min-w-0',
          style === 'check' && item.checked && 'text-muted-foreground/80 line-through',
        )}
      >
        <RichTextView value={item.text} context={context} field={field} />
      </span>
    </>
  );
}

export function ListView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof listElement>>) {
  const Tag = props.style === 'number' ? 'ol' : 'ul';
  const itemClass = cn(
    'text-muted-foreground leading-relaxed',
    props.style === 'number' ? 'marker:text-primary pl-1 marker:font-semibold' : 'flex gap-3',
  );
  // Only top-level items are edited in place (`prefix` is set for them);
  // nested ones are edited in the inspector.
  const renderItems = (items: readonly ListItem[] | ListItem['children'], prefix?: string) =>
    (items ?? []).map((item, index) => (
      <li key={index} className={itemClass}>
        {props.style === 'number' ? (
          <RichTextView
            value={item.text}
            context={context}
            field={prefix ? { node: node.id, path: `${prefix}.${String(index)}.text` } : undefined}
          />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex gap-3">
              <ItemBody
                item={item}
                style={props.style}
                context={context}
                field={
                  prefix ? { node: node.id, path: `${prefix}.${String(index)}.text` } : undefined
                }
              />
            </div>
          </div>
        )}
        {'children' in item && item.children?.length ? (
          <Tag
            className={cn(
              'mt-2.5 space-y-2',
              props.style === 'number' ? 'list-[lower-alpha] pl-5' : 'pl-5',
            )}
          >
            {renderItems(item.children)}
          </Tag>
        ) : null}
      </li>
    ));
  return (
    <Tag
      {...frameProps(
        frame,
        cn(
          'mb-6 space-y-2.5',
          props.style === 'number' && 'list-decimal pl-5',
          props.style === 'check' && 'list-none',
        ),
      )}
    >
      {renderItems(props.items, 'items')}
    </Tag>
  );
}

export function QuoteView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof quoteElement>>) {
  const { Link } = context;
  return (
    <figure {...frameProps(frame, 'my-8')}>
      <blockquote
        className="border-primary bg-muted/50 rounded-r-[var(--radius-card,0.625rem)] border-l-2 px-6 py-5 text-lg leading-relaxed font-medium"
        {...(props.source ? { cite: props.source } : {})}
      >
        <RichTextView
          value={props.text}
          context={context}
          field={{ node: node.id, path: 'text' }}
        />
      </blockquote>
      {props.cite ? (
        <figcaption className="text-muted-foreground mt-3 pl-6 text-sm">
          —{' '}
          {props.source ? (
            <Link
              href={context.options.editing ? '#' : props.source}
              className="hover:text-foreground underline underline-offset-2"
            >
              {props.cite}
            </Link>
          ) : (
            props.cite
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function PullQuoteView({
  props,
  frame,
}: ElementRenderProps<PropsOf<typeof pullQuoteElement>>) {
  return (
    <figure
      {...frameProps(frame, cn('my-12', props.align === 'center' ? 'text-center' : 'text-start'))}
    >
      <Quote
        className={cn('text-primary/35 mb-3 size-10', props.align === 'center' && 'mx-auto')}
        aria-hidden="true"
      />
      <blockquote className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl">
        {props.text}
      </blockquote>
      {props.cite ? (
        <figcaption className="text-muted-foreground mt-4 text-sm font-medium">
          — {props.cite}
        </figcaption>
      ) : null}
    </figure>
  );
}

const CALLOUT: Record<
  PropsOf<typeof calloutElement>['tone'],
  { box: string; icon: string; Icon: LucideIcon }
> = {
  info: { box: 'bg-chart-1/8 border-chart-1/25', icon: 'text-chart-1', Icon: Info },
  tip: { box: 'bg-primary/8 border-primary/25', icon: 'text-primary', Icon: Lightbulb },
  success: { box: 'bg-ok/8 border-ok/25', icon: 'text-ok', Icon: CircleCheck },
  warning: { box: 'bg-warn/8 border-warn/30', icon: 'text-warn', Icon: TriangleAlert },
  danger: { box: 'bg-no/8 border-no/25', icon: 'text-no', Icon: OctagonAlert },
};

export function CalloutView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof calloutElement>>) {
  const tone = CALLOUT[props.tone];
  return (
    <aside
      role="note"
      {...frameProps(
        frame,
        cn('my-8 flex gap-3.5 rounded-[var(--radius-card,0.625rem)] border px-5 py-4', tone.box),
      )}
    >
      {props.showIcon ? (
        <tone.Icon className={cn('mt-0.5 size-5 shrink-0', tone.icon)} aria-hidden="true" />
      ) : null}
      <div className="min-w-0 flex-1">
        {props.title ? <p className="text-foreground mb-1 font-semibold">{props.title}</p> : null}
        <div className="text-muted-foreground leading-relaxed">
          <RichTextView
            value={props.text}
            context={context}
            field={{ node: node.id, path: 'text' }}
          />
        </div>
      </div>
    </aside>
  );
}

/** Prism token types → theme-aware classes. */
const TOKEN_CLASS: Record<string, string> = {
  comment: 'text-muted-foreground italic',
  prolog: 'text-muted-foreground',
  keyword: 'text-violet-600 dark:text-violet-400',
  builtin: 'text-violet-600 dark:text-violet-400',
  string: 'text-emerald-700 dark:text-emerald-400',
  char: 'text-emerald-700 dark:text-emerald-400',
  'attr-value': 'text-emerald-700 dark:text-emerald-400',
  number: 'text-amber-700 dark:text-amber-400',
  boolean: 'text-amber-700 dark:text-amber-400',
  constant: 'text-amber-700 dark:text-amber-400',
  function: 'text-sky-700 dark:text-sky-400',
  'class-name': 'text-sky-700 dark:text-sky-400',
  tag: 'text-rose-700 dark:text-rose-400',
  'attr-name': 'text-sky-700 dark:text-sky-400',
  property: 'text-sky-700 dark:text-sky-400',
  operator: 'text-foreground/70',
  punctuation: 'text-foreground/60',
};

type PrismToken = string | { type: string; content: PrismToken | PrismToken[] };

/** Tokens → one array of `[className, text]` pieces per line. */
function highlightLines(code: string, language: string): [string, string][][] {
  const grammar = language === 'plain' ? undefined : Prism.languages[language];
  const tokens: PrismToken[] = grammar ? Prism.tokenize(code, grammar) : [code];
  const lines: [string, string][][] = [[]];
  const push = (className: string, text: string) => {
    text.split('\n').forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1]?.push([className, part]);
    });
  };
  const visit = (token: PrismToken, inherited: string) => {
    if (typeof token === 'string') {
      push(inherited, token);
      return;
    }
    const className = TOKEN_CLASS[token.type] ?? inherited;
    if (Array.isArray(token.content)) {
      token.content.forEach((inner) => {
        visit(inner, className);
      });
    } else if (typeof token.content === 'string') push(className, token.content);
    else visit(token.content, className);
  };
  tokens.forEach((token) => {
    visit(token, '');
  });
  return lines;
}

export function CodeView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof codeElement>>) {
  const lines = highlightLines(props.code, props.language);
  const highlighted = parseLineSpec(props.highlight);
  return (
    <figure
      {...frameProps(
        frame,
        'border-border bg-card my-8 overflow-hidden rounded-[var(--radius-card,0.625rem)] border',
      )}
    >
      <figcaption className="border-border bg-muted/50 flex items-center justify-between gap-3 border-b py-1.5 pr-1.5 pl-4">
        <span className="text-muted-foreground truncate font-mono text-xs">
          {props.filename || (props.language === 'plain' ? '' : props.language)}
        </span>
        <CopyButton
          text={props.code}
          label={context.messages.copy}
          done={context.messages.copied}
        />
      </figcaption>
      <pre className="overflow-x-auto py-4 font-mono text-[13px] leading-6">
        <code className="grid min-w-max">
          {lines.map((line, index) => (
            <span
              key={index}
              className={cn(
                'px-4',
                highlighted.has(index + 1) && 'bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]',
              )}
            >
              {props.lineNumbers ? (
                <span
                  className="text-muted-foreground/60 mr-4 inline-block w-6 text-right select-none"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
              ) : null}
              {line.length === 0
                ? '\n'
                : line.map(([className, text], piece) => (
                    <span key={piece} className={className || undefined}>
                      {text}
                    </span>
                  ))}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

const CELL_ALIGN = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

export function TableView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof tableElement>>) {
  const [head, ...body] = props.rows;
  const rows = props.headerRow ? body : props.rows;
  return (
    <figure {...frameProps(frame, 'my-8')}>
      <div className="border-border overflow-x-auto rounded-[var(--radius-card,0.625rem)] border">
        <table className="w-full border-collapse text-sm">
          {props.headerRow && head ? (
            <thead className="bg-muted/60">
              <tr>
                {head.map((cell, column) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      'text-foreground px-4 py-3 font-semibold',
                      CELL_ALIGN[props.align[column] ?? 'start'],
                    )}
                  >
                    <RichTextView value={cell} context={context} />
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'border-border border-t',
                  props.striped && rowIndex % 2 === 1 && 'bg-muted/30',
                )}
              >
                {row.map((cell, column) => {
                  const header = props.headerColumn && column === 0;
                  const Tag = header ? 'th' : 'td';
                  return (
                    <Tag
                      key={column}
                      {...(header ? { scope: 'row' } : {})}
                      className={cn(
                        'px-4 py-3 align-top',
                        header ? 'text-foreground font-semibold' : 'text-muted-foreground',
                        CELL_ALIGN[props.align[column] ?? 'start'],
                      )}
                    >
                      <RichTextView value={cell} context={context} />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.caption ? (
        <figcaption className="text-muted-foreground mt-2.5 text-sm">{props.caption}</figcaption>
      ) : null}
    </figure>
  );
}

/**
 * A footnote renders NOTHING in place on the page: its text is collected into
 * the numbered notes at the end (see `renderDocument`), and the reference
 * mark in the text links there. In the editor it shows where it was written.
 */
export function FootnoteView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof footnoteElement>>) {
  if (!context.options.editing) return null;
  return (
    <p {...frameProps(frame, 'text-muted-foreground border-border my-4 border-l-2 pl-3 text-sm')}>
      <sup className="text-primary mr-1 font-semibold">{context.footnotes.get(node.id)}</sup>
      <RichTextView value={props.text} context={context} field={{ node: node.id, path: 'text' }} />
    </p>
  );
}

export function TakeawaysView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof takeawaysElement>>) {
  return (
    <aside
      {...frameProps(
        frame,
        'border-primary/25 bg-primary/5 my-8 rounded-[var(--radius-card,0.625rem)] border px-6 py-5',
      )}
    >
      {props.title ? (
        <p className="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          {props.title}
        </p>
      ) : null}
      <ul className="space-y-2">
        {props.items.map((item, index) => (
          <li key={index} className="text-foreground/85 flex gap-2.5 leading-relaxed">
            <CircleCheck
              className="text-primary mt-[0.2em] size-[1.1em] shrink-0"
              aria-hidden="true"
            />
            <span>
              <RichTextView value={item} context={context} />
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function DefinitionsView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof definitionListElement>>) {
  return (
    <dl {...frameProps(frame, 'divide-border border-border my-8 divide-y border-y')}>
      {props.items.map((item, index) => (
        <div key={index} className="grid gap-1 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-6">
          <dt className="text-foreground font-semibold">{item.term}</dt>
          <dd className="text-muted-foreground leading-relaxed">
            <RichTextView value={item.description} context={context} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
