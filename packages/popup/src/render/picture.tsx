import { localize } from '@builderset/engine';
import type { ReactNode } from 'react';

import { elementsOf, formatOf, type PopupDocument } from '../core';
import { frameStyle, PopupElementContent } from './elements';
import { popupStyle } from './style';
import { popupWords, type PopupWords } from './words';

/**
 * A popup as a still picture at its design size: no trigger, no motion,
 * nothing clickable. For a list of popups, a template's thumbnail, the
 * editor's library peek — anywhere it is looked at rather than used.
 */
export interface PopupPictureProps {
  document: PopupDocument;
  locale?: string | undefined;
  words?: PopupWords | undefined;
  /** The variables' values. Omitted: a variable shows as `{{path}}`. */
  data?: unknown;
  assetUrl?: ((key: string) => string) | undefined;
  /** Drawn at this fraction of its size. Default: 1. */
  scale?: number | undefined;
  className?: string | undefined;
}

export function PopupPicture({
  document: stored,
  locale,
  words,
  data,
  assetUrl,
  scale = 1,
  className,
}: PopupPictureProps): ReactNode {
  const doc = locale ? localize(stored, locale) : stored;
  const format = formatOf(doc);
  const context = { format, words: words ?? popupWords(locale), data, assetUrl };
  return (
    <div
      className={['bsp', 'bsp-picture', `bsp-t-${format.type}`, className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={popupStyle(format, scale)}
    >
      <div className="bsp-box">
        <div className="bsp-stage">
          {elementsOf(doc)
            .filter((node) => !node.hidden && !(node.type === 'close' && !format.motion.closeX))
            .map((node) => (
              <div key={node.id} className={`bsp-el bsp-e-${node.type}`} style={frameStyle(node)}>
                <PopupElementContent node={node} context={context} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
