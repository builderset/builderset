import type { BuilderNode } from '@motors/builder-core';
import {
  ROW_LAYOUTS,
  variableOf,
  type Display,
  type EmailDocument,
  type EmailRichText,
  type Padding,
  type RowLayout,
} from '@motors/email-core';
import type { CSSProperties, ReactNode } from 'react';

import {
  color,
  createContext,
  fill,
  fontStack,
  holds,
  listOf,
  variableText,
  type RenderContext,
  type RenderOptions,
} from './context';

/**
 * The email as React, for the builder's canvas (and for thumbnails).
 *
 * The same looks as `renderEmail`'s HTML — same colours, sizes, spacing — but
 * built from divs and flexbox, because the canvas is a web page: it must be
 * selectable node by node (`data-node` on every element's outermost box, which
 * is what the editor's overlay measures) and its text must be editable in
 * place (`editText`, the same hook the article renderer has).
 */

export interface EditableField {
  nodeId: string;
  path: string;
  value: EmailRichText;
  placeholder?: string | undefined;
}

export interface EmailCanvasProps extends RenderOptions {
  document: EmailDocument;
  /** Editor only: draws an editable field in place of a rich-text value. */
  editText?: ((field: EditableField) => ReactNode) | undefined;
  /** Lays the email out as a phone shows it: columns stacked. */
  mobile?: boolean | undefined;
  /** Editor only: marks every node so the overlay can find it. */
  editing?: boolean | undefined;
}

interface Frame {
  scope: Record<string, unknown>;
}

function pad(value: Padding | undefined): string | undefined {
  if (!value) return undefined;
  return `${String(value.top)}px ${String(value.right)}px ${String(value.bottom)}px ${String(value.left)}px`;
}

function RichRuns({
  value,
  context,
  scope,
  linkColor,
}: {
  value: EmailRichText | undefined;
  context: RenderContext;
  scope: Record<string, unknown>;
  linkColor: string | undefined;
}) {
  return (
    <>
      {(value ?? []).map((run, index) => {
        const variable = variableOf(run);
        let node: ReactNode = variable ? (
          context.mode === 'preview-raw' ? (
            <span
              style={{
                background: 'rgba(37,99,235,0.12)',
                color: '#1d4ed8',
                borderRadius: 4,
                padding: '0 4px',
                fontSize: '0.9em',
              }}
            >
              {variable.path}
            </span>
          ) : (
            variableText(variable.path, variable.format, variable.fallback, context, scope)
          )
        ) : (
          run.text
        );
        for (const mark of [...(run.marks ?? [])].reverse()) {
          if (mark.type === 'bold') node = <strong>{node}</strong>;
          else if (mark.type === 'italic') node = <em>{node}</em>;
          else if (mark.type === 'underline') node = <u>{node}</u>;
          else if (mark.type === 'strike') node = <s>{node}</s>;
          else if (mark.type === 'code') node = <code>{node}</code>;
          else if (mark.type === 'highlight') node = <mark>{node}</mark>;
          else if (mark.type === 'sub') node = <sub>{node}</sub>;
          else if (mark.type === 'sup') node = <sup>{node}</sup>;
          else if (mark.type === 'link') {
            node = (
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                }}
                style={{ color: linkColor }}
              >
                {node}
              </a>
            );
          }
        }
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}

interface Env {
  context: RenderContext;
  editText: EmailCanvasProps['editText'];
  mobile: boolean;
  editing: boolean;
}

function nodeAttrs(node: BuilderNode, env: Env) {
  return env.editing
    ? {
        'data-node': node.id,
        ...(node.hidden ? { 'data-hidden-node': '' } : {}),
      }
    : {};
}

function hiddenHere(node: BuilderNode, env: Env, scope: Record<string, unknown>): boolean {
  const display = node.props.display as Display | undefined;
  if (env.editing) {
    // The editor shows everything, dimmed when it would not be shown here.
    return false;
  }
  if (node.hidden) return true;
  if (display?.hideOn === 'mobile' && env.mobile) return true;
  if (display?.hideOn === 'desktop' && !env.mobile) return true;
  return display ? !holds(display.when, env.context, scope) : false;
}

function Text({
  node,
  path,
  value,
  env,
  scope,
  linkColor,
  placeholder,
}: {
  node: BuilderNode;
  path: string;
  value: EmailRichText;
  env: Env;
  scope: Record<string, unknown>;
  linkColor: string | undefined;
  placeholder?: string;
}) {
  if (env.editText) return <>{env.editText({ nodeId: node.id, path, value, placeholder })}</>;
  return <RichRuns value={value} context={env.context} scope={scope} linkColor={linkColor} />;
}

function Block({ node, env, frame }: { node: BuilderNode; env: Env; frame: Frame }) {
  const { context } = env;
  const p = node.props;
  const settings = context.doc.settings;
  const text = color(settings.textColor, context);
  const link = color(settings.linkColor, context);
  const font = fontStack(null, context);
  const align = ((p.align as string | undefined) ?? 'left') as CSSProperties['textAlign'];
  const muted = color('brand.muted', context);
  if (hiddenHere(node, env, frame.scope)) return null;
  const display = p.display as Display | undefined;
  const dim =
    env.editing &&
    ((display?.hideOn === 'mobile' && env.mobile) ||
      (display?.hideOn === 'desktop' && !env.mobile));
  const shell = (children: ReactNode, extra: CSSProperties = {}) => (
    <div
      {...nodeAttrs(node, env)}
      style={{
        padding: pad(p.padding as Padding | undefined),
        opacity: dim ? 0.4 : undefined,
        ...extra,
      }}
    >
      {children}
    </div>
  );
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  switch (node.type) {
    case 'heading': {
      const Tag = `h${String(p.level)}` as 'h1';
      return shell(
        <Tag
          style={{
            margin: 0,
            fontFamily: fontStack(p.font as string | null, context),
            fontSize: p.size as number,
            lineHeight: 1.25,
            fontWeight: 700,
            color:
              color(p.color as string | null, context) ?? color(settings.headingColor, context),
            textAlign: align,
          }}
        >
          <Text
            node={node}
            path="text"
            value={p.text as EmailRichText}
            env={env}
            scope={frame.scope}
            linkColor={link}
            placeholder="Heading"
          />
        </Tag>,
      );
    }
    case 'text':
      return shell(
        <div
          style={{
            fontFamily: font,
            fontSize: p.size as number,
            lineHeight: (p.lineHeight as number | null) ?? settings.lineHeight,
            color: color(p.color as string | null, context) ?? text,
            textAlign: align,
            whiteSpace: 'pre-wrap',
          }}
        >
          <Text
            node={node}
            path="text"
            value={p.text as EmailRichText}
            env={env}
            scope={frame.scope}
            linkColor={link}
            placeholder="Write something…"
          />
        </div>,
      );
    case 'list': {
      const items = p.items as { text: EmailRichText }[];
      const marker = color(p.markerColor as string, context);
      return shell(
        <div
          style={{
            fontFamily: font,
            fontSize: p.size as number,
            lineHeight: settings.lineHeight,
            color: color(p.color as string | null, context) ?? text,
          }}
        >
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
              <span style={{ color: marker, fontWeight: 700, minWidth: 16 }}>
                {p.style === 'number' ? `${String(index + 1)}.` : p.style === 'check' ? '✓' : '•'}
              </span>
              <span style={{ flex: 1 }}>
                <Text
                  node={node}
                  path={`items.${String(index)}.text`}
                  value={item.text}
                  env={env}
                  scope={frame.scope}
                  linkColor={link}
                />
              </span>
            </div>
          ))}
        </div>,
      );
    }
    case 'button': {
      const background = color(p.background as string, context);
      return shell(
        <div
          style={{
            display: 'flex',
            justifyContent: env.mobile && p.fullWidthMobile ? 'stretch' : justify,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: env.mobile && p.fullWidthMobile ? '100%' : undefined,
              textAlign: 'center',
              padding: `${String(p.paddingY)}px ${String(p.paddingX)}px`,
              background,
              color: color(p.textColor as string, context),
              fontFamily: font,
              fontSize: p.size as number,
              fontWeight: 600,
              lineHeight: 1.2,
              borderRadius: p.radius as number,
              border:
                (p.borderWidth as number) > 0
                  ? `${String(p.borderWidth)}px solid ${color(p.borderColor as string | null, context) ?? background ?? '#111'}`
                  : undefined,
            }}
          >
            {fill(p.label as string, context, frame.scope) || ' '}
          </span>
        </div>,
      );
    }
    case 'image':
    case 'logo': {
      const media =
        (p.media as { key: string } | null) ??
        (node.type === 'logo' ? (context.brand.logo ?? null) : null);
      if (!media) {
        return shell(
          node.type === 'logo' ? (
            <div
              style={{
                fontFamily: font,
                fontSize: 20,
                fontWeight: 700,
                color: text,
                textAlign: align,
              }}
            >
              {context.brand.name}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 140,
                border: '2px dashed #d4d4d8',
                borderRadius: 8,
                color: '#a1a1aa',
                fontFamily: font,
                fontSize: 13,
              }}
            >
              Image
            </div>
          ),
        );
      }
      return shell(
        <div style={{ display: 'flex', justifyContent: justify }}>
          <img
            src={context.assetUrl(media.key)}
            alt={fill((p.alt as string | undefined) ?? context.brand.name, context, frame.scope)}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: (p.width as number | null) ?? '100%',
              height: 'auto',
              borderRadius: (p.radius as number | undefined) ?? 0,
            }}
          />
        </div>,
      );
    }
    case 'divider':
      return shell(
        <div
          style={{
            width: `${String(p.width)}%`,
            margin: '0 auto',
            borderTop: `${String(p.thickness)}px ${String(p.style)} ${color(p.color as string, context) ?? '#e5e7eb'}`,
          }}
        />,
      );
    case 'spacer': {
      const height =
        env.mobile && p.mobileHeight !== null ? (p.mobileHeight as number) : (p.height as number);
      return <div {...nodeAttrs(node, env)} style={{ height }} />;
    }
    case 'quote':
      return shell(
        <div
          style={{
            borderLeft: `4px solid ${color(p.accent as string, context) ?? '#111'}`,
            padding: '12px 18px',
            background: color(p.background as string | null, context),
          }}
        >
          <div
            style={{
              fontFamily: font,
              fontSize: p.size as number,
              lineHeight: 1.5,
              color: text,
              fontStyle: 'italic',
            }}
          >
            <Text
              node={node}
              path="text"
              value={p.text as EmailRichText}
              env={env}
              scope={frame.scope}
              linkColor={link}
            />
          </div>
          {p.cite ? (
            <div style={{ fontFamily: font, fontSize: 13, color: muted, marginTop: 8 }}>
              — {fill(p.cite as string, context, frame.scope)}
            </div>
          ) : null}
        </div>,
      );
    case 'video': {
      const media = p.thumbnail as { key: string } | null;
      return shell(
        <div style={{ position: 'relative' }}>
          {media ? (
            <img
              src={context.assetUrl(media.key)}
              alt=""
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                borderRadius: p.radius as number,
              }}
            />
          ) : (
            <div style={{ height: 200, background: '#18181b', borderRadius: p.radius as number }} />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: 'rgba(0,0,0,0.55)',
                color: color(p.playColor as string, context),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
              }}
            >
              ▶
            </span>
          </div>
        </div>,
      );
    }
    case 'social':
      return shell(
        <div
          style={{
            display: 'flex',
            justifyContent: justify,
            gap: p.gap as number,
            flexWrap: 'wrap',
          }}
        >
          {(p.items as { network: string }[]).map((item, index) => {
            const icon = context.socialIcon?.(item.network, p.style as string);
            return icon ? (
              <img
                key={index}
                src={icon}
                width={p.size as number}
                height={p.size as number}
                alt={item.network}
              />
            ) : (
              <span
                key={index}
                style={{
                  fontFamily: font,
                  fontSize: 13,
                  fontWeight: 600,
                  color: link,
                  padding: '4px 10px',
                  border: `1px solid ${color('brand.border', context) ?? '#e5e7eb'}`,
                  borderRadius: 999,
                  textTransform: 'capitalize',
                }}
              >
                {item.network}
              </span>
            );
          })}
        </div>,
      );
    case 'menu': {
      const separator = p.separator === 'dot' ? ' · ' : p.separator === 'bar' ? ' | ' : '   ';
      return shell(
        <div
          style={{
            fontFamily: font,
            fontSize: p.size as number,
            textAlign: align,
            color: color(p.color as string | null, context) ?? text,
          }}
        >
          {(p.items as { label: string }[])
            .map((item) => fill(item.label, context, frame.scope))
            .join(separator)}
        </div>,
      );
    }
    case 'product': {
      const media = p.image as { key: string } | null;
      const accent = color(p.accent as string, context);
      const image = media ? (
        <img
          src={context.assetUrl(media.key)}
          alt=""
          style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }}
        />
      ) : (
        <div style={{ height: 160, border: '2px dashed #d4d4d8', borderRadius: 8 }} />
      );
      const body = (
        <div>
          <div
            style={{
              fontFamily: font,
              fontSize: 17,
              fontWeight: 700,
              color: color(settings.headingColor, context),
              paddingTop: 10,
            }}
          >
            {fill(p.title as string, context, frame.scope)}
          </div>
          <div
            style={{ fontFamily: font, fontSize: 14, lineHeight: 1.5, color: text, paddingTop: 4 }}
          >
            <Text
              node={node}
              path="description"
              value={p.description as EmailRichText}
              env={env}
              scope={frame.scope}
              linkColor={link}
            />
          </div>
          <div
            style={{
              fontFamily: font,
              fontSize: 18,
              fontWeight: 700,
              color: accent,
              paddingTop: 8,
            }}
          >
            {fill(p.price as string, context, frame.scope)}{' '}
            {p.oldPrice ? (
              <s style={{ fontSize: 14, color: muted, fontWeight: 400 }}>
                {fill(p.oldPrice as string, context, frame.scope)}
              </s>
            ) : null}
          </div>
          {p.buttonLabel ? (
            <div style={{ paddingTop: 12 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '10px 18px',
                  background: accent,
                  color: '#fff',
                  fontFamily: font,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                {fill(p.buttonLabel as string, context, frame.scope)}
              </span>
            </div>
          ) : null}
        </div>
      );
      return shell(
        p.layout === 'side' && !env.mobile ? (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: '40%' }}>{image}</div>
            <div style={{ flex: 1 }}>{body}</div>
          </div>
        ) : (
          <>
            {image}
            {body}
          </>
        ),
      );
    }
    case 'coupon':
      return shell(
        <div style={{ display: 'flex', justifyContent: justify }}>
          <div
            style={{
              border: `2px dashed ${color(p.borderColor as string, context) ?? '#111'}`,
              borderRadius: 10,
              padding: '14px 24px',
              background: color(p.background as string | null, context),
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Courier New',monospace",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 3,
                color: color(p.textColor as string | null, context) ?? text,
              }}
            >
              {fill(p.code as string, context, frame.scope)}
            </div>
            <div style={{ fontFamily: font, fontSize: 13, color: muted, paddingTop: 6 }}>
              {fill(p.caption as string, context, frame.scope)}
            </div>
          </div>
        </div>,
      );
    case 'key-value': {
      const border = color(p.borderColor as string, context) ?? '#e5e7eb';
      return shell(
        <div style={{ background: color(p.background as string | null, context), borderRadius: 8 }}>
          {(p.rows as { label: string; value: string }[]).map((row, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderBottom: `1px solid ${border}`,
                fontFamily: font,
                fontSize: p.size as number,
              }}
            >
              <span style={{ color: color(p.labelColor as string | null, context) ?? muted }}>
                {fill(row.label, context, frame.scope)}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: color(p.valueColor as string | null, context) ?? text,
                  textAlign: 'right',
                }}
              >
                {fill(row.value, context, frame.scope)}
              </span>
            </div>
          ))}
        </div>,
      );
    }
    case 'line-items': {
      const columns = p.columns as { header: string; field: string; align: string }[];
      const border = color(p.borderColor as string, context) ?? '#e5e7eb';
      const items =
        context.mode === 'preview-raw'
          ? [{}]
          : listOf(p.list as string, context, frame.scope).slice(0, p.max as number);
      const cellStyle = (alignment: string): CSSProperties => ({
        padding: 10,
        textAlign: alignment as CSSProperties['textAlign'],
        borderBottom: `1px solid ${border}`,
      });
      return shell(
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: font,
            fontSize: p.size as number,
            color: text,
          }}
        >
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  style={{
                    ...cellStyle(column.align),
                    fontSize: 12,
                    textTransform: 'uppercase',
                    color: muted,
                    background: color(p.headerBackground as string | null, context),
                  }}
                >
                  {fill(column.header, context, frame.scope)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, row) => (
              <tr key={row}>
                {columns.map((column, index) => (
                  <td key={index} style={cellStyle(column.align)}>
                    {context.mode === 'preview-raw'
                      ? `{{item.${column.field}}}`
                      : String(
                          ((item as Record<string, unknown>)[column.field] as
                            string | number | undefined) ?? '',
                        )}
                  </td>
                ))}
              </tr>
            ))}
            {p.totalLabel ? (
              <tr>
                <td
                  colSpan={columns.length - 1}
                  style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700 }}
                >
                  {fill(p.totalLabel as string, context, frame.scope)}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700 }}>
                  {fill(p.totalValue as string, context, frame.scope)}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>,
      );
    }
    case 'survey': {
      const scale = p.scale as number;
      const start = scale === 10 ? 0 : 1;
      const accent = color(p.color as string, context);
      return shell(
        <div style={{ fontFamily: font }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: text,
              textAlign: 'center',
              paddingBottom: 10,
            }}
          >
            {fill(p.question as string, context, frame.scope)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
            {Array.from({ length: scale === 10 ? 11 : 5 }, (_, index) => (
              <span
                key={index}
                style={{
                  width: 32,
                  lineHeight: '32px',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  color: accent,
                  border: `1px solid ${accent ?? '#111'}`,
                  borderRadius: 6,
                }}
              >
                {start + index}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: muted,
              paddingTop: 6,
            }}
          >
            <span>{fill(p.lowLabel as string, context, frame.scope)}</span>
            <span>{fill(p.highLabel as string, context, frame.scope)}</span>
          </div>
        </div>,
      );
    }
    case 'footer': {
      const footerColor = color(p.color as string | null, context) ?? muted;
      const words =
        context.locale === 'sq'
          ? ['Shiko në shfletues', 'Preferencat', 'Çregjistrohu']
          : context.locale === 'de'
            ? ['Im Browser ansehen', 'Einstellungen', 'Abmelden']
            : ['View in browser', 'Preferences', 'Unsubscribe'];
      const links = [
        p.showViewInBrowser && words[0],
        p.showPreferences && words[1],
        p.showUnsubscribe && words[2],
      ].filter(Boolean);
      return shell(
        <div
          style={{
            fontFamily: font,
            fontSize: p.size as number,
            lineHeight: 1.6,
            color: footerColor,
            textAlign: align,
          }}
        >
          <Text
            node={node}
            path="text"
            value={p.text as EmailRichText}
            env={env}
            scope={frame.scope}
            linkColor={footerColor}
          />
          {p.showAddress ? <div>{context.brand.address}</div> : null}
          {links.length ? (
            <div style={{ textDecoration: 'underline' }}>{links.join(' · ')}</div>
          ) : null}
        </div>,
      );
    }
    case 'conditional':
    case 'repeat': {
      const children = (node.children ?? [])
        .map((id) => context.doc.nodes[id])
        .filter((child): child is BuilderNode => !!child);
      const items =
        node.type === 'repeat' && !env.editing
          ? listOf(p.list as string, context, frame.scope).slice(0, p.max as number)
          : [null];
      return (
        <div
          {...nodeAttrs(node, env)}
          style={
            env.editing
              ? {
                  outline: '1px dashed rgba(37,99,235,0.45)',
                  outlineOffset: -1,
                  borderRadius: 4,
                  minHeight: 24,
                }
              : undefined
          }
        >
          {items.map((item, index) =>
            children.map((child) => (
              <Block
                key={`${String(index)}-${child.id}`}
                node={child}
                env={env}
                frame={item === null ? frame : { scope: { ...frame.scope, item } }}
              />
            )),
          )}
        </div>
      );
    }
    default:
      return shell(<div style={{ fontFamily: font, fontSize: 12, color: muted }}>{node.type}</div>);
  }
}

function Row({ node, env }: { node: BuilderNode; env: Env }) {
  const { context } = env;
  const p = node.props;
  const widths = ROW_LAYOUTS[p.layout as RowLayout] as readonly number[];
  const columns = (node.children ?? [])
    .map((id) => context.doc.nodes[id])
    .filter((child): child is BuilderNode => !!child);
  const stacked = env.mobile && p.stackOnMobile === true;
  const alignItems =
    p.verticalAlign === 'middle'
      ? 'center'
      : p.verticalAlign === 'bottom'
        ? 'flex-end'
        : 'flex-start';
  return (
    <div
      {...nodeAttrs(node, env)}
      style={{
        display: 'flex',
        flexDirection: stacked ? (p.reverseOnMobile ? 'column-reverse' : 'column') : 'row',
        gap: p.gap as number,
        alignItems: stacked ? 'stretch' : alignItems,
        padding: pad(p.padding as Padding),
        background: color(p.background as string | null, context),
      }}
    >
      {columns.map((column, index) => {
        const cp = column.props;
        const pct = widths[index] ?? 100 / columns.length;
        return (
          <div
            key={column.id}
            {...nodeAttrs(column, env)}
            style={{
              flex: stacked
                ? '1 1 auto'
                : `0 0 calc(${String(pct)}% - ${String(((p.gap as number) * (columns.length - 1)) / columns.length)}px)`,
              minWidth: 0,
              padding: pad(cp.padding as Padding),
              background: color(cp.background as string | null, context),
              borderRadius: cp.radius as number,
              border:
                (cp.borderWidth as number) > 0
                  ? `${String(cp.borderWidth)}px solid ${color(cp.borderColor as string, context) ?? '#e5e7eb'}`
                  : undefined,
              boxSizing: 'border-box',
            }}
          >
            {(column.children ?? []).map((id) => {
              const child = context.doc.nodes[id];
              return child ? <Block key={id} node={child} env={env} frame={{ scope: {} }} /> : null;
            })}
          </div>
        );
      })}
    </div>
  );
}

/** The email, rendered for a web page. */
export function EmailCanvas({
  document: doc,
  editText,
  mobile = false,
  editing = false,
  ...options
}: EmailCanvasProps) {
  const context = createContext(doc, options);
  const env: Env = { context, editText, mobile, editing };
  const settings = doc.settings;
  const root = doc.nodes[doc.root];
  return (
    <div
      style={{
        background: color(settings.backdrop, context),
        padding: '24px 0',
        minHeight: '100%',
      }}
    >
      {(root?.children ?? []).map((id) => {
        const section = doc.nodes[id];
        if (!section || hiddenHere(section, env, {})) return null;
        const p = section.props;
        const image = p.backgroundImage as { key: string } | null;
        return (
          <div key={id} style={{ background: color(p.backdrop as string | null, context) }}>
            <div
              {...nodeAttrs(section, env)}
              style={{
                maxWidth: p.fullWidth ? '100%' : settings.width,
                margin: '0 auto',
                background:
                  color(p.background as string | null, context) ??
                  color(settings.background, context),
                backgroundImage: image ? `url('${context.assetUrl(image.key)}')` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: p.radius as number,
                padding: pad(p.padding as Padding),
              }}
            >
              {(section.children ?? []).map((rowId) => {
                const row = doc.nodes[rowId];
                return row ? <Row key={rowId} node={row} env={env} /> : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
