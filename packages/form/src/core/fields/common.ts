import { error, type BuilderNode, type Issue } from '@builderset/engine';
import { z } from 'zod';

/**
 * What every field shares: how it is named in the responses (its key), its
 * label and help, whether it is required, how wide it is, when it shows
 * (logic) and what an answer must look like (checks). Each field type adds
 * its own props on top — choices, a unit, the files it takes.
 */

/** Fields sit in a step. */
export const FIELD_PARENTS = ['step'] as const;

/** A response's column name: `plate`, `first_name`. */
export const ANSWER_KEY = /^[a-z][a-z0-9_]{0,39}$/;
export const answerKey = () => z.string().regex(ANSWER_KEY);

// #region logic
/** How a rule compares an earlier answer. `empty` / `not_empty` take no value. */
export const LOGIC_OPS = ['is', 'is_not', 'contains', 'empty', 'not_empty', 'gt', 'lt'] as const;
export type LogicOp = (typeof LOGIC_OPS)[number];

export const logicRuleSchema = z.object({
  /** The key of an earlier field. */
  key: z.string().max(40),
  op: z.enum(LOGIC_OPS),
  value: z.string().max(200),
});
export type LogicRule = z.infer<typeof logicRuleSchema>;

/** "Show only when…": off, or rules that must all (or any) match. */
export const logicSchema = z.object({
  enabled: z.boolean(),
  match: z.enum(['all', 'any']),
  rules: z.array(logicRuleSchema).max(5),
});
export type FieldLogic = z.infer<typeof logicSchema>;
// #endregion logic

// #region checks
/** Formats a short answer may be held to. `custom` uses `regex`. */
export const PATTERNS = ['none', 'letters', 'digits', 'custom'] as const;
export type Pattern = (typeof PATTERNS)[number];

/**
 * What an answer must look like. Each field type uses the ones that make
 * sense for it: lengths for text, a range for numbers, how many choices for
 * multiple choice. `message` replaces the visitor-facing error.
 */
export const checksSchema = z.object({
  minLength: z.number().int().min(0).max(10_000).nullable(),
  maxLength: z.number().int().min(1).max(10_000).nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  pattern: z.enum(PATTERNS),
  regex: z.string().max(200),
  message: z.string().max(200),
});
export type FieldChecks = z.infer<typeof checksSchema>;
// #endregion checks

export const noChecks = (): FieldChecks => ({
  minLength: null,
  maxLength: null,
  min: null,
  max: null,
  pattern: 'none',
  regex: '',
  message: '',
});
export const noLogic = (): FieldLogic => ({ enabled: false, match: 'all', rules: [] });

/** Shown when, and how wide: what content blocks (a heading, a picture) share with fields. */
export const layoutShape = {
  width: z.enum(['full', 'half']),
  logic: logicSchema,
  hideFromVisitors: z.boolean(),
};
export const layoutDefaults = () => ({
  width: 'full' as const,
  logic: noLogic(),
  hideFromVisitors: false,
});

/** The props of every field that takes an answer. */
export const inputShape = {
  label: z.string().max(300),
  key: answerKey(),
  help: z.string().max(500),
  required: z.boolean(),
  /**
   * Why a template needs this field ("Valuation needs the plate"). Set: the
   * field stays required and cannot be removed or retyped; it can be reworded
   * and moved. Empty: an ordinary field.
   */
  lock: z.string().max(200),
  /** Editors cannot remove it until it is unprotected. */
  protect: z.boolean(),
  readonly: z.boolean(),
  /** The link parameter that fills it: `plate` for `?plate=AA123BC`. Empty: none. */
  prefill: z
    .string()
    .regex(/^[a-z0-9_]*$/i)
    .max(40),
  checks: checksSchema,
  ...layoutShape,
};

export function inputDefaults(label: string, key: string) {
  return {
    label,
    key,
    help: '',
    required: false,
    lock: '',
    protect: false,
    readonly: false,
    prefill: '',
    checks: noChecks(),
    ...layoutDefaults(),
  };
}

/** What every input field is checked for before the form goes live. */
export function inputIssues(
  props: { label: string; checks: FieldChecks },
  node: BuilderNode,
): Issue[] {
  const issues: Issue[] = [];
  if (!props.label.trim())
    issues.push(error('field.labelMissing', { nodeId: node.id, path: 'label' }));
  if (props.checks.pattern === 'custom') {
    try {
      new RegExp(props.checks.regex);
    } catch {
      issues.push(error('field.patternInvalid', { nodeId: node.id, path: 'checks.regex' }));
    }
  }
  return issues;
}

/** Whether a node is a field that takes an answer (it has a key). */
export function takesAnswer(node: BuilderNode): boolean {
  return typeof node.props.key === 'string';
}
