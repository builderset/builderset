import { parentOf, type PropsOf } from '@builderset/engine';
import type {
  accordionElement,
  accordionItemElement,
  buttonsElement,
  ctaElement,
  disclaimerElement,
  newsletterElement,
  relatedElement,
  tabItemElement,
  tabsElement,
} from '../../core/elements/engagement';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

import { NewsletterForm } from '../client/newsletter-form';
import { TabsIsland } from '../client/tabs';
import { cn } from '../cn';
import type { ElementRenderProps, RelatedItem } from '../context';
import { ButtonLink, frameProps } from '../parts';
import { RichTextView } from '../rich-text';

const CTA_TONE = {
  neutral: 'bst:border-border bst:bg-card bst:border',
  primary:
    'bst:bg-primary bst:text-primary-foreground bst:[&_[class~="bst:text-muted-foreground"]]:text-primary-foreground/80',
  inverted:
    'bst:bg-foreground bst:text-background bst:[&_[class~="bst:text-muted-foreground"]]:text-background/75',
} as const;

export function CtaView({ props, frame, context }: ElementRenderProps<PropsOf<typeof ctaElement>>) {
  const center = props.align === 'center';
  return (
    <section
      {...frameProps(
        frame,
        cn(
          'bst:my-12 bst:px-6 bst:py-10 bst:sm:px-10',
          props.layout === 'card' ? 'bst:rounded-card' : 'bst:-mx-4 bst:sm:-mx-8',
          CTA_TONE[props.tone],
          center ? 'bst:text-center' : 'bst:text-start',
        ),
      )}
    >
      {props.title ? (
        <h2 className="bst:text-2xl bst:font-semibold bst:tracking-tight bst:text-balance bst:sm:text-3xl">
          {props.title}
        </h2>
      ) : null}
      {props.text.length ? (
        <p
          className={cn(
            'bst:mt-3 bst:leading-relaxed bst:text-muted-foreground',
            center && 'bst:mx-auto bst:max-w-lg',
          )}
        >
          <RichTextView value={props.text} context={context} />
        </p>
      ) : null}
      <div
        className={cn('bst:mt-7 bst:flex bst:flex-wrap bst:gap-3', center && 'bst:justify-center')}
      >
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
  start: 'bst:justify-start',
  center: 'bst:justify-center',
  end: 'bst:justify-end',
  stretch: 'bst:[&>*]:flex-1',
} as const;

export function ButtonsView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof buttonsElement>>) {
  return (
    <div
      {...frameProps(
        frame,
        cn('bst:my-7 bst:flex bst:flex-wrap bst:gap-3', BUTTONS_ALIGN[props.align]),
      )}
    >
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
      className="bst:group bst:flex bst:flex-col bst:overflow-hidden bst:rounded-card bst:border bst:border-border bst:bg-card bst:transition-colors bst:hover:border-border-strong"
    >
      {item.cover ? (
        <img
          src={item.cover}
          alt=""
          loading="lazy"
          className="bst:aspect-[16/9] bst:w-full bst:bg-muted bst:object-cover bst:transition-transform bst:duration-500 bst:group-hover:scale-[1.02]"
        />
      ) : null}
      <span className="bst:flex bst:flex-1 bst:flex-col bst:gap-1.5 bst:p-4">
        <span className="bst:flex bst:items-start bst:justify-between bst:gap-2 bst:leading-snug bst:font-semibold bst:text-foreground">
          {item.title}
          <ArrowUpRight
            className="bst:size-4 bst:shrink-0 bst:text-muted-foreground bst:transition-colors bst:group-hover:text-primary"
            aria-hidden="true"
          />
        </span>
        {item.excerpt ? (
          <span className="bst:line-clamp-2 bst:text-sm bst:text-muted-foreground">
            {item.excerpt}
          </span>
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
    <section {...frameProps(frame, 'bst:my-12')}>
      <h2 className="bst:mb-5 bst:text-xl bst:font-semibold bst:tracking-tight bst:sm:text-2xl">
        {props.title || context.messages.readNext}
      </h2>
      <div className="bst:grid bst:gap-4 bst:sm:grid-cols-2 bst:lg:grid-cols-3">
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
        'bst:border-border bst:bg-muted/40 bst:my-12 bst:rounded-card bst:border bst:px-6 bst:py-8 bst:sm:px-8',
      )}
    >
      {props.title ? (
        <h2 className="bst:text-xl bst:font-semibold bst:tracking-tight">{props.title}</h2>
      ) : null}
      {props.text.length ? (
        <p className="bst:mt-2 bst:mb-5 bst:leading-relaxed bst:text-muted-foreground">
          <RichTextView value={props.text} context={context} />
        </p>
      ) : (
        <div className="bst:mb-5" />
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
        'bst:divide-border bst:border-border bst:my-8 bst:divide-y bst:rounded-card bst:border',
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
      {...frameProps(frame, 'bst:group bst:px-5 bst:[&_summary::-webkit-details-marker]:hidden')}
    >
      <summary className="bst:flex bst:cursor-pointer bst:list-none bst:items-center bst:justify-between bst:gap-4 bst:py-4 bst:font-medium bst:text-foreground">
        {props.title}
        <ChevronDown
          className="bst:size-4 bst:shrink-0 bst:text-muted-foreground bst:transition-transform bst:duration-200 bst:group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="bst:animate-[bst-rise_220ms_ease-out] bst:pb-4 bst:[&>*:first-child]:mt-0">
        {children}
      </div>
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
    <div {...frameProps(frame, 'bst:my-8')}>
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
  return <div {...frameProps(frame, 'bst:[&>*:first-child]:mt-0')}>{children}</div>;
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
        'bst:text-muted-foreground bst:border-border bst:my-8 bst:border-t bst:pt-4 bst:text-xs bst:leading-relaxed',
      )}
    >
      <RichTextView value={props.text} context={context} />
    </p>
  );
}
