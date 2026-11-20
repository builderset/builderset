import { isSafeUrl, type BuilderNode, type MediaRef } from '@builderset/engine';
import {
  Car,
  Check,
  Clock,
  Gift,
  Globe,
  Heart,
  ImageIcon,
  KeyRound,
  Mail,
  MapPin,
  Nfc,
  Phone,
  ShieldCheck,
  SquareUser,
  Star,
  Ticket,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import {
  CARD_FONTS,
  fillText,
  VARIABLE_TOKEN,
  type CardFont,
  type CardIcon,
  type CardRecord,
  type QrLevel,
} from '../core';
import { Barcode, QrCode } from './codes';
import { inkOn } from './style';
import type { CardWords } from './words';

/**
 * One element's content, filling its frame: what the card view, the print
 * sheet and the editor's canvas all draw, so the three cannot disagree. Sizes
 * are millimetres (and type points) times `--bsc-mm`, set by whoever places
 * the element.
 */

const ICONS: Record<CardIcon, LucideIcon> = {
  star: Star,
  check: Check,
  car: Car,
  wrench: Wrench,
  'shield-check': ShieldCheck,
  'key-round': KeyRound,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  'map-pin': MapPin,
  clock: Clock,
  gift: Gift,
  ticket: Ticket,
  heart: Heart,
};

export interface CardElementProps {
  node: BuilderNode;
  /** The side's background: the ink a text without a colour of its own takes. */
  background: string;
  /** The member the card is filled in for. Without one, variables show as written. */
  record?: CardRecord | null | undefined;
  /** Mark each `{{variable}}` (the editor, without example data). */
  markVariables?: boolean | undefined;
  /** A media key's address. Without one, uploaded pictures show as placeholders. */
  assetUrl?: ((key: string) => string) | undefined;
  words: CardWords;
  /** Drawn in place of a text's words: the editor's inline editor. */
  textSlot?: ReactNode;
}

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

/** `{{member.name}}` and the rest of the words, each variable in a marked span. */
function marked(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokens = new RegExp(VARIABLE_TOKEN.source, 'g');
  let last = 0;
  for (const match of text.matchAll(tokens)) {
    const at = match.index;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <span key={at} className="bsc-var">
        {match[1]}
      </span>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Words({
  text,
  record,
  markVariables,
}: {
  text: string;
  record: CardRecord | null | undefined;
  markVariables: boolean | undefined;
}) {
  if (record) return <>{fillText(text, record)}</>;
  return <>{markVariables ? marked(text) : text}</>;
}

function Picture({
  media,
  assetUrl,
  fit,
  tone,
  label,
  radius,
  opacity,
}: {
  media: MediaRef | null;
  assetUrl: ((key: string) => string) | undefined;
  fit: string;
  tone: string;
  label: string;
  radius: number;
  opacity: number;
}) {
  const style = { '--radius': String(radius), opacity } as CSSProperties;
  if (media && assetUrl) {
    return (
      <img
        className="bsc-picture"
        src={assetUrl(media.key)}
        alt=""
        draggable={false}
        style={{ ...style, objectFit: fit === 'contain' ? 'contain' : 'cover' }}
      />
    );
  }
  return (
    <div
      className="bsc-picture bsc-placeholder"
      style={{ ...style, background: tone }}
      role="img"
      aria-label={label}
    >
      <ImageIcon aria-hidden="true" />
    </div>
  );
}

export function CardElement({
  node,
  background,
  record,
  markVariables,
  assetUrl,
  words,
  textSlot,
}: CardElementProps) {
  const props = node.props;
  switch (node.type) {
    case 'heading':
    case 'text':
    case 'label':
    case 'field': {
      const highlight = str(props.background);
      const style = {
        '--size': String(num(props.size, 8)),
        fontFamily: CARD_FONTS[str(props.font, 'poppins') as CardFont].stack,
        fontWeight: num(props.weight, 400),
        color: str(props.color) || inkOn(background),
        textAlign: str(props.align, 'left') as CSSProperties['textAlign'],
        lineHeight: num(props.lineHeight, 1.25),
        letterSpacing: `${String(num(props.letterSpacing))}em`,
        textTransform: props.upper ? 'uppercase' : 'none',
        ...(highlight
          ? { background: highlight, '--radius': String(num(props.backgroundRadius)) }
          : {}),
      } as CSSProperties;
      return (
        <div className={`bsc-text bsc-${str(props.valign, 'top')}`} style={style}>
          <div className="bsc-words">
            {textSlot ?? (
              <Words text={str(props.text)} record={record} markVariables={markVariables} />
            )}
          </div>
        </div>
      );
    }
    case 'logo': {
      const media = props.media as MediaRef | null;
      if (media && assetUrl) {
        return (
          <img
            className="bsc-picture bsc-logo-file"
            src={assetUrl(media.key)}
            alt={str(props.text)}
            draggable={false}
          />
        );
      }
      return (
        <div
          className="bsc-logo"
          style={
            {
              '--size': String(num(props.size, 10)),
              color: str(props.color, '#ffffff'),
              fontFamily: CARD_FONTS[str(props.font, 'sora') as CardFont].stack,
            } as CSSProperties
          }
        >
          {str(props.text)}
        </div>
      );
    }
    case 'rect':
    case 'ellipse': {
      const stroke = str(props.stroke);
      return (
        <div
          className={node.type === 'ellipse' ? 'bsc-shape bsc-round' : 'bsc-shape'}
          aria-hidden="true"
          style={
            {
              background: str(props.fill) || 'transparent',
              opacity: num(props.opacity, 1),
              '--radius': String(num(props.radius)),
              ...(stroke
                ? { '--stroke': String(num(props.strokeWidth, 0.2) || 0.2), borderColor: stroke }
                : {}),
            } as CSSProperties
          }
          data-stroke={stroke ? '' : undefined}
        />
      );
    }
    case 'line':
    case 'stripe':
      return (
        <div
          className="bsc-shape"
          role={node.type === 'stripe' ? 'img' : undefined}
          aria-label={node.type === 'stripe' ? words.stripe : undefined}
          aria-hidden={node.type === 'line' ? true : undefined}
          style={{ background: str(props.color), opacity: num(props.opacity, 1) }}
        />
      );
    case 'image':
      return (
        <Picture
          media={(props.media as MediaRef | null) ?? null}
          assetUrl={assetUrl}
          fit={str(props.fit, 'cover')}
          tone={str(props.tone, '#2b3442')}
          label={words.image}
          radius={num(props.radius)}
          opacity={num(props.opacity, 1)}
        />
      );
    case 'icon': {
      const Icon = ICONS[str(props.name, 'star') as CardIcon];
      return (
        <div className="bsc-icon" style={{ color: str(props.color) }} aria-hidden="true">
          <Icon />
        </div>
      );
    }
    case 'nfc':
      return (
        <div
          className="bsc-icon"
          style={{ color: str(props.color) }}
          role="img"
          aria-label={words.contactless}
        >
          <Nfc aria-hidden="true" />
        </div>
      );
    case 'photo': {
      const address = record ? (record[str(props.bind)] ?? '') : '';
      const style = { '--radius': String(num(props.radius)) } as CSSProperties;
      // A member's photo is an address from the host's data: only a web
      // address or a path on the site is drawn.
      if (address && isSafeUrl(address)) {
        return (
          <img
            className="bsc-picture"
            src={address}
            alt={words.photo}
            draggable={false}
            style={style}
          />
        );
      }
      return (
        <div
          className="bsc-picture bsc-placeholder bsc-photo"
          style={{ ...style, background: str(props.tone) }}
          role="img"
          aria-label={words.photo}
        >
          <SquareUser aria-hidden="true" />
          {!record && markVariables ? (
            <span className="bsc-photo-path">{str(props.bind)}</span>
          ) : null}
        </div>
      );
    }
    case 'qr': {
      const data = fillText(str(props.data), record);
      return (
        <QrCode
          data={data}
          color={str(props.color, '#111827')}
          background={str(props.background, '#ffffff')}
          level={str(props.level, 'M') as QrLevel}
          label={words.qr(data)}
          unreadable={words.unreadableCode}
        />
      );
    }
    case 'barcode': {
      const data = fillText(str(props.data), record);
      return (
        <Barcode
          data={data}
          color={str(props.color, '#111827')}
          label={words.barcode(data)}
          unreadable={words.unreadableCode}
        />
      );
    }
    case 'chip': {
      const gold = props.finish !== 'silver';
      const face = gold ? '#d8b75e' : '#c9ced6';
      const line = gold ? '#a8873a' : '#8b929c';
      return (
        <svg
          className="bsc-code"
          viewBox="0 0 68 52"
          preserveAspectRatio="none"
          role="img"
          aria-label={words.chip}
        >
          <rect
            x="1"
            y="1"
            width="66"
            height="50"
            rx="9"
            fill={face}
            stroke={line}
            strokeWidth="1.2"
          />
          <path
            d="M1 18h22M1 34h22M45 18h22M45 34h22M23 1v50M45 1v50M23 26h22"
            stroke={line}
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      );
    }
    case 'sign':
      return (
        <div className="bsc-sign" role="img" aria-label={words.signature}>
          <span style={{ color: str(props.color) }}>{str(props.label)}</span>
        </div>
      );
    default:
      return null;
  }
}
