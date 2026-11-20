'use client';

import type { BuilderNode } from '@builderset/engine';
import { FreeStage, useEditor, useEditorContext, type FreeUnit } from '@builderset/engine/editor';
import { FlipHorizontal2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  CHIP_ZONE,
  cardSizeOf,
  formatOf,
  formatSpec,
  sideOf,
  TEXT_TYPES,
  type CardDocument,
} from '../core';
import { CardElement } from '../render';
import { useCard, useShownRecord, type CardFace } from './context';

/**
 * The card on the board: the side being designed as the engine's free
 * canvas, in millimetres. Around and over it, what a printer needs to see —
 * the bleed past the cut line (veiled: it is cut off), the cut line itself,
 * the safe area words and codes keep inside, and on a bank card the spot ISO
 * 7816 fixes for the chip. Under it, the flip to the other side (F).
 */

/** Millimetres on the free canvas: six screen pixels each at 100 %, nudged by half a millimetre. */
export const MM: FreeUnit = {
  px: 6,
  label: 'mm',
  decimals: 2,
  nudge: 0.5,
  bigNudge: 5,
  minSize: 0.1,
  maxFit: 3,
};

const EDITABLE = new Set<string>(TEXT_TYPES.filter((type) => type !== 'logo'));
/** Elements that keep their proportions while resized: a square code, a round mark. */
const KEEP_RATIO = new Set(['qr', 'nfc', 'icon', 'chip']);

/** Whether a key press belongs to something being typed in. */
function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/**
 * Typing into a text on the card: plain words, the way they are stored, with
 * `{{member.name}}` as written. Every keystroke is saved (one undo step for
 * the whole edit); Escape or a click elsewhere stops typing.
 */
function InlineText({ node }: { node: BuilderNode }) {
  const { store } = useEditorContext<CardDocument>();
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(typeof node.props.text === 'string' ? node.props.text : '');

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.textContent = initial.current;
    element.focus({ preventScroll: true });
    // The caret at the end: a key pressed right away adds to the words rather than replacing them.
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const save = () => {
    const text = (ref.current?.innerText ?? '').replace(/\n$/, '');
    store.getState().updateNode(node.id, { props: { text } }, 'Text', `card:text:${node.id}`);
  };

  return (
    <div
      ref={ref}
      // `true`, not `plaintext-only`: the stage leaves a press inside `[contenteditable="true"]` to the caret.
      contentEditable="true"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={typeof node.name === 'string' && node.name ? node.name : node.type}
      spellCheck
      className="bsc-editing"
      onInput={save}
      onPaste={(event) => {
        // Words only: a paste from a web page would bring its markup along.
        event.preventDefault();
        const range = window.getSelection()?.getRangeAt(0);
        if (!range) return;
        range.deleteContents();
        const words = document.createTextNode(event.clipboardData.getData('text/plain'));
        range.insertNode(words);
        range.setStartAfter(words);
        range.collapse(true);
        save();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          store.getState().setEditing(null);
          return;
        }
        // Arrows, Delete and the shortcuts belong to the words while typing.
        event.stopPropagation();
      }}
    />
  );
}

/** The veil over the bleed, the cut line, the safe area and the chip's spot, in millimetres. */
function Marks({
  doc,
  face,
  showBleed,
  showSafe,
  guides,
  chipZone,
}: {
  doc: CardDocument;
  face: CardFace;
  showBleed: boolean;
  showSafe: boolean;
  guides: boolean;
  chipZone: string;
}) {
  const format = formatOf(doc);
  const printed = formatSpec(format.format).print;
  const px = MM.px;
  const bleed = printed ? format.print.bleed : 0;
  const safe = format.print.safe;
  const landscape = format.width >= format.height;
  // The veil: the whole bleed square with the cut card taken out of it (even-odd).
  const w = format.width * px;
  const h = format.height * px;
  const b = bleed * px;
  const r = Math.min(format.radius * px, w / 2, h / 2);
  const n = (value: number) => String(Math.round(value * 100) / 100);
  const cut = `M${n(b + r)} ${n(b)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(2 * r - w)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(2 * r - h)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}z`;
  return (
    <>
      <svg
        className={showBleed && guides ? 'bsc-cut' : 'bsc-cut bsc-cut-soft'}
        style={{ left: -b, top: -b }}
        width={w + 2 * b}
        height={h + 2 * b}
        viewBox={`0 0 ${n(w + 2 * b)} ${n(h + 2 * b)}`}
      >
        {b > 0 ? (
          <path
            className="bsc-veil"
            d={`M0 0H${n(w + 2 * b)}V${n(h + 2 * b)}H0Z${cut}`}
            fillRule="evenodd"
          />
        ) : null}
        <path className="bsc-cut-line" d={cut} fill="none" />
      </svg>
      {guides && showSafe && printed && safe > 0 ? (
        <div
          className="bsc-safe"
          style={{
            left: safe * px,
            top: safe * px,
            width: (format.width - 2 * safe) * px,
            height: (format.height - 2 * safe) * px,
            borderRadius: Math.max(0, format.radius - safe) * px,
          }}
        />
      ) : null}
      {guides && format.format === 'bank' && face === 'front' && landscape ? (
        <div
          className="bsc-chip-zone"
          title={chipZone}
          style={{
            left: CHIP_ZONE.x * px,
            top: CHIP_ZONE.y * px,
            width: CHIP_ZONE.width * px,
            height: CHIP_ZONE.height * px,
          }}
        />
      ) : null}
    </>
  );
}

export function CardStage() {
  const { store } = useEditorContext<CardDocument>();
  const card = useCard();
  const { words, viewer, face, setFace, guides, showBleed, showSafe, assetUrl } = card;
  const record = useShownRecord();
  const doc = useEditor<CardDocument, CardDocument>((state) => state.view);
  const format = formatOf(doc);
  const side = sideOf(doc, face) ?? sideOf(doc, 'front');
  const twoSided = format.sides === 2;
  const other: CardFace = face === 'front' ? 'back' : 'front';
  const faceName = face === 'front' ? words.front : words.back;

  // F flips the card, as in the preview — unless something is being typed.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (typing(event.target) || store.getState().editingId || !twoSided) return;
      event.preventDefault();
      setFace(other);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [store, twoSided, other, setFace]);

  if (!side) return null;
  const background = typeof side.props.background === 'string' ? side.props.background : '#ffffff';
  const picture = side.props.image as { key: string } | null;
  const printed = formatSpec(format.format).print;
  const safe = format.print.safe;

  return (
    <div key={face} className="bsc-stage bst:flex bst:h-full bst:min-h-0 bst:flex-col">
      <FreeStage
        artboard={{
          id: side.id,
          width: format.width,
          height: format.height,
          radius: format.radius,
          background: picture
            ? `url("${assetUrl(picture.key)}") center / cover, ${background}`
            : background,
          bleed: printed ? format.print.bleed : 0,
          overlay: (
            <Marks
              doc={doc}
              face={face}
              showBleed={showBleed}
              showSafe={showSafe}
              guides={guides}
              chipZone={words.chipZone}
            />
          ),
          snapX: printed && safe > 0 ? [safe, format.width - safe] : [],
          snapY: printed && safe > 0 ? [safe, format.height - safe] : [],
          className: 'bsc-board',
        }}
        unit={MM}
        guides={guides}
        editable={(node) => EDITABLE.has(node.type)}
        keepRatio={(node) => KEEP_RATIO.has(node.type)}
        sizeOf={(type) => cardSizeOf(type, format.width)}
        renderElement={(node, { editing }) => (
          <CardElement
            node={node}
            background={background}
            record={record}
            markVariables
            assetUrl={assetUrl}
            words={viewer}
            textSlot={editing ? <InlineText node={node} /> : undefined}
          />
        )}
        caption={
          <span className="bst:rounded-full bst:border bst:border-border bst:bg-card bst:px-3 bst:py-1 bst:font-mono bst:text-[11.5px] bst:text-muted-foreground bst:shadow-[0_1px_2px_rgb(20_23_30/0.06)]">
            {twoSided ? words.caption(faceName) : words.caption(words.singleSided)}
          </span>
        }
        footer={
          twoSided ? (
            <div className="bst:flex bst:items-center bst:gap-2">
              <button
                type="button"
                className="bst:inline-flex bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-3 bst:py-1.5 bst:text-[12.5px] bst:font-semibold bst:shadow-[0_1px_2px_rgb(20_23_30/0.06)] bst:transition-colors bst:hover:bg-accent bst:focus-visible:outline-2 bst:focus-visible:outline-primary bst:[&_svg]:size-4"
                onClick={() => {
                  setFace(other);
                }}
              >
                <FlipHorizontal2 aria-hidden="true" />
                {words.flipTo(other === 'front' ? words.front : words.back)}
              </button>
              <kbd className="bst:font-mono bst:text-[11px] bst:text-muted-foreground">F</kbd>
            </div>
          ) : null
        }
      />
    </div>
  );
}
