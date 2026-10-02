import { isSafeUrl, type BuilderNode } from '@motors/builder-core';
import {
  googleFontsUrl,
  isSafeTemplateUrl,
  ROW_LAYOUTS,
  variableOf,
  type Display,
  type EmailDocument,
  type EmailRichText,
  type Padding,
  type RowLayout,
} from '@motors/email-core';

import {
  color,
  createContext,
  fill,
  fontStack,
  fontsInUse,
  holds,
  listOf,
  str,
  typography,
  variableText,
  type RenderContext,
  type RenderOptions,
} from './context';

/**
 * Email document → HTML every mail client can show.
 *
 * The rules are the email world's, not the web's: layout is nested
 * `role="presentation"` tables; every style is inline; columns are
 * "fluid-hybrid" — `inline-block` divs that stack on a phone, wrapped in
 * `<!--[if mso]>` ghost tables so Outlook's Word engine lays them side by
 * side; buttons are padded links in a cell with a VML fallback; the only
 * `<style>` block holds the media queries and the dark palette, which the
 * clients that honour them read and the rest ignore.
 *
 * Deterministic: the same document and data always give the same bytes —
 * the renderer's tests snapshot it, and the API's port must match it.
 */

export interface RenderWarning {
  code: string;
  nodeId?: string | undefined;
  params?: Record<string, string | number> | undefined;
}

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
  preheader: string;
  warnings: RenderWarning[];
}

// ── escaping ─────────────────────────────────────────────────────────────────

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A link after substitution — refused (as `#`) when the value is not a safe URL. */
function href(
  template: string,
  context: RenderContext,
  scope: Record<string, unknown> = {},
): string {
  if (!template.trim() || !isSafeTemplateUrl(template)) return '';
  const url = fill(template, context, scope).trim();
  if (context.mode === 'preview-raw') return '#';
  if (!isSafeUrl(url)) return '';
  const utm = context.doc.settings.utm;
  if (!utm.enabled || !/^https?:/i.test(url)) return url;
  const separator = url.includes('?') ? '&' : '?';
  const params = [
    ['utm_source', utm.source],
    ['utm_medium', utm.medium],
    ['utm_campaign', utm.campaign],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `${key ?? ''}=${encodeURIComponent(value ?? '')}`)
    .join('&');
  return params ? `${url}${separator}${params}` : url;
}

function style(rules: Record<string, string | number | undefined | null | false>): string {
  return Object.entries(rules)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && value !== '')
    .map(
      ([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${String(value)}`,
    )
    .join(';');
}

function padding(value: Padding | undefined): string | undefined {
  if (!value) return undefined;
  return `${String(value.top)}px ${String(value.right)}px ${String(value.bottom)}px ${String(value.left)}px`;
}

// ── rich text ────────────────────────────────────────────────────────────────

function richHtml(
  value: EmailRichText | undefined,
  context: RenderContext,
  scope: Record<string, unknown>,
  linkColor: string | undefined,
): string {
  return (value ?? [])
    .map((run) => {
      const variable = variableOf(run);
      const raw = variable
        ? variableText(variable.path, variable.format, variable.fallback, context, scope)
        : run.text;
      let html = escapeHtml(raw).replace(/\n/g, '<br>');
      for (const mark of [...(run.marks ?? [])].reverse()) {
        switch (mark.type) {
          case 'bold':
            html = `<strong>${html}</strong>`;
            break;
          case 'italic':
            html = `<em>${html}</em>`;
            break;
          case 'underline':
            html = `<u>${html}</u>`;
            break;
          case 'strike':
            html = `<s>${html}</s>`;
            break;
          case 'code':
            html = `<code style="font-family:'Courier New',monospace;font-size:0.92em">${html}</code>`;
            break;
          case 'highlight':
            html = `<mark style="background:#fef08a;color:inherit">${html}</mark>`;
            break;
          case 'sub':
            html = `<sub>${html}</sub>`;
            break;
          case 'sup':
            html = `<sup>${html}</sup>`;
            break;
          case 'font':
            html = `<span style="font-family:${escapeHtml(fontStack(mark.family, context))}">${html}</span>`;
            break;
          case 'link': {
            const url = href(mark.href, context, scope);
            if (url) {
              html = `<a href="${escapeHtml(url)}" target="_blank" style="${style({ color: linkColor, textDecoration: 'underline' })}">${html}</a>`;
            }
            break;
          }
          default:
            break;
        }
      }
      return html;
    })
    .join('');
}

function richText(
  value: EmailRichText | undefined,
  context: RenderContext,
  scope: Record<string, unknown>,
): string {
  return (value ?? [])
    .map((run) => {
      const variable = variableOf(run);
      return variable
        ? variableText(variable.path, variable.format, variable.fallback, context, scope)
        : run.text;
    })
    .join('');
}

// ── the tree ─────────────────────────────────────────────────────────────────

interface Frame {
  /** The width the block has to fill, in px — for images and ghost tables. */
  width: number;
  scope: Record<string, unknown>;
}

function displayClass(display: Display | undefined): string {
  if (!display) return '';
  if (display.hideOn === 'mobile') return 'hide-mobile';
  if (display.hideOn === 'desktop') return 'hide-desktop';
  return '';
}

function visible(
  node: BuilderNode,
  context: RenderContext,
  scope: Record<string, unknown>,
): boolean {
  if (node.hidden) return false;
  const display = node.props.display as Display | undefined;
  return !display || holds(display.when, context, scope);
}

function childrenOf(node: BuilderNode, context: RenderContext): BuilderNode[] {
  return (node.children ?? [])
    .map((id) => context.doc.nodes[id])
    .filter((child): child is BuilderNode => !!child);
}

/** A block in a full-width cell with its padding: the unit every block sits in. */
function cell(inner: string, props: Record<string, unknown>, extra = ''): string {
  const cls = displayClass(props.display as Display | undefined);
  const hideDesktop = cls === 'hide-desktop' ? 'display:none;mso-hide:all;' : '';
  return `<tr${cls ? ` class="${cls}"` : ''}><td style="${hideDesktop}${style({ padding: padding(props.padding as Padding | undefined) })}${extra}">${inner}</td></tr>`;
}

function blockTable(rows: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>`;
}

function renderBlocks(nodes: BuilderNode[], context: RenderContext, frame: Frame): string {
  return nodes
    .filter((node) => visible(node, context, frame.scope))
    .map((node) => renderBlock(node, context, frame))
    .join('');
}

function renderBlock(node: BuilderNode, context: RenderContext, frame: Frame): string {
  const p = node.props;
  const settings = context.doc.settings;
  const text = color(settings.textColor, context);
  const link = color(settings.linkColor, context);
  const font = fontStack(p.font as string | null | undefined, context);
  const type = typography(p);
  const align = (p.align as string | undefined) ?? 'left';

  switch (node.type) {
    case 'heading': {
      const level = p.level as number;
      const inner = `<h${String(level)} style="${style({
        margin: 0,
        fontFamily: fontStack(p.font as string | null, context),
        fontSize: `${String(p.size)}px`,
        lineHeight: 1.25,
        fontWeight: type.fontWeight ?? 700,
        letterSpacing: type.letterSpacing,
        textTransform: type.textTransform,
        color: color(p.color as string | null, context) ?? color(settings.headingColor, context),
        textAlign: align,
      })}">${richHtml(p.text as EmailRichText, context, frame.scope, link)}</h${String(level)}>`;
      return cell(inner, p);
    }
    case 'text': {
      const inner = `<div style="${style({
        fontFamily: font,
        fontSize: `${String(p.size)}px`,
        lineHeight: (p.lineHeight as number | null) ?? settings.lineHeight,
        color: color(p.color as string | null, context) ?? text,
        textAlign: align,
        fontWeight: type.fontWeight,
        letterSpacing: type.letterSpacing,
        textTransform: type.textTransform,
      })}">${richHtml(p.text as EmailRichText, context, frame.scope, link)}</div>`;
      return cell(inner, p);
    }
    case 'list': {
      const items = p.items as { text: EmailRichText }[];
      const marker = color(p.markerColor as string, context);
      const rows = items
        .map((item, index) => {
          const bullet =
            p.style === 'number'
              ? `${String(index + 1)}.`
              : p.style === 'check'
                ? '&#10003;'
                : '&#8226;';
          return `<tr><td valign="top" style="${style({ width: '24px', color: marker, fontWeight: 700, fontFamily: font, fontSize: `${String(p.size)}px`, lineHeight: settings.lineHeight, paddingBottom: '6px' })}">${bullet}</td><td style="${style({ fontFamily: font, fontSize: `${String(p.size)}px`, lineHeight: settings.lineHeight, color: color(p.color as string | null, context) ?? text, paddingBottom: '6px' })}">${richHtml(item.text, context, frame.scope, link)}</td></tr>`;
        })
        .join('');
      return cell(
        `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${align}">${rows}</table>`,
        p,
      );
    }
    case 'button': {
      const url = href(p.href as string, context, frame.scope);
      const label = escapeHtml(fill(p.label as string, context, frame.scope));
      const background = color(p.background as string, context) ?? '#111827';
      const fg = color(p.textColor as string, context) ?? '#ffffff';
      const border =
        (p.borderWidth as number) > 0
          ? `${String(p.borderWidth)}px solid ${color(p.borderColor as string | null, context) ?? background}`
          : undefined;
      const linkStyle = style({
        display: 'inline-block',
        padding: `${String(p.paddingY)}px ${String(p.paddingX)}px`,
        fontFamily: font,
        fontSize: `${String(p.size)}px`,
        fontWeight: type.fontWeight ?? 600,
        letterSpacing: type.letterSpacing,
        textTransform: type.textTransform,
        lineHeight: 1.2,
        color: fg,
        textDecoration: 'none',
        borderRadius: `${String(p.radius)}px`,
        border,
        msoPaddingAlt: '0',
      });
      const height = (p.size as number) + (p.paddingY as number) * 2 + 4;
      const vml = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${escapeHtml(url)}" style="height:${String(height)}px;v-text-anchor:middle;width:${String(Math.max(120, label.length * ((p.size as number) * 0.6) + (p.paddingX as number) * 2))}px" arcsize="${String(Math.min(50, Math.round(((p.radius as number) / height) * 100)))}%" stroke="f" fillcolor="${background}"><w:anchorlock/><center style="color:${fg};font-family:Arial,sans-serif;font-size:${String(p.size)}px;font-weight:bold">${label}</center></v:roundrect><![endif]-->`;
      const inner = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${align === 'center' ? 'center' : align === 'right' ? 'right' : 'left'}" class="${p.fullWidthMobile ? 'btn-full' : ''}"><tr><td align="center" bgcolor="${background}" style="${style({ borderRadius: `${String(p.radius)}px`, background })}">${vml}<!--[if !mso]><!--><a href="${escapeHtml(url || '#')}" target="_blank" style="${linkStyle}">${label}</a><!--<![endif]--></td></tr></table>`;
      return cell(inner, p);
    }
    case 'image':
    case 'logo': {
      const media =
        (p.media as { key: string; width?: number } | null) ??
        (node.type === 'logo' ? (context.brand.logo ?? null) : null);
      if (!media) {
        if (node.type === 'logo') {
          const inner = `<div style="${style({ fontFamily: font, fontSize: '20px', fontWeight: 700, color: text, textAlign: align })}">${escapeHtml(context.brand.name)}</div>`;
          return cell(inner, p);
        }
        return '';
      }
      const width = Math.min(frame.width, (p.width as number | null) ?? frame.width);
      const alt = escapeHtml(
        fill(
          node.type === 'logo' ? context.brand.name : ((p.alt as string | undefined) ?? ''),
          context,
          frame.scope,
        ),
      );
      const img = `<img src="${escapeHtml(context.assetUrl(media.key))}" width="${String(Math.round(width))}" alt="${alt}" style="${style({ display: 'block', width: '100%', maxWidth: `${String(Math.round(width))}px`, height: 'auto', border: 0, outline: 'none', borderRadius: p.radius ? `${str(p.radius)}px` : undefined })}">`;
      const url = href((p.href as string | undefined) ?? '', context, frame.scope);
      const linked = url ? `<a href="${escapeHtml(url)}" target="_blank">${img}</a>` : img;
      const inner = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${align}" style="${style({ width: `${String(Math.round(width))}px`, maxWidth: '100%' })}" class="img-fluid"><tr><td>${linked}</td></tr></table>`;
      return cell(inner, p);
    }
    case 'divider': {
      const inner = `<table role="presentation" width="${String(p.width)}%" align="${align === 'left' ? 'left' : align === 'right' ? 'right' : 'center'}" cellspacing="0" cellpadding="0" border="0"><tr><td style="${style({ borderTop: `${String(p.thickness)}px ${String(p.style)} ${color(p.color as string, context) ?? '#e5e7eb'}`, fontSize: '0', lineHeight: '0' })}">&nbsp;</td></tr></table>`;
      return cell(inner, p);
    }
    case 'spacer': {
      const mobile = p.mobileHeight as number | null;
      const cls = [
        displayClass(p.display as Display | undefined),
        mobile !== null ? `sp-${String(mobile)}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<tr${cls ? ` class="${cls}"` : ''}><td style="height:${String(p.height)}px;line-height:${String(p.height)}px;font-size:1px">&nbsp;</td></tr>`;
    }
    case 'quote': {
      const inner = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="${style({ borderLeft: `4px solid ${color(p.accent as string, context) ?? '#111827'}`, padding: '12px 18px', background: color(p.background as string | null, context) })}"><div style="${style({ fontFamily: font, fontSize: `${String(p.size)}px`, lineHeight: 1.5, color: text, fontStyle: 'italic', textAlign: align })}">${richHtml(p.text as EmailRichText, context, frame.scope, link)}</div>${p.cite ? `<div style="${style({ fontFamily: font, fontSize: '13px', color: color('brand.muted', context), marginTop: '8px' })}">— ${escapeHtml(fill(p.cite as string, context, frame.scope))}</div>` : ''}</td></tr></table>`;
      return cell(inner, p);
    }
    case 'video': {
      const media = p.thumbnail as { key: string } | null;
      if (!media) return '';
      const url = href(p.href as string, context, frame.scope);
      const img = `<img src="${escapeHtml(context.assetUrl(media.key))}" width="${String(Math.round(frame.width))}" alt="${escapeHtml(fill(p.alt as string, context, frame.scope))}" style="${style({ display: 'block', width: '100%', height: 'auto', border: 0, borderRadius: `${String(p.radius)}px` })}">`;
      const play = `<div style="${style({ fontFamily: font, fontSize: '14px', fontWeight: 600, color: link, paddingTop: '8px', textAlign: 'center' })}">&#9654; ${escapeHtml(fill(p.alt as string, context, frame.scope))}</div>`;
      const inner = url
        ? `<a href="${escapeHtml(url)}" target="_blank" style="text-decoration:none">${img}${play}</a>`
        : `${img}${play}`;
      return cell(inner, p);
    }
    case 'social': {
      const items = p.items as { network: string; href: string }[];
      const size = p.size as number;
      const links = items
        .map((item) => {
          const url = href(item.href, context, frame.scope);
          if (!url) return '';
          const icon =
            p.appearance === 'icons' ? context.socialIcon?.(item.network, p.style as string) : null;
          const content = icon
            ? `<img src="${escapeHtml(icon)}" width="${String(size)}" height="${String(size)}" alt="${escapeHtml(item.network)}" style="display:block;border:0">`
            : `<span style="${style({ display: 'inline-block', fontFamily: font, fontSize: '13px', fontWeight: 600, color: link, padding: '4px 8px', border: `1px solid ${color('brand.border', context) ?? '#e5e7eb'}`, borderRadius: '999px' })}">${escapeHtml(item.network.charAt(0).toUpperCase() + item.network.slice(1))}</span>`;
          return `<td style="padding:0 ${String((p.gap as number) / 2)}px"><a href="${escapeHtml(url)}" target="_blank" style="text-decoration:none">${content}</a></td>`;
        })
        .join('');
      return cell(
        `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${align}"><tr>${links}</tr></table>`,
        p,
      );
    }
    case 'menu': {
      const items = p.items as { label: string; href: string }[];
      const separator =
        p.separator === 'dot' ? ' &middot; ' : p.separator === 'bar' ? ' | ' : '&nbsp;&nbsp;';
      const inner = `<div style="${style({ fontFamily: font, fontSize: `${String(p.size)}px`, textAlign: align, color: color(p.color as string | null, context) ?? text })}">${items
        .map((item) => {
          const url = href(item.href, context, frame.scope);
          const label = escapeHtml(fill(item.label, context, frame.scope));
          return url
            ? `<a href="${escapeHtml(url)}" target="_blank" style="${style({ color: color(p.color as string | null, context) ?? text, textDecoration: 'none' })}">${label}</a>`
            : label;
        })
        .join(separator)}</div>`;
      return cell(inner, p);
    }
    case 'product': {
      const media = p.image as { key: string } | null;
      const accent = color(p.accent as string, context);
      const url = href(p.href as string, context, frame.scope);
      const img = media
        ? `<img src="${escapeHtml(context.assetUrl(media.key))}" width="${String(Math.round(p.layout === 'side' ? frame.width * 0.4 : frame.width))}" alt="${escapeHtml(fill(p.alt as string, context, frame.scope))}" style="display:block;width:100%;height:auto;border:0;border-radius:8px">`
        : '';
      const body = `<div style="${style({ fontFamily: font, fontSize: '17px', fontWeight: 700, color: color(settings.headingColor, context), paddingTop: '10px' })}">${escapeHtml(fill(p.title as string, context, frame.scope))}</div><div style="${style({ fontFamily: font, fontSize: '14px', lineHeight: 1.5, color: text, paddingTop: '4px' })}">${richHtml(p.description as EmailRichText, context, frame.scope, link)}</div><div style="${style({ fontFamily: font, fontSize: '18px', fontWeight: 700, color: accent, paddingTop: '8px' })}">${escapeHtml(fill(p.price as string, context, frame.scope))}${p.oldPrice ? ` <s style="font-size:14px;color:${color('brand.muted', context) ?? '#6b7280'};font-weight:400">${escapeHtml(fill(p.oldPrice as string, context, frame.scope))}</s>` : ''}</div>${url && p.buttonLabel ? `<div style="padding-top:12px"><a href="${escapeHtml(url)}" target="_blank" style="${style({ display: 'inline-block', padding: '10px 18px', background: accent, color: '#ffffff', fontFamily: font, fontSize: '14px', fontWeight: 600, textDecoration: 'none', borderRadius: '8px' })}">${escapeHtml(fill(p.buttonLabel as string, context, frame.scope))}</a></div>` : ''}`;
      const inner =
        p.layout === 'side' && img
          ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="40%" valign="top">${img}</td><td valign="top" style="padding-left:16px">${body}</td></tr></table>`
          : `${img}${body}`;
      return cell(inner, p);
    }
    case 'coupon': {
      const inner = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${align}"><tr><td style="${style({ border: `2px dashed ${color(p.borderColor as string, context) ?? '#111827'}`, borderRadius: '10px', padding: '14px 24px', background: color(p.background as string | null, context), textAlign: 'center' })}"><div style="${style({ fontFamily: "'Courier New',monospace", fontSize: '24px', fontWeight: 700, letterSpacing: '3px', color: color(p.textColor as string | null, context) ?? text })}">${escapeHtml(fill(p.code as string, context, frame.scope))}</div><div style="${style({ fontFamily: font, fontSize: '13px', color: color('brand.muted', context), paddingTop: '6px' })}">${escapeHtml(fill(p.caption as string, context, frame.scope))}</div></td></tr></table>`;
      return cell(inner, p);
    }
    case 'key-value': {
      const rows = (p.rows as { label: string; value: string }[])
        .map(
          (row) =>
            `<tr><td style="${style({ padding: '10px 12px', borderBottom: `1px solid ${color(p.borderColor as string, context) ?? '#e5e7eb'}`, fontFamily: font, fontSize: `${String(p.size)}px`, color: color(p.labelColor as string | null, context) ?? color('brand.muted', context) })}">${escapeHtml(fill(row.label, context, frame.scope))}</td><td align="right" style="${style({ padding: '10px 12px', borderBottom: `1px solid ${color(p.borderColor as string, context) ?? '#e5e7eb'}`, fontFamily: font, fontSize: `${String(p.size)}px`, fontWeight: 600, color: color(p.valueColor as string | null, context) ?? text })}">${escapeHtml(fill(row.value, context, frame.scope))}</td></tr>`,
        )
        .join('');
      return cell(
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${style({ background: color(p.background as string | null, context), borderRadius: '8px' })}">${rows}</table>`,
        p,
      );
    }
    case 'line-items': {
      const columns = p.columns as { header: string; field: string; align: string }[];
      const border = color(p.borderColor as string, context) ?? '#e5e7eb';
      const items =
        context.mode === 'preview-raw'
          ? [{}]
          : listOf(p.list as string, context, frame.scope).slice(0, p.max as number);
      const head = `<tr>${columns.map((column) => `<th align="${column.align}" style="${style({ padding: '8px 10px', fontFamily: font, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: color('brand.muted', context), background: color(p.headerBackground as string | null, context), borderBottom: `1px solid ${border}` })}">${escapeHtml(fill(column.header, context, frame.scope))}</th>`).join('')}</tr>`;
      const body = items
        .map(
          (item) =>
            `<tr>${columns.map((column) => `<td align="${column.align}" style="${style({ padding: '10px', fontFamily: font, fontSize: `${String(p.size)}px`, color: text, borderBottom: `1px solid ${border}` })}">${escapeHtml(context.mode === 'preview-raw' ? `{{item.${column.field}}}` : String(((item as Record<string, unknown>)[column.field] as string | number | undefined) ?? ''))}</td>`).join('')}</tr>`,
        )
        .join('');
      const total = p.totalLabel
        ? `<tr><td colspan="${String(columns.length - 1)}" align="right" style="${style({ padding: '12px 10px', fontFamily: font, fontSize: `${String(p.size)}px`, fontWeight: 700, color: text })}">${escapeHtml(fill(p.totalLabel as string, context, frame.scope))}</td><td align="right" style="${style({ padding: '12px 10px', fontFamily: font, fontSize: `${String(p.size)}px`, fontWeight: 700, color: text })}">${escapeHtml(fill(p.totalValue as string, context, frame.scope))}</td></tr>`
        : '';
      return cell(
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${head}${body}${total}</table>`,
        p,
      );
    }
    case 'survey': {
      const scale = p.scale as number;
      const start = scale === 10 ? 0 : 1;
      const accent = color(p.color as string, context) ?? '#111827';
      const cells = Array.from({ length: scale === 10 ? 11 : 5 }, (_, index) => {
        const score = start + index;
        const url = href(String(p.href).replace('{score}', String(score)), context, frame.scope);
        return `<td align="center" style="padding:2px"><a href="${escapeHtml(url || '#')}" target="_blank" style="${style({ display: 'inline-block', width: '32px', lineHeight: '32px', fontFamily: font, fontSize: '14px', fontWeight: 600, color: accent, border: `1px solid ${accent}`, borderRadius: '6px', textDecoration: 'none' })}">${String(score)}</a></td>`;
      }).join('');
      const inner = `<div style="${style({ fontFamily: font, fontSize: '16px', fontWeight: 600, color: text, textAlign: 'center', paddingBottom: '10px' })}">${escapeHtml(fill(p.question as string, context, frame.scope))}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr>${cells}</tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="${style({ fontFamily: font, fontSize: '12px', color: color('brand.muted', context), paddingTop: '6px' })}">${escapeHtml(fill(p.lowLabel as string, context, frame.scope))}</td><td align="right" style="${style({ fontFamily: font, fontSize: '12px', color: color('brand.muted', context), paddingTop: '6px' })}">${escapeHtml(fill(p.highLabel as string, context, frame.scope))}</td></tr></table>`;
      return cell(inner, p);
    }
    case 'footer': {
      const muted = color(p.color as string | null, context) ?? color('brand.muted', context);
      const linkStyle = style({ color: muted, textDecoration: 'underline' });
      const links = [
        p.showViewInBrowser
          ? [
              'links.view_in_browser',
              context.locale === 'sq'
                ? 'Shiko në shfletues'
                : context.locale === 'de'
                  ? 'Im Browser ansehen'
                  : 'View in browser',
            ]
          : null,
        p.showPreferences
          ? [
              'links.preferences',
              context.locale === 'sq'
                ? 'Preferencat'
                : context.locale === 'de'
                  ? 'Einstellungen'
                  : 'Preferences',
            ]
          : null,
        p.showUnsubscribe
          ? [
              'links.unsubscribe',
              context.locale === 'sq'
                ? 'Çregjistrohu'
                : context.locale === 'de'
                  ? 'Abmelden'
                  : 'Unsubscribe',
            ]
          : null,
      ]
        .filter((entry): entry is string[] => entry !== null)
        .map(([path, label]) => {
          const url = href(`{{ ${path ?? ''} }}`, context, frame.scope);
          return url
            ? `<a href="${escapeHtml(url)}" target="_blank" style="${linkStyle}">${escapeHtml(label ?? '')}</a>`
            : escapeHtml(label ?? '');
        })
        .join(' &middot; ');
      const inner = `<div style="${style({ fontFamily: font, fontSize: `${String(p.size)}px`, lineHeight: 1.6, color: muted, textAlign: align })}">${richHtml(p.text as EmailRichText, context, frame.scope, muted)}${p.showAddress ? `<br>${escapeHtml(context.brand.address)}` : ''}${links ? `<br>${links}` : ''}</div>`;
      return cell(inner, p);
    }
    case 'conditional':
      return renderBlocks(childrenOf(node, context), context, frame);
    case 'repeat': {
      const items =
        context.mode === 'preview-raw'
          ? [{}]
          : listOf(p.list as string, context, frame.scope).slice(0, p.max as number);
      return items
        .map((item) =>
          renderBlocks(childrenOf(node, context), context, {
            ...frame,
            scope: { ...frame.scope, item },
          }),
        )
        .join('');
    }
    default:
      return '';
  }
}

function renderRow(
  row: BuilderNode,
  context: RenderContext,
  innerWidth: number,
  scope: Record<string, unknown>,
): string {
  const p = row.props;
  const widths = ROW_LAYOUTS[p.layout as RowLayout] as readonly number[];
  const columns = childrenOf(row, context);
  const rowPadding = p.padding as Padding;
  const available = innerWidth - rowPadding.left - rowPadding.right;
  const gap = columns.length > 1 ? (p.gap as number) : 0;
  const valign = p.verticalAlign as string;
  const stack = p.stackOnMobile === true;

  const cells = columns
    .map((column, index) => {
      const pct = widths[index] ?? 100 / columns.length;
      const colWidth = Math.floor(((available - gap * (columns.length - 1)) * pct) / 100);
      const cp = column.props;
      const colPad = cp.padding as Padding;
      const inner = blockTable(
        renderBlocks(childrenOf(column, context), context, {
          width: colWidth - colPad.left - colPad.right,
          scope,
        }),
      );
      const colStyle = style({
        background: color(cp.background as string | null, context),
        padding: padding(colPad),
        borderRadius: cp.radius ? `${str(cp.radius)}px` : undefined,
        border:
          (cp.borderWidth as number) > 0
            ? `${String(cp.borderWidth)}px solid ${color(cp.borderColor as string, context) ?? '#e5e7eb'}`
            : undefined,
        // The row centres its inline-block columns; the blocks inside must not
        // inherit that — a table cell or a list with no alignment of its own
        // reads left, as it does in the editor.
        textAlign: 'left',
      });
      const ghostOpen =
        index === 0
          ? `<!--[if mso]><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="${String(colWidth)}" valign="${valign}"><![endif]-->`
          : `<!--[if mso]></td><td width="${String(gap)}"></td><td width="${String(colWidth)}" valign="${valign}"><![endif]-->`;
      const ghostClose =
        index === columns.length - 1 ? '<!--[if mso]></td></tr></table><![endif]-->' : '';
      const spacing = index < columns.length - 1 ? `margin-right:${String(gap)}px;` : '';
      return `${ghostOpen}<div class="${stack ? 'col' : ''}" style="display:inline-block;vertical-align:${valign};width:100%;max-width:${String(colWidth)}px;${spacing}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="${colStyle}">${inner}</td></tr></table></div>${ghostClose}`;
    })
    .join('');

  const reverse = stack && p.reverseOnMobile === true ? ' dir="rtl"' : '';
  const inner = reverse
    ? cells.replace(
        /<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="/g,
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="ltr"><tr><td style="',
      )
    : cells;
  return `<tr><td${reverse} style="${style({ padding: padding(rowPadding), background: color(p.background as string | null, context), fontSize: 0, textAlign: 'center' })}">${inner}</td></tr>`;
}

function renderSection(section: BuilderNode, context: RenderContext): string {
  const p = section.props;
  const settings = context.doc.settings;
  const width = settings.width;
  const pad = p.padding as Padding;
  const inner = width - pad.left - pad.right;
  const background =
    color(p.background as string | null, context) ?? color(settings.background, context);
  const image = p.backgroundImage as { key: string } | null;
  const backgroundImage = image ? context.assetUrl(image.key) : null;
  const rows = childrenOf(section, context)
    .filter((row) => visible(row, context, {}))
    .map((row) => renderRow(row, context, inner, {}))
    .join('');
  const content = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${style({ background: background, backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined, backgroundSize: backgroundImage ? 'cover' : undefined, backgroundPosition: backgroundImage ? 'center' : undefined, borderRadius: p.radius ? `${str(p.radius)}px` : undefined })}"${backgroundImage ? ` background="${escapeHtml(backgroundImage)}"` : ''}><tr><td style="${style({ padding: padding(pad) })}">${blockTable(rows)}</td></tr></table>`;
  const backdrop = color(p.backdrop as string | null, context);
  return `<tr><td align="center"${backdrop ? ` bgcolor="${backdrop}"` : ''} style="${style({ background: backdrop, padding: '0' })}"><!--[if mso]><table role="presentation" width="${String(width)}" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]--><div class="container" style="max-width:${String(p.fullWidth ? 2000 : width)}px;margin:0 auto">${content}</div><!--[if mso]></td></tr></table><![endif]--></td></tr>`;
}

function css(doc: EmailDocument, context: RenderContext): string {
  const s = doc.settings;
  const breakpoint = s.width + 20;
  const spacers = [
    ...new Set(
      Object.values(doc.nodes)
        .filter((node) => node.type === 'spacer' && node.props.mobileHeight !== null)
        .map((node) => node.props.mobileHeight as number),
    ),
  ];
  const dark =
    s.darkMode === 'custom'
      ? `@media (prefers-color-scheme: dark){.body-bg{background:${s.dark.backdrop}!important}.container table{background-color:${s.dark.background}!important}.container div,.container td{color:${s.dark.text}!important}.container h1,.container h2,.container h3{color:${s.dark.heading}!important}.container a{color:${s.dark.link}!important}}[data-ogsc] .container div,[data-ogsc] .container td{color:${s.dark.text}!important}[data-ogsb] .container table{background-color:${s.dark.background}!important}`
      : '';
  void context;
  return [
    'body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}',
    'table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}',
    'img{-ms-interpolation-mode:bicubic}',
    'a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}',
    `@media only screen and (max-width:${String(breakpoint)}px){.col{max-width:100%!important;display:block!important;margin-right:0!important}.hide-mobile{display:none!important}.hide-desktop{display:table-row!important;max-height:none!important}.btn-full{width:100%!important}.btn-full a{display:block!important}.img-fluid{width:100%!important}${spacers.map((height) => `.sp-${String(height)} td{height:${String(height)}px!important;line-height:${String(height)}px!important}`).join('')}}`,
    dark,
  ].join('');
}

/** Render a whole email. */
export function renderEmail(doc: EmailDocument, options: RenderOptions): RenderedEmail {
  const context = createContext(doc, options);
  const settings = doc.settings;
  const subject = fill(doc.meta.subject, context);
  const preheader = fill(doc.meta.preheader, context);
  const root = doc.nodes[doc.root];
  const sections = (root?.children ?? [])
    .map((id) => doc.nodes[id])
    .filter((node): node is BuilderNode => !!node && visible(node, context, {}))
    .map((node) => renderSection(node, context))
    .join('');
  const backdrop = color(settings.backdrop, context) ?? '#f4f4f5';
  const lang = escapeHtml(context.locale);
  const fontsUrl = googleFontsUrl(fontsInUse(doc));

  const html = [
    '<!DOCTYPE html>',
    `<html lang="${lang}" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="x-apple-disable-message-reformatting">',
    '<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="supported-color-schemes" content="light dark">',
    `<title>${escapeHtml(subject)}</title>`,
    '<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->',
    // Web fonts for the clients that load them; Outlook never sees the link
    // and uses the stack's fallback, which is why every stack has one.
    fontsUrl
      ? `<!--[if !mso]><!--><link href="${escapeHtml(fontsUrl)}" rel="stylesheet" type="text/css"><!--<![endif]-->`
      : '',
    `<style>${css(doc, context)}</style>`,
    '</head>',
    `<body class="body-bg" style="margin:0;padding:0;background:${backdrop}">`,
    // The preheader: shown in the inbox after the subject, hidden in the email.
    // The trailing entities keep the client from filling the preview with body text.
    `<div style="display:none;font-size:1px;color:${backdrop};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}${'&#8199;&#65279;&#847; '.repeat(40)}</div>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="body-bg" bgcolor="${backdrop}" style="background:${backdrop}"><tr><td align="center" style="padding:24px 0">`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${sections}</table>`,
    '</td></tr></table>',
    '</body>',
    '</html>',
  ].join('');

  const warnings: RenderWarning[] = [];
  const bytes = new TextEncoder().encode(html).length;
  if (bytes > 90_000)
    warnings.push({ code: 'size.clipping', params: { kb: Math.round(bytes / 1024) } });
  if (!preheader.trim()) warnings.push({ code: 'meta.preheaderMissing' });
  for (const path of context.missing)
    warnings.push({ code: 'variable.noValue', params: { variable: path } });

  return { html, text: renderText(doc, context), subject, preheader, warnings };
}

// ── plain text ───────────────────────────────────────────────────────────────

function textOf(
  node: BuilderNode,
  context: RenderContext,
  scope: Record<string, unknown>,
): string[] {
  if (!visible(node, context, scope)) return [];
  const p = node.props;
  switch (node.type) {
    case 'heading': {
      const title = richText(p.text as EmailRichText, context, scope);
      return [title.toUpperCase(), ''];
    }
    case 'text':
      return [richText(p.text as EmailRichText, context, scope), ''];
    case 'list':
      return [
        ...(p.items as { text: EmailRichText }[]).map(
          (item, index) =>
            `${p.style === 'number' ? `${String(index + 1)}.` : '-'} ${richText(item.text, context, scope)}`,
        ),
        '',
      ];
    case 'button': {
      const url = href(p.href as string, context, scope);
      return [`${fill(p.label as string, context, scope)}: ${url}`, ''];
    }
    case 'image':
      return p.href
        ? [
            `${fill(p.alt as string, context, scope)}: ${href(p.href as string, context, scope)}`,
            '',
          ]
        : [];
    case 'divider':
      return ['----------', ''];
    case 'quote':
      return [
        `"${richText(p.text as EmailRichText, context, scope)}" — ${fill(p.cite as string, context, scope)}`,
        '',
      ];
    case 'video':
      return [
        `${fill(p.alt as string, context, scope)}: ${href(p.href as string, context, scope)}`,
        '',
      ];
    case 'menu':
      return [
        (p.items as { label: string; href: string }[])
          .map((item) => `${fill(item.label, context, scope)} (${href(item.href, context, scope)})`)
          .join(' | '),
        '',
      ];
    case 'social':
      return [
        (p.items as { network: string; href: string }[])
          .map((item) => `${item.network}: ${href(item.href, context, scope)}`)
          .join('\n'),
        '',
      ];
    case 'product':
      return [
        fill(p.title as string, context, scope),
        richText(p.description as EmailRichText, context, scope),
        fill(p.price as string, context, scope),
        ...(p.href
          ? [
              `${fill(p.buttonLabel as string, context, scope)}: ${href(p.href as string, context, scope)}`,
            ]
          : []),
        '',
      ];
    case 'coupon':
      return [
        `${fill(p.caption as string, context, scope)}: ${fill(p.code as string, context, scope)}`,
        '',
      ];
    case 'key-value':
      return [
        ...(p.rows as { label: string; value: string }[]).map(
          (row) => `${fill(row.label, context, scope)}: ${fill(row.value, context, scope)}`,
        ),
        '',
      ];
    case 'line-items': {
      const columns = p.columns as { header: string; field: string }[];
      const items = listOf(p.list as string, context, scope).slice(0, p.max as number) as Record<
        string,
        unknown
      >[];
      return [
        columns.map((column) => fill(column.header, context, scope)).join(' | '),
        ...items.map((item) =>
          columns
            .map((column) => String((item[column.field] as string | number | undefined) ?? ''))
            .join(' | '),
        ),
        `${fill(p.totalLabel as string, context, scope)}: ${fill(p.totalValue as string, context, scope)}`,
        '',
      ];
    }
    case 'survey':
      return [
        fill(p.question as string, context, scope),
        href(String(p.href).replace('{score}', '10'), context, scope),
        '',
      ];
    case 'footer': {
      const lines = [richText(p.text as EmailRichText, context, scope)];
      if (p.showAddress) lines.push(context.brand.address);
      if (p.showUnsubscribe)
        lines.push(`Unsubscribe: ${href('{{ links.unsubscribe }}', context, scope)}`);
      return [...lines, ''];
    }
    case 'conditional':
      return childrenOf(node, context).flatMap((child) => textOf(child, context, scope));
    case 'repeat':
      return listOf(p.list as string, context, scope)
        .slice(0, p.max as number)
        .flatMap((item) =>
          childrenOf(node, context).flatMap((child) => textOf(child, context, { ...scope, item })),
        );
    case 'section':
    case 'row':
    case 'column':
      return childrenOf(node, context).flatMap((child) => textOf(child, context, scope));
    default:
      return [];
  }
}

export function renderText(doc: EmailDocument, context: RenderContext): string {
  const root = doc.nodes[doc.root];
  const lines = (root?.children ?? [])
    .map((id) => doc.nodes[id])
    .filter((node): node is BuilderNode => !!node)
    .flatMap((node) => textOf(node, context, {}));
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type { RenderOptions };
