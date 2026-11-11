import {
  documentLocales,
  error,
  i18nSchema,
  localize,
  nodeShapeSchema,
  structuralIssues,
  translationIssues,
  warning,
  type BuilderNode,
  type ElementRegistry,
  type Issue,
  type Localizable,
  type NodeTree,
  unknownLocaleIssues,
} from '@motors/engine';
import { z } from 'zod';

import { ROW_LAYOUTS, type RowLayout } from './blocks/structure';
import {
  EMAIL_ROOT,
  EMAIL_SCHEMA,
  emailMetaSchema,
  emailSettingsSchema,
  type EmailDocument,
} from './document';
import { isSafeTemplateUrl } from './fields';
import { EMAIL_LIMITS } from './limits';
import { variableOf, type EmailRichText } from './rich-text';
import { tokensIn, variablesOf, type EmailType } from './variables';

/**
 * `emailSchema(registry)` — is this a well-formed email of these blocks? What
 * the JSON Schema export and the server mirror; failing it means "cannot be
 * stored".
 *
 * `checkEmail(doc, registry, type)` — what should the designer know? The
 * schema's verdict as errors, plus the email-specific rules: variables the
 * type does not have, a row whose columns do not match its layout, a
 * marketing email with no way to unsubscribe. Activation is refused while an
 * error remains.
 */

export function emailSchema(registry: ElementRegistry) {
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
      schema: z.literal(EMAIL_SCHEMA),
      version: z.number().int().min(1),
      root: z.literal(EMAIL_ROOT),
      nodes: z.record(z.string(), nodeSchema),
      meta: emailMetaSchema,
      settings: emailSettingsSchema,
      i18n: i18nSchema.optional(),
    })
    .superRefine((doc, ctx) => {
      // zod infers the nodes as `{ type }` only — the union above is cast to
      // satisfy `discriminatedUnion` — so the tree is named for what it is.
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

/** Every string in a value, with its dot path — to find `{{ … }}` in props. */
function* strings(value: unknown, path = ''): Generator<[string, string]> {
  if (typeof value === 'string') {
    yield [path, value];
  } else if (Array.isArray(value)) {
    for (const [index, item] of value.entries())
      yield* strings(item, path ? `${path}.${String(index)}` : String(index));
  } else if (value && typeof value === 'object') {
    // A variable run's text is only its label; the run itself is counted by
    // `variableRuns`, and reading its text here would count it twice.
    if ('marks' in value && Array.isArray(value.marks) && value.marks.some(isVariableMark)) return;
    for (const [key, item] of Object.entries(value))
      yield* strings(item, path ? `${path}.${key}` : key);
  }
}

function isVariableMark(mark: unknown): boolean {
  return !!mark && typeof mark === 'object' && (mark as { type?: unknown }).type === 'variable';
}

/** Every rich-text run with a variable, in a node's props. */
function* variableRuns(value: unknown, path = ''): Generator<[string, string]> {
  if (Array.isArray(value)) {
    const looksRich = value.every(
      (item) => item && typeof item === 'object' && 'text' in (item as object),
    );
    if (looksRich) {
      for (const run of value as EmailRichText) {
        const mark = variableOf(run);
        if (mark) yield [path, mark.path];
      }
    }
    for (const [index, item] of value.entries()) {
      if (item && typeof item === 'object') {
        yield* variableRuns(item, path ? `${path}.${String(index)}` : String(index));
      }
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      yield* variableRuns(item, path ? `${path}.${key}` : key);
    }
  }
}

/** Every variable path a document uses: `[path, nodeId, propPath]`. */
export function variableUses(
  doc: EmailDocument,
): { path: string; nodeId?: string; prop: string }[] {
  const uses: { path: string; nodeId?: string; prop: string }[] = [];
  for (const [prop, text] of [
    ['meta.subject', doc.meta.subject],
    ['meta.preheader', doc.meta.preheader],
  ] as const) {
    for (const token of tokensIn(text)) uses.push({ path: token.path, prop });
  }
  for (const node of Object.values(doc.nodes)) {
    for (const [prop, text] of strings(node.props)) {
      for (const token of tokensIn(text)) uses.push({ path: token.path, nodeId: node.id, prop });
    }
    for (const [prop, path] of variableRuns(node.props)) uses.push({ path, nodeId: node.id, prop });
  }
  return uses;
}

function rowIssues(node: BuilderNode): Issue[] {
  if (node.type !== 'row') return [];
  const layout = ROW_LAYOUTS[node.props.layout as RowLayout] as readonly number[] | undefined;
  const count = node.children?.length ?? 0;
  return layout && layout.length !== count
    ? [
        error('row.columnsMismatch', {
          nodeId: node.id,
          path: 'layout',
          params: { expected: layout.length, actual: count },
        }),
      ]
    : [];
}

/** What a project tells the check: the languages its designs may be written in. */
export interface CheckEmailOptions {
  /** Languages outside this list are `i18n.locale.unknown` errors. Omitted: any language. */
  locales?: readonly string[] | undefined;
}

export function checkEmail(
  doc: EmailDocument,
  registry: ElementRegistry,
  type?: EmailType | null,
  options: CheckEmailOptions = {},
): Issue[] {
  const parsed = emailSchema(registry).safeParse(doc);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const [first, nodeId, , ...rest] = issue.path.map(String);
      const unknownType = !!nodeId && !registry.has(doc.nodes[nodeId]?.type ?? '');
      if (first === 'i18n' && issue.code === 'custom') {
        // A translation that would not be a valid email in its language.
        return error('props.invalid', {
          ...(nodeId ? { nodeId } : {}),
          path: issue.path.slice(2).map(String).join('.'),
        });
      }
      return first === 'nodes' && nodeId
        ? error(
            unknownType
              ? 'element.unknown'
              : issue.code === 'custom'
                ? issue.message
                : 'props.invalid',
            {
              nodeId,
              ...(rest.length ? { path: rest.join('.') } : {}),
            },
          )
        : error('document.malformed', { path: issue.path.join('.') });
    });
    return issues;
  }

  const issues: Issue[] = [];
  if (Object.keys(doc.nodes).length > EMAIL_LIMITS.nodes) {
    issues.push(error('document.tooManyNodes', { params: { max: EMAIL_LIMITS.nodes } }));
  }
  for (const node of Object.values(doc.nodes)) {
    const definition = registry.get(node.type);
    if (!definition) continue;
    issues.push(...rowIssues(node));
    issues.push(...(definition.check?.(node.props, { node, document: doc }) ?? []));
    for (const link of definition.links?.(node.props) ?? []) {
      if (link && link !== 'https://' && !isSafeTemplateUrl(link)) {
        issues.push(error('url.unsafe', { nodeId: node.id }));
      }
    }
  }

  if (!doc.meta.subject.trim()) issues.push(error('meta.subjectMissing', { path: 'meta.subject' }));
  if (!doc.meta.preheader.trim()) {
    issues.push(warning('meta.preheaderMissing', { path: 'meta.preheader' }));
  }

  if (type) issues.push(...typeIssues(doc, type));
  issues.push(...languageIssues(doc, type));
  if (options.locales) issues.push(...unknownLocaleIssues(doc, options.locales));
  return issues;
}

/**
 * Each language must still be a whole email: a subject, and — for its type —
 * only the variables it has and every one it must use. Reported once per
 * language, and only where the language differs from the base.
 */
function languageIssues(doc: EmailDocument, type?: EmailType | null): Issue[] {
  const issues: Issue[] = [];
  const base = new Set(
    (type ? typeIssues(doc, type) : []).map(
      (issue) => `${issue.code}:${JSON.stringify(issue.params)}`,
    ),
  );
  for (const locale of documentLocales(doc).slice(1)) {
    const view = localize(doc, locale);
    if (view === doc) continue;
    if (!view.meta.subject.trim()) {
      issues.push(error('meta.subjectMissing', { path: 'meta.subject', params: { locale } }));
    }
    for (const issue of type ? typeIssues(view, type) : []) {
      if (base.has(`${issue.code}:${JSON.stringify(issue.params)}`)) continue;
      issues.push({ ...issue, params: { ...issue.params, locale } });
    }
  }
  return issues;
}

/** The rules that depend on what the email is FOR. */
export function typeIssues(doc: EmailDocument, type: EmailType): Issue[] {
  const issues: Issue[] = [];
  const known = new Set(variablesOf(type).map((variable) => variable.path));
  const loops = Object.values(doc.nodes).some(
    (node) => node.type === 'repeat' || node.type === 'line-items',
  );
  const used = variableUses(doc);
  for (const use of used) {
    const inLoop = use.path.startsWith('item.') && loops;
    if (!known.has(use.path) && !inLoop && use.path !== 'now') {
      issues.push(
        error('variable.unknown', {
          ...(use.nodeId ? { nodeId: use.nodeId } : {}),
          path: use.prop,
          params: { variable: use.path },
        }),
      );
    }
  }
  const usedPaths = new Set(used.map((use) => use.path));
  for (const path of type.mustUse ?? []) {
    if (!usedPaths.has(path))
      issues.push(error('variable.mustUse', { params: { variable: path } }));
  }
  if (type.kind === 'marketing') {
    const unsubscribes = Object.values(doc.nodes).some(
      (node) =>
        (node.type === 'footer' && node.props.showUnsubscribe === true) ||
        usedPaths.has('links.unsubscribe'),
    );
    if (!unsubscribes) issues.push(error('compliance.unsubscribeMissing'));
  }
  return issues;
}

/**
 * A stored email read back: the document when it is a valid email of these
 * elements, otherwise null. What the editor's crash-safety copy and a host
 * loading a template both use.
 */
export function parseEmail(raw: unknown, registry: ElementRegistry): EmailDocument | null {
  if (!emailSchema(registry).safeParse(raw).success) return null;
  // The schema accepted it, so it has the email's shape; the stored object is
  // kept as it is rather than the schema's copy of it.
  return raw as EmailDocument;
}
