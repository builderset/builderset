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

const TOC_INDENT = { 2: '', 3: 'bst:pl-4', 4: 'bst:pl-8' } as const;

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
          'bst:my-8 bst:rounded-card bst:border bst:border-border bst:bg-card bst:px-5 bst:py-4',
          props.sticky && 'bst:lg:sticky bst:lg:top-24',
        ),
      )}
    >
      <p className="bst:mb-2.5 bst:text-sm bst:font-semibold bst:text-foreground">
        {props.title || context.messages.contents}
      </p>
      <List
        className={cn(
          'bst:space-y-1.5 bst:text-sm',
          props.numbered && 'bst:list-decimal bst:pl-5 bst:marker:text-primary',
        )}
      >
        {entries.map((entry) => (
          <li key={entry.id} className={TOC_INDENT[entry.level]}>
            <Link
              href={`#${entry.anchor}`}
              className="bst:text-muted-foreground bst:transition-colors bst:hover:text-primary"
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
    <section {...frameProps(frame, 'bst:my-10')}>
      {props.title ? (
        <h2 className="bst:mb-4 bst:text-xl bst:font-semibold bst:tracking-tight bst:sm:text-2xl">
          {props.title}
        </h2>
      ) : null}
      <div className="bst:divide-y bst:divide-border bst:rounded-card bst:border bst:border-border">
        {props.items.map((item, index) => (
          <details
            key={index}
            name={`faq-${node.id}`}
            open={props.firstOpen && index === 0}
            className="bst:group bst:px-5 bst:[&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="bst:flex bst:cursor-pointer bst:list-none bst:items-center bst:justify-between bst:gap-4 bst:py-4 bst:font-medium bst:text-foreground">
              {item.question}
              <ChevronDown
                className="bst:size-4 bst:shrink-0 bst:text-muted-foreground bst:transition-transform bst:duration-200 bst:group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="bst:animate-[bst-rise_220ms_ease-out] bst:pb-4 bst:leading-relaxed bst:text-muted-foreground">
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
    <section {...frameProps(frame, 'bst:my-10')}>
      {props.title || props.totalMinutes ? (
        <div className="bst:mb-5 bst:flex bst:flex-wrap bst:items-center bst:justify-between bst:gap-3">
          {props.title ? (
            <h2 className="bst:text-xl bst:font-semibold bst:tracking-tight bst:sm:text-2xl">
              {props.title}
            </h2>
          ) : (
            <span />
          )}
          {props.totalMinutes ? (
            <span className="bst:inline-flex bst:items-center bst:gap-1.5 bst:rounded-full bst:bg-muted bst:px-3 bst:py-1 bst:text-xs bst:font-medium bst:text-muted-foreground">
              <Clock className="bst:size-3.5" aria-hidden="true" />
              {fill(context.messages.minutes, { n: props.totalMinutes })}
            </span>
          ) : null}
        </div>
      ) : null}
      <ol className="bst:space-y-6">
        {props.steps.map((step, index) => (
          <li key={index} className="bst:flex bst:gap-4">
            <span className="bst:grid bst:size-8 bst:shrink-0 bst:place-items-center bst:rounded-full bst:bg-primary bst:text-sm bst:font-semibold bst:text-primary-foreground bst:tabular-nums">
              {index + 1}
            </span>
            <div className="bst:min-w-0 bst:flex-1 bst:pt-1">
              <p className="bst:font-semibold bst:text-foreground">
                <span className="bst:sr-only">
                  {context.messages.step} {index + 1}:{' '}
                </span>
                {step.title}
              </p>
              <div className="bst:mt-1.5 bst:leading-relaxed bst:text-muted-foreground">
                <RichTextView value={step.text} context={context} />
              </div>
              {step.media ? (
                <Picture
                  media={step.media}
                  alt={step.alt}
                  context={context}
                  className="bst:mt-4 bst:w-full bst:rounded-card bst:bg-muted"
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
    <ol
      {...frameProps(
        frame,
        'bst:border-border bst:relative bst:my-10 bst:ml-2 bst:space-y-7 bst:border-l bst:pl-6',
      )}
    >
      {props.items.map((item, index) => (
        <li key={index} className="bst:relative">
          <span
            aria-hidden="true"
            className="bst:absolute bst:top-1.5 bst:-left-[1.95rem] bst:size-3 bst:rounded-full bst:border-2 bst:border-primary bst:bg-background"
          />
          {item.date ? (
            <p className="bst:text-xs bst:font-semibold bst:tracking-wide bst:text-primary bst:uppercase">
              {item.date}
            </p>
          ) : null}
          {item.title ? (
            <p className="bst:mt-1 bst:font-semibold bst:text-foreground">{item.title}</p>
          ) : null}
          <div className="bst:mt-1 bst:leading-relaxed bst:text-muted-foreground">
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
      tone: 'bst:text-ok',
      box: 'bst:border-ok/25 bst:bg-ok/5',
    },
    {
      title: props.consTitle || context.messages.cons,
      lines: props.cons,
      Icon: ThumbsDown,
      tone: 'bst:text-no',
      box: 'bst:border-no/25 bst:bg-no/5',
    },
  ];
  return (
    <div {...frameProps(frame, 'bst:my-9 bst:grid bst:gap-4 bst:sm:grid-cols-2')}>
      {columns.map(({ title, lines, Icon, tone, box }) => (
        <div key={title} className={cn('bst:rounded-card bst:border bst:p-5', box)}>
          <p className={cn('bst:mb-3 bst:flex bst:items-center bst:gap-2 bst:font-semibold', tone)}>
            <Icon className="bst:size-4" aria-hidden="true" />
            {title}
          </p>
          <ul className="bst:space-y-2">
            {lines
              .filter((line) => line.trim())
              .map((line, index) => (
                <li
                  key={index}
                  className="bst:flex bst:gap-2.5 bst:text-sm bst:leading-relaxed bst:text-foreground/85"
                >
                  <span
                    className={cn(
                      'bst:mt-[0.55em] bst:size-1.5 bst:shrink-0 bst:rounded-full bst:bg-current',
                      tone,
                    )}
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
  1: 'bst:grid-cols-1',
  2: 'bst:grid-cols-2',
  3: 'bst:grid-cols-2 bst:sm:grid-cols-3',
  4: 'bst:grid-cols-2 bst:sm:grid-cols-4',
} as const;

export function StatsView({ props, frame }: ElementRenderProps<PropsOf<typeof statsElement>>) {
  const count = Math.min(4, Math.max(1, props.items.length)) as 1 | 2 | 3 | 4;
  return (
    <div {...frameProps(frame, cn('bst:my-9 bst:grid bst:gap-3', STAT_GRID[count]))}>
      {props.items.map((item, index) => {
        const Trend =
          item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus;
        return (
          <div
            key={index}
            className="bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-5"
          >
            <p className="bst:flex bst:items-baseline bst:gap-2 bst:text-3xl bst:font-semibold bst:tracking-tight bst:tabular-nums">
              {item.value}
              {item.trend !== 'none' ? (
                <Trend
                  className={cn('bst:size-4', item.trend === 'up' ? 'bst:text-ok' : 'bst:text-no')}
                  aria-hidden="true"
                />
              ) : null}
            </p>
            <p className="bst:mt-1 bst:text-sm bst:text-muted-foreground">{item.label}</p>
            {item.note ? (
              <p className="bst:mt-2 bst:text-xs bst:text-muted-foreground/80">{item.note}</p>
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
    <span className="bst:flex bst:gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, fivePoint - index));
        return (
          <span key={index} className="bst:relative bst:size-5">
            <Star className="bst:absolute bst:inset-0 bst:size-5 bst:text-border" />
            <span
              className="bst:absolute bst:inset-0 bst:overflow-hidden"
              style={{ width: `${String(fill * 100)}%` }}
            >
              <Star className="bst:size-5 bst:fill-primary bst:text-primary" />
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
    <section
      {...frameProps(
        frame,
        'bst:border-border bst:bg-card bst:my-10 bst:rounded-card bst:border bst:p-6',
      )}
    >
      <div className="bst:flex bst:flex-wrap bst:items-center bst:justify-between bst:gap-4">
        <div>
          {props.title ? (
            <p className="bst:text-lg bst:font-semibold bst:text-foreground">{props.title}</p>
          ) : null}
          {props.itemName ? (
            <p className="bst:text-sm bst:text-muted-foreground">{props.itemName}</p>
          ) : null}
        </div>
        <div className="bst:flex bst:items-center bst:gap-3">
          <Stars score={props.score} scale={props.scale} />
          <p className="bst:text-3xl bst:font-semibold bst:tabular-nums">
            {score}
            <span className="bst:text-base bst:font-medium bst:text-muted-foreground">
              /{props.scale}
            </span>
          </p>
          <span className="bst:sr-only">
            {fill(context.messages.ratingOutOf, { score, scale: props.scale })}
          </span>
        </div>
      </div>
      {props.criteria.length ? (
        <dl className="bst:mt-5 bst:space-y-3">
          {props.criteria.map((criterion, index) => (
            <div
              key={index}
              className="bst:grid bst:grid-cols-[8rem_1fr_2.5rem] bst:items-center bst:gap-3 bst:text-sm bst:sm:grid-cols-[10rem_1fr_2.5rem]"
            >
              <dt className="bst:truncate bst:text-muted-foreground">{criterion.label}</dt>
              <dd className="bst:h-2 bst:overflow-hidden bst:rounded-full bst:bg-muted">
                <span
                  className="bst:block bst:h-full bst:rounded-full bst:bg-primary"
                  style={{ width: `${String((criterion.score / props.scale) * 100)}%` }}
                />
              </dd>
              <dd className="bst:text-right bst:font-medium bst:text-foreground bst:tabular-nums">
                {criterion.score}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {props.summary.length ? (
        <div className="bst:mt-5 bst:border-t bst:border-border bst:pt-4 bst:leading-relaxed bst:text-muted-foreground">
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
        'bst:border-border bst:bg-card bst:my-10 bst:flex bst:gap-4 bst:rounded-card bst:border bst:p-5 bst:sm:gap-5',
      )}
    >
      {props.avatar ? (
        <Picture
          media={props.avatar}
          alt={props.name}
          context={context}
          className="bst:size-14 bst:shrink-0 bst:rounded-full bst:object-cover bst:sm:size-16"
        />
      ) : (
        <span className="bst:grid bst:size-14 bst:shrink-0 bst:place-items-center bst:rounded-full bst:bg-primary bst:text-lg bst:font-semibold bst:text-primary-foreground bst:sm:size-16">
          {initials}
        </span>
      )}
      <div className="bst:min-w-0">
        <p className="bst:font-semibold bst:text-foreground">{props.name}</p>
        {props.role ? <p className="bst:text-sm bst:text-muted-foreground">{props.role}</p> : null}
        {props.bio.length ? (
          <div className="bst:mt-2 bst:text-sm bst:leading-relaxed bst:text-muted-foreground">
            <RichTextView value={props.bio} context={context} />
          </div>
        ) : null}
        {props.links.length ? (
          <div className="bst:mt-3 bst:flex bst:flex-wrap bst:gap-x-4 bst:gap-y-1 bst:text-sm">
            {props.links.map((link) => (
              <Link
                key={link.href}
                href={context.options.editing ? '#' : link.href}
                className="bst:font-medium bst:text-primary bst:hover:underline"
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
