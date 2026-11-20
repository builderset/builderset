import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { CodeBlock } from './docs/code-block';
import { Icon } from './docs/icons';
import { Tab, Tabs } from './docs/tabs';

/** A heading with its own link, shown on hover. */
function heading(Tag: 'h2' | 'h3' | 'h4') {
  return function Heading({ id, children, ...props }: ComponentProps<'h2'>) {
    if (!id) return <Tag {...props}>{children}</Tag>;
    return (
      <Tag id={id} className="bs-heading" {...props}>
        <span>{children}</span>
        <a className="bs-anchor" href={`#${id}`} aria-label="Link to this section">
          #
        </a>
      </Tag>
    );
  };
}

function Anchor({ href = '', children, ...props }: ComponentProps<'a'>) {
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} rel="noreferrer" {...props}>
      {children}
    </a>
  );
}

/** A note beside the text; `type="warn"` for a limit the reader must know. */
export function Callout({
  title,
  type = 'info',
  children,
}: {
  title?: ReactNode;
  type?: 'info' | 'warn' | 'warning';
  children: ReactNode;
}) {
  return (
    <aside className={type === 'info' ? 'bs-callout' : 'bs-callout warn'}>
      {title ? <span className="t">{title}</span> : null}
      <div>{children}</div>
    </aside>
  );
}

/** A list of links, one row each, with a label column — the docs' cards. */
export function Cards({ children }: { children: ReactNode }) {
  return <div className="bs-rows">{children}</div>;
}

export function Card({
  title,
  href,
  label,
  children,
}: {
  title: ReactNode;
  href?: string;
  label?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const body = (
    <>
      <div className="bs-row-h">
        {label ? <span className="code">{label}</span> : null}
        <span className="title">{title}</span>
      </div>
      <div className="bs-row-b">{children}</div>
      {href ? <Icon name="arrow" className="go" /> : <span />}
    </>
  );
  if (!href) return <div className="bs-row">{body}</div>;
  return (
    <Link className="bs-row" href={href}>
      {body}
    </Link>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <div className="bs-steps">{children}</div>;
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="bs-step">{children}</div>;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
    a: Anchor,
    pre: CodeBlock,
    table: (props: ComponentProps<'table'>) => (
      <div className="bs-table">
        <table {...props} />
      </div>
    ),
    Callout,
    Cards,
    Card,
    Steps,
    Step,
    Tabs,
    Tab,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
