import { parentOf } from '../../core';
import type {
  accordionElement,
  accordionItemElement,
  buttonsElement,
  ctaElement,
  disclaimerElement,
  newsletterElement,
  PropsOf,
  relatedElement,
  tabItemElement,
  tabsElement,
} from '../../core';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

import { NewsletterForm } from '../client/newsletter-form';
import { TabsIsland } from '../client/tabs';
import { cn } from '../cn';
import type { ElementRenderProps, RelatedItem } from '../context';
import { ButtonLink, frameProps } from '../parts';
import { RichTextView } from '../rich-text';

const CTA_TONE = {
  neutral: 'border-border bg-card border',
  primary:
    'bg-primary text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/80',
  inverted: 'bg-foreground text-background [&_.text-muted-foreground]:text-background/75',
} as const;

export function CtaView({ props, frame, context }: ElementRenderProps<PropsOf<typeof ctaElement>>) {
  const center = props.align === 'center';
  return (
    <section
      {...frameProps(
        frame,
        cn(
          'my-12 px-6 py-10 sm:px-10',
          props.layout === 'card' ? 'rounded-[var(--radius-card,0.625rem)]' : '-mx-4 sm:-mx-8',
          CTA_TONE[props.tone],
          center ? 'text-center' : 'text-start',
        ),
      )}
    >
      {props.title ? (
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {props.title}
        </h2>
      ) : null}
      {props.text.length ? (
        <p
          className={cn('text-muted-foreground mt-3 leading-relaxed', center && 'mx-auto max-w-lg')}
        >
          <RichTextView value={props.text} context={context} />
        </p>
      ) : null}
      <div className={cn('mt-7 flex flex-wrap gap-3', center && 'justify-center')}>
        {props.buttons.map((button, index) => (
          <ButtonLink
            key={index}
            button={
              // On a filled band a "primary" button would vanish into it, so
              // the first button inverts to stay the loudest thing there.
              props.tone !== 'neutral' && button.variant === 'primary'
                ? { ...button, variant: 'secondary' }
                : button
            }
            context={context}
            size="lg"
          />
        ))}
      </div>
    </section>
  );
}

const BUTTONS_ALIGN = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  stretch: '[&>*]:flex-1',
} as const;

export function ButtonsView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof buttonsElement>>) {
  return (
    <div {...frameProps(frame, cn('my-7 flex flex-wrap gap-3', BUTTONS_ALIGN[props.align]))}>
      {props.buttons.map((button, index) => (
        <ButtonLink key={index} button={button} context={context} size={props.size} />
      ))}
    </div>
  );
}

function RelatedCard({
  item,
  editing,
  Link,
}: {
  item: RelatedItem;
  editing: boolean;
  Link: ElementRenderProps['context']['Link'];
}) {
  return (
    <Link
      href={editing ? '#' : item.href}
      className="group border-border bg-card hover:border-border-strong flex flex-col overflow-hidden rounded-[var(--radius-card,0.625rem)] border transition-colors"
    >
      {item.cover ? (
        <img
          src={item.cover}
          alt=""
          loading="lazy"
          className="bg-muted aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : null}
      <span className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-foreground flex items-start justify-between gap-2 leading-snug font-semibold">
          {item.title}
          <ArrowUpRight
            className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors"
            aria-hidden="true"
          />
        </span>
        {item.excerpt ? (
          <span className="text-muted-foreground line-clamp-2 text-sm">{item.excerpt}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function RelatedView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof relatedElement>>) {
  const items: RelatedItem[] =
    props.mode === 'manual' ? props.items : (context.options.related ?? []).slice(0, props.count);
  if (items.length === 0 && !context.options.editing) return null;
  return (
    <section {...frameProps(frame, 'my-12')}>
      <h2 className="mb-5 text-xl font-semibold tracking-tight sm:text-2xl">
        {props.title || context.messages.readNext}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RelatedCard
            key={item.id}
            item={item}
            editing={Boolean(context.options.editing)}
            Link={context.Link}
          />
        ))}
      </div>
    </section>
  );
}

export function NewsletterView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof newsletterElement>>) {
  return (
    <section
      {...frameProps(
        frame,
        'border-border bg-muted/40 my-12 rounded-[var(--radius-card,0.625rem)] border px-6 py-8 sm:px-8',
      )}
    >
      {props.title ? <h2 className="text-xl font-semibold tracking-tight">{props.title}</h2> : null}
      {props.text.length ? (
        <p className="text-muted-foreground mt-2 mb-5 leading-relaxed">
          <RichTextView value={props.text} context={context} />
        </p>
      ) : (
        <div className="mb-5" />
      )}
      <NewsletterForm
        action={context.options.editing ? undefined : context.options.newsletterAction}
        placeholder={props.placeholder || context.messages.emailPlaceholder}
        button={props.button || context.messages.subscribe}
        done={context.messages.subscribed}
        failed={context.messages.subscribeFailed}
      />
    </section>
  );
}

export function AccordionView({
  frame,
  children,
}: ElementRenderProps<PropsOf<typeof accordionElement>>) {
  return (
    <div
      {...frameProps(
        frame,
        'divide-border border-border my-8 divide-y rounded-[var(--radius-card,0.625rem)] border',
      )}
    >
      {children}
    </div>
  );
}

export function AccordionItemView({
  node,
  props,
  frame,
  children,
  context,
}: ElementRenderProps<PropsOf<typeof accordionItemElement>>) {
  const parent = parentOf(context.document, node.id);
  const settings = parent?.props as PropsOf<typeof accordionElement> | undefined;
  const first = parent?.children?.[0] === node.id;
  return (
    <details
      // One shared `name` makes the browser keep only one open — the
      // exclusive accordion, with no script.
      {...(settings && !settings.allowMultiple ? { name: `accordion-${parent?.id ?? ''}` } : {})}
      open={Boolean(settings?.firstOpen && first) || Boolean(context.options.editing)}
      {...frameProps(frame, 'group px-5 [&_summary::-webkit-details-marker]:hidden')}
    >
      <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
        {props.title}
        <ChevronDown
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="animate-[ui-rise_220ms_ease-out] pb-4 [&>*:first-child]:mt-0">{children}</div>
    </details>
  );
}

export function TabsView({
  node,
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof tabsElement>>) {
  const ids = node.children ?? [];
  const titles = ids.map((id) => {
    const item = context.document.nodes[id];
    return typeof item?.props.title === 'string' ? item.props.title : '';
  });
  return (
    <div {...frameProps(frame, 'my-8')}>
      <TabsIsland
        titles={titles}
        panels={ids.map((id) => context.renderNode(id))}
        align={props.align}
      />
    </div>
  );
}

export function TabItemView({
  frame,
  children,
}: ElementRenderProps<PropsOf<typeof tabItemElement>>) {
  return <div {...frameProps(frame, '[&>*:first-child]:mt-0')}>{children}</div>;
}

export function DisclaimerView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof disclaimerElement>>) {
  return (
    <p
      {...frameProps(
        frame,
        'text-muted-foreground border-border my-8 border-t pt-4 text-xs leading-relaxed',
      )}
    >
      <RichTextView value={props.text} context={context} />
    </p>
  );
}
