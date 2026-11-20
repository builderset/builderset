import { frameOf } from '@builderset/engine';
import type { CSSProperties } from 'react';

import { elementsOf, formatOf, sideOf, type CardDocument, type CardRecord } from '../core';
import { CardElement } from './element';
import { cardStyle, frameStyle } from './style';
import { cardWords, type CardWords } from './words';

/**
 * One side of a card, drawn with plain elements and `card.css`: no editor,
 * no state. The size follows `scale` (pixels per millimetre; 96 / 25.4 is
 * actual size on a screen), the words follow `record` (one member's data),
 * and with `bleed` the area past the cut line is drawn too, square, as the
 * printer needs it.
 */

export interface CardViewProps {
  /** The card to draw. */
  document: CardDocument;
  /** Which side. Default: the front. */
  face?: 'front' | 'back' | undefined;
  /** Pixels per millimetre, or a CSS length (`'1mm'` to print). Default: actual size on a screen. */
  scale?: number | string | undefined;
  /** The member the card is filled in for. Without one, variables show as written. */
  record?: CardRecord | null | undefined;
  /** Mark each `{{variable}}` where it is not filled in. */
  markVariables?: boolean | undefined;
  /** Draw this many millimetres past the cut line, for printing. Default: none — the card as cut. */
  bleed?: number | undefined;
  /** A media key's address: side pictures, images and logo files. */
  assetUrl?: ((key: string) => string) | undefined;
  /** The words for screen readers. Default: English. */
  words?: CardWords | undefined;
  /** The name a screen reader hears. Default: the side's ("Front"). */
  label?: string | undefined;
  /** Added to the card's own `bsc` class. */
  className?: string | undefined;
  /** Merged over the card's variables: a position, a shadow. */
  style?: CSSProperties | undefined;
}

export function CardView({
  document,
  face = 'front',
  scale,
  record,
  markVariables,
  bleed = 0,
  assetUrl,
  words = cardWords(),
  label,
  className,
  style,
}: CardViewProps) {
  const format = formatOf(document);
  const side = sideOf(document, face);
  const background = typeof side?.props.background === 'string' ? side.props.background : '#ffffff';
  const picture = side?.props.image as { key: string } | null | undefined;
  return (
    <div
      className={['bsc', bleed > 0 ? 'bsc-bleed' : '', className].filter(Boolean).join(' ')}
      style={{ ...cardStyle(format, scale), '--bleed': String(bleed), ...style } as CSSProperties}
      role="group"
      aria-label={label ?? (face === 'front' ? words.front : words.back)}
    >
      <div
        className="bsc-face"
        style={{
          background,
          ...(picture && assetUrl ? { backgroundImage: `url("${assetUrl(picture.key)}")` } : {}),
        }}
      >
        <div className="bsc-trim">
          {elementsOf(document, face)
            .filter((node) => !node.hidden)
            .map((node) => (
              <div
                key={node.id}
                className={`bsc-el bsc-t-${node.type}`}
                style={frameStyle(frameOf(node))}
              >
                <CardElement
                  node={node}
                  background={background}
                  record={record}
                  markVariables={markVariables}
                  assetUrl={assetUrl}
                  words={words}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
