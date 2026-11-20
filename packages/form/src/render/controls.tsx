'use client';

import type { BuilderNode, MediaRef } from '@builderset/engine';
import { EyeOff, ImageIcon, Star, Upload } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import type { FormWords } from './words';

/**
 * The input for one field: a text box, a set of choices, stars, a drop zone…
 *
 * With `onChange` it is a working control; without, an inert picture of one —
 * what the editor's canvas shows, filled with `value` (an example answer, or
 * nothing). Either way it is the same markup and the same classes, so the
 * canvas looks exactly like the live form.
 */

export interface FieldControlProps {
  node: BuilderNode;
  value: unknown;
  /** Absent: the control is drawn but takes no input (the editor's canvas). */
  onChange?: ((value: unknown) => void) | undefined;
  words: FormWords;
  /** The input's id, for its label. */
  id: string;
  invalid?: boolean | undefined;
  /** The id of the error under it. */
  describedBy?: string | undefined;
  /** Storage key → address, for an image block. */
  assetUrl?: ((key: string) => string) | undefined;
}

interface FileAnswer {
  name: string;
  size?: number | undefined;
}

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export function FieldControl(props: FieldControlProps) {
  const { node, value, onChange, words, id, invalid, describedBy, assetUrl } = props;
  const p = node.props;
  const live = !!onChange;
  const key = typeof p.key === 'string' ? p.key : node.id;
  // Shared by every native input: inert on the canvas, described by its error live.
  const common = {
    id,
    name: key,
    readOnly: !live || p.readonly === true,
    tabIndex: live ? undefined : -1,
    'aria-invalid': invalid ? true : undefined,
    'aria-describedby': describedBy,
  };
  const change = (next: unknown) => {
    onChange?.(next);
  };

  const input = (
    type: string,
    extra: { before?: ReactNode; after?: ReactNode; inputMode?: 'numeric' | 'decimal' } = {},
  ) => {
    const field = (
      <input
        {...common}
        type={type}
        className="bsf-input"
        placeholder={text(p.placeholder)}
        inputMode={extra.inputMode}
        value={text(value)}
        onChange={(event) => {
          change(event.target.value);
        }}
      />
    );
    return extra.before || extra.after ? (
      <div className="bsf-group">
        {extra.before ? <span className="bsf-addon bsf-before">{extra.before}</span> : null}
        {field}
        {extra.after ? <span className="bsf-addon bsf-after">{extra.after}</span> : null}
      </div>
    ) : (
      field
    );
  };

  /** One or several choices, as a list, buttons or cards. */
  const choices = (
    multiple: boolean,
    options: readonly string[],
    labels?: readonly string[],
    layout = typeof p.layout === 'string' ? p.layout : 'list',
  ) => {
    const picked = multiple ? (Array.isArray(value) ? (value as string[]) : []) : text(value);
    return (
      <div
        role={multiple ? 'group' : 'radiogroup'}
        aria-labelledby={`${id}-label`}
        className={`bsf-options bsf-${layout}`}
      >
        {options.map((option, index) => {
          const checked = multiple ? (picked as string[]).includes(option) : picked === option;
          return (
            <label key={`${option}-${String(index)}`} className="bsf-option">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={key}
                value={option}
                checked={checked}
                readOnly={!live}
                tabIndex={live ? undefined : -1}
                onChange={() => {
                  if (!multiple) change(option);
                  else {
                    const list = picked as string[];
                    change(checked ? list.filter((item) => item !== option) : [...list, option]);
                  }
                }}
              />
              <span className="bsf-mark" />
              <span>{labels?.[index] ?? option}</span>
            </label>
          );
        })}
      </div>
    );
  };

  switch (node.type) {
    case 'text':
      return input('text');
    case 'email':
      return input('email');
    case 'password':
      return input('password');
    case 'date':
      return input('date');
    case 'time':
      return input('time');
    case 'phone':
      return input('tel', { before: text(p.prefix) || undefined });
    case 'number':
      return input('text', { after: text(p.unit) || undefined, inputMode: 'decimal' });
    case 'textarea':
      return (
        <textarea
          {...common}
          className="bsf-input"
          rows={typeof p.rows === 'number' ? p.rows : 4}
          placeholder={text(p.placeholder)}
          value={text(value)}
          onChange={(event) => {
            change(event.target.value);
          }}
        />
      );
    case 'select':
      return (
        <select
          {...common}
          disabled={!live}
          className="bsf-input bsf-select"
          value={text(value)}
          onChange={(event) => {
            change(event.target.value);
          }}
        >
          <option value="">{words.choose}</option>
          {(p.options as string[]).map((option, index) => (
            <option key={`${option}-${String(index)}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'radio':
      return choices(false, p.options as string[]);
    case 'checkbox':
      return choices(true, p.options as string[]);
    case 'yes-no':
      return (
        <div className="bsf-yesno">
          {choices(false, ['yes', 'no'], [words.yes, words.no], 'buttons')}
        </div>
      );
    case 'rating': {
      const stars = typeof p.stars === 'number' ? p.stars : 5;
      const chosen = Number(value) || 0;
      return (
        <div className="bsf-stars" role="radiogroup" aria-labelledby={`${id}-label`}>
          {Array.from({ length: stars }, (_, index) => (
            <label key={index} className={index < chosen ? 'bsf-on' : undefined}>
              <input
                type="radio"
                name={key}
                value={index + 1}
                checked={chosen === index + 1}
                readOnly={!live}
                tabIndex={live ? undefined : -1}
                aria-label={String(index + 1)}
                onChange={() => {
                  change(index + 1);
                }}
              />
              <Star aria-hidden="true" />
            </label>
          ))}
        </div>
      );
    }
    case 'scale': {
      const from = typeof p.from === 'number' ? p.from : 0;
      const to = typeof p.to === 'number' ? p.to : 10;
      const numbers = Array.from({ length: to - from + 1 }, (_, index) => from + index);
      return (
        <>
          <div
            className="bsf-scale"
            role="radiogroup"
            aria-labelledby={`${id}-label`}
            style={{ '--bsf-count': numbers.length } as CSSProperties}
          >
            {numbers.map((number) => (
              <label key={number}>
                <input
                  type="radio"
                  name={key}
                  value={number}
                  checked={value === number || text(value) === String(number)}
                  readOnly={!live}
                  tabIndex={live ? undefined : -1}
                  onChange={() => {
                    change(number);
                  }}
                />
                <span>{number}</span>
              </label>
            ))}
          </div>
          <div className="bsf-scale-ends">
            <span>{text(p.lowLabel)}</span>
            <span>{text(p.highLabel)}</span>
          </div>
        </>
      );
    }
    case 'slider': {
      const current = value === undefined || value === '' ? Number(p.defaultValue) : Number(value);
      return (
        <div className="bsf-slider">
          <input
            {...common}
            type="range"
            min={Number(p.min)}
            max={Number(p.max)}
            step={Number(p.step)}
            value={current}
            disabled={!live}
            onChange={(event) => {
              change(Number(event.target.value));
            }}
          />
          <output htmlFor={id}>
            {current}
            {text(p.unit) ? ` ${text(p.unit)}` : ''}
          </output>
        </div>
      );
    }
    case 'name': {
      const name = (value ?? {}) as { first?: string; last?: string };
      return (
        <div className="bsf-two">
          {(['first', 'last'] as const).map((part) => (
            <input
              key={part}
              {...common}
              id={part === 'first' ? id : `${id}-last`}
              name={`${key}.${part}`}
              className="bsf-input"
              autoComplete={part === 'first' ? 'given-name' : 'family-name'}
              placeholder={part === 'first' ? words.firstName : words.lastName}
              aria-label={part === 'first' ? words.firstName : words.lastName}
              value={name[part] ?? ''}
              onChange={(event) => {
                change({ ...name, [part]: event.target.value });
              }}
            />
          ))}
        </div>
      );
    }
    case 'address': {
      const address = (value ?? {}) as { street?: string; city?: string; zip?: string };
      const part = (
        which: 'street' | 'city' | 'zip',
        placeholder: string,
        autoComplete: string,
      ) => (
        <input
          {...common}
          id={which === 'street' ? id : `${id}-${which}`}
          name={`${key}.${which}`}
          className="bsf-input"
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-label={placeholder}
          value={address[which] ?? ''}
          onChange={(event) => {
            change({ ...address, [which]: event.target.value });
          }}
        />
      );
      return (
        <div className="bsf-stack">
          {part('street', words.street, 'street-address')}
          <div className="bsf-two">
            {part('city', words.city, 'address-level2')}
            {part('zip', words.zip, 'postal-code')}
          </div>
        </div>
      );
    }
    case 'consent': {
      const sentence = text(p.text);
      const linkText = text(p.linkText);
      const at = linkText ? sentence.indexOf(linkText) : -1;
      return (
        <label className="bsf-consent">
          <input
            type="checkbox"
            name={key}
            checked={value === true}
            readOnly={!live}
            tabIndex={live ? undefined : -1}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => {
              change(event.target.checked);
            }}
          />
          <span className="bsf-mark" />
          <span>
            {at >= 0 ? (
              <>
                {sentence.slice(0, at)}
                {text(p.linkUrl) && live ? (
                  <a href={text(p.linkUrl)} target="_blank" rel="noreferrer">
                    {linkText}
                  </a>
                ) : (
                  <u>{linkText}</u>
                )}
                {sentence.slice(at + linkText.length)}
              </>
            ) : (
              sentence
            )}
          </span>
        </label>
      );
    }
    case 'signature':
      return (
        <SignaturePad value={text(value)} onChange={live ? change : undefined} words={words} />
      );
    case 'file': {
      const files = Array.isArray(value) ? (value as FileAnswer[]) : [];
      const accept = (p.accept as string[]).map((extension) => extension.toUpperCase()).join(', ');
      return (
        <label className="bsf-drop">
          <Upload aria-hidden="true" />
          <b>
            {words.dropFiles} <u>{words.chooseFiles}</u>
          </b>
          <small>{words.fileLimits(accept, Number(p.maxFiles), Number(p.maxMb))}</small>
          {files.length ? <em>{words.filesChosen(files.length)}</em> : null}
          {live ? (
            <input
              id={id}
              type="file"
              name={key}
              multiple={Number(p.maxFiles) > 1}
              accept={(p.accept as string[]).map((extension) => `.${extension}`).join(',')}
              aria-describedby={describedBy}
              onChange={(event) => {
                const chosen = [...(event.target.files ?? [])];
                change(chosen.map((file) => ({ name: file.name, size: file.size, file })));
              }}
            />
          ) : null}
        </label>
      );
    }
    case 'heading':
      return <h3 className="bsf-heading">{text(p.text)}</h3>;
    case 'paragraph':
      return <p className="bsf-text">{text(p.text)}</p>;
    case 'divider':
      return <hr className="bsf-rule" />;
    case 'image': {
      const media = p.media as MediaRef | null;
      return media && assetUrl ? (
        <img className="bsf-image" src={assetUrl(media.key)} alt={text(p.alt)} />
      ) : (
        <div className="bsf-image bsf-empty">
          <ImageIcon aria-hidden="true" />
        </div>
      );
    }
    case 'hidden':
      return live ? (
        <input type="hidden" name={key} value={text(value)} />
      ) : (
        <div className="bsf-note">
          <EyeOff aria-hidden="true" width={15} height={15} />
          {words.hiddenField}
          {text(p.prefill) ? (
            <code>?{text(p.prefill)}=</code>
          ) : text(p.value) ? (
            <code>{text(p.value)}</code>
          ) : null}
        </div>
      );
    default:
      return null;
  }
}

/** A pad to sign with a finger or a mouse; the answer is the drawing as a PNG data URL. */
function SignaturePad({
  value,
  onChange,
  words,
}: {
  value: string;
  onChange?: ((value: unknown) => void) | undefined;
  words: FormWords;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.strokeStyle = getComputedStyle(element).color || '#1b1e22';
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * element.width,
      ((event.clientY - rect.top) / rect.height) * element.height,
    ];
  };

  return (
    <div className={value ? 'bsf-signature bsf-signed' : 'bsf-signature'}>
      {onChange ? (
        <canvas
          ref={canvas}
          width={560}
          height={120}
          onPointerDown={(event) => {
            drawing.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            const context = event.currentTarget.getContext('2d');
            context?.beginPath();
            context?.moveTo(...point(event));
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return;
            const context = event.currentTarget.getContext('2d');
            context?.lineTo(...point(event));
            context?.stroke();
          }}
          onPointerUp={(event) => {
            drawing.current = false;
            onChange(event.currentTarget.toDataURL('image/png'));
          }}
        />
      ) : null}
      <span>{words.signHere}</span>
      {onChange ? (
        <button
          type="button"
          onClick={() => {
            const element = canvas.current;
            element?.getContext('2d')?.clearRect(0, 0, element.width, element.height);
            onChange('');
          }}
        >
          {words.clear}
        </button>
      ) : null}
    </div>
  );
}

/** Whether a field's control is a box the label can sit inside ("inside" labels). */
export function isBoxed(type: string): boolean {
  return [
    'text',
    'email',
    'phone',
    'number',
    'date',
    'time',
    'password',
    'textarea',
    'select',
  ].includes(type);
}
