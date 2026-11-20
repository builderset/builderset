'use client';

import { isSafeUrl } from '@builderset/engine';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  answerKindOf,
  answerOf,
  isShown,
  stepsOf,
  validateAnswers,
  type AnswerError,
  type Answers,
  type FormDocument,
} from '../core';
import { FieldControl } from './controls';
import { FieldBox, FormHeader, FormProgress, Thanks } from './parts';
import { formClassName, formStyle, type FormDevice } from './style';
import { errorText, formWords, type FormWords } from './words';

/**
 * The form, working: one step at a time, questions appearing as their logic
 * allows, each step checked before the next, the answers checked again as a
 * whole before they are handed to `onSubmit`, then the thank-you message.
 *
 * Load `@builderset/form/form.css` on the page. The server must check the
 * answers again with `validateAnswers` — what the browser sends is never
 * trusted on its word.
 */

/** What `onSubmit` receives. */
export interface FormSubmission {
  /** The checked answers: shown fields only, numbers as numbers, files as `{ name, size }`. */
  values: Answers;
  /** The files chosen, by field key, to upload with the answers. */
  files: Record<string, File[]>;
  /** The hidden trap field's content. Anything in it: a bot sent the form. */
  trap: string;
}

export interface FormViewProps {
  document: FormDocument;
  /** The visitor's language, for the words the form does not set itself. Default: `'en'`. */
  locale?: string | undefined;
  /** Words for a language that is not built in. */
  words?: FormWords | undefined;
  device?: FormDevice | undefined;
  /** Storage key → address, for image blocks. */
  assetUrl?: ((key: string) => string) | undefined;
  /** The page's link parameters: fields with a `prefill` key take theirs. */
  prefill?: Readonly<Record<string, string>> | undefined;
  /** Answers to start from — the editor's test answers. */
  initialAnswers?: Answers | undefined;
  /**
   * Called with the checked answers. Resolve `false` (or throw) to stay on the
   * form; anything else shows the thank-you message.
   */
  onSubmit?: ((submission: FormSubmission) => unknown) | undefined;
  /** Where half-filled answers are kept in this browser when the form saves progress. */
  storageKey?: string | undefined;
  /** The form is not taking responses: its closed message instead of the fields. */
  closed?: boolean | undefined;
  className?: string | undefined;
}

interface FileAnswer {
  name: string;
  size?: number | undefined;
  file?: File | undefined;
}

/** The starting answers: prefilled from the link, hidden fields' own values, then the given ones. */
function startingAnswers(
  doc: FormDocument,
  prefill: Readonly<Record<string, string>> | undefined,
  initial: Answers | undefined,
): Answers {
  const answers: Answers = {};
  for (const node of Object.values(doc.nodes)) {
    const key = node.props.key;
    if (typeof key !== 'string') continue;
    if (node.type === 'hidden' && typeof node.props.value === 'string' && node.props.value) {
      answers[key] = node.props.value;
    }
    if (
      'defaultValue' in node.props &&
      node.props.defaultValue !== '' &&
      node.props.defaultValue !== null
    ) {
      answers[key] = node.props.defaultValue;
    }
    const param = node.props.prefill;
    if (prefill && typeof param === 'string' && param && Object.hasOwn(prefill, param)) {
      if (doc.settings.prefill || node.type === 'hidden') answers[key] = prefill[param];
    }
  }
  return { ...answers, ...initial };
}

/**
 * Where to send the visitor once the form is sent, or null: never anywhere
 * `checkForm` refuses (`url.unsafe`) — a stored `javascript:` address must not
 * run, even in a form that was saved before the check existed.
 */
export function redirectTarget(after: FormDocument['settings']['after']): string | null {
  const url = after.redirectUrl.trim();
  return after.mode !== 'message' && url && isSafeUrl(url) ? url : null;
}

/** `{{key}}` in the thank-you message, filled with that answer. */
function fill(template: string, answers: Answers): string {
  return template.replace(
    /\{\{\s*([a-z][a-z0-9_]*)(?:\.([a-z]+))?\s*\}\}/g,
    (_, key: string, part: string | undefined) => {
      const answer = answerOf(answers, key);
      // `{{name.first}}`: one part of an answer with parts.
      return answerText(
        part && answer && typeof answer === 'object' && !Array.isArray(answer)
          ? answerOf(answer as Answers, part)
          : answer,
      );
    },
  );
}

/** An answer as words: a name's parts joined, a list with commas. */
function answerText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(answerText).filter(Boolean).join(', ');
  if (value && typeof value === 'object')
    return Object.values(value).map(answerText).filter(Boolean).join(' ');
  return '';
}

export function FormView({
  document: doc,
  locale = 'en',
  words: ownWords,
  device = 'desktop',
  assetUrl,
  prefill,
  initialAnswers,
  onSubmit,
  storageKey,
  closed = false,
  className,
}: FormViewProps) {
  const words = ownWords ?? formWords(locale);
  const settings = doc.settings;
  const steps = useMemo(() => stepsOf(doc), [doc]);
  const base = useId();
  const keep = settings.saveProgress && storageKey ? storageKey : null;
  const [answers, setAnswers] = useState<Answers>(() => {
    const start = startingAnswers(doc, prefill, initialAnswers);
    if (!keep || typeof localStorage === 'undefined') return start;
    try {
      const saved = JSON.parse(localStorage.getItem(keep) ?? 'null') as Answers | null;
      return saved ? { ...start, ...saved } : start;
    } catch {
      return start;
    }
  });
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, AnswerError>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [robot, setRobot] = useState({ ticked: false, missing: false });
  const trap = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLFormElement>(null);

  // Half-filled answers, for coming back later. Files cannot be kept.
  useEffect(() => {
    if (!keep || done) return;
    try {
      const kept = Object.fromEntries(
        Object.entries(answers).filter(
          ([, value]) =>
            !(
              Array.isArray(value) &&
              value.some((item) => item && typeof item === 'object' && 'file' in item)
            ),
        ),
      );
      localStorage.setItem(keep, JSON.stringify(kept));
    } catch {
      // Storage full or blocked: the form still works, it just forgets.
    }
  }, [keep, answers, done]);

  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const style = formStyle(settings.style, device);
  const classes = [formClassName(settings.style, device), className ?? '']
    .filter(Boolean)
    .join(' ');

  const answer = (key: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    // An error goes as soon as the answer is fixed; a new one waits for "Continue".
    if (Object.hasOwn(errors, key)) {
      setErrors((current) => {
        const next = { ...current };
        Reflect.deleteProperty(next, key);
        return next;
      });
    }
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const bad = card.current?.querySelector<HTMLElement>(
        '.bsf-field.bsf-bad, .bsf-captcha.bsf-bad',
      );
      bad?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bad?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
    });
  };

  const submit = async () => {
    const result = validateAnswers(doc, answers);
    if (!result.ok) {
      setErrors(result.errors);
      // Back to the first step with something wrong.
      const firstBad = steps.findIndex((candidate) =>
        (candidate.children ?? []).some((id) => {
          const key = doc.nodes[id]?.props.key;
          return typeof key === 'string' && key in result.errors;
        }),
      );
      if (firstBad >= 0) setIndex(firstBad);
      focusFirstError();
      return;
    }
    const files: Record<string, File[]> = {};
    const values: Answers = {};
    for (const [key, value] of Object.entries(result.values)) {
      if (
        Array.isArray(value) &&
        value.some((item) => item && typeof item === 'object' && 'file' in item)
      ) {
        files[key] = (value as FileAnswer[])
          .map((item) => item.file)
          .filter((file): file is File => !!file);
        values[key] = (value as FileAnswer[]).map(({ name, size }) => ({ name, size }));
      } else values[key] = value;
    }
    setSending(true);
    try {
      const accepted = await onSubmit?.({ values, files, trap: trap.current?.value ?? '' });
      if (accepted === false) return;
      setDone(true);
      if (keep) {
        try {
          localStorage.removeItem(keep);
        } catch {
          // Nothing kept to remove.
        }
      }
      const url = redirectTarget(settings.after);
      if (url && typeof window !== 'undefined') {
        const go = () => {
          window.location.assign(url);
        };
        if (settings.after.mode === 'redirect') go();
        else setTimeout(go, 4000);
      }
    } catch {
      // The host reports the failure; the visitor keeps their answers.
    } finally {
      setSending(false);
    }
  };

  const next = () => {
    const result = validateAnswers(doc, answers, { step: index });
    const captchaMissing = last && settings.spam.captcha === 'checkbox' && !robot.ticked;
    setRobot((current) => ({ ...current, missing: captchaMissing }));
    if (!result.ok || captchaMissing) {
      setErrors(result.errors);
      focusFirstError();
      return;
    }
    setErrors({});
    if (!last) {
      setIndex(index + 1);
      card.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    void submit();
  };

  if (closed) {
    return (
      <div className={classes} style={style}>
        <Thanks title={settings.limits.closedMessage || words.closed} message="" again="" />
      </div>
    );
  }

  if (done) {
    return (
      <div className={classes} style={style}>
        <Thanks
          title={fill(settings.after.title, answers)}
          message={fill(settings.after.message, answers)}
          again={words.again}
          onAgain={() => {
            setAnswers(startingAnswers(doc, prefill, initialAnswers));
            setIndex(0);
            setDone(false);
          }}
        />
      </div>
    );
  }

  return (
    <form
      ref={card}
      className={classes}
      style={style}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        next();
      }}
    >
      {index === 0 && (doc.meta.title || doc.meta.intro) ? (
        <FormHeader title={doc.meta.title} intro={doc.meta.intro} />
      ) : null}
      <FormProgress
        mode={settings.progress}
        titles={steps.map((candidate) => (candidate.props.title as string) || '')}
        index={index}
        words={words}
      />
      <div className="bsf-grid">
        {(step?.children ?? []).map((id) => {
          const node = doc.nodes[id];
          if (!node) return null;
          const key = typeof node.props.key === 'string' ? node.props.key : id;
          const controlId = `${base}-${id}`;
          if (node.type === 'hidden') {
            return (
              <input key={id} type="hidden" name={key} value={answerText(answerOf(answers, key))} />
            );
          }
          if (node.props.hideFromVisitors === true) return null;
          if (!isShown(node.props, answers)) return null;
          const error = Object.hasOwn(errors, key) ? errors[key] : undefined;
          return (
            <FieldBox
              key={id}
              node={node}
              controlId={controlId}
              marker={settings.marker}
              words={words}
              mobile={device === 'mobile'}
              error={error ? errorText(error, words) : null}
            >
              <FieldControl
                node={node}
                id={controlId}
                value={answerOf(answers, key)}
                words={words}
                assetUrl={assetUrl}
                invalid={!!error}
                describedBy={error ? `${controlId}-error` : undefined}
                onChange={
                  answerKindOf(node.type) === 'none'
                    ? undefined
                    : (value) => {
                        answer(key, value);
                      }
                }
              />
            </FieldBox>
          );
        })}
      </div>
      {settings.spam.honeypot ? (
        <div className="bsf-trap" aria-hidden="true">
          <label>
            Website
            <input ref={trap} type="text" name="_website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      ) : null}
      {last && settings.spam.captcha === 'checkbox' ? (
        <label className={robot.missing ? 'bsf-captcha bsf-bad' : 'bsf-captcha'}>
          <input
            type="checkbox"
            checked={robot.ticked}
            onChange={(event) => {
              setRobot({ ticked: event.target.checked, missing: false });
            }}
          />
          <span className="bsf-mark" />
          {words.notRobot}
        </label>
      ) : null}
      <div className="bsf-nav">
        {index > 0 ? (
          <button
            type="button"
            className="bsf-back"
            onClick={() => {
              setErrors({});
              setIndex(index - 1);
            }}
          >
            {settings.buttons.back}
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="bsf-button" aria-busy={sending || undefined}>
          {sending ? words.sending : last ? settings.buttons.submit : settings.buttons.next}
        </button>
      </div>
    </form>
  );
}
