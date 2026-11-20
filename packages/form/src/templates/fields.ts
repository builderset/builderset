import { field, noChecks, type FieldChecks, type FieldSpec, type LogicOp } from '../core';

/*
 * Small builders for a template's fields, so a template file reads as the
 * form it asks. Each gives only the props that differ from the field's
 * defaults; `buildForm` fills in the rest and checks them against the
 * field's schema when the template is used (`templates.test.ts` does the same
 * for every template).
 *
 * The last argument is always more props, spread over the field's own — the
 * helpers below make the common ones short:
 *
 *   email({ ...half, ...locked('Replies go to this address') })
 *   textarea('What went wrong?', 'problem_details', when('problem', 'is', 'yes'))
 */

type Props = Record<string, unknown>;
type Layout = 'list' | 'buttons' | 'cards';

// ── props ────────────────────────────────────────────────────────────────────

/** A field the template cannot do without: required, and locked with the reason why. */
export const locked = (reason: string): Props => ({ required: true, lock: reason });

/** Half the row: two half-width fields sit side by side. */
export const half: Props = { width: 'half' };

/** What an answer must look like: the given checks, the rest left off. */
export const checks = (some: Partial<FieldChecks>): Props => ({
  checks: { ...noChecks(), ...some },
});

/** Show only when an earlier answer matches: `when('problem', 'is', 'yes')`. */
export const when = (key: string, op: LogicOp, value = ''): Props => ({
  logic: { enabled: true, match: 'all', rules: [{ key, op, value }] },
});

// ── the person ───────────────────────────────────────────────────────────────

/** First and last name, required, saved as `name`. */
export const fullName = (props: Props = {}): FieldSpec =>
  field('name', { label: 'Your name', key: 'name', required: true, ...props });

/** An email address, required, saved as `email` (where an auto-reply goes). */
export const email = (props: Props = {}): FieldSpec =>
  field('email', { label: 'Email', key: 'email', required: true, ...props });

/** A phone number, saved as `phone`. */
export const phone = (props: Props = {}): FieldSpec =>
  field('phone', { label: 'Phone', key: 'phone', ...props });

/** Street, city and postcode, saved as `address`. */
export const address = (label: string, props: Props = {}): FieldSpec =>
  field('address', { label, key: 'address', ...props });

/** The box to agree; `linkText` must be words of `text`, linked to the policy. */
export const consent = (text: string, linkText: string, props: Props = {}): FieldSpec =>
  field('consent', { label: 'Consent', key: 'consent', required: true, text, linkText, ...props });

/** Where the visitor came from: filled from `?utm_source=…`, never shown. */
export const source = (): FieldSpec =>
  field('hidden', { label: 'Source', key: 'source', value: '', prefill: 'utm_source' });

// ── answers ──────────────────────────────────────────────────────────────────

/** One line of text. */
export const text = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('text', { label, key, ...props });

/** A few sentences. */
export const textarea = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('textarea', { label, key, ...props });

/** The visitor's message, saved as `message`. */
export const message = (label: string, props: Props = {}): FieldSpec =>
  textarea(label, 'message', props);

/** A number, with an optional unit after it. */
export const number = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('number', { label, key, ...props });

/** A day from a calendar. */
export const date = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('date', { label, key, ...props });

/** An hour and minutes. */
export const time = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('time', { label, key, ...props });

/** A password, for a new account. */
export const password = (label: string, props: Props = {}): FieldSpec =>
  field('password', { label, key: 'password', ...props });

/** Files the visitor sends: `accept` is extensions without the dot. */
export const files = (
  label: string,
  key: string,
  accept: readonly string[],
  props: Props = {},
): FieldSpec => field('file', { label, key, accept: [...accept], ...props });

// ── choices ──────────────────────────────────────────────────────────────────

/** One of a few options, as a list, buttons in a row or cards. */
export const choice = (
  label: string,
  key: string,
  options: readonly string[],
  layout: Layout = 'list',
  props: Props = {},
): FieldSpec => field('radio', { label, key, options: [...options], layout, ...props });

/** Any of a few options, as a list, buttons in a row or cards. */
export const choices = (
  label: string,
  key: string,
  options: readonly string[],
  layout: Layout = 'list',
  props: Props = {},
): FieldSpec => field('checkbox', { label, key, options: [...options], layout, ...props });

/** One choice from a longer list, in a dropdown. */
export const dropdown = (
  label: string,
  key: string,
  options: readonly string[],
  props: Props = {},
): FieldSpec => field('select', { label, key, options: [...options], ...props });

/** A yes or a no; logic reads it as `yes` / `no`. */
export const yesNo = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('yes-no', { label, key, ...props });

/** Stars: 3, 5 or 10. */
export const rating = (label: string, key: string, props: Props = {}): FieldSpec =>
  field('rating', { label, key, ...props });

/** A score on a scale, 0–10 by default, with words under both ends. */
export const scale = (
  label: string,
  key: string,
  ends: readonly [low: string, high: string],
  props: Props = {},
): FieldSpec => field('scale', { label, key, lowLabel: ends[0], highLabel: ends[1], ...props });

/** A value on a range. */
export const slider = (
  label: string,
  key: string,
  range: { min: number; max: number; step: number; start: number; unit?: string },
  props: Props = {},
): FieldSpec =>
  field('slider', {
    label,
    key,
    min: range.min,
    max: range.max,
    step: range.step,
    defaultValue: range.start,
    unit: range.unit ?? '',
    ...props,
  });

// ── layout ───────────────────────────────────────────────────────────────────

/** A title over a part of a step. */
export const heading = (words: string, props: Props = {}): FieldSpec =>
  field('heading', { text: words, ...props });

/** A sentence or two that explains. */
export const paragraph = (words: string, props: Props = {}): FieldSpec =>
  field('paragraph', { text: words, ...props });
