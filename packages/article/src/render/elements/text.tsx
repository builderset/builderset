import type { PropsOf, RichText } from '@builderset/engine';
import type {
  calloutElement,
  codeElement,
  definitionListElement,
  footnoteElement,
  headingElement,
  listElement,
  paragraphElement,
  pullQuoteElement,
  quoteElement,
  tableElement,
  takeawaysElement,
} from '../../core/elements/text';
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
    2: 'bst:mt-12 bst:mb-4 bst:text-xl bst:font-semibold bst:tracking-tight bst:sm:text-2xl',
    3: 'bst:mt-10 bst:mb-3 bst:text-lg bst:font-semibold bst:tracking-tight',
    4: 'bst:mt-8 bst:mb-2 bst:text-base bst:font-semibold',
  }[props.level];
  return (
    <Tag
      {...frameProps(
        { ...frame, id: frame.id ?? anchor },
        cn('bst:scroll-mt-24 bst:text-balance', size),
      )}
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
          'bst:mb-5 bst:leading-[1.75] bst:text-muted-foreground',
          props.lead && 'bst:text-lg bst:leading-relaxed bst:text-foreground/85 bst:sm:text-xl',
          props.dropCap &&
            'bst:first-letter:float-left bst:first-letter:mt-1 bst:first-letter:mr-2.5 bst:first-letter:text-[3.4em] bst:first-letter:leading-[0.8] bst:first-letter:font-semibold bst:first-letter:text-primary',
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
    <span
      className="bst:mt-[0.7em] bst:size-1.5 bst:shrink-0 bst:rounded-full bst:bg-primary"
      aria-hidden="true"
    />
  );
}

function CheckMark({ checked }: { checked: boolean | undefined }) {
  const Icon = checked ? SquareCheck : Square;
  return (
    <Icon
      className={cn(
        'bst:mt-[0.2em] bst:size-[1.15em] bst:shrink-0',
        checked ? 'bst:text-primary' : 'bst:text-muted-foreground',
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
          'bst:min-w-0',
          style === 'check' && item.checked && 'bst:text-muted-foreground/80 bst:line-through',
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
    'bst:leading-relaxed bst:text-muted-foreground',
    props.style === 'number'
      ? 'bst:pl-1 bst:marker:font-semibold bst:marker:text-primary'
      : 'bst:flex bst:gap-3',
  );
  // Only top-level items are edited in place (`prefix` is set for them);
  // nested ones are edited in the inspector.
  const renderItems = (items: readonly ListItem[] | ListItem['children'], prefix?: string) =>
    (items ?? []).map((item, index) => {
      const field = prefix ? { node: node.id, path: `${prefix}.${String(index)}.text` } : undefined;
      // An item's own list goes UNDER its text. In a bullet or check item that
      // means inside the item's column — a sibling of the column would sit in
      // the item's flex row, to the right of the text.
      const nested =
        'children' in item && item.children?.length ? (
          <Tag
            className={cn(
              'bst:space-y-2 bst:pl-5',
              props.style === 'number' && 'bst:mt-2.5 bst:list-[lower-alpha]',
            )}
          >
            {renderItems(item.children)}
          </Tag>
        ) : null;
      return (
        <li key={index} className={itemClass}>
          {props.style === 'number' ? (
            <>
              <RichTextView value={item.text} context={context} field={field} />
              {nested}
            </>
          ) : (
            <div className="bst:flex bst:min-w-0 bst:flex-1 bst:flex-col bst:gap-2.5">
              <div className="bst:flex bst:gap-3">
                <ItemBody item={item} style={props.style} context={context} field={field} />
              </div>
              {nested}
            </div>
          )}
        </li>
      );
    });
  return (
    <Tag
      {...frameProps(
        frame,
        cn(
          'bst:mb-6 bst:space-y-2.5',
          props.style === 'number' && 'bst:list-decimal bst:pl-5',
          props.style === 'check' && 'bst:list-none',
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
    <figure {...frameProps(frame, 'bst:my-8')}>
      <blockquote
        className="bst:rounded-r-card bst:border-l-2 bst:border-primary bst:bg-muted/50 bst:px-6 bst:py-5 bst:text-lg bst:leading-relaxed bst:font-medium"
        {...(props.source ? { cite: props.source } : {})}
      >
        <RichTextView
          value={props.text}
          context={context}
          field={{ node: node.id, path: 'text' }}
        />
      </blockquote>
      {props.cite ? (
        <figcaption className="bst:mt-3 bst:pl-6 bst:text-sm bst:text-muted-foreground">
          —{' '}
          {props.source ? (
            <Link
              href={context.options.editing ? '#' : props.source}
              className="bst:underline bst:underline-offset-2 bst:hover:text-foreground"
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
      {...frameProps(
        frame,
        cn('bst:my-12', props.align === 'center' ? 'bst:text-center' : 'bst:text-start'),
      )}
    >
      <Quote
        className={cn(
          'bst:mb-3 bst:size-10 bst:text-primary/35',
          props.align === 'center' && 'bst:mx-auto',
        )}
        aria-hidden="true"
      />
      <blockquote className="bst:text-2xl bst:leading-snug bst:font-semibold bst:tracking-tight bst:text-balance bst:sm:text-3xl">
        {props.text}
      </blockquote>
      {props.cite ? (
        <figcaption className="bst:mt-4 bst:text-sm bst:font-medium bst:text-muted-foreground">
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
  info: { box: 'bst:bg-chart-1/8 bst:border-chart-1/25', icon: 'bst:text-chart-1', Icon: Info },
  tip: { box: 'bst:bg-primary/8 bst:border-primary/25', icon: 'bst:text-primary', Icon: Lightbulb },
  success: { box: 'bst:bg-ok/8 bst:border-ok/25', icon: 'bst:text-ok', Icon: CircleCheck },
  warning: { box: 'bst:bg-warn/8 bst:border-warn/30', icon: 'bst:text-warn', Icon: TriangleAlert },
  danger: { box: 'bst:bg-no/8 bst:border-no/25', icon: 'bst:text-no', Icon: OctagonAlert },
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
        cn('bst:my-8 bst:flex bst:gap-3.5 bst:rounded-card bst:border bst:px-5 bst:py-4', tone.box),
      )}
    >
      {props.showIcon ? (
        <tone.Icon
          className={cn('bst:mt-0.5 bst:size-5 bst:shrink-0', tone.icon)}
          aria-hidden="true"
        />
      ) : null}
      <div className="bst:min-w-0 bst:flex-1">
        {props.title ? (
          <p className="bst:mb-1 bst:font-semibold bst:text-foreground">{props.title}</p>
        ) : null}
        <div className="bst:leading-relaxed bst:text-muted-foreground">
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
  comment: 'bst:text-muted-foreground bst:italic',
  prolog: 'bst:text-muted-foreground',
  keyword: 'bst:text-[light-dark(var(--bst-color-violet-600),var(--bst-color-violet-400))]',
  builtin: 'bst:text-[light-dark(var(--bst-color-violet-600),var(--bst-color-violet-400))]',
  string: 'bst:text-[light-dark(var(--bst-color-emerald-700),var(--bst-color-emerald-400))]',
  char: 'bst:text-[light-dark(var(--bst-color-emerald-700),var(--bst-color-emerald-400))]',
  'attr-value': 'bst:text-[light-dark(var(--bst-color-emerald-700),var(--bst-color-emerald-400))]',
  number: 'bst:text-[light-dark(var(--bst-color-amber-700),var(--bst-color-amber-400))]',
  boolean: 'bst:text-[light-dark(var(--bst-color-amber-700),var(--bst-color-amber-400))]',
  constant: 'bst:text-[light-dark(var(--bst-color-amber-700),var(--bst-color-amber-400))]',
  function: 'bst:text-[light-dark(var(--bst-color-sky-700),var(--bst-color-sky-400))]',
  'class-name': 'bst:text-[light-dark(var(--bst-color-sky-700),var(--bst-color-sky-400))]',
  tag: 'bst:text-[light-dark(var(--bst-color-rose-700),var(--bst-color-rose-400))]',
  'attr-name': 'bst:text-[light-dark(var(--bst-color-sky-700),var(--bst-color-sky-400))]',
  property: 'bst:text-[light-dark(var(--bst-color-sky-700),var(--bst-color-sky-400))]',
  operator: 'bst:text-foreground/70',
  punctuation: 'bst:text-foreground/60',
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
        'bst:border-border bst:bg-card bst:my-8 bst:overflow-hidden bst:rounded-card bst:border',
      )}
    >
      <figcaption className="bst:flex bst:items-center bst:justify-between bst:gap-3 bst:border-b bst:border-border bst:bg-muted/50 bst:py-1.5 bst:pr-1.5 bst:pl-4">
        <span className="bst:truncate bst:font-mono bst:text-xs bst:text-muted-foreground">
          {props.filename || (props.language === 'plain' ? '' : props.language)}
        </span>
        <CopyButton
          text={props.code}
          label={context.messages.copy}
          done={context.messages.copied}
        />
      </figcaption>
      <pre className="bst:overflow-x-auto bst:py-4 bst:font-mono bst:text-[13px] bst:leading-6">
        <code className="bst:grid bst:min-w-max">
          {lines.map((line, index) => (
            <span
              key={index}
              className={cn(
                'bst:px-4',
                highlighted.has(index + 1) &&
                  'bst:bg-primary/10 bst:shadow-[inset_2px_0_0_var(--builderset-primary,var(--bst-d-primary))]',
              )}
            >
              {props.lineNumbers ? (
                <span
                  className="bst:mr-4 bst:inline-block bst:w-6 bst:text-right bst:text-muted-foreground/60 bst:select-none"
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

const CELL_ALIGN = {
  start: 'bst:text-start',
  center: 'bst:text-center',
  end: 'bst:text-end',
} as const;

export function TableView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof tableElement>>) {
  const [head, ...body] = props.rows;
  const rows = props.headerRow ? body : props.rows;
  return (
    <figure {...frameProps(frame, 'bst:my-8')}>
      <div className="bst:overflow-x-auto bst:rounded-card bst:border bst:border-border">
        <table className="bst:w-full bst:border-collapse bst:text-sm">
          {props.headerRow && head ? (
            <thead className="bst:bg-muted/60">
              <tr>
                {head.map((cell, column) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      'bst:px-4 bst:py-3 bst:font-semibold bst:text-foreground',
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
                  'bst:border-t bst:border-border',
                  props.striped && rowIndex % 2 === 1 && 'bst:bg-muted/30',
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
                        'bst:px-4 bst:py-3 bst:align-top',
                        header
                          ? 'bst:font-semibold bst:text-foreground'
                          : 'bst:text-muted-foreground',
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
        <figcaption className="bst:mt-2.5 bst:text-sm bst:text-muted-foreground">
          {props.caption}
        </figcaption>
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
    <p
      {...frameProps(
        frame,
        'bst:text-muted-foreground bst:border-border bst:my-4 bst:border-l-2 bst:pl-3 bst:text-sm',
      )}
    >
      <sup className="bst:mr-1 bst:font-semibold bst:text-primary">
        {context.footnotes.get(node.id)}
      </sup>
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
        'bst:border-primary/25 bst:bg-primary/5 bst:my-8 bst:rounded-card bst:border bst:px-6 bst:py-5',
      )}
    >
      {props.title ? (
        <p className="bst:mb-3 bst:text-sm bst:font-semibold bst:tracking-wide bst:text-foreground bst:uppercase">
          {props.title}
        </p>
      ) : null}
      <ul className="bst:space-y-2">
        {props.items.map((item, index) => (
          <li
            key={index}
            className="bst:flex bst:gap-2.5 bst:leading-relaxed bst:text-foreground/85"
          >
            <CircleCheck
              className="bst:mt-[0.2em] bst:size-[1.1em] bst:shrink-0 bst:text-primary"
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
    <dl
      {...frameProps(
        frame,
        'bst:divide-border bst:border-border bst:my-8 bst:divide-y bst:border-y',
      )}
    >
      {props.items.map((item, index) => (
        <div
          key={index}
          className="bst:grid bst:gap-1 bst:py-3.5 bst:sm:grid-cols-[12rem_1fr] bst:sm:gap-6"
        >
          <dt className="bst:font-semibold bst:text-foreground">{item.term}</dt>
          <dd className="bst:leading-relaxed bst:text-muted-foreground">
            <RichTextView value={item.description} context={context} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
