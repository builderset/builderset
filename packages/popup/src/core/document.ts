import { i18nSchema, nodeShapeSchema, type EngineDocument } from '@builderset/engine';
import { z } from 'zod';

/**
 * A popup, as data.
 *
 * The engine's node tree: a root that IS the popup — its type and size, where
 * it sits, its look, when it shows (`display`) and how it moves (`motion`) —
 * holding the placed elements, each at its own frame in CSS pixels. The root
 * keeps the engine's `root` type (every tree has one), and its props are the
 * popup's format; the elements are its children, last one on top.
 *
 * It is never HTML: `PopupView` draws it on a page, and the same document
 * decides on a server whether to show it (`shouldShow`) and checks what a
 * visitor sends (`validateSubmission`).
 */

export const POPUP_SCHEMA = 'popup/document' as const;
export const POPUP_VERSION = 1;
export const POPUP_ROOT = 'root';

export const hex = () => z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** A colour, or empty for "automatic" (text) or "none" (a fill). */
export const optionalHex = () => z.string().regex(/^(#[0-9a-fA-F]{6})?$/);
const words = (max: number) => z.string().max(max);

/** The fonts a popup may use: Google fonts the host page loads, and system stacks. */
export const POPUP_FONTS = {
  poppins: { label: 'Poppins', stack: '"Poppins", ui-sans-serif, system-ui, sans-serif' },
  sora: { label: 'Sora', stack: '"Sora", ui-sans-serif, system-ui, sans-serif' },
  inter: { label: 'Inter', stack: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  mono: { label: 'Geist Mono', stack: '"Geist Mono", ui-monospace, "SFMono-Regular", monospace' },
  georgia: { label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  system: {
    label: 'System',
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
} as const;
export type PopupFont = keyof typeof POPUP_FONTS;
export const FONT_KEYS = Object.keys(POPUP_FONTS) as [PopupFont, ...PopupFont[]];

// #region types
/** Where a popup can sit. A type allows some of them (see `POPUP_TYPES`). */
export const POSITIONS = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'left',
  'right',
] as const;
export type PopupPosition = (typeof POSITIONS)[number];

/**
 * What each kind of popup is: its starting size, the sizes offered, where it
 * may sit, which sides stretch to the page (`fill`), whether it dims the page
 * behind (`overlay`) and whether it takes the keyboard while open (`modal`:
 * focus trapped inside, `aria-modal`).
 *
 * A stretched side is drawn edge to edge, its elements in a box of the
 * design's width centred on it — a bar is as wide as the page, its words are
 * where they were designed.
 */
export const POPUP_TYPES = {
  modal: {
    width: 520,
    height: 340,
    sizes: [
      ['s', 420, 300],
      ['m', 520, 340],
      ['l', 680, 420],
    ],
    positions: ['center'],
    fill: 'none',
    overlay: true,
    modal: true,
  },
  slidein: {
    width: 360,
    height: 220,
    sizes: [],
    positions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    fill: 'none',
    overlay: false,
    modal: false,
  },
  bartop: {
    width: 1100,
    height: 64,
    sizes: [],
    positions: ['center'],
    fill: 'width',
    overlay: false,
    modal: false,
  },
  barbottom: {
    width: 1100,
    height: 64,
    sizes: [],
    positions: ['center'],
    fill: 'width',
    overlay: false,
    modal: false,
  },
  fullscreen: {
    width: 1100,
    height: 640,
    sizes: [],
    positions: ['center'],
    fill: 'both',
    overlay: true,
    modal: true,
  },
  drawer: {
    width: 380,
    height: 640,
    sizes: [],
    positions: ['left', 'right'],
    fill: 'height',
    overlay: true,
    modal: true,
  },
  inline: {
    width: 360,
    height: 240,
    sizes: [],
    positions: ['center'],
    fill: 'none',
    overlay: false,
    modal: false,
  },
} as const satisfies Record<
  string,
  {
    width: number;
    height: number;
    sizes: readonly (readonly [string, number, number])[];
    positions: readonly PopupPosition[];
    fill: 'none' | 'width' | 'height' | 'both';
    overlay: boolean;
    modal: boolean;
  }
>;
export type PopupType = keyof typeof POPUP_TYPES;
export const POPUP_TYPE_KEYS = Object.keys(POPUP_TYPES) as [PopupType, ...PopupType[]];

/** The position a type actually uses: the stored one when it allows it, else its default. */
export function positionOf(type: PopupType, position: PopupPosition): PopupPosition {
  const allowed: readonly PopupPosition[] = POPUP_TYPES[type].positions;
  return allowed.includes(position) ? position : (allowed[allowed.length - 1] ?? 'center');
}
// #endregion types

// #region format
export const TRIGGERS = ['load', 'delay', 'scroll', 'exit', 'click'] as const;
export const FREQUENCIES = ['every', 'session', 'days', 'until'] as const;
export const AUDIENCES = ['all', 'new', 'returning'] as const;
export const PAGE_MODES = ['all', 'only', 'except'] as const;
export const ENTER_MOTIONS = ['fade', 'scale', 'up', 'side', 'none'] as const;
export const EXIT_MOTIONS = ['fade', 'down', 'none'] as const;

/** A calendar day, `2026-11-30`; empty: no limit. */
const day = () => z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/);

/** When, where and to whom the popup shows. `shouldShow` reads it. */
export const displaySchema = z.object({
  trigger: z.enum(TRIGGERS),
  /** Seconds on the page, for `delay`. */
  delay: z.number().int().min(0).max(600),
  /** Per cent of the page scrolled, for `scroll`. */
  scroll: z.number().int().min(0).max(100),
  /** The element a click on opens it, for `click`: a CSS selector, `#offer`. */
  selector: words(200),
  /** On every page, only on `rules`, or on every page but `rules`. */
  pages: z.enum(PAGE_MODES),
  /** Paths; `*` stands for any part of one: `/blog/*`. */
  rules: z.array(words(200)).max(30),
  audience: z.enum(AUDIENCES),
  /** The page's language it shows on (`sq`, `en`…); `all` for any. */
  language: z.string().regex(/^(all|[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2})$/),
  /** Every visit, once a session, once every `days` days, or until closed or filled in. */
  frequency: z.enum(FREQUENCIES),
  days: z.number().int().min(1).max(365),
  /** The first and the last day it shows, both included. */
  starts: day(),
  ends: day(),
  desktop: z.boolean(),
  mobile: z.boolean(),
  /** When two popups could show on one page, the higher number wins. */
  priority: z.number().int().min(0).max(1000),
});
export type PopupDisplay = z.infer<typeof displaySchema>;

/** How it comes and goes, and what closes it. */
export const motionSchema = z.object({
  enter: z.enum(ENTER_MOTIONS),
  /** Milliseconds the entrance takes. */
  duration: z.number().int().min(0).max(3000),
  exit: z.enum(EXIT_MOTIONS),
  /** Show the × elements. Off: they are hidden on the site. */
  closeX: z.boolean(),
  /** A click on the dimmed page closes it (types with an overlay). */
  outside: z.boolean(),
  esc: z.boolean(),
  /** Seconds until it closes by itself; 0: never. */
  autoClose: z.number().int().min(0).max(600),
});
export type PopupMotion = z.infer<typeof motionSchema>;

/** The root's props: the popup itself. */
export const popupFormatSchema = z.object({
  type: z.enum(POPUP_TYPE_KEYS),
  /** The design's size in CSS pixels. A stretched side (see `fill`) is drawn page-wide. */
  width: z.number().int().min(120).max(1600),
  height: z.number().int().min(32).max(1200),
  position: z.enum(POSITIONS),
  background: hex(),
  radius: z.number().int().min(0).max(64),
  shadow: z.enum(['none', 'soft', 'strong']),
  /** How dark the page behind gets, per cent (types with an overlay). */
  overlay: z.number().int().min(0).max(90),
  blur: z.boolean(),
  display: displaySchema,
  motion: motionSchema,
});
export type PopupFormat = z.infer<typeof popupFormatSchema>;
// #endregion format

export const popupMetaSchema = z.object({
  /** The popup's working name in the admin. */
  name: words(120),
});
export type PopupMeta = z.infer<typeof popupMetaSchema>;

/** The engine's node tree with the popup's meta. `i18n` holds the words in other languages. */
export interface PopupDocument extends EngineDocument<PopupMeta> {
  schema: typeof POPUP_SCHEMA;
}

export const defaultDisplay = (): PopupDisplay => ({
  trigger: 'delay',
  delay: 6,
  scroll: 50,
  selector: '',
  pages: 'all',
  rules: [],
  audience: 'all',
  language: 'all',
  frequency: 'days',
  days: 7,
  starts: '',
  ends: '',
  desktop: true,
  mobile: true,
  priority: 0,
});

export const defaultMotion = (): PopupMotion => ({
  enter: 'scale',
  duration: 360,
  exit: 'fade',
  closeX: true,
  outside: true,
  esc: true,
  autoClose: 0,
});

/** A type's starting format: its size and position, a light surface, the default rules. */
export function defaultFormat(type: PopupType = 'modal'): PopupFormat {
  const spec = POPUP_TYPES[type];
  return {
    type,
    width: spec.width,
    height: spec.height,
    position: positionOf(type, 'bottom-right'),
    background: spec.fill === 'width' || spec.fill === 'both' ? '#111827' : '#ffffff',
    radius: spec.fill === 'none' ? 18 : 0,
    shadow: spec.fill === 'width' ? 'soft' : 'strong',
    overlay: 45,
    blur: true,
    display: defaultDisplay(),
    motion: defaultMotion(),
  };
}

/** The popup's format: the root's props. */
export function formatOf(doc: PopupDocument): PopupFormat {
  return doc.nodes[doc.root]?.props as PopupFormat;
}

/** An empty popup of one type. */
export function createPopupDocument(
  meta: Partial<PopupMeta> = {},
  type: PopupType = 'modal',
): PopupDocument {
  return {
    schema: POPUP_SCHEMA,
    version: POPUP_VERSION,
    root: POPUP_ROOT,
    nodes: {
      [POPUP_ROOT]: {
        id: POPUP_ROOT,
        type: 'root',
        v: 1,
        props: defaultFormat(type),
        children: [],
      },
    },
    meta: { name: '', ...meta },
  };
}

export const popupShapeSchema = z.object({
  schema: z.literal(POPUP_SCHEMA),
  version: z.number().int().min(1),
  root: z.literal(POPUP_ROOT),
  nodes: z.record(z.string(), nodeShapeSchema),
  meta: popupMetaSchema,
  i18n: i18nSchema.optional(),
});
