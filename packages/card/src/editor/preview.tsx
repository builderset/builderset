'use client';

import { SegmentedControl } from '@builderset/engine/ui';
import { FlipHorizontal2, Maximize2, Ruler } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { formatOf, roundTo, type CardDocument } from '../core';
import { ACTUAL_SIZE, CardView } from '../render';
import { useCard } from './context';

/**
 * The preview: the card as a thing in the hand. It tilts with the mouse,
 * turns over on a click (or F), and stands at its real size on the screen —
 * 96 CSS pixels to the inch, so a real card held against the glass matches —
 * or large, to look at the details. The members switch fills it in for each.
 * With reduced motion it neither tilts nor spins: the flip is instant.
 */
export function CardPreview({ doc }: { doc: CardDocument }) {
  const { words, viewer, records, recordIndex, setRecordIndex, assetUrl } = useCard();
  const format = formatOf(doc);
  const [size, setSize] = useState<'actual' | 'large'>('actual');
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [room, setRoom] = useState({ width: 1200, height: 800 });
  const box = useRef<HTMLDivElement>(null);
  const twoSided = format.sides === 2;
  const record = records[recordIndex] ?? records[0] ?? null;

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      setRoom({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f' && twoSided && !event.ctrlKey && !event.metaKey) {
        setFlipped((was) => !was);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [twoSided]);

  const scale =
    size === 'actual'
      ? ACTUAL_SIZE
      : Math.max(
          ACTUAL_SIZE,
          Math.min((room.width - 120) / format.width, (room.height - 160) / format.height, 9),
        );
  const face = (side: 'front' | 'back') => (
    <CardView
      document={doc}
      face={side}
      scale={scale}
      record={record}
      assetUrl={assetUrl}
      words={viewer}
      className="bsc-preview-face"
      style={{
        position: 'absolute',
        inset: 0,
        backfaceVisibility: 'hidden',
        transform: side === 'back' ? 'rotateY(180deg)' : undefined,
        boxShadow: '0 30px 60px rgb(15 17 22 / 0.28), 0 4px 10px rgb(15 17 22 / 0.12)',
        borderRadius: `${String(format.radius * scale)}px`,
      }}
    />
  );

  return (
    <div className="bst:flex bst:h-full bst:min-h-[70vh] bst:flex-col bst:items-center bst:gap-4 bst:py-4">
      <div className="bst:flex bst:flex-wrap bst:items-center bst:justify-center bst:gap-2">
        <SegmentedControl
          aria-label={words.actualSize}
          value={size}
          onValueChange={setSize}
          options={[
            {
              value: 'actual',
              label: (
                <span className="bst:inline-flex bst:items-center bst:gap-1.5">
                  <Ruler className="bst:size-3.5" aria-hidden="true" />
                  {words.actualSize}
                </span>
              ),
            },
            {
              value: 'large',
              label: (
                <span className="bst:inline-flex bst:items-center bst:gap-1.5">
                  <Maximize2 className="bst:size-3.5" aria-hidden="true" />
                  {words.large}
                </span>
              ),
            },
          ]}
        />
        {records.length > 1 ? (
          <SegmentedControl
            aria-label={words.exampleMember}
            value={String(recordIndex)}
            onValueChange={(value) => {
              setRecordIndex(Number(value));
            }}
            options={records.map((member, index) => ({
              value: String(index),
              label: member['member.name'] ?? Object.values(member)[0] ?? String(index + 1),
            }))}
          />
        ) : null}
        {twoSided ? (
          <button
            type="button"
            onClick={() => {
              setFlipped((was) => !was);
            }}
            className="bst:inline-flex bst:h-8 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-3 bst:text-xs bst:font-semibold bst:hover:bg-accent bst:[&_svg]:size-3.5"
          >
            <FlipHorizontal2 aria-hidden="true" />
            {words.flip}
          </button>
        ) : null}
      </div>
      <div
        ref={box}
        className="bst:grid bst:w-full bst:flex-1 bst:place-items-center bst:[perspective:1600px]"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTilt({
            y: ((event.clientX - rect.left) / rect.width - 0.5) * 30,
            x: -((event.clientY - rect.top) / rect.height - 0.5) * 22,
          });
        }}
        onPointerLeave={() => {
          setTilt({ x: 0, y: 0 });
        }}
      >
        <button
          type="button"
          aria-label={twoSided ? words.flip : viewer.front}
          aria-pressed={twoSided ? flipped : undefined}
          disabled={!twoSided}
          onClick={() => {
            setFlipped((was) => !was);
          }}
          className="bsc-preview-card bst:relative bst:cursor-pointer bst:border-0 bst:bg-transparent bst:p-0 bst:[transform-style:preserve-3d] bst:disabled:cursor-default"
          style={
            {
              width: format.width * scale,
              height: format.height * scale,
              '--tilt': `rotateX(${String(tilt.x)}deg) rotateY(${String(tilt.y + (flipped ? 180 : 0))}deg)`,
              '--turn': `rotateY(${flipped ? '180' : '0'}deg)`,
            } as CSSProperties
          }
        >
          {face('front')}
          {twoSided ? face('back') : null}
        </button>
      </div>
      <p className="bst:max-w-xl bst:px-6 bst:text-center bst:text-[12.5px] bst:text-muted-foreground">
        {size === 'actual'
          ? words.actualHint(String(roundTo(format.width)), String(roundTo(format.height)))
          : words.largeHint}{' '}
        {words.tiltHint}
      </p>
    </div>
  );
}
