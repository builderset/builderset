'use client';

import { inOrder, type BuilderDocument } from '../../core';
import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Blocks slide to their new places instead of jumping — FLIP.
 *
 * After every render that changed the document's STRUCTURE (a move, a drop, a
 * duplicate, a delete, undo of any of those), each block is measured again and
 * played from where it was to where it is now. New blocks rise in. Typing does
 * not trigger it: the order of the blocks is the same, and a paragraph growing
 * a line should push the rest down instantly, not wobble them.
 *
 * Nested blocks move with their parent, so a child is animated only by the part
 * of its movement its parent does not already carry — otherwise a column moved
 * with its section would travel twice the distance.
 */

interface Place {
  x: number;
  y: number;
}

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const DURATION = 320;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useFlip(
  pageRef: RefObject<HTMLElement | null>,
  doc: BuilderDocument,
  scale: number,
): void {
  const places = useRef<Map<string, Place>>(new Map());
  const signature = useRef('');

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const outer = page.getBoundingClientRect();
    const next = new Map<string, Place>();
    const elements = new Map<string, HTMLElement>();
    for (const element of page.querySelectorAll<HTMLElement>('[data-node]')) {
      const id = element.dataset.node;
      if (!id) continue;
      const rect = element.getBoundingClientRect();
      next.set(id, { x: (rect.left - outer.left) / scale, y: (rect.top - outer.top) / scale });
      elements.set(id, element);
    }

    const order = inOrder(doc)
      .map((node) => `${node.id}>${node.children?.join(',') ?? ''}`)
      .join('|');
    const previous = places.current;
    const structural = signature.current !== '' && order !== signature.current;
    signature.current = order;
    places.current = next;
    if (!structural || previous.size === 0) return;
    // No Web Animations (jsdom, very old browsers): blocks simply move.
    if (typeof page.animate !== 'function') return;

    const reduced = reducedMotion();
    const carried = new Map<string, Place>();
    for (const node of inOrder(doc)) {
      const element = elements.get(node.id);
      const now = next.get(node.id);
      if (!element || !now) continue;
      const before = previous.get(node.id);
      // The movement the nearest animated ancestor already applies.
      let inherited: Place = { x: 0, y: 0 };
      let parent = element.parentElement?.closest<HTMLElement>('[data-node]');
      while (parent) {
        const parentId = parent.dataset.node;
        const carriedByParent = parentId ? carried.get(parentId) : undefined;
        if (carriedByParent) {
          inherited = carriedByParent;
          break;
        }
        parent = parent.parentElement?.closest<HTMLElement>('[data-node]');
      }

      if (!before) {
        // Arrived: rise in, unless it arrived inside a block that is itself new.
        if (inherited.x === 0 && inherited.y === 0 && !parentIsNew(element, previous)) {
          element.animate(
            reduced
              ? [{ opacity: 0 }, { opacity: 1 }]
              : [
                  { opacity: 0, transform: 'translateY(10px) scale(0.985)' },
                  { opacity: 1, transform: 'none' },
                ],
            { duration: DURATION, easing: EASE },
          );
        }
        continue;
      }

      const dx = before.x - now.x;
      const dy = before.y - now.y;
      const total = { x: dx, y: dy };
      const own = { x: dx - inherited.x, y: dy - inherited.y };
      if (Math.abs(own.x) < 1 && Math.abs(own.y) < 1) {
        if (inherited.x !== 0 || inherited.y !== 0) carried.set(node.id, inherited);
        continue;
      }
      carried.set(node.id, total);
      if (reduced) continue;
      element.animate(
        [{ transform: `translate(${String(own.x)}px, ${String(own.y)}px)` }, { transform: 'none' }],
        { duration: DURATION, easing: EASE },
      );
    }
  }, [pageRef, doc, scale]);
}

function parentIsNew(element: HTMLElement, previous: Map<string, Place>): boolean {
  const parent = element.parentElement?.closest<HTMLElement>('[data-node]');
  const id = parent?.dataset.node;
  return id !== undefined && !previous.has(id);
}
