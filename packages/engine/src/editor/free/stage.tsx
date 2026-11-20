'use client';

import {
  frameBounds,
  frameOf,
  richTextToPlain,
  type BuilderNode,
  type EditableTextField,
  type FreeFrame,
  type FreeRect,
  type NodeId,
} from '../../core';
import { Lock, RotateCw } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { activeDrag, readPayload, setActiveDrag, type DragPayload } from '../canvas/drop';
import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { InlineText } from '../text/inline-text';
import {
  formatNumber,
  formatUnit,
  linesOf,
  resizeFrame,
  rotateFrom,
  roundFrame,
  snapAxis,
  unionBounds,
  intersects,
  type SnapHit,
} from './geometry';
import { useFreeKeys } from './keys';
import type { FreeHandle, FreeStageProps } from './types';

/**
 * The free canvas: one artboard, its elements at their own x and y, and
 * everything to place them — see README.md.
 *
 * ── Two coordinate spaces ────────────────────────────────────────────────────
 * The artboard is drawn at its natural size (one unit = `unit.px` CSS pixels)
 * and scaled with CSS `zoom`, so the kit's elements never think about zoom.
 * The selection, handles, guides and marquee are drawn over it in SCREEN
 * pixels (one unit = `k`), so they stay the same size at every zoom.
 *
 * ── One gesture, one undo step ───────────────────────────────────────────────
 * While a drag, resize, rotate or marquee is under way the stage draws a
 * preview of the frames it would write; the document is changed once, on
 * release. The history is never fed a frame per pointer move.
 */

const HANDLES: readonly FreeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_CURSOR: Record<FreeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};
/** Screen pixels a press must travel before it is a drag rather than a click. */
const DRAG_START = 3;
/** Room the fit leaves around the artboard: the caption, the footer and the dock. */
const FIT_ROOM = { x: 120, y: 230 };

type Gesture =
  | {
      kind: 'move';
      ids: NodeId[];
      starts: Record<NodeId, FreeFrame>;
      origin: { x: number; y: number };
      moved: boolean;
      /** Pressed on an element already in a multi-selection: a click selects it alone. */
      clicked: NodeId | null;
    }
  | {
      kind: 'resize';
      id: NodeId;
      handle: FreeHandle;
      start: FreeFrame;
      origin: { x: number; y: number };
      ratio: boolean;
    }
  | { kind: 'rotate'; id: NodeId; start: FreeFrame }
  | { kind: 'marquee'; origin: { x: number; y: number }; keep: NodeId[]; moved: boolean };

/** The element area's size, kept current as panels open and the window resizes. */
function useSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      setSize((current) =>
        current.w === element.clientWidth && current.h === element.clientHeight
          ? current
          : { w: element.clientWidth, h: element.clientHeight },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return size;
}

/** A text field outside editing: its words, plain. */
function plainText(field: EditableTextField) {
  return <span key={`${field.nodeId}:${field.path}`}>{richTextToPlain(field.value)}</span>;
}

function liveText(field: EditableTextField) {
  return <InlineText key={`${field.nodeId}:${field.path}`} field={field} />;
}

export function FreeStage({
  artboard,
  unit,
  renderElement,
  editable,
  keepRatio,
  sizeOf,
  guides,
  caption,
  footer,
  label,
  snapThreshold = 6,
}: FreeStageProps) {
  const { store, registry, messages } = useEditorContext();
  const words = messages.free;
  const nodes = useEditor((state) => state.view.nodes);
  const boardNode = nodes[artboard.id];
  const childIds = boardNode?.children ?? [];
  const selection = useEditor((state) => state.selection);
  const editingId = useEditor((state) => state.editingId);
  const hoverId = useEditor((state) => state.hoverId);
  const zoom = useEditor((state) => state.zoom);

  const scrollRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const size = useSize(scrollRef);
  const bleed = artboard.bleed ?? 0;
  const outerW = artboard.width + bleed * 2;
  const outerH = artboard.height + bleed * 2;
  const fitRaw = size.w
    ? Math.min(
        (size.w - FIT_ROOM.x) / (outerW * unit.px),
        (size.h - FIT_ROOM.y) / (outerH * unit.px),
      )
    : 1;
  const fit = Math.max(0.1, Math.min(unit.maxFit ?? 1, fitRaw));
  /** The artboard's CSS zoom over its natural size. */
  const scale = (fit * zoom) / 100;
  /** Screen pixels per unit. */
  const k = unit.px * scale;
  const px = unit.px;

  const [preview, setPreview] = useState<Record<NodeId, FreeFrame> | null>(null);
  const [lines, setLines] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const [marquee, setMarquee] = useState<FreeRect | null>(null);
  const [drop, setDrop] = useState<{ frame: FreeFrame; type: string } | null>(null);
  const [tip, setTip] = useState<{ left: number; top: number; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const gesture = useRef<Gesture | null>(null);
  /** Set while a press focuses an element, so the focus does not select it a second time. */
  const pressing = useRef(false);
  const helpId = useId();

  const here = new Set(childIds);
  const selectedHere = selection.filter((id) => here.has(id));
  const frameFor = (id: NodeId): FreeFrame => preview?.[id] ?? frameOf(nodes[id]);
  const fmt = (value: number) => formatUnit(value, unit);

  // ── Keyboard: nudges, Enter, Escape, select all, restack ─────────────────
  useFreeKeys({ artboardId: artboard.id, unit, editable, onAnnounce: setAnnouncement });

  // ── Pointer → units ──────────────────────────────────────────────────────
  const toUnits = useCallback(
    (clientX: number, clientY: number) => {
      const rect = originRef.current?.getBoundingClientRect();
      return { x: (clientX - (rect?.left ?? 0)) / k, y: (clientY - (rect?.top ?? 0)) / k };
    },
    [k],
  );

  /** Every line a moving box may snap to, leaving out the ones moving. */
  const snapLines = (exclude: ReadonlySet<NodeId>) => {
    const xs = [0, artboard.width / 2, artboard.width];
    const ys = [0, artboard.height / 2, artboard.height];
    if (guides) {
      xs.push(...(artboard.snapX ?? []));
      ys.push(...(artboard.snapY ?? []));
    }
    for (const id of childIds) {
      const node = nodes[id];
      if (!node || node.hidden || exclude.has(id)) continue;
      const box = linesOf(frameBounds(frameOf(node)));
      xs.push(...box.xs);
      ys.push(...box.ys);
    }
    return { xs, ys };
  };

  /** Snap a box on both axes; null hits when Alt says not to. */
  const snapBox = (
    box: FreeRect,
    exclude: ReadonlySet<NodeId>,
    free: boolean,
  ): { x: SnapHit | null; y: SnapHit | null } => {
    if (free) return { x: null, y: null };
    const all = snapLines(exclude);
    const threshold = snapThreshold / k;
    const own = linesOf(box);
    return { x: snapAxis(own.xs, all.xs, threshold), y: snapAxis(own.ys, all.ys, threshold) };
  };

  const showLines = (x: SnapHit | null, y: SnapHit | null) => {
    const next = { x: guides ? (x?.line ?? null) : null, y: guides ? (y?.line ?? null) : null };
    setLines((current) => (current.x === next.x && current.y === next.y ? current : next));
  };

  const showTip = (event: PointerEvent | DragEvent, text: string) => {
    setTip({ left: event.clientX + 16, top: event.clientY + 18, text });
  };

  // ── Gestures ─────────────────────────────────────────────────────────────
  const onMove = (event: PointerEvent) => {
    const current = gesture.current;
    if (!current) return;
    const point = toUnits(event.clientX, event.clientY);

    if (current.kind === 'move') {
      let dx = point.x - current.origin.x;
      let dy = point.y - current.origin.y;
      if (!current.moved) {
        if (Math.hypot(dx, dy) * k < DRAG_START) return;
        current.moved = true;
      }
      if (event.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const moved = current.ids.map((id) => {
        const start = current.starts[id] ?? frameOf(nodes[id]);
        return { ...start, x: start.x + dx, y: start.y + dy };
      });
      const box = unionBounds(moved);
      if (box) {
        const hit = snapBox(box, new Set(current.ids), event.altKey);
        // Shift keeps to one axis: no snapping off it.
        const sx = event.shiftKey && dx === 0 ? null : hit.x;
        const sy = event.shiftKey && dy === 0 ? null : hit.y;
        dx += sx?.delta ?? 0;
        dy += sy?.delta ?? 0;
        showLines(sx, sy);
      }
      const next: Record<NodeId, FreeFrame> = {};
      for (const id of current.ids) {
        const start = current.starts[id] ?? frameOf(nodes[id]);
        next[id] = { ...start, x: start.x + dx, y: start.y + dy };
      }
      setPreview(next);
      const first = current.ids.length === 1 ? next[current.ids[0] ?? ''] : null;
      const shown = first ?? unionBounds(Object.values(next));
      if (shown) showTip(event, `X ${fmt(shown.x)}  Y ${fmt(shown.y)}`);
      return;
    }

    if (current.kind === 'resize') {
      const node = nodes[current.id];
      const corner = current.handle.length === 2;
      let hitX: SnapHit | null = null;
      let hitY: SnapHit | null = null;
      const frame = resizeFrame(
        current.start,
        current.handle,
        point.x - current.origin.x,
        point.y - current.origin.y,
        {
          keepRatio: current.ratio || (event.shiftKey && corner) || (!!node && !!keepRatio?.(node)),
          min: unit.minSize ?? unit.nudge,
          snap: event.altKey
            ? undefined
            : (edges) => {
                const all = snapLines(new Set([current.id]));
                const threshold = snapThreshold / k;
                hitX = edges.x === null ? null : snapAxis([edges.x], all.xs, threshold);
                hitY = edges.y === null ? null : snapAxis([edges.y], all.ys, threshold);
                return { dx: hitX?.delta ?? 0, dy: hitY?.delta ?? 0 };
              },
        },
      );
      showLines(hitX, hitY);
      setPreview({ [current.id]: frame });
      showTip(event, `${formatNumber(frame.w, unit)} × ${fmt(frame.h)}`);
      return;
    }

    if (current.kind === 'rotate') {
      const angle = rotateFrom(current.start, point.x, point.y, {
        step: event.shiftKey,
        free: event.altKey,
      });
      setPreview({ [current.id]: { ...current.start, r: angle } });
      showTip(event, `${String(angle)}°`);
      return;
    }

    // Marquee.
    const box: FreeRect = {
      x: Math.min(current.origin.x, point.x),
      y: Math.min(current.origin.y, point.y),
      w: Math.abs(point.x - current.origin.x),
      h: Math.abs(point.y - current.origin.y),
    };
    if (!current.moved) {
      if ((box.w + box.h) * k < DRAG_START * 2) return;
      current.moved = true;
    }
    setMarquee(box);
    const hits = childIds.filter((id) => {
      const node = nodes[id];
      return !!node && !node.hidden && !node.locked && intersects(frameBounds(frameOf(node)), box);
    });
    const next = [...new Set([...current.keep, ...hits])];
    const state = store.getState();
    if (next.join('|') !== state.selection.join('|')) state.select(next);
  };

  const onUp = () => {
    const current = gesture.current;
    gesture.current = null;
    window.removeEventListener('pointermove', moveListener.current);
    window.removeEventListener('pointerup', upListener.current);
    window.removeEventListener('pointercancel', upListener.current);
    const frames = preview;
    setPreview(null);
    setLines({ x: null, y: null });
    setMarquee(null);
    setTip(null);
    if (!current) return;
    const state = store.getState();

    if (current.kind === 'marquee') {
      if (!current.moved) state.select(current.keep);
      return;
    }
    if (current.kind === 'move' && !current.moved) {
      if (current.clicked) state.select([current.clicked]);
      return;
    }
    if (!frames) return;
    const label =
      current.kind === 'move' ? 'Move' : current.kind === 'resize' ? 'Resize' : 'Rotate';
    state.updateDocument(label, (draft) => {
      for (const [id, frame] of Object.entries(frames)) {
        const node = draft.nodes[id];
        if (node && !node.locked) node.props.frame = roundFrame(frame, unit.decimals);
      }
    });
    const ids = Object.keys(frames);
    const one = ids.length === 1 ? frames[ids[0] ?? ''] : undefined;
    const box = one ?? unionBounds(Object.values(frames));
    if (!box) return;
    if (current.kind === 'move') setAnnouncement(words.movedTo(fmt(box.x), fmt(box.y)));
    else if (current.kind === 'resize') setAnnouncement(words.resizedTo(fmt(box.w), fmt(box.h)));
    else if (one) setAnnouncement(words.rotatedTo(String(Math.round(one.r))));
  };

  // The window listeners are added once per gesture; these refs always call
  // the newest closures, which see the newest preview.
  const onMoveRef = useRef<(event: PointerEvent) => void>(() => undefined);
  const onUpRef = useRef<() => void>(() => undefined);
  const moveListener = useRef((event: PointerEvent) => {
    onMoveRef.current(event);
  });
  const upListener = useRef(() => {
    onUpRef.current();
  });
  useLayoutEffect(() => {
    onMoveRef.current = onMove;
    onUpRef.current = onUp;
  });

  const begin = (next: Gesture) => {
    gesture.current = next;
    // The hover outline would trail behind what is being dragged.
    store.getState().hover(null);
    window.addEventListener('pointermove', moveListener.current);
    window.addEventListener('pointerup', upListener.current);
    window.addEventListener('pointercancel', upListener.current);
  };

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', moveListener.current);
      window.removeEventListener('pointerup', upListener.current);
      window.removeEventListener('pointercancel', upListener.current);
    },
    [],
  );

  // ── Pressing ─────────────────────────────────────────────────────────────
  const onElementDown = (event: ReactPointerEvent<HTMLElement>, id: NodeId) => {
    if (event.button !== 0) return;
    const state = store.getState();
    // Inside the text being typed: the caret's, not a drag.
    if (
      state.editingId === id &&
      event.target instanceof Element &&
      event.target.closest('[contenteditable="true"]')
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (state.editingId) state.setEditing(null);
    pressing.current = true;
    event.currentTarget.focus({ preventScroll: true });
    pressing.current = false;

    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    if (additive) {
      const has = state.selection.includes(id);
      state.select(
        has ? state.selection.filter((other) => other !== id) : [...state.selection, id],
      );
      return;
    }
    const wasSelected = state.selection.includes(id);
    if (!wasSelected) state.select([id]);
    const ids = store
      .getState()
      .selection.filter((other) => here.has(other) && !state.doc.nodes[other]?.locked);
    if (ids.length === 0) return;
    const starts: Record<NodeId, FreeFrame> = {};
    for (const other of ids) starts[other] = frameOf(state.doc.nodes[other]);
    begin({
      kind: 'move',
      ids,
      starts,
      origin: toUnits(event.clientX, event.clientY),
      moved: false,
      clicked: wasSelected && store.getState().selection.length > 1 ? id : null,
    });
  };

  const onHandleDown = (event: ReactPointerEvent<HTMLElement>, id: NodeId, handle: FreeHandle) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const node = store.getState().doc.nodes[id];
    if (!node || node.locked) return;
    begin({
      kind: 'resize',
      id,
      handle,
      start: frameOf(node),
      origin: toUnits(event.clientX, event.clientY),
      ratio: false,
    });
  };

  const onRotateDown = (event: ReactPointerEvent<HTMLElement>, id: NodeId) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const node = store.getState().doc.nodes[id];
    if (!node || node.locked) return;
    begin({ kind: 'rotate', id, start: frameOf(node) });
  };

  const onBoardDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const state = store.getState();
    if (state.editingId) state.setEditing(null);
    const keep = event.shiftKey ? state.selection.filter((id) => here.has(id)) : [];
    if (!event.shiftKey && state.selection.length) state.select([]);
    begin({ kind: 'marquee', origin: toUnits(event.clientX, event.clientY), keep, moved: false });
  };

  // ── Dropping from the library ────────────────────────────────────────────
  const payloadOf = (event: DragEvent): DragPayload | null =>
    activeDrag() ?? readPayload(event.dataTransfer);

  const dropFrame = (event: DragEvent): { frame: FreeFrame; type: string } | null => {
    const payload = payloadOf(event);
    if (payload?.kind !== 'type' || !boardNode) return null;
    if (!registry.canContain(boardNode.type, payload.type)) return null;
    const wanted = sizeOf(payload.type, payload.props);
    const point = toUnits(event.clientX, event.clientY);
    let frame: FreeFrame = {
      x: wanted.x ?? point.x - wanted.w / 2,
      y: wanted.y ?? point.y - wanted.h / 2,
      w: wanted.w,
      h: wanted.h,
      r: 0,
    };
    const hit = snapBox(frame, new Set(), event.altKey);
    if (wanted.x === undefined) frame = { ...frame, x: frame.x + (hit.x?.delta ?? 0) };
    if (wanted.y === undefined) frame = { ...frame, y: frame.y + (hit.y?.delta ?? 0) };
    showLines(wanted.x === undefined ? hit.x : null, wanted.y === undefined ? hit.y : null);
    return { frame, type: payload.type };
  };

  const onDragOver = (event: DragEvent) => {
    const next = dropFrame(event);
    if (!next) {
      if (drop) setDrop(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDrop(next);
  };

  const onDragLeave = (event: DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDrop(null);
    setLines({ x: null, y: null });
  };

  const onDrop = (event: DragEvent) => {
    const payload = payloadOf(event);
    const next = dropFrame(event);
    setDrop(null);
    setLines({ x: null, y: null });
    if (!next || payload?.kind !== 'type') return;
    event.preventDefault();
    setActiveDrag(null);
    const state = store.getState();
    const index = state.doc.nodes[artboard.id]?.children?.length ?? 0;
    const id = state.insertElement(
      payload.type,
      { parentId: artboard.id, index },
      { ...payload.props, frame: roundFrame(next.frame, unit.decimals) },
    );
    if (id) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-free-element="${CSS.escape(id)}"]`)?.focus({
          preventScroll: true,
        });
      });
    }
  };

  // ── Drawing ──────────────────────────────────────────────────────────────
  const radius = artboard.radius ?? 0;
  const artboardStyle = {
    width: outerW * px,
    height: outerH * px,
    zoom: scale,
  } as CSSProperties;
  const clipStyle = {
    background: artboard.background,
    // With a bleed the sheet is cut square; the trim's corners are the kit's overlay.
    borderRadius: bleed ? Math.min(4, radius * px) : radius * px,
    boxShadow: artboard.shadow ?? '0 1px 2px rgb(0 0 0 / 0.08), 0 24px 60px rgb(20 23 30 / 0.22)',
  } as CSSProperties;
  const trimStyle = {
    left: bleed * px,
    top: bleed * px,
    width: artboard.width * px,
    height: artboard.height * px,
    '--bld-free-u': `${String(px)}px`,
  } as CSSProperties;

  const single = selectedHere.length === 1 ? selectedHere[0] : undefined;
  const singleNode = single ? nodes[single] : undefined;
  const hovered =
    hoverId && here.has(hoverId) && !selectedHere.includes(hoverId) && !gesture.current
      ? hoverId
      : null;

  const box = (frame: FreeFrame | FreeRect, rotate = true): CSSProperties => ({
    left: frame.x * k,
    top: frame.y * k,
    width: frame.w * k,
    height: frame.h * k,
    transform: rotate && 'r' in frame && frame.r ? `rotate(${String(frame.r)}deg)` : undefined,
  });

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label={label ?? words.stage}
      data-free-scope=""
      className="bld-canvas bld-free-stage bst:relative bst:h-full bst:overflow-auto bst:select-none"
      onPointerDown={(event) => {
        // Outside the artboard: let go of everything.
        if (event.button !== 0 || event.target !== event.currentTarget) return;
        const state = store.getState();
        if (state.editingId) state.setEditing(null);
        if (state.selection.length) state.select([]);
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className="bst:flex bst:min-h-full bst:min-w-fit bst:flex-col bst:items-center bst:justify-center bst:gap-[18px] bst:px-10 bst:pt-[60px] bst:pb-[120px]"
        onPointerDown={(event) => {
          if (event.button !== 0 || event.target !== event.currentTarget) return;
          const state = store.getState();
          if (state.editingId) state.setEditing(null);
          if (state.selection.length) state.select([]);
        }}
      >
        {caption ? (
          <div className="bld-free-caption bst:rounded-full bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-1 bst:font-mono bst:text-xs bst:text-muted-foreground">
            {caption}
          </div>
        ) : null}
        <div
          className="bst:relative bst:flex-none"
          style={{ width: outerW * k, height: outerH * k }}
        >
          <div className="bst:absolute bst:top-0 bst:left-0" style={artboardStyle}>
            <div
              data-free-artboard={artboard.id}
              className={cn(
                'bld-free-artboard bst:absolute bst:inset-0 bst:overflow-clip',
                artboard.className,
              )}
              style={clipStyle}
              onPointerDown={onBoardDown}
            >
              <div
                role="listbox"
                aria-label={words.elementsList}
                aria-multiselectable="true"
                aria-describedby={helpId}
                className="bst:absolute"
                style={trimStyle}
              >
                {artboard.underlay ? (
                  <div
                    aria-hidden="true"
                    className="bst:pointer-events-none bst:absolute bst:inset-0"
                  >
                    {artboard.underlay}
                  </div>
                ) : null}
                {childIds.map((id) => {
                  const node = nodes[id];
                  if (!node) return null;
                  const frame = frameFor(id);
                  const selected = selectedHere.includes(id);
                  const editing = editingId === id;
                  return (
                    <div
                      key={id}
                      role="option"
                      aria-selected={selected}
                      aria-label={nameOf(node, messages.elements)}
                      tabIndex={0}
                      data-node={id}
                      data-free-element={id}
                      data-hidden-node={node.hidden ? '' : undefined}
                      data-locked={node.locked ? '' : undefined}
                      data-editing={editing ? '' : undefined}
                      className={cn(
                        'bld-free-el bst:absolute bst:outline-none',
                        node.locked ? 'bst:cursor-default' : 'bst:cursor-move',
                        editing && 'bst:cursor-text bst:select-text',
                        preview?.[id] && !editing && 'bld-free-moving',
                      )}
                      style={{
                        left: frame.x * px,
                        top: frame.y * px,
                        width: frame.w * px,
                        height: frame.h * px,
                        transform: frame.r ? `rotate(${String(frame.r)}deg)` : undefined,
                        opacity: node.hidden ? 0.28 : undefined,
                      }}
                      onPointerDown={(event) => {
                        onElementDown(event, id);
                      }}
                      onDoubleClick={() => {
                        const state = store.getState();
                        const current = state.doc.nodes[id];
                        if (!current || current.locked || !editable?.(current)) return;
                        state.select([id]);
                        state.setEditing(id);
                      }}
                      onFocus={(event) => {
                        if (pressing.current || event.target !== event.currentTarget) return;
                        const state = store.getState();
                        if (!state.selection.includes(id)) state.select([id]);
                      }}
                      onPointerEnter={() => {
                        if (!gesture.current) store.getState().hover(id);
                      }}
                      onPointerLeave={() => {
                        if (store.getState().hoverId === id) store.getState().hover(null);
                      }}
                    >
                      {renderElement(node, {
                        editing,
                        selected,
                        editText: editing ? liveText : plainText,
                        px,
                      })}
                    </div>
                  );
                })}
                {artboard.overlay ? (
                  <div
                    aria-hidden="true"
                    className="bst:pointer-events-none bst:absolute bst:inset-0"
                  >
                    {artboard.overlay}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* What is drawn in screen pixels, over the artboard: the trim's corner is its origin. */}
          <div
            ref={originRef}
            aria-hidden="true"
            className="bst:pointer-events-none bst:absolute"
            style={{
              left: bleed * k,
              top: bleed * k,
              width: artboard.width * k,
              height: artboard.height * k,
            }}
          >
            {hovered ? (
              <div
                className="bst:absolute bst:border bst:border-[#6d89ff]"
                style={box(frameFor(hovered))}
              />
            ) : null}
            {single && singleNode && !editingId ? (
              <SelectionBox
                frame={frameFor(single)}
                k={k}
                locked={!!singleNode.locked}
                tag={`${formatNumber(frameFor(single).w, unit)} × ${fmt(frameFor(single).h)}`}
                handleLabels={words.handles}
                rotateLabel={words.rotate}
                lockedLabel={words.locked}
                onHandle={(event, handle) => {
                  onHandleDown(event, single, handle);
                }}
                onRotate={(event) => {
                  onRotateDown(event, single);
                }}
              />
            ) : null}
            {single && editingId === single ? (
              <div
                className="bst:absolute bst:border-[1.5px] bst:border-[#6d89ff]"
                style={box(frameFor(single))}
              />
            ) : null}
            {selectedHere.length > 1 ? (
              <MultiBox
                frames={selectedHere.map((id) => frameFor(id))}
                k={k}
                tag={words.selectedCount(selectedHere.length)}
              />
            ) : null}
            {lines.x !== null ? (
              <i
                className="bld-free-guide bst:absolute bst:w-px bst:bg-[#ff3d8b]"
                style={{ left: lines.x * k, top: -20, height: artboard.height * k + 40 }}
              />
            ) : null}
            {lines.y !== null ? (
              <i
                className="bld-free-guide bst:absolute bst:h-px bst:bg-[#ff3d8b]"
                style={{ top: lines.y * k, left: -20, width: artboard.width * k + 40 }}
              />
            ) : null}
            {marquee ? (
              <div
                className="bst:absolute bst:border bst:border-[#6d89ff] bst:bg-[#6d89ff]/10"
                style={box(marquee)}
              />
            ) : null}
            {drop ? (
              <div
                className="bst:absolute bst:grid bst:place-items-center bst:rounded-md bst:border-[1.5px] bst:border-dashed bst:border-[#6d89ff] bst:bg-[#6d89ff]/12 bst:text-[#6d89ff] bst:transition-[left,top] bst:duration-100"
                style={box(drop.frame)}
              >
                <ElementIcon
                  name={registry.get(drop.type)?.icon ?? 'box'}
                  className="bst:size-5 bst:max-h-full bst:max-w-full"
                />
                <span className="bst:sr-only">{words.dropHere}</span>
              </div>
            ) : null}
          </div>
        </div>
        {footer}
      </div>
      {tip ? (
        <div
          aria-hidden="true"
          className="bld-free-tip bst:pointer-events-none bst:fixed bst:z-[95] bst:rounded-md bst:bg-foreground bst:px-[7px] bst:py-1 bst:font-mono bst:text-[11px] bst:font-semibold bst:whitespace-pre bst:text-background"
          style={{ left: tip.left, top: tip.top }}
        >
          {tip.text}
        </div>
      ) : null}
      <p id={helpId} className="bst:sr-only">
        {words.keyboardHelp}
      </p>
      <p role="status" aria-live="polite" className="bst:sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** A layer's name: the writer's, else the element's in the editor's words. */
export function nameOf(
  node: BuilderNode,
  elements: Readonly<Record<string, { name: string } | undefined>>,
): string {
  return node.name ?? elements[node.type]?.name ?? node.type;
}

/** One element's selection: the box, 8 square handles, the rotate handle, the size below. */
function SelectionBox({
  frame,
  k,
  locked,
  tag,
  handleLabels,
  rotateLabel,
  lockedLabel,
  onHandle,
  onRotate,
}: {
  frame: FreeFrame;
  k: number;
  locked: boolean;
  tag: string;
  handleLabels: Record<FreeHandle, string>;
  rotateLabel: string;
  lockedLabel: string;
  onHandle: (event: ReactPointerEvent<HTMLElement>, handle: FreeHandle) => void;
  onRotate: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const bounds = frameBounds(frame);
  return (
    <>
      <div
        className={cn(
          'bld-free-selection bst:absolute bst:border-[1.5px] bst:border-[#6d89ff]',
          locked && 'bst:border-dashed',
        )}
        style={{
          left: frame.x * k,
          top: frame.y * k,
          width: frame.w * k,
          height: frame.h * k,
          transform: frame.r ? `rotate(${String(frame.r)}deg)` : undefined,
        }}
      >
        {locked ? null : (
          <>
            {HANDLES.map((handle) => (
              <button
                key={handle}
                type="button"
                tabIndex={-1}
                aria-label={handleLabels[handle]}
                data-handle={handle}
                onPointerDown={(event) => {
                  onHandle(event, handle);
                }}
                className="bst:pointer-events-auto bst:absolute bst:size-[9px] bst:-translate-x-1/2 bst:-translate-y-1/2 bst:rounded-[2px] bst:border-[1.5px] bst:border-[#6d89ff] bst:bg-white bst:p-0"
                style={{
                  left: handle.includes('w') ? 0 : handle.includes('e') ? '100%' : '50%',
                  top: handle.startsWith('n') ? 0 : handle.startsWith('s') ? '100%' : '50%',
                  cursor: HANDLE_CURSOR[handle],
                }}
              />
            ))}
            <button
              type="button"
              tabIndex={-1}
              aria-label={rotateLabel}
              data-handle="rotate"
              onPointerDown={onRotate}
              className="bst:pointer-events-auto bst:absolute bst:top-[-28px] bst:left-1/2 bst:grid bst:size-5 bst:-translate-x-1/2 bst:cursor-grab bst:place-items-center bst:rounded-full bst:border-[1.5px] bst:border-[#6d89ff] bst:bg-white bst:p-0 bst:text-[#6d89ff]"
            >
              <RotateCw className="bst:size-3" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <span
        className="bld-free-tag bst:absolute bst:inline-flex bst:-translate-x-1/2 bst:items-center bst:gap-1 bst:rounded-[5px] bst:bg-[#6d89ff] bst:px-1.5 bst:py-0.5 bst:font-mono bst:text-[10.5px] bst:font-semibold bst:whitespace-nowrap bst:text-white"
        style={{ left: (bounds.x + bounds.w / 2) * k, top: (bounds.y + bounds.h) * k + 8 }}
      >
        {locked ? <Lock className="bst:size-[11px]" aria-label={lockedLabel} /> : null}
        {tag}
      </span>
    </>
  );
}

/** Several selected: a dashed box on each, one box around them all, "3 selected". */
function MultiBox({ frames, k, tag }: { frames: FreeFrame[]; k: number; tag: string }) {
  const all = unionBounds(frames);
  if (!all) return null;
  return (
    <>
      {frames.map((frame, index) => (
        <div
          key={index}
          className="bst:absolute bst:border bst:border-dashed bst:border-[#6d89ff] bst:opacity-70"
          style={{
            left: frame.x * k,
            top: frame.y * k,
            width: frame.w * k,
            height: frame.h * k,
            transform: frame.r ? `rotate(${String(frame.r)}deg)` : undefined,
          }}
        />
      ))}
      <div
        className="bld-free-selection bst:absolute bst:border-[1.5px] bst:border-[#6d89ff]"
        style={{ left: all.x * k, top: all.y * k, width: all.w * k, height: all.h * k }}
      />
      <span
        className="bld-free-tag bst:absolute bst:-translate-x-1/2 bst:rounded-[5px] bst:bg-[#6d89ff] bst:px-1.5 bst:py-0.5 bst:font-mono bst:text-[10.5px] bst:font-semibold bst:whitespace-nowrap bst:text-white"
        style={{ left: (all.x + all.w / 2) * k, top: (all.y + all.h) * k + 8 }}
      >
        {tag}
      </span>
    </>
  );
}
