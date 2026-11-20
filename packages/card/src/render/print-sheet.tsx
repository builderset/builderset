import type { CSSProperties } from 'react';

import { formatOf, printedFaces, roundTo, type CardDocument, type CardRecord } from '../core';
import { CardView } from './card-view';
import { cardWords, type CardWords } from './words';

/**
 * The cards as a printer wants them: one page per side per member, each
 * card at its real size in millimetres with its bleed, and crop marks at the
 * corners showing where to cut. Print the page (or save it as a PDF) with
 * margins off; `@page` sets the paper to the card's size.
 */

export interface CardPrintSheetProps {
  /** The card to print: its printed sides, at its own size and bleed. */
  document: CardDocument;
  /** One card per member, in order. Default: one card, its variables as written. */
  records?: readonly CardRecord[] | undefined;
  /** A media key's address: side pictures, images and logo files. */
  assetUrl?: ((key: string) => string) | undefined;
  /** Crop marks at the corners. Default: on. */
  cropMarks?: boolean | undefined;
  /** The words for screen readers. Default: English. */
  words?: CardWords | undefined;
  /** Added to the sheet's own `bsc-sheet` class. */
  className?: string | undefined;
}

/** Millimetres of paper around the bleed, where the crop marks are drawn. */
const MARGIN = 8;

export function CardPrintSheet({
  document,
  records,
  assetUrl,
  cropMarks = true,
  words = cardWords(),
  className,
}: CardPrintSheetProps) {
  const format = formatOf(document);
  const bleed = format.print.bleed;
  const pageW = roundTo(format.width + 2 * (bleed + MARGIN));
  const pageH = roundTo(format.height + 2 * (bleed + MARGIN));
  const members: readonly (CardRecord | null)[] = records?.length ? records : [null];
  const faces = printedFaces(document);
  // Crop marks: short lines in the margin, in line with the cut, stopping
  // a millimetre short of the bleed so none is printed on the card.
  const left = MARGIN + bleed;
  const top = MARGIN + bleed;
  const reach = MARGIN - 1;
  const n = (value: number) => String(value);
  const lines = [
    ...[left, left + format.width].flatMap((x) => [
      `M${n(x)} 0v${n(reach)}`,
      `M${n(x)} ${n(pageH - reach)}v${n(reach)}`,
    ]),
    ...[top, top + format.height].flatMap((y) => [
      `M0 ${n(y)}h${n(reach)}`,
      `M${n(pageW - reach)} ${n(y)}h${n(reach)}`,
    ]),
  ];
  const marks = (
    <svg className="bsc-crop" viewBox={`0 0 ${n(pageW)} ${n(pageH)}`} aria-hidden="true">
      <path d={lines.join('')} stroke="#000000" strokeWidth="0.25" fill="none" />
    </svg>
  );
  return (
    <div
      className={['bsc-sheet', className].filter(Boolean).join(' ')}
      style={
        {
          '--page-w': `${String(pageW)}mm`,
          '--page-h': `${String(pageH)}mm`,
          '--margin': String(MARGIN),
          '--bleed': String(bleed),
        } as CSSProperties
      }
    >
      <style>{`@page { size: ${String(pageW)}mm ${String(pageH)}mm; margin: 0; }`}</style>
      {members.map((record, index) =>
        faces.map((face) => {
          const side = face === 'front' ? words.front : words.back;
          return (
            <section
              key={`${String(index)}-${face}`}
              className="bsc-page"
              aria-label={words.page(side, index + 1, members.length)}
            >
              <CardView
                document={document}
                face={face}
                scale="1mm"
                record={record}
                bleed={bleed}
                assetUrl={assetUrl}
                words={words}
              />
              {cropMarks ? marks : null}
            </section>
          );
        }),
      )}
    </div>
  );
}
