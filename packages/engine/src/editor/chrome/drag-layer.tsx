'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { dragSnapshot, setActiveDrag, subscribeDrag } from '../canvas/drop';
import { cn } from '../cn';
import { useEditorContext } from '../context';
import { ElementIcon } from '../icons';

const SERVER = { payload: null, ghost: null };

/** The drag in progress, for the parts of the workspace that react to one. */
export function useDragSession() {
  return useSyncExternalStore(subscribeDrag, dragSnapshot, () => SERVER);
}

/**
 * While something is dragged: the card that follows the pointer — trailing a
 * little and tilting with the speed it moves at — and, for blocks already on
 * the page, a target at the foot of the window that deletes what is dropped
 * on it.
 */
export function DragLayer() {
  const { store, messages } = useEditorContext();
  const { payload, ghost } = useDragSession();
  const card = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(false);
  const moving = payload?.kind === 'nodes';

  // Follow the pointer: `dragover` reports where it is, every few ms.
  useEffect(() => {
    if (!ghost) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let target = { x: -400, y: -400 };
    let at: { x: number; y: number } | null = null;
    let frame = 0;
    const onOver = (event: DragEvent) => {
      if (event.clientX === 0 && event.clientY === 0) return;
      target = { x: event.clientX, y: event.clientY };
      at ??= { ...target };
    };
    const loop = () => {
      const element = card.current;
      if (element && at) {
        const k = still ? 1 : 0.32;
        at = { x: at.x + (target.x - at.x) * k, y: at.y + (target.y - at.y) * k };
        const tilt = still ? 0 : Math.max(-9, Math.min(9, (target.x - at.x) * 0.35));
        element.style.transform = `translate(${String(at.x + 18)}px, ${String(at.y + 22)}px) rotate(${String(tilt)}deg)`;
        element.style.opacity = '1';
      }
      frame = requestAnimationFrame(loop);
    };
    const end = () => {
      setActiveDrag(null);
    };
    window.addEventListener('dragover', onOver, true);
    window.addEventListener('dragend', end, true);
    window.addEventListener('drop', end);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('dragover', onOver, true);
      window.removeEventListener('dragend', end, true);
      window.removeEventListener('drop', end);
    };
  }, [ghost]);

  useEffect(() => {
    if (!moving) setHot(false);
  }, [moving]);

  return (
    <>
      {ghost ? (
        <div
          ref={card}
          aria-hidden="true"
          style={{ opacity: 0 }}
          className="bst:pointer-events-none bst:fixed bst:top-0 bst:left-0 bst:z-[90] bst:flex bst:max-w-[280px] bst:items-center bst:gap-2.5 bst:rounded-xl bst:border bst:border-primary/35 bst:bg-card bst:py-2.5 bst:pr-3.5 bst:pl-2.5 bst:text-[13px] bst:font-semibold bst:text-foreground bst:shadow-[0_2px_6px_rgb(20_23_30/0.08),0_24px_60px_rgb(20_23_30/0.18)] bst:will-change-transform"
        >
          <span className="bst:grid bst:size-8 bst:shrink-0 bst:place-items-center bst:rounded-[9px] bst:bg-primary/12 bst:text-primary">
            <ElementIcon name={ghost.icon ?? 'box'} className="bst:size-4" />
          </span>
          <span className="bst:min-w-0">
            <span className="bst:block bst:truncate">{ghost.label}</span>
            {ghost.detail ? (
              <small className="bst:block bst:max-w-[200px] bst:truncate bst:text-[11.5px] bst:font-normal bst:text-muted-foreground">
                {ghost.detail}
              </small>
            ) : null}
          </span>
          {ghost.count && ghost.count > 1 ? (
            <span className="bst:absolute bst:-top-2 bst:-right-2 bst:grid bst:h-5 bst:min-w-5 bst:place-items-center bst:rounded-full bst:bg-primary bst:px-[5px] bst:text-[11px] bst:text-primary-foreground">
              {ghost.count}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        role="region"
        aria-label={messages.dropToDelete}
        onDragOver={(event) => {
          if (!moving) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setHot(true);
        }}
        onDragLeave={() => {
          setHot(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (payload?.kind === 'nodes') store.getState().removeNodes(payload.ids);
          setHot(false);
          setActiveDrag(null);
        }}
        className={cn(
          'bst:fixed bst:bottom-[22px] bst:left-1/2 bst:z-[70] bst:flex bst:h-11 bst:-translate-x-1/2 bst:items-center bst:gap-2 bst:rounded-full bst:border bst:px-[18px] bst:text-[13px] bst:font-semibold bst:shadow-[0_2px_6px_rgb(20_23_30/0.08),0_24px_60px_rgb(20_23_30/0.18)] bst:transition-[transform,opacity,background-color,color] bst:duration-300 bst:ease-[cubic-bezier(.34,1.4,.5,1)]',
          moving
            ? 'bst:translate-y-0 bst:opacity-100'
            : 'bst:pointer-events-none bst:translate-y-[30px] bst:opacity-0',
          hot
            ? 'bst:scale-[1.08] bst:border-destructive bst:bg-destructive bst:text-white'
            : 'bst:border-border bst:bg-card bst:text-muted-foreground',
        )}
      >
        <Trash2 className="bst:size-4" aria-hidden="true" />
        {messages.dropToDelete}
      </div>
    </>
  );
}
