import type { PropsOf } from '@builderset/engine';
import type {
  authorElement,
  faqElement,
  howToElement,
  prosConsElement,
  ratingElement,
  statsElement,
  timelineElement,
  tocElement,
} from '../../core/elements/article';
import {
  ChevronDown,
  Clock,
  Minus,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { cn } from '../cn';
import type { ElementRenderProps } from '../context';
import { fill } from '../messages';
import { frameProps, Picture } from '../parts';
import { RichTextView } from '../rich-text';

const TOC_INDENT = { 2: '', 3: 'pl-4', 4: 'pl-8' } as const;

export function TocView({ props, frame, context }: ElementRenderProps<PropsOf<typeof tocElement>>) {
  const entries = context.outline.filter((entry) => entry.level <= props.depth);
  if (entries.length === 0 && !context.options.editing) return null;
  const { Link } = context;
  const List = props.numbered ? 'ol' : 'ul';
  return (
    <nav
      aria-label={props.title || context.messages.contents}
      {...frameProps(
        frame,
        cn(
          'border-border bg-card my-8 rounded-card border px-5 py-4',
          props.sticky && 'lg:sticky lg:top-24',
        ),
      )}
    >
      <p className="text-foreground mb-2.5 text-sm font-semibold">
        {props.title || context.messages.contents}
      </p>
      <List
        className={cn(
          'space-y-1.5 text-sm',
          props.numbered && 'marker:text-primary list-decimal pl-5',
        )}
      >
        {entries.map((entry) => (
          <li key={entry.id} className={TOC_INDENT[entry.level]}>
            <Link
              href={`#${entry.anchor}`}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {entry.text}
            </Link>
          </li>
        ))}
      </List>
    </nav>
  );
}

export function FaqView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof faqElement>>) {
  return (
    <section {...frameProps(frame, 'my-10')}>
      {props.title ? (
        <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">{props.title}</h2>
      ) : null}
      <div className="divide-border border-border rounded-card divide-y border">
        {props.items.map((item, index) => (
          <details
            key={index}
            name={`faq-${node.id}`}
            open={props.firstOpen && index === 0}
            className="group px-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
              {item.question}
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="text-muted-foreground animate-[bst-rise_220ms_ease-out] pb-4 leading-relaxed">
              <RichTextView value={item.answer} context={context} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function HowToView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof howToElement>>) {
  return (
    <section {...frameProps(frame, 'my-10')}>
      {props.title || props.totalMinutes ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {props.title ? (
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{props.title}</h2>
          ) : (
            <span />
          )}
          {props.totalMinutes ? (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
              <Clock className="size-3.5" aria-hidden="true" />
              {fill(context.messages.minutes, { n: props.totalMinutes })}
            </span>
          ) : null}
        </div>
      ) : null}
      <ol className="space-y-6">
        {props.steps.map((step, index) => (
          <li key={index} className="flex gap-4">
            <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-foreground font-semibold">
                <span className="sr-only">
                  {context.messages.step} {index + 1}:{' '}
                </span>
                {step.title}
              </p>
              <div className="text-muted-foreground mt-1.5 leading-relaxed">
                <RichTextView value={step.text} context={context} />
              </div>
              {step.media ? (
                <Picture
                  media={step.media}
                  alt={step.alt}
                  context={context}
                  className="bg-muted rounded-card mt-4 w-full"
                />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TimelineView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof timelineElement>>) {
  return (
    <ol {...frameProps(frame, 'border-border relative my-10 ml-2 space-y-7 border-l pl-6')}>
      {props.items.map((item, index) => (
        <li key={index} className="relative">
          <span
            aria-hidden="true"
            className="bg-background border-primary absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2"
          />
          {item.date ? (
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              {item.date}
            </p>
          ) : null}
          {item.title ? <p className="text-foreground mt-1 font-semibold">{item.title}</p> : null}
          <div className="text-muted-foreground mt-1 leading-relaxed">
            <RichTextView value={item.text} context={context} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProsConsView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof prosConsElement>>) {
  const columns = [
    {
      title: props.prosTitle || context.messages.pros,
      lines: props.pros,
      Icon: ThumbsUp,
      tone: 'text-ok',
      box: 'border-ok/25 bg-ok/5',
    },
    {
      title: props.consTitle || context.messages.cons,
      lines: props.cons,
      Icon: ThumbsDown,
      tone: 'text-no',
      box: 'border-no/25 bg-no/5',
    },
  ];
  return (
    <div {...frameProps(frame, 'my-9 grid gap-4 sm:grid-cols-2')}>
      {columns.map(({ title, lines, Icon, tone, box }) => (
        <div key={title} className={cn('rounded-card border p-5', box)}>
          <p className={cn('mb-3 flex items-center gap-2 font-semibold', tone)}>
            <Icon className="size-4" aria-hidden="true" />
            {title}
          </p>
          <ul className="space-y-2">
            {lines
              .filter((line) => line.trim())
              .map((line, index) => (
                <li key={index} className="text-foreground/85 flex gap-2.5 text-sm leading-relaxed">
                  <span
                    className={cn('mt-[0.55em] size-1.5 shrink-0 rounded-full bg-current', tone)}
                    aria-hidden="true"
                  />
                  {line}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const STAT_GRID = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;

export function StatsView({ props, frame }: ElementRenderProps<PropsOf<typeof statsElement>>) {
  const count = Math.min(4, Math.max(1, props.items.length)) as 1 | 2 | 3 | 4;
  return (
    <div {...frameProps(frame, cn('my-9 grid gap-3', STAT_GRID[count]))}>
      {props.items.map((item, index) => {
        const Trend =
          item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus;
        return (
          <div key={index} className="border-border bg-card rounded-card border p-5">
            <p className="flex items-baseline gap-2 text-3xl font-semibold tracking-tight tabular-nums">
              {item.value}
              {item.trend !== 'none' ? (
                <Trend
                  className={cn('size-4', item.trend === 'up' ? 'text-ok' : 'text-no')}
                  aria-hidden="true"
                />
              ) : null}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{item.label}</p>
            {item.note ? (
              <p className="text-muted-foreground/80 mt-2 text-xs">{item.note}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Stars({ score, scale }: { score: number; scale: number }) {
  const fivePoint = (score / scale) * 5;
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, fivePoint - index));
        return (
          <span key={index} className="relative size-5">
            <Star className="text-border absolute inset-0 size-5" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${String(fill * 100)}%` }}
            >
              <Star className="text-primary fill-primary size-5" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof ratingElement>>) {
  const locale = context.options.locale ?? 'en';
  const score = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(props.score);
  return (
    <section {...frameProps(frame, 'border-border bg-card my-10 rounded-card border p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {props.title ? (
            <p className="text-foreground text-lg font-semibold">{props.title}</p>
          ) : null}
          {props.itemName ? (
            <p className="text-muted-foreground text-sm">{props.itemName}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Stars score={props.score} scale={props.scale} />
          <p className="text-3xl font-semibold tabular-nums">
            {score}
            <span className="text-muted-foreground text-base font-medium">/{props.scale}</span>
          </p>
          <span className="sr-only">
            {fill(context.messages.ratingOutOf, { score, scale: props.scale })}
          </span>
        </div>
      </div>
      {props.criteria.length ? (
        <dl className="mt-5 space-y-3">
          {props.criteria.map((criterion, index) => (
            <div
              key={index}
              className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_2.5rem]"
            >
              <dt className="text-muted-foreground truncate">{criterion.label}</dt>
              <dd className="bg-muted h-2 overflow-hidden rounded-full">
                <span
                  className="bg-primary block h-full rounded-full"
                  style={{ width: `${String((criterion.score / props.scale) * 100)}%` }}
                />
              </dd>
              <dd className="text-foreground text-right font-medium tabular-nums">
                {criterion.score}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {props.summary.length ? (
        <div className="text-muted-foreground border-border mt-5 border-t pt-4 leading-relaxed">
          <RichTextView value={props.summary} context={context} />
        </div>
      ) : null}
    </section>
  );
}

export function AuthorView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof authorElement>>) {
  const initials = props.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
  const { Link } = context;
  return (
    <aside
      {...frameProps(
        frame,
        'border-border bg-card my-10 flex gap-4 rounded-card border p-5 sm:gap-5',
      )}
    >
      {props.avatar ? (
        <Picture
          media={props.avatar}
          alt={props.name}
          context={context}
          className="size-14 shrink-0 rounded-full object-cover sm:size-16"
        />
      ) : (
        <span className="bg-primary text-primary-foreground grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold sm:size-16">
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-foreground font-semibold">{props.name}</p>
        {props.role ? <p className="text-muted-foreground text-sm">{props.role}</p> : null}
        {props.bio.length ? (
          <div className="text-muted-foreground mt-2 text-sm leading-relaxed">
            <RichTextView value={props.bio} context={context} />
          </div>
        ) : null}
        {props.links.length ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {props.links.map((link) => (
              <Link
                key={link.href}
                href={context.options.editing ? '#' : link.href}
                className="text-primary font-medium hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
