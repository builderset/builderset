'use client';

import {
  createFragment,
  createId,
  type BuilderNode,
  type ElementRegistry,
  type Fragment,
} from '@builderset/engine';
import type { EditorProfile } from '@builderset/engine/editor';
import {
  BRAND_COLORS,
  checkEmail,
  EMAIL_CATEGORIES,
  EMAIL_FONTS,
  googleFontsUrl,
  parseEmail,
  ROW_LAYOUTS,
  variablesOf,
  type EmailDocument,
  type EmailType,
  type RowLayout,
} from '../core';
import { socialIconUrl, type BrandKit } from '../render';
import { EmailCanvas, type EditableField } from './canvas';

import { EmailSettingsPanel } from './settings-panel';
import { ImportHtmlHost } from './import-html-host';
import { ModulesPanel } from './modules-panel';
import type { EmailWords } from './messages';

/**
 * The email builder, as a profile of the shared editor: the canvas draws the
 * email (`EmailCanvas`), settings are the email's (subject, width, colours,
 * dark mode), checks are @builderset/email's against the email TYPE, and new text is
 * a `text` block in a section › row › column the editor builds around it.
 */

export interface EmailProfileOptions {
  registry: ElementRegistry;
  type: EmailType | null;
  brand: BrandKit;
  assetUrl: (key: string) => string;
  /** The public site, where the social icons are served. */
  socialIconBase?: string | undefined;
  locale: string;
  words: EmailWords;
  /** The languages a design may be written in; others block activation. */
  contentLocales?: readonly string[] | undefined;
  /** Load the fonts from Google Fonts: on the canvas, and to preview the choices. Default: true. */
  fontPreviews?: boolean | undefined;
}

/** A row's column diagram, for the Structures tiles. */
function ColumnsIcon({ widths }: { widths: readonly number[] }) {
  return (
    <span className="bst:flex bst:h-6 bst:w-16 bst:gap-0.5" aria-hidden="true">
      {widths.map((width, index) => (
        <span
          key={index}
          className="bst:rounded-[2px] bst:bg-muted-foreground/35 bst:transition-colors bst:group-hover:bg-primary/60"
          style={{ flex: `${String(width)} 1 0` }}
        />
      ))}
    </span>
  );
}

/** A new section holding one row of `layout`, with empty columns. */
function structure(registry: ElementRegistry, layout: RowLayout): Fragment {
  const nodes: Fragment['nodes'] = {};
  const make = (type: string, props: Record<string, unknown>, children?: string[]): string => {
    const definition = registry.require(type);
    const id = createId();
    const node: BuilderNode = {
      id,
      type,
      v: definition.version,
      props: { ...definition.defaults(), ...props },
    };
    if (definition.container) node.children = children ?? [];
    nodes[id] = node;
    return id;
  };
  const columns = ROW_LAYOUTS[layout].map(() => make('column', {}));
  const row = make('row', { layout }, columns);
  const section = make('section', {}, [row]);
  return { roots: [section], nodes };
}

/**
 * Keep a row's columns in step with its layout: switching "2 columns" to "3"
 * adds an empty column; switching down moves the dropped columns' blocks into
 * the last one kept, so no content is ever lost to a layout change.
 */
function syncColumns(draft: EmailDocument, id: string, registry: ElementRegistry) {
  const node = draft.nodes[id];
  if (node?.type !== 'row') return;
  const want = (ROW_LAYOUTS[node.props.layout as RowLayout] as readonly number[] | undefined)
    ?.length;
  if (!want) return;
  const children = node.children ?? [];
  node.children = children;
  while (children.length < want) {
    const fragment = createFragment(registry, 'column');
    Object.assign(draft.nodes, fragment.nodes);
    children.push(...fragment.roots);
  }
  while (children.length > want) {
    const extra = children.pop();
    const last = children[children.length - 1];
    if (!extra || !last) break;
    const kept = draft.nodes[last];
    const dropped = draft.nodes[extra];
    if (kept && dropped) kept.children = [...(kept.children ?? []), ...(dropped.children ?? [])];
    Reflect.deleteProperty(draft.nodes, extra);
  }
}

export function emailProfile({
  registry,
  type,
  brand,
  assetUrl,
  socialIconBase,
  locale,
  words,
  contentLocales,
  fontPreviews = true,
}: EmailProfileOptions): EditorProfile<EmailDocument> {
  const socialIcon = socialIconBase ? socialIconUrl(socialIconBase) : undefined;
  const variables = variablesOf(type).map((variable) => ({
    path: variable.path,
    label: variable.label[locale] ?? variable.label.en ?? variable.path,
  }));
  const layouts: RowLayout[] = ['100', '50-50', '33-67', '67-33', '33-33-33', '25-25-25-25'];

  return {
    renderCanvas: ({ doc, editText, viewport, locale: writing }) => (
      <EmailCanvas
        document={doc}
        editing
        mobile={viewport === 'mobile'}
        editText={editText as unknown as (field: EditableField) => React.ReactNode}
        assetUrl={assetUrl}
        brand={brand}
        locale={writing ?? locale}
        mode="preview-raw"
        socialIcon={socialIcon}
        fontPreviews={fontPreviews}
      />
    ),
    canvasFrame: 'bare',
    canvasWidths: { desktop: 760, tablet: 680, mobile: 390 },
    settingsPanel: EmailSettingsPanel,
    overlays: ImportHtmlHost,
    templatesPanel: ModulesPanel,
    check: (doc) => checkEmail(doc, registry, type, { locales: contentLocales }),
    parse: (raw) => parseEmail(raw, registry),
    categories: EMAIL_CATEGORIES.filter((category) => category !== 'structure'),
    paragraphType: 'text',
    variables,
    titleOf: (doc) => doc.meta.name,
    styleTab: false,
    onNodeUpdated: syncColumns,
    fonts: Object.entries(EMAIL_FONTS).map(([key, font]) => ({
      key,
      label: font.label,
      stack: font.stack,
      category: font.category,
      web: 'google' in font,
    })),
    fontsPreviewUrl: fontPreviews
      ? (googleFontsUrl(Object.keys(EMAIL_FONTS)) ?? undefined)
      : undefined,
    colorTokens: BRAND_COLORS.map((name) => ({
      value: `brand.${name}`,
      label: name,
      hex: brand.colors[name] ?? '#000000',
    })),
    structures: layouts.map((layout) => ({
      id: layout,
      label:
        ROW_LAYOUTS[layout].length > 1
          ? `${words.email.columns(ROW_LAYOUTS[layout].length)} · ${ROW_LAYOUTS[layout].map((width) => String(Math.round(width))).join('/')}`
          : words.email.columns(1),
      icon: <ColumnsIcon widths={ROW_LAYOUTS[layout]} />,
      build: () => structure(registry, layout),
    })),
  };
}
