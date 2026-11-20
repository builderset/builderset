import {
  error,
  frameOf,
  i18nSchema,
  nodeShapeSchema,
  richTextToPlain,
  structuralIssues,
  translationIssues,
  unknownLocaleIssues,
  warning,
  type BuilderNode,
  type ElementRegistry,
  type Issue,
  type Localizable,
  type NodeTree,
  type RichText,
} from '@builderset/engine';
import { z } from 'zod';

import {
  formatOf,
  POPUP_ROOT,
  POPUP_SCHEMA,
  POPUP_TYPES,
  popupMetaSchema,
  type PopupDocument,
  type PopupFormat,
} from './document';
import { POPUP_FIELDS, variablesIn } from './variables';

/**
 * `popupSchema(registry)` — is this a well-formed popup of these elements?
 * Failing it means "cannot be stored".
 *
 * `checkPopup(doc, registry)` — what should the person building it know
 * before it goes live? The schema's verdict as errors, each element's own
 * checks, and the popup's rules: a way to close it, inputs with names of
 * their own, display rules that can ever match, and the gentler warnings
 * (shown on every visit, a modal the moment the page opens). Publishing is
 * refused while an error remains; warnings never stop it.
 *
 * `popupTips(doc)` — notes that are neither: what happens on a phone.
 */

export function popupSchema(registry: ElementRegistry) {
  const variants = registry
    .all()
    .map((definition) =>
      nodeShapeSchema.extend({ type: z.literal(definition.type), props: definition.schema }),
    );
  const nodeSchema = z.discriminatedUnion(
    'type',
    variants as unknown as [
      z.ZodObject<{ type: z.ZodLiteral<string> }>,
      ...z.ZodObject<{ type: z.ZodLiteral<string> }>[],
    ],
  );
  return z
    .object({
      schema: z.literal(POPUP_SCHEMA),
      version: z.number().int().min(1),
      root: z.literal(POPUP_ROOT),
      nodes: z.record(z.string(), nodeSchema),
      meta: popupMetaSchema,
      i18n: i18nSchema.optional(),
    })
    .superRefine((doc, ctx) => {
      for (const issue of structuralIssues(doc as unknown as NodeTree, registry)) {
        ctx.addIssue({ code: 'custom', message: issue.code, path: ['nodes', issue.nodeId ?? ''] });
      }
      for (const issue of translationIssues(doc as unknown as Localizable, registry)) {
        ctx.addIssue({
          code: 'custom',
          message: issue.code,
          path: ['i18n', issue.nodeId ?? '', issue.path ?? ''],
        });
      }
    });
}

/** The popup's elements, in stacking order (last on top). */
export function elementsOf(doc: PopupDocument): BuilderNode[] {
  return (doc.nodes[doc.root]?.children ?? [])
    .map((id) => doc.nodes[id])
    .filter((node): node is BuilderNode => node !== undefined);
}

/** The words a visitor reads in an element, variables included. */
function wordsOf(node: BuilderNode): string {
  const text = node.props.text;
  if (Array.isArray(text)) return richTextToPlain(text as RichText);
  if (node.type === 'qr' && typeof node.props.data === 'string') return node.props.data;
  return '';
}

/** Whether a type of popup dims the page behind it, where a click outside it lands. */
export const hasOverlay = (format: PopupFormat): boolean => POPUP_TYPES[format.type].overlay;

/** Whether a visitor can close it: a × shown, a "close" click, the page behind, or Esc. */
export function canClose(doc: PopupDocument): boolean {
  const format = formatOf(doc);
  const shown = elementsOf(doc).filter((node) => !node.hidden);
  return (
    (format.motion.closeX && shown.some((node) => node.type === 'close')) ||
    shown.some((node) => node.props.action === 'close') ||
    (hasOverlay(format) && format.motion.outside) ||
    format.motion.esc
  );
}

/** A display rule a path can match: a path, `*` for any part, no spaces, no query or hash. */
const RULE = /^\/?[^\s?#]*$/;

/** The popup's own rules, across its elements and its format. */
function popupIssues(doc: PopupDocument, variables: readonly string[]): Issue[] {
  const issues: Issue[] = [];
  const format = formatOf(doc);
  const display = format.display;
  const elements = elementsOf(doc);
  const shown = elements.filter((node) => !node.hidden);

  if (shown.length === 0) issues.push(error('popup.empty'));
  if (format.type !== 'inline' && !canClose(doc)) {
    issues.push(error('popup.noClose', { path: 'motion' }));
  }

  // One answer, one name: a second input with the same name would be lost.
  const names = new Set<string>();
  for (const node of shown) {
    if (node.type !== 'input' || !node.props.name) continue;
    const name = node.props.name as string;
    if (names.has(name)) {
      issues.push(
        error('input.nameDuplicate', { nodeId: node.id, path: 'name', params: { name } }),
      );
    }
    names.add(name);
  }
  if (
    shown.some((node) => node.type === 'input') &&
    !shown.some((node) => node.type === 'button' && node.props.action === 'submit')
  ) {
    issues.push(warning('input.noSubmit'));
  }

  const known = new Set(variables);
  for (const node of shown) {
    for (const path of variablesIn(wordsOf(node))) {
      if (!known.has(path)) {
        issues.push(warning('variable.unknown', { nodeId: node.id, params: { path } }));
      }
    }
    const frame = frameOf(node);
    // Nothing of it is inside the popup: a visitor never sees it.
    if (
      frame.x >= format.width ||
      frame.y >= format.height ||
      frame.x + frame.w <= 0 ||
      frame.y + frame.h <= 0
    ) {
      issues.push(warning('element.outside', { nodeId: node.id, path: 'frame' }));
    }
  }

  if (!display.desktop && !display.mobile) {
    issues.push(error('display.noDevice', { path: 'display' }));
  }
  if (display.trigger === 'click' && !display.selector.trim()) {
    issues.push(error('display.selectorMissing', { path: 'display.selector' }));
  }
  if (display.pages === 'only' && !display.rules.some((rule) => rule.trim())) {
    issues.push(error('display.pagesMissing', { path: 'display.rules' }));
  }
  display.rules.forEach((rule, index) => {
    if (rule.trim() && !RULE.test(rule.trim())) {
      issues.push(
        error('display.ruleInvalid', { path: `display.rules.${String(index)}`, params: { rule } }),
      );
    }
  });
  if (display.starts && display.ends && display.ends < display.starts) {
    issues.push(error('display.datesInvalid', { path: 'display.ends' }));
  }
  if (display.frequency === 'every' && format.type !== 'inline') {
    issues.push(warning('display.everyVisit', { path: 'display.frequency' }));
  }
  // Google ranks pages lower when a popup covers the content the moment it opens.
  if ((format.type === 'modal' || format.type === 'fullscreen') && display.trigger === 'load') {
    issues.push(warning('display.interstitial', { path: 'display.trigger' }));
  }
  return issues;
}

/** What a project tells the check: its languages and its variables. */
export interface CheckPopupOptions {
  /** Languages outside this list are `i18n.locale.unknown` errors. Omitted: any language. */
  locales?: readonly string[] | undefined;
  /** The variable paths the project fills in. Omitted: `POPUP_FIELDS`'. */
  variables?: readonly string[] | undefined;
}

export function checkPopup(
  doc: PopupDocument,
  registry: ElementRegistry,
  options: CheckPopupOptions = {},
): Issue[] {
  const parsed = popupSchema(registry).safeParse(doc);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => {
      const [first, nodeId, , ...rest] = issue.path.map(String);
      if (first === 'i18n' && issue.code === 'custom') {
        return error('props.invalid', {
          ...(nodeId ? { nodeId } : {}),
          path: issue.path.slice(2).map(String).join('.'),
        });
      }
      if (first === 'nodes' && nodeId) {
        const unknownType = !registry.has(doc.nodes[nodeId]?.type ?? '');
        return error(
          unknownType
            ? 'element.unknown'
            : issue.code === 'custom'
              ? issue.message
              : 'props.invalid',
          { nodeId, ...(rest.length ? { path: rest.join('.') } : {}) },
        );
      }
      return error('document.malformed', { path: issue.path.join('.') });
    });
  }

  const issues: Issue[] = [];
  for (const node of Object.values(doc.nodes)) {
    const definition = registry.get(node.type);
    issues.push(...(definition?.check?.(node.props, { node, document: doc }) ?? []));
  }
  issues.push(...popupIssues(doc, options.variables ?? POPUP_FIELDS.map((field) => field.path)));
  if (options.locales) issues.push(...unknownLocaleIssues(doc, options.locales));
  return issues;
}

/** The popup, if the stored value is one; null otherwise. */
export function parsePopup(raw: unknown, registry: ElementRegistry): PopupDocument | null {
  if (!popupSchema(registry).safeParse(raw).success) return null;
  // The schema accepted it, so it has the popup's shape; the stored object is
  // kept as it is rather than the schema's copy of it.
  return raw as PopupDocument;
}

/** The widest a popup is drawn on a phone before it is scaled down: a 390 px screen, 16 px each side. */
export const PHONE_WIDTH = 358;

/** A note for the person building it: neither an error nor a warning. */
export interface PopupTip {
  code: string;
  params?: Record<string, string | number> | undefined;
}

/** What happens to this popup that is worth knowing, but nothing to fix. */
export function popupTips(doc: PopupDocument): PopupTip[] {
  const format = formatOf(doc);
  const tips: PopupTip[] = [];
  if (format.display.mobile && format.width > PHONE_WIDTH) {
    tips.push({ code: 'popup.scaledOnPhones', params: { width: format.width } });
  }
  return tips;
}

/**
 * What a saved draft may still contain before it goes live: an empty popup,
 * a button without its link yet, a rule half typed. What a draft may never
 * contain is a malformed tree or an unsafe link. Going live checks strictly:
 * every error blocks it, warnings never do.
 */
export const POPUP_DRAFT_TOLERATES: readonly string[] = [
  'popup.empty',
  'popup.noClose',
  'action.linkMissing',
  'input.nameMissing',
  'input.nameDuplicate',
  'display.noDevice',
  'display.selectorMissing',
  'display.pagesMissing',
  'display.ruleInvalid',
  'display.datesInvalid',
  'i18n.locale.unknown',
];

/** Whether this issue stops a popup's draft from being saved. */
export function isDraftBlocking(issue: Issue): boolean {
  return issue.severity === 'error' && !POPUP_DRAFT_TOLERATES.includes(issue.code);
}

/** Whether this issue stops a popup from going live. */
export function isPublishBlocking(issue: Issue): boolean {
  return issue.severity === 'error';
}
