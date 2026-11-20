'use client';

import { type BuilderNode } from '@builderset/engine';
import {
  FreeLayersPanel,
  FreeStage,
  useEditor,
  type FreeSize,
  type FreeUnit,
} from '@builderset/engine/editor';
import { RotateCcw } from 'lucide-react';
import { useEffect, useId, useMemo, useRef } from 'react';

import {
  exampleData,
  formatOf,
  POPUP_ELEMENT_SIZES,
  POPUP_ROOT,
  POPUP_TYPES,
  TEXT_TYPES,
  type PopupDocument,
  type PopupFormat,
} from '../core';
import { PopupElementContent, SHADOWS } from '../render';
import { usePopup } from './context';

/**
 * The popup on the board: the engine's free canvas with the popup as its
 * artboard, in CSS pixels — its corners, its background and its shadow as on
 * the site — the type above it, and "Replay how it appears" below.
 */

/** A popup counts in CSS pixels; arrows nudge by 1, Shift + arrows by 10. */
export const PX: FreeUnit = {
  px: 1,
  label: 'px',
  decimals: 0,
  nudge: 1,
  bigNudge: 10,
  maxFit: 1.4,
};

const TEXT = new Set<string>(TEXT_TYPES);

export const sizeOf = (type: string): FreeSize => POPUP_ELEMENT_SIZES[type] ?? { w: 120, h: 40 };

/** The entrance's first frame, as the site plays it. */
function entranceFrom(format: PopupFormat): string {
  const left = format.position.includes('left');
  switch (format.motion.enter) {
    case 'scale':
      return 'scale(0.86)';
    case 'up':
      return 'translateY(40px)';
    case 'side':
      return left ? 'translateX(-60px)' : 'translateX(60px)';
    default:
      return 'none';
  }
}

export function PopupStage() {
  const { words, visitor, guides, exampleData: example, fields, replays, assetUrl } = usePopup();
  const format = useEditor<PopupFormat, PopupDocument>((state) => formatOf(state.view));
  const marker = `bsp-artboard-${useId().replace(/[^\w-]/g, '')}`;
  const data = useMemo(() => (example ? exampleData(fields) : undefined), [example, fields]);
  const fill = POPUP_TYPES[format.type].fill;

  // Each replay plays the entrance again, the way the site will.
  const played = useRef(replays);
  useEffect(() => {
    if (played.current === replays) return;
    played.current = replays;
    const artboard = document.querySelector<HTMLElement>(`.${marker}`);
    if (!artboard || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (format.motion.enter === 'none') return;
    artboard.animate(
      [
        { opacity: 0, transform: entranceFrom(format) },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: format.motion.duration,
        easing:
          format.motion.enter === 'scale'
            ? 'cubic-bezier(.34,1.4,.5,1)'
            : 'cubic-bezier(.2,.8,.2,1)',
      },
    );
  }, [replays, marker, format]);

  const context = { format, words: visitor, data, assetUrl };
  return (
    <FreeStage
      artboard={{
        id: POPUP_ROOT,
        width: format.width,
        height: format.height,
        radius: fill === 'none' ? format.radius : 6,
        background: format.background,
        shadow: SHADOWS[format.shadow === 'none' ? 'soft' : format.shadow],
        className: marker,
      }}
      unit={PX}
      guides={guides}
      sizeOf={sizeOf}
      editable={(node: BuilderNode) => TEXT.has(node.type)}
      keepRatio={(node: BuilderNode) => node.type === 'qr' || node.type === 'icon'}
      renderElement={(node, { editing, editText }) => (
        <PopupElementContent
          node={node}
          context={context}
          editText={editing ? editText : undefined}
        />
      )}
      caption={
        <span className="bst:rounded-full bst:bg-card bst:px-2.5 bst:py-1 bst:font-mono bst:text-[11.5px] bst:text-muted-foreground bst:shadow-[0_0_0_1px_var(--builderset-border)]">
          {words.workingView(words.types[format.type])}
        </span>
      }
      footer={<ReplayButton />}
    />
  );
}

/** "Replay how it appears", and R does the same while nobody is typing. */
function ReplayButton() {
  const { words, replay } = usePopup();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      )
        return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== 'r') return;
      replay();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [replay]);
  return (
    <span className="bst:flex bst:items-center bst:gap-2">
      <button
        type="button"
        onClick={replay}
        className="bld-focus bst:inline-flex bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-[9px] bst:bg-card bst:px-3 bst:py-1.5 bst:text-xs bst:font-semibold bst:shadow-[0_0_0_1px_var(--builderset-border)] bst:transition-colors bst:hover:bg-accent bst:[&_svg]:size-3.5"
      >
        <RotateCcw aria-hidden="true" />
        {words.replay}
      </button>
      <kbd className="bst:font-mono bst:text-[11px] bst:text-muted-foreground">R</kbd>
    </span>
  );
}

/** The Layers tab: the popup's elements, topmost first. */
export function PopupLayers() {
  const { words } = usePopup();
  const count = useEditor<number, PopupDocument>(
    (state) => state.view.nodes[POPUP_ROOT]?.children?.length ?? 0,
  );
  return <FreeLayersPanel artboardId={POPUP_ROOT} summary={words.layersSummary(count)} />;
}
