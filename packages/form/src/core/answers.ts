import type { BuilderNode } from '@builderset/engine';

import type { FormDocument } from './document';
import {
  answerKindOf,
  takesAnswer,
  type FieldChecks,
  type FieldLogic,
  type LogicRule,
} from './fields';

/**
 * The answers a visitor sends, checked the way the form says: which fields
 * show (logic), which must be answered, and what each answer must look like.
 *
 * Plain TypeScript, no DOM: the renderer checks a step before moving on, and
 * the server checks the whole submission again with the same function —
 * the browser's word is never taken for it.
 */

export type Answers = Record<string, unknown>;

/** A field of the form, with the step it is on. */
export interface FormField {
  node: BuilderNode;
  step: BuilderNode;
  stepIndex: number;
}

/** The steps, in order. */
export function stepsOf(doc: FormDocument): BuilderNode[] {
  return (doc.nodes[doc.root]?.children ?? [])
    .map((id) => doc.nodes[id])
    .filter((node): node is BuilderNode => node?.type === 'step');
}

/** Every field and block, step by step, in order. */
export function formFields(doc: FormDocument): FormField[] {
  return stepsOf(doc).flatMap((step, stepIndex) =>
    (step.children ?? [])
      .map((id) => doc.nodes[id])
      .filter((node): node is BuilderNode => !!node)
      .map((node) => ({ node, step, stepIndex })),
  );
}

// #region logic
function asText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(asText).join(', ');
  if (typeof value === 'object') return Object.values(value).map(asText).join(' ').trim();
  return '';
}

/** Whether one rule holds for the answers given so far. */
export function ruleMatches(rule: LogicRule, answers: Answers): boolean {
  const answer = answers[rule.key];
  const text = asText(answer);
  switch (rule.op) {
    case 'is':
      return Array.isArray(answer) ? answer.includes(rule.value) : text === rule.value;
    case 'is_not':
      return Array.isArray(answer) ? !answer.includes(rule.value) : text !== rule.value;
    case 'contains':
      return text.toLowerCase().includes(rule.value.toLowerCase());
    case 'empty':
      return isEmpty(answer);
    case 'not_empty':
      return !isEmpty(answer);
    case 'gt':
      return Number(text) > Number(rule.value);
    case 'lt':
      return Number(text) < Number(rule.value);
  }
}

/** Whether a field shows, given the answers so far. Its logic off: always. */
export function isShown(props: { logic?: FieldLogic | undefined }, answers: Answers): boolean {
  const logic = props.logic;
  if (!logic?.enabled || logic.rules.length === 0) return true;
  return logic.match === 'all'
    ? logic.rules.every((rule) => ruleMatches(rule, answers))
    : logic.rules.some((rule) => ruleMatches(rule, answers));
}
// #endregion logic

// #region errors
/** Why an answer is refused. The renderer words them; `limit` fills "at least {limit}". */
export type AnswerErrorCode =
  | 'required'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'time'
  | 'tooShort'
  | 'tooLong'
  | 'tooLow'
  | 'tooHigh'
  | 'letters'
  | 'digits'
  | 'pattern'
  | 'choice'
  | 'tooFewChoices'
  | 'tooManyChoices'
  | 'tooManyFiles'
  | 'fileType'
  | 'fileTooBig';

export interface AnswerError {
  code: AnswerErrorCode;
  limit?: number | undefined;
  /** The form's own words for this field's errors (`checks.message`), when it has them. */
  message?: string | undefined;
}
// #endregion errors

/** No answer: nothing, an empty string, no choice, an unticked box, a blank name. */
export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.values(value).every(isEmpty);
  return false;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{6,24}$/;
const LETTERS = /^[\p{L}\s'’-]+$/u;
const DIGITS = /^\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

interface FileAnswer {
  name: string;
  size?: number | undefined;
}

function textChecks(text: string, checks: FieldChecks): AnswerError | null {
  if (checks.minLength !== null && text.length < checks.minLength) {
    return { code: 'tooShort', limit: checks.minLength };
  }
  if (checks.maxLength !== null && text.length > checks.maxLength) {
    return { code: 'tooLong', limit: checks.maxLength };
  }
  if (checks.pattern === 'letters' && !LETTERS.test(text)) return { code: 'letters' };
  if (checks.pattern === 'digits' && !DIGITS.test(text)) return { code: 'digits' };
  if (checks.pattern === 'custom' && checks.regex) {
    try {
      if (!new RegExp(checks.regex).test(text)) return { code: 'pattern' };
    } catch {
      // A broken pattern is the designer's mistake, reported before publishing.
    }
  }
  return null;
}

function rangeChecks(value: number, min: number | null, max: number | null): AnswerError | null {
  if (min !== null && value < min) return { code: 'tooLow', limit: min };
  if (max !== null && value > max) return { code: 'tooHigh', limit: max };
  return null;
}

/**
 * The first thing wrong with one answer, or null. `props` are the field's;
 * a field that does not show is never checked (see `validateAnswers`).
 */
export function checkAnswer(
  type: string,
  props: Record<string, unknown>,
  value: unknown,
): AnswerError | null {
  const checks = props.checks as FieldChecks | undefined;
  const required = props.required === true && props.hideFromVisitors !== true;
  const withMessage = (found: AnswerError | null): AnswerError | null =>
    found && checks?.message ? { ...found, message: checks.message } : found;

  if (isEmpty(value)) return required ? withMessage({ code: 'required' }) : null;

  switch (answerKindOf(type)) {
    case 'text': {
      const text = asText(value).trim();
      if (type === 'email' && !EMAIL.test(text)) return withMessage({ code: 'email' });
      if (type === 'phone' && !PHONE.test(text)) return withMessage({ code: 'phone' });
      if (type === 'date' && !DATE.test(text)) return withMessage({ code: 'date' });
      if (type === 'time' && !TIME.test(text)) return withMessage({ code: 'time' });
      if (type === 'select' || type === 'radio') {
        const options = props.options as string[];
        if (!options.includes(text)) return withMessage({ code: 'choice' });
        return null;
      }
      if (type === 'yes-no' && text !== 'yes' && text !== 'no')
        return withMessage({ code: 'choice' });
      return checks ? withMessage(textChecks(text, checks)) : null;
    }
    case 'number': {
      const number = typeof value === 'number' ? value : Number(asText(value).replace(/\s/g, ''));
      if (!Number.isFinite(number)) return withMessage({ code: 'number' });
      if (type === 'rating') return withMessage(rangeChecks(number, 1, props.stars as number));
      if (type === 'scale') {
        return withMessage(rangeChecks(number, props.from as number, props.to as number));
      }
      if (type === 'slider') {
        return withMessage(rangeChecks(number, props.min as number, props.max as number));
      }
      return checks ? withMessage(rangeChecks(number, checks.min, checks.max)) : null;
    }
    case 'list': {
      if (!Array.isArray(value)) return withMessage({ code: 'choice' });
      const options = props.options as string[];
      if (value.some((item) => typeof item !== 'string' || !options.includes(item))) {
        return withMessage({ code: 'choice' });
      }
      if (checks?.min !== null && checks?.min !== undefined && value.length < checks.min) {
        return withMessage({ code: 'tooFewChoices', limit: checks.min });
      }
      if (checks?.max !== null && checks?.max !== undefined && value.length > checks.max) {
        return withMessage({ code: 'tooManyChoices', limit: checks.max });
      }
      return null;
    }
    case 'name': {
      const name = value as { first?: unknown; last?: unknown };
      return required && isEmpty(name.first) ? withMessage({ code: 'required' }) : null;
    }
    case 'address': {
      const address = value as { street?: unknown; city?: unknown };
      return required && (isEmpty(address.street) || isEmpty(address.city))
        ? withMessage({ code: 'required' })
        : null;
    }
    case 'boolean':
      return value === true ? null : withMessage({ code: 'required' });
    case 'files': {
      if (!Array.isArray(value)) return withMessage({ code: 'required' });
      const files = value as FileAnswer[];
      if (files.length > (props.maxFiles as number)) {
        return withMessage({ code: 'tooManyFiles', limit: props.maxFiles as number });
      }
      const accept = props.accept as string[];
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (accept.length && !accept.includes(extension)) return withMessage({ code: 'fileType' });
        if (file.size !== undefined && file.size > (props.maxMb as number) * 1024 * 1024) {
          return withMessage({ code: 'fileTooBig', limit: props.maxMb as number });
        }
      }
      return null;
    }
    case 'none':
      return null;
  }
}

/** What `validateAnswers` decided. */
export interface AnswersResult {
  ok: boolean;
  /** By field key, the first thing wrong with its answer. */
  errors: Record<string, AnswerError>;
  /** The answers to keep: shown fields only, numbers as numbers, nothing the form does not ask. */
  values: Answers;
}

/**
 * Check a submission against the form. With `step`, only that step's fields
 * (the renderer's "Continue"); without, every step (the server).
 *
 * Fields hidden by logic are skipped and their answers dropped: a question
 * the visitor never saw cannot be required, and its stale answer is not kept.
 */
export function validateAnswers(
  doc: FormDocument,
  answers: Answers,
  options: { step?: number | undefined } = {},
): AnswersResult {
  const errors: Record<string, AnswerError> = {};
  const values: Answers = {};
  for (const { node, stepIndex } of formFields(doc)) {
    if (options.step !== undefined && stepIndex !== options.step) continue;
    if (!takesAnswer(node)) continue;
    const key = node.props.key as string;
    // Logic reads the answers as sent; hidden fields' answers are kept as they are.
    if (node.type !== 'hidden' && !isShown(node.props, answers)) continue;
    const value = answers[key];
    const found = node.type === 'hidden' ? null : checkAnswer(node.type, node.props, value);
    if (found) {
      errors[key] = found;
      continue;
    }
    if (isEmpty(value)) continue;
    values[key] =
      answerKindOf(node.type) === 'number' && typeof value === 'string'
        ? Number(value.replace(/\s/g, ''))
        : value;
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}
