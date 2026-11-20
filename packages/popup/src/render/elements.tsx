import {
  frameOf,
  isSafeUrl,
  type BuilderNode,
  type EditableTextField,
  type MediaRef,
  type RichText,
  type TextRun,
} from '@builderset/engine';
import {
  Bell,
  Calendar,
  Car,
  Check,
  Clock,
  Cookie,
  Gift,
  Heart,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Megaphone,
  Percent,
  Phone,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import {
  fillVariables,
  POPUP_FONTS,
  type PopupFont,
  type PopupFormat,
  type PopupIcon,
} from '../core';
import { qrModules, qrPath } from './qr';
import { inkOn } from './style';
import type { PopupWords } from './words';

/**
 * One element of a popup, drawn to fill its frame: the same drawing on the
 * editor's stage (`design`), in its preview and on a real page (`live`). In
 * design nothing is clickable and an input is a picture of one; live, links
 * are links, buttons are buttons and inputs take answers.
 */

export const POPUP_ICON_COMPONENTS: Record<PopupIcon, LucideIcon> = {
  star: Star,
  check: Check,
  clock: Clock,
  car: Car,
  phone: Phone,
  send: Send,
  gift: Gift,
  tag: Tag,
  percent: Percent,
  bell: Bell,
  mail: Mail,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  'map-pin': MapPin,
  calendar: Calendar,
  smartphone: Smartphone,
  cookie: Cookie,
  heart: Heart,
  info: Info,
  megaphone: Megaphone,
};

/** What every element is drawn with. */
export interface ElementContext {
  format: PopupFormat;
  words: PopupWords;
  /** The variables' values. Omitted: a variable shows as `{{path}}` (the editor without example data). */
  data?: unknown;
  /** Storage key → address, for pictures and logos. */
  assetUrl?: ((key: string) => string) | undefined;
}

/** What a live element needs from the popup around it. */
export interface LiveElement {
  /** The heading the dialog is named by. */
  headingId?: string | undefined;
  /** An input's answer, its error and where it goes. */
  value?: string | undefined;
  error?: string | undefined;
  errorId?: string | undefined;
  onValue?: ((value: string) => void) | undefined;
  /** A click on a link, a "close" or a submit button. */
  onAction?: ((node: BuilderNode) => void) | undefined;
  sending?: boolean | undefined;
}

export interface PopupElementProps {
  node: BuilderNode;
  context: ElementContext;
  /** Live on a page; omitted: a drawing (the editor's stage). */
  live?: LiveElement | undefined;
  /** The editor is typing into this element's text: draw it through `editText`. */
  editText?: ((field: EditableTextField) => ReactNode) | undefined;
}

const fontOf = (font: unknown): string =>
  (POPUP_FONTS[font as PopupFont] as (typeof POPUP_FONTS)[PopupFont] | undefined)?.stack ??
  POPUP_FONTS.system.stack;

const words = (text: string, data: unknown): string =>
  data === undefined ? text : fillVariables(text, data);

function Run({ run, data, live }: { run: TextRun; data: unknown; live: boolean }): ReactNode {
  let out: ReactNode = words(run.text, data);
  for (const mark of run.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        out = <strong>{out}</strong>;
        break;
      case 'italic':
        out = <em>{out}</em>;
        break;
      case 'underline':
        out = <u>{out}</u>;
        break;
      case 'strike':
        out = <s>{out}</s>;
        break;
      case 'code':
        out = <code>{out}</code>;
        break;
      case 'highlight':
        out = <mark>{out}</mark>;
        break;
      case 'sub':
        out = <sub>{out}</sub>;
        break;
      case 'sup':
        out = <sup>{out}</sup>;
        break;
      case 'link':
        out =
          live && isSafeUrl(mark.href) ? (
            <a
              href={mark.href}
              {...(mark.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {out}
            </a>
          ) : (
            <span className="bsp-inline-link">{out}</span>
          );
        break;
      case 'footnote':
        break;
    }
  }
  return out;
}

/** Rich text with its variables filled in. */
export function RichTextView({
  value,
  data,
  live = false,
}: {
  value: RichText;
  data?: unknown;
  live?: boolean;
}): ReactNode {
  return value.map((run, index) => (
    // Runs have no identity of their own; their order is their key.
    <Run key={index} run={run} data={data} live={live} />
  ));
}

/** The look of a text's words. */
function typeStyle(props: Record<string, unknown>, format: PopupFormat): CSSProperties {
  const highlight = props.highlight as string;
  return {
    fontFamily: fontOf(props.font),
    fontSize: `${String(props.size)}px`,
    fontWeight: props.weight as number,
    color: (props.color as string) || inkOn(format.background),
    textAlign: props.align as CSSProperties['textAlign'],
    lineHeight: props.lineHeight as number,
    letterSpacing: `${String(props.letterSpacing)}px`,
    textTransform: props.uppercase ? 'uppercase' : 'none',
    ...(highlight
      ? { background: highlight, borderRadius: `${String(props.highlightRadius)}px` }
      : {}),
  };
}

function href(props: Record<string, unknown>): Record<string, string> {
  const url = typeof props.url === 'string' ? props.url : '';
  if (!isSafeUrl(url)) return {};
  return {
    href: url,
    ...(props.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
  };
}

function TextElement({ node, context, live, editText }: PopupElementProps) {
  const props = node.props;
  const style = typeStyle(props, context.format);
  const text = props.text as RichText;
  if (editText) {
    return (
      <div className="bsp-words" style={style}>
        {editText({ nodeId: node.id, path: 'text', value: text, multiline: true })}
      </div>
    );
  }
  const body = <RichTextView value={text} data={context.data} live={Boolean(live)} />;
  if (!live) {
    return (
      <div className="bsp-words" style={style}>
        {body}
      </div>
    );
  }
  const onClick = () => live.onAction?.(node);
  if (props.action === 'link') {
    return (
      <a className="bsp-words bsp-plain" style={style} {...href(props)} onClick={onClick}>
        {body}
      </a>
    );
  }
  if (props.action === 'close') {
    return (
      <button type="button" className="bsp-words bsp-plain" style={style} onClick={onClick}>
        {body}
      </button>
    );
  }
  if (node.type === 'heading') {
    return (
      <h2 className="bsp-words" style={style} id={live.headingId}>
        {body}
      </h2>
    );
  }
  return (
    <p className="bsp-words" style={style}>
      {body}
    </p>
  );
}

function ButtonElement({ node, context, live, editText }: PopupElementProps) {
  const props = node.props;
  const style: CSSProperties = {
    fontFamily: fontOf(props.font),
    fontSize: `${String(props.size)}px`,
    fontWeight: props.weight as number,
    color: props.color as string,
    background: (props.fill as string) || 'transparent',
    borderRadius: `${String(props.radius)}px`,
  };
  const text = props.text as RichText;
  const body = editText ? (
    editText({ nodeId: node.id, path: 'text', value: text })
  ) : (
    <RichTextView value={text} data={context.data} />
  );
  if (!live) {
    return (
      <div className="bsp-button" style={style}>
        <span className="bsp-button-text">{body}</span>
      </div>
    );
  }
  const onClick = () => live.onAction?.(node);
  if (props.action === 'link') {
    return (
      <a className="bsp-button" style={style} {...href(props)} onClick={onClick}>
        <span className="bsp-button-text">{body}</span>
      </a>
    );
  }
  const submit = props.action === 'submit';
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className="bsp-button"
      style={style}
      disabled={submit && live.sending}
      aria-busy={submit && live.sending ? true : undefined}
      data-node={node.id}
      onClick={submit ? undefined : onClick}
    >
      <span className="bsp-button-text">
        {submit && live.sending ? context.words.sending : body}
      </span>
    </button>
  );
}

const INPUT_TYPES = { text: 'text', email: 'email', tel: 'tel', plate: 'text' } as const;
const AUTOCOMPLETE = { text: 'on', email: 'email', tel: 'tel', plate: 'off' } as const;

function InputElement({ node, live }: PopupElementProps) {
  const props = node.props;
  const kind = props.kind as keyof typeof INPUT_TYPES;
  const style: CSSProperties = {
    fontSize: `${String(props.size)}px`,
    color: props.color as string,
    background: props.fill as string,
    borderRadius: `${String(props.radius)}px`,
    borderColor: (props.border as string) || 'transparent',
  };
  const label = (props.label as string) || (props.placeholder as string);
  if (!live) {
    return (
      <div className="bsp-input" style={style}>
        <span className="bsp-placeholder">{props.placeholder as string}</span>
      </div>
    );
  }
  return (
    <>
      <input
        className="bsp-input"
        style={style}
        name={props.name as string}
        type={INPUT_TYPES[kind]}
        inputMode={kind === 'tel' ? 'tel' : kind === 'email' ? 'email' : 'text'}
        autoComplete={AUTOCOMPLETE[kind]}
        autoCapitalize={kind === 'plate' ? 'characters' : undefined}
        placeholder={props.placeholder as string}
        aria-label={label}
        required={props.required as boolean}
        aria-invalid={live.error ? true : undefined}
        aria-describedby={live.error ? live.errorId : undefined}
        value={live.value ?? ''}
        onChange={(event) => live.onValue?.(event.target.value)}
      />
      {live.error ? (
        <span className="bsp-error" id={live.errorId}>
          {live.error}
        </span>
      ) : null}
    </>
  );
}

function CloseElement({ node, context, live }: PopupElementProps) {
  const props = node.props;
  const style: CSSProperties = {
    color: props.color as string,
    background: (props.fill as string) || 'transparent',
  };
  const icon = <X aria-hidden="true" strokeWidth={2.25} />;
  if (!live) {
    return (
      <div className="bsp-close" style={style}>
        {icon}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="bsp-close"
      style={style}
      aria-label={context.words.close}
      onClick={() => live.onAction?.(node)}
    >
      {icon}
    </button>
  );
}

/** Now, every second, while the countdown is on the page. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return now;
}

/** Days, hours, minutes and seconds from `now` until `to` (the visitor's own time); zeros once past. */
export function timeLeft(to: string, now: number): [number, number, number, number] {
  const ms = Math.max(0, new Date(to).getTime() - now) || 0;
  return [
    Math.floor(ms / 86_400_000),
    Math.floor((ms % 86_400_000) / 3_600_000),
    Math.floor((ms % 3_600_000) / 60_000),
    Math.floor((ms % 60_000) / 1000),
  ];
}

function CountdownElement({ node, context }: PopupElementProps) {
  const props = node.props;
  const now = useNow();
  const [days, hours, minutes, seconds] = timeLeft(props.to as string, now);
  const { words: w } = context;
  const units: [number, string][] = [
    [days, w.days],
    [hours, w.hours],
    [minutes, w.minutes],
    [seconds, w.seconds],
  ];
  return (
    <div
      className="bsp-countdown"
      role="timer"
      aria-label={w.timeLeft(days, hours, minutes)}
      style={{
        color: props.color as string,
        fontFamily: fontOf(props.font),
        fontSize: `${String(props.size)}px`,
      }}
    >
      {units.map(([value, unit], index) => (
        <span className="bsp-countdown-unit" key={unit} aria-hidden="true">
          <b suppressHydrationWarning>{index === 0 ? value : String(value).padStart(2, '0')}</b>
          <small>{unit}</small>
        </span>
      ))}
    </div>
  );
}

function QrElement({ node, context }: PopupElementProps) {
  const props = node.props;
  const data = words(props.data as string, context.data ?? {});
  const modules = useMemo(() => qrModules(data), [data]);
  const size = (modules?.length ?? 21) + 4;
  return (
    <svg
      className="bsp-qr"
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      role="img"
      aria-label={data}
      shapeRendering="crispEdges"
      style={{ background: props.background as string }}
    >
      {modules ? <path d={qrPath(modules, 2)} fill={props.color as string} /> : null}
    </svg>
  );
}

function Picture({
  media,
  alt,
  context,
  className,
  style,
}: {
  media: MediaRef;
  alt: string;
  context: ElementContext;
  className: string;
  style?: CSSProperties;
}) {
  const src = context.assetUrl?.(media.key) ?? media.key;
  return <img className={className} src={src} alt={alt} style={style} />;
}

/** One element's content, filling its frame. */
export function PopupElementContent(props: PopupElementProps): ReactNode {
  const { node, context } = props;
  const p = node.props;
  switch (node.type) {
    case 'heading':
    case 'text':
    case 'label':
      return <TextElement {...props} />;
    case 'button':
      return <ButtonElement {...props} />;
    case 'input':
      return <InputElement {...props} />;
    case 'close':
      return <CloseElement {...props} />;
    case 'countdown':
      return <CountdownElement {...props} />;
    case 'qr':
      return <QrElement {...props} />;
    case 'rect':
    case 'ellipse':
      return (
        <div
          className="bsp-shape"
          style={{
            background: (p.fill as string) || 'transparent',
            borderRadius: node.type === 'ellipse' ? '50%' : `${String(p.radius)}px`,
            border: p.stroke ? `${String(p.strokeWidth)}px solid ${p.stroke as string}` : undefined,
            opacity: p.opacity as number,
          }}
        />
      );
    case 'line':
      return (
        <div
          className="bsp-shape"
          style={{ background: p.color as string, opacity: p.opacity as number }}
        />
      );
    case 'image': {
      const style: CSSProperties = {
        borderRadius: `${String(p.radius)}px`,
        opacity: p.opacity as number,
        objectFit: p.fit as CSSProperties['objectFit'],
      };
      const media = p.media as MediaRef | null;
      return media ? (
        <Picture
          className="bsp-image"
          media={media}
          alt={p.alt as string}
          context={context}
          style={style}
        />
      ) : (
        // No picture yet: its placeholder colour, and in the editor a sign that one goes here.
        <div
          className="bsp-shape bsp-image-empty"
          style={{ ...style, background: p.tone as string }}
        >
          {props.live ? null : <ImageIcon aria-hidden="true" />}
        </div>
      );
    }
    case 'icon': {
      const Icon = POPUP_ICON_COMPONENTS[p.name as PopupIcon];
      return (
        <Icon
          className="bsp-icon"
          aria-hidden="true"
          color={p.color as string}
          strokeWidth={p.strokeWidth as number}
        />
      );
    }
    case 'logo': {
      const media = p.media as MediaRef | null;
      return media ? (
        <Picture
          className="bsp-logo-image"
          media={media}
          alt={p.text as string}
          context={context}
        />
      ) : (
        <span
          className="bsp-logo"
          style={{
            fontSize: `${String(p.size)}px`,
            fontWeight: p.weight as number,
            color: (p.color as string) || inkOn(context.format.background),
          }}
        >
          {p.text as string}
        </span>
      );
    }
    default:
      return null;
  }
}

/** Where an element sits: its frame as a positioned box. */
export function frameStyle(node: BuilderNode): CSSProperties {
  const frame = frameOf(node);
  return {
    left: `${String(frame.x)}px`,
    top: `${String(frame.y)}px`,
    width: `${String(frame.w)}px`,
    height: `${String(frame.h)}px`,
    ...(frame.r ? { transform: `rotate(${String(frame.r)}deg)` } : {}),
  };
}
