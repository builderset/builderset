import type { BuilderNode } from '@builderset/engine';
import { Check, CircleAlert } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { answerKindOf, type FormSettings } from '../core';
import { isBoxed } from './controls';
import type { FormWords } from './words';

/**
 * The pieces a form is drawn from, shared by the live form and the editor's
 * canvas: the title, the progress, and the box around each field — its
 * label, the required mark, the help line and the error.
 */

export function FormHeader({ title, intro }: { title: ReactNode; intro?: ReactNode }) {
  return (
    <div className="bsf-head">
      <h2 className="bsf-title">{title}</h2>
      {intro ? <p className="bsf-intro">{intro}</p> : null}
    </div>
  );
}

/** "Step 2 of 3" with a bar, or the steps numbered — nothing for a form of one step. */
export function FormProgress({
  mode,
  titles,
  index,
  words,
}: {
  mode: FormSettings['progress'];
  titles: readonly string[];
  index: number;
  words: FormWords;
}) {
  if (titles.length < 2 || mode === 'none') return null;
  if (mode === 'bar') {
    return (
      <div className="bsf-progress">
        <div className="bsf-progress-line">
          <span>{words.stepOf(index + 1, titles.length)}</span>
          <b>{titles[index]}</b>
        </div>
        <div
          className="bsf-progress-bar"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={titles.length}
          aria-valuenow={index + 1}
          aria-valuetext={words.stepOf(index + 1, titles.length)}
        >
          <i style={{ width: `${String(((index + 1) / titles.length) * 100)}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="bsf-steps" role="group" aria-label={words.stepOf(index + 1, titles.length)}>
      {titles.flatMap((title, step) => [
        ...(step > 0 ? [<i key={`line-${String(step)}`} aria-hidden="true" />] : []),
        <span
          key={`step-${String(step)}`}
          className={step < index ? 'bsf-done' : step === index ? 'bsf-on' : undefined}
          aria-current={step === index ? 'step' : undefined}
        >
          <b>{step < index ? <Check aria-hidden="true" width={12} height={12} /> : step + 1}</b>
          {title}
        </span>,
      ])}
    </div>
  );
}

/** The required mark, or "(optional)", as the form's settings ask. */
export function Marker({
  required,
  marker,
  words,
}: {
  required: boolean;
  marker: FormSettings['marker'];
  words: FormWords;
}) {
  if (required && marker !== 'optional')
    return (
      <i className="bsf-req" aria-hidden="true">
        *
      </i>
    );
  if (!required && marker !== 'asterisk') return <em className="bsf-opt">{words.optional}</em>;
  return null;
}

export interface FieldBoxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  node: BuilderNode;
  /** The id of the control, its label points at it. */
  controlId: string;
  marker: FormSettings['marker'];
  words: FormWords;
  /** In place of the field's own label: the editor's editable one. */
  label?: ReactNode;
  error?: string | null | undefined;
  /** Narrow on a phone, whatever the field says. */
  mobile?: boolean | undefined;
  children: ReactNode;
}

/** A field with its label, mark, help and error around its control. */
export function FieldBox({
  node,
  controlId,
  marker,
  words,
  label,
  error,
  mobile,
  className,
  children,
  ...rest
}: FieldBoxProps) {
  const p = node.props;
  const input = answerKindOf(node.type) !== 'none' && node.type !== 'hidden';
  const classes = [
    'bsf-field',
    p.width === 'half' && !mobile ? 'bsf-half' : '',
    input ? 'bsf-asks' : '',
    isBoxed(node.type) ? 'bsf-boxed' : '',
    error ? 'bsf-bad' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {input ? (
        <label id={`${controlId}-label`} htmlFor={controlId} className="bsf-label">
          <span>{label ?? (typeof p.label === 'string' ? p.label : '')}</span>
          <Marker required={p.required === true} marker={marker} words={words} />
        </label>
      ) : null}
      {children}
      {input && typeof p.help === 'string' && p.help ? (
        <small className="bsf-help">{p.help}</small>
      ) : null}
      {error ? (
        <div id={`${controlId}-error`} className="bsf-error" role="alert">
          <CircleAlert aria-hidden="true" width={14} height={14} />
          {error}
        </div>
      ) : null}
    </div>
  );
}

/** The thank-you screen: the form's own title and message, then "Fill it in again". */
export function Thanks({
  title,
  message,
  again,
  onAgain,
}: {
  title: string;
  message: string;
  again: string;
  onAgain?: (() => void) | undefined;
}) {
  return (
    <div className="bsf-thanks" role="status">
      <span className="bsf-thanks-icon">
        <Check aria-hidden="true" strokeWidth={2.4} />
      </span>
      <b>{title}</b>
      {message ? <p>{message}</p> : null}
      {onAgain ? (
        <button type="button" className="bsf-button" onClick={onAgain}>
          {again}
        </button>
      ) : null}
    </div>
  );
}
