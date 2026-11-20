import type { BuilderNode } from '@builderset/engine';

import type { PopupDocument } from './document';
import type { InputKind } from './elements';

/**
 * What a visitor sends from a popup's inputs, checked the way the popup says:
 * which inputs it has, which are required, what a valid email, phone number
 * or plate looks like. `PopupView` checks before it calls `onSubmit`; the
 * server checks again with the same function (or `validate_submission` in
 * Python) — the browser's word is never taken for it.
 */

export type Submission = Record<string, unknown>;

export type SubmissionErrorCode = 'required' | 'text' | 'tooLong' | 'email' | 'phone' | 'plate';

export interface SubmissionError {
  code: SubmissionErrorCode;
  /** For `tooLong`: the most characters an answer may have. */
  limit?: number | undefined;
}

export interface SubmissionResult {
  ok: boolean;
  /** By input name, the first thing wrong with its answer. */
  errors: Record<string, SubmissionError>;
  /** The answers to keep: the popup's own inputs only, trimmed. */
  values: Record<string, string>;
}

/** The longest answer an input takes, in UTF-16 units as the browser counts. */
export const SUBMISSION_MAX_LENGTH = 500;

/**
 * The shapes an answer is held to. Published in the JSON Schema
 * (`x-submission-formats`) so a server in another language can tell when they change.
 */
export const SUBMISSION_FORMATS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  tel: /^\+?[\d\s().-]{6,24}$/,
  // Letters and digits, spaces or hyphens between: `AA 123 BC`, `TR-482-KL`.
  plate: /^[A-Za-z0-9](?:[A-Za-z0-9]|[ -](?=[A-Za-z0-9])){1,11}$/,
} as const;

const CODES: Record<Exclude<InputKind, 'text'>, SubmissionErrorCode> = {
  email: 'email',
  tel: 'phone',
  plate: 'plate',
};

/** The inputs a visitor sees, in stacking order: hidden ones take no answer. */
export function inputsOf(doc: PopupDocument): BuilderNode[] {
  return (doc.nodes[doc.root]?.children ?? [])
    .map((id) => doc.nodes[id])
    .filter((node): node is BuilderNode => node?.type === 'input' && !node.hidden);
}

/** The first thing wrong with one answer, or null. */
export function checkSubmissionValue(
  props: { kind: InputKind; required: boolean },
  value: unknown,
): SubmissionError | null {
  if (value === undefined || value === null) return props.required ? { code: 'required' } : null;
  if (typeof value !== 'string') return { code: 'text' };
  const text = value.trim();
  if (!text) return props.required ? { code: 'required' } : null;
  if (text.length > SUBMISSION_MAX_LENGTH) return { code: 'tooLong', limit: SUBMISSION_MAX_LENGTH };
  if (props.kind !== 'text' && !SUBMISSION_FORMATS[props.kind].test(text)) {
    return { code: CODES[props.kind] };
  }
  return null;
}

/**
 * Check what was sent against the popup's inputs. Answers to names the popup
 * does not ask are dropped; two inputs with one name (`checkPopup` refuses
 * that) are read as the first.
 */
export function validateSubmission(doc: PopupDocument, values: unknown): SubmissionResult {
  const errors: Record<string, SubmissionError> = {};
  const kept: Record<string, string> = {};
  // Anything but an object of answers is no answers: every required input is missing.
  const answers: Submission =
    values !== null && typeof values === 'object' && !Array.isArray(values)
      ? (values as Submission)
      : {};
  const done = new Set<string>();
  for (const node of inputsOf(doc)) {
    const name = node.props.name as string;
    if (!name || done.has(name)) continue;
    done.add(name);
    const value = Object.hasOwn(answers, name) ? answers[name] : undefined;
    const found = checkSubmissionValue(node.props as { kind: InputKind; required: boolean }, value);
    if (found) errors[name] = found;
    else if (typeof value === 'string' && value.trim()) kept[name] = value.trim();
  }
  return { ok: Object.keys(errors).length === 0, errors, values: kept };
}
