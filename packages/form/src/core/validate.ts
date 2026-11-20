import {
  error,
  i18nSchema,
  nodeShapeSchema,
  structuralIssues,
  translationIssues,
  unknownLocaleIssues,
  warning,
  type ElementRegistry,
  type Issue,
  type Localizable,
  type NodeTree,
} from '@builderset/engine';
import { z } from 'zod';

import { formFields } from './answers';
import {
  FORM_ROOT,
  FORM_SCHEMA,
  formMetaSchema,
  formSettingsSchema,
  type FormDocument,
} from './document';
import { takesAnswer, type FieldLogic } from './fields';

/**
 * `formSchema(registry)` — is this a well-formed form of these fields? Failing
 * it means "cannot be stored".
 *
 * `checkForm(doc, registry)` — what should the person building it know before
 * it goes live? The schema's verdict as errors, each field's own checks, and
 * the form's rules: two fields saving to the same key, an auto-reply with no
 * email to send it to, personal data asked without consent. Publishing is
 * refused while an error remains; warnings never stop it.
 */

export function formSchema(registry: ElementRegistry) {
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
      schema: z.literal(FORM_SCHEMA),
      version: z.number().int().min(1),
      root: z.literal(FORM_ROOT),
      nodes: z.record(z.string(), nodeSchema),
      meta: formMetaSchema,
      settings: formSettingsSchema,
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

/** Field types that hold personal data: asking for them calls for consent. */
const PERSONAL = new Set(['name', 'email', 'phone', 'address']);

/** The form's own rules, across fields and settings. */
function formIssues(doc: FormDocument): Issue[] {
  const issues: Issue[] = [];
  const fields = formFields(doc);
  const inputs = fields.filter(({ node }) => takesAnswer(node));

  // Every answer needs its own column.
  const seen = new Set<string>();
  for (const { node } of inputs) {
    const key = node.props.key as string;
    if (seen.has(key)) {
      issues.push(error('field.keyDuplicate', { nodeId: node.id, path: 'key', params: { key } }));
    }
    seen.add(key);
  }

  // Logic may only read answers given before the field.
  const before = new Set<string>();
  for (const { node } of fields) {
    const logic = node.props.logic as FieldLogic | undefined;
    if (logic?.enabled) {
      for (const rule of logic.rules) {
        if (!before.has(rule.key)) {
          issues.push(
            warning('logic.unknownField', {
              nodeId: node.id,
              path: 'logic',
              params: { key: rule.key },
            }),
          );
        }
      }
    }
    if (takesAnswer(node)) before.add(node.props.key as string);
  }

  const settings = doc.settings;
  if (settings.autoReply.enabled) {
    const target = inputs.find(({ node }) => node.props.key === settings.autoReply.to);
    if (target?.node.type !== 'email') {
      issues.push(error('autoReply.noEmailField', { path: 'settings.autoReply.to' }));
    }
  }
  if (settings.after.mode !== 'message' && !settings.after.redirectUrl.trim()) {
    issues.push(error('after.redirectMissing', { path: 'settings.after.redirectUrl' }));
  }
  if (settings.notify.enabled && settings.notify.recipients.length === 0) {
    issues.push(warning('notify.noRecipients', { path: 'settings.notify.recipients' }));
  }
  if (
    inputs.some(({ node }) => PERSONAL.has(node.type)) &&
    !inputs.some(({ node }) => node.type === 'consent')
  ) {
    issues.push(warning('consent.missing'));
  }
  if (settings.spam.captcha === 'off' && !settings.spam.honeypot) {
    issues.push(warning('spam.none', { path: 'settings.spam' }));
  }
  if (!doc.meta.title.trim()) issues.push(warning('meta.titleMissing', { path: 'meta.title' }));
  if (inputs.length === 0) issues.push(error('form.noFields'));
  return issues;
}

/** What a project tells the check: the languages its forms may be written in. */
export interface CheckFormOptions {
  /** Languages outside this list are `i18n.locale.unknown` errors. Omitted: any language. */
  locales?: readonly string[] | undefined;
}

export function checkForm(
  doc: FormDocument,
  registry: ElementRegistry,
  options: CheckFormOptions = {},
): Issue[] {
  const parsed = formSchema(registry).safeParse(doc);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => {
      const [first, nodeId, , ...rest] = issue.path.map(String);
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
  issues.push(...formIssues(doc));
  if (options.locales) issues.push(...unknownLocaleIssues(doc, options.locales));
  return issues;
}

/** The form, if the stored value is one; null otherwise. */
export function parseForm(raw: unknown, registry: ElementRegistry): FormDocument | null {
  if (!formSchema(registry).safeParse(raw).success) return null;
  // The schema accepted it, so it has the form's shape; the stored object is
  // kept as it is rather than the schema's copy of it.
  return raw as FormDocument;
}

/**
 * What a saved draft may still contain before it goes live: an empty form, a
 * missing title. What a draft may never contain is a malformed tree. Going
 * live checks strictly: every error blocks it, warnings never do.
 */
export const FORM_DRAFT_TOLERATES: readonly string[] = [
  'form.noFields',
  'field.labelMissing',
  'field.optionsMissing',
  'field.keyDuplicate',
  'autoReply.noEmailField',
  'after.redirectMissing',
  'consent.textMissing',
  'i18n.locale.unknown',
];

/** Whether this issue stops a form's draft from being saved. */
export function isDraftBlocking(issue: Issue): boolean {
  return issue.severity === 'error' && !FORM_DRAFT_TOLERATES.includes(issue.code);
}

/** Whether this issue stops a form from going live. */
export function isPublishBlocking(issue: Issue): boolean {
  return issue.severity === 'error';
}
