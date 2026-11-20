import {
  error,
  frameBounds,
  frameOf,
  i18nSchema,
  isPlaced,
  nodeShapeSchema,
  structuralIssues,
  translationIssues,
  unknownLocaleIssues,
  warning,
  type BuilderNode,
  type ElementRegistry,
  type Issue,
  type Localizable,
  type NodeTree,
} from '@builderset/engine';
import { z } from 'zod';

import { CARD_FIELDS, VARIABLE_TOKEN, variablesIn, type CardField } from './data';
import {
  CARD_ROOT,
  CARD_SCHEMA,
  cardMetaSchema,
  type CardDocument,
  type CardFormatProps,
} from './document';
import { SAFE_TYPES, TEXT_TYPES } from './elements';
import { formatSpec } from './formats';
import { VARIABLE_PROPS } from './fill';
import { CARD_RULES, isUnsafeCodeLink, unencodableChars } from './rules';

/**
 * `cardSchema(registry)` — is this a well-formed card of these elements?
 * Failing it means "cannot be stored".
 *
 * `checkCard(doc, registry)` — what should the person designing it know
 * before it is printed? The schema's verdict as errors, then the card's own
 * rules on every printed side: words and codes inside the safe area, type no
 * smaller than 6 pt, QR codes large enough to scan, a chip on a bank card,
 * links a phone may be sent to, variables the member data has. Printing is
 * refused while an error remains; warnings never stop it.
 */

export function cardSchema(registry: ElementRegistry) {
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
      schema: z.literal(CARD_SCHEMA),
      version: z.number().int().min(1),
      root: z.literal(CARD_ROOT),
      nodes: z.record(z.string(), nodeSchema),
      meta: cardMetaSchema,
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

/** The card's format: the root's props. */
export function formatOf(doc: CardDocument): CardFormatProps {
  return doc.nodes[doc.root]?.props as CardFormatProps;
}

/** The side node of a face, if the card has one. */
export function sideOf(doc: CardDocument, face: 'front' | 'back'): BuilderNode | undefined {
  return (doc.nodes[doc.root]?.children ?? [])
    .map((id) => doc.nodes[id])
    .find((node) => node?.type === 'side' && node.props.face === face);
}

/** The elements placed on a face, bottom to top. */
export function elementsOf(doc: CardDocument, face: 'front' | 'back'): BuilderNode[] {
  return (sideOf(doc, face)?.children ?? [])
    .map((id) => doc.nodes[id])
    .filter((node): node is BuilderNode => Boolean(node));
}

/** The faces printed: the front, and the back on a two-sided card. */
export function printedFaces(doc: CardDocument): ('front' | 'back')[] {
  return formatOf(doc).sides === 2 ? ['front', 'back'] : ['front'];
}

const TEXT = new Set<string>(TEXT_TYPES);
const SAFE = new Set<string>(SAFE_TYPES);

/** The card's own rules, on its printed sides. */
function cardIssues(doc: CardDocument, fields: readonly CardField[]): Issue[] {
  const issues: Issue[] = [];
  const format = formatOf(doc);
  const sides = (doc.nodes[doc.root]?.children ?? []).map((id) => doc.nodes[id]);
  const faces = sides.map((node) => node?.props.face);
  if (!(faces.includes('front') && faces.includes('back'))) {
    issues.push(error('card.sidesInvalid', { nodeId: doc.root }));
    return issues;
  }

  const textPaths = new Set(fields.filter((one) => one.kind === 'text').map((one) => one.path));
  const photoPaths = new Set(fields.filter((one) => one.kind === 'photo').map((one) => one.path));
  const printed = formatSpec(format.format).print;
  const safe = format.print.safe;
  const inner = {
    left: safe - CARD_RULES.tolerance,
    top: safe - CARD_RULES.tolerance,
    right: format.width - safe + CARD_RULES.tolerance,
    bottom: format.height - safe + CARD_RULES.tolerance,
  };

  for (const face of printedFaces(doc)) {
    const side = sideOf(doc, face);
    const shown = elementsOf(doc, face).filter((node) => !node.hidden);
    if (side && shown.length === 0) {
      issues.push(warning('side.empty', { nodeId: side.id, params: { face } }));
    }
    for (const node of shown) {
      const props = node.props;
      const at = { nodeId: node.id, params: { face } };
      const frame = frameOf(node);

      // A frame without a size was never placed: nothing of it is printed.
      if (!isPlaced(frame)) {
        issues.push(warning('frame.unplaced', { ...at, path: 'frame' }));
        continue;
      }
      if (printed && safe > 0 && SAFE.has(node.type)) {
        const box = frameBounds(frame);
        if (
          box.x < inner.left ||
          box.y < inner.top ||
          box.x + box.w > inner.right ||
          box.y + box.h > inner.bottom
        ) {
          issues.push(warning('card.outsideSafe', { ...at, path: 'frame' }));
        }
      }
      if (
        TEXT.has(node.type) &&
        typeof props.size === 'number' &&
        props.size < CARD_RULES.minTextPt
      ) {
        issues.push(
          warning('card.textTooSmall', {
            nodeId: node.id,
            path: 'size',
            params: { face, size: props.size },
          }),
        );
      }

      const variableProp = VARIABLE_PROPS[node.type];
      const words = variableProp ? props[variableProp] : undefined;
      if (variableProp && typeof words === 'string') {
        for (const path of new Set(variablesIn(words))) {
          if (!textPaths.has(path)) {
            issues.push(
              error('variable.unknown', { nodeId: node.id, path: variableProp, params: { path } }),
            );
          }
        }
      }

      if (node.type === 'qr' || node.type === 'barcode') {
        const data = typeof props.data === 'string' ? props.data : '';
        if (!data.trim()) issues.push(warning('code.empty', { ...at, path: 'data' }));
      }
      if (node.type === 'qr') {
        const size = Math.min(frame.w, frame.h);
        if (size < CARD_RULES.minQrMm) {
          issues.push(
            warning('card.qrTooSmall', {
              nodeId: node.id,
              path: 'frame',
              params: { face, size: Math.round(size * 10) / 10 },
            }),
          );
        }
        if (typeof props.data === 'string' && isUnsafeCodeLink(props.data)) {
          issues.push(error('url.unsafe', { nodeId: node.id, path: 'data' }));
        }
      }
      if (node.type === 'barcode' && typeof props.data === 'string') {
        const literal = props.data.replace(new RegExp(VARIABLE_TOKEN.source, 'g'), '');
        const bad = unencodableChars(literal);
        if (bad.length) {
          issues.push(
            warning('barcode.unencodable', {
              nodeId: node.id,
              path: 'data',
              params: { chars: bad.join('') },
            }),
          );
        }
      }
      if (node.type === 'photo' && typeof props.bind === 'string' && !photoPaths.has(props.bind)) {
        issues.push(
          error('variable.unknown', {
            nodeId: node.id,
            path: 'bind',
            params: { path: props.bind },
          }),
        );
      }
      if (node.type === 'image' && !props.media) {
        issues.push(warning('image.missing', { ...at, path: 'media' }));
      }
    }
  }

  if (
    format.format === 'bank' &&
    !elementsOf(doc, 'front').some((node) => node.type === 'chip' && !node.hidden)
  ) {
    issues.push(warning('card.chipMissing', { nodeId: sideOf(doc, 'front')?.id }));
  }
  if (!doc.meta.name.trim()) issues.push(warning('meta.nameMissing', { path: 'meta.name' }));
  return issues;
}

/** What a project tells the check. */
export interface CheckCardOptions {
  /** Languages outside this list are `i18n.locale.unknown` errors. Omitted: any language. */
  locales?: readonly string[] | undefined;
  /** The member fields a card may use. Default: `CARD_FIELDS`. */
  fields?: readonly CardField[] | undefined;
}

export function checkCard(
  doc: CardDocument,
  registry: ElementRegistry,
  options: CheckCardOptions = {},
): Issue[] {
  const parsed = cardSchema(registry).safeParse(doc);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => {
      const [first, nodeId, , ...rest] = issue.path.map(String);
      if (first === 'i18n' && issue.code === 'custom') {
        // A translation that would not be a valid card in its language.
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
  issues.push(...cardIssues(doc, options.fields ?? CARD_FIELDS));
  if (options.locales) issues.push(...unknownLocaleIssues(doc, options.locales));
  return issues;
}

/** The card, if the stored value is one; null otherwise. */
export function parseCard(raw: unknown, registry: ElementRegistry): CardDocument | null {
  if (!cardSchema(registry).safeParse(raw).success) return null;
  // The schema accepted it, so it has the card's shape; the stored object is
  // kept as it is rather than the schema's copy of it.
  return raw as CardDocument;
}

/**
 * What a saved draft may still contain before it is printed: a variable the
 * member data does not have yet, a language not yet allowed. What a draft may
 * never contain is a malformed tree or a link a phone should not open.
 */
export const CARD_DRAFT_TOLERATES: readonly string[] = ['variable.unknown', 'i18n.locale.unknown'];

/** Whether this issue stops a card's draft from being saved. */
export function isDraftBlocking(issue: Issue): boolean {
  return issue.severity === 'error' && !CARD_DRAFT_TOLERATES.includes(issue.code);
}

/** Whether this issue stops a card from being printed. */
export function isPrintBlocking(issue: Issue): boolean {
  return issue.severity === 'error';
}
