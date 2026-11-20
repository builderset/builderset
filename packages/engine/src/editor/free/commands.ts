'use client';

import { frameOf, indexInParent, parentOf, type FreeFrame, type NodeId } from '../../core';
import { useMemo } from 'react';

import { useEditorContext } from '../context';
import type { EditorActions } from '../store';
import { alignNodes, distributeNodes, moveFramesBy, writeFrame } from './operations';
import type { FreeAlign, FreeBoard } from './types';

/**
 * Elements glide into place after an align or a spread, rather than jump: the
 * artboard carries `data-glide` for a moment and its CSS transitions `left`
 * and `top` (reduced motion turns the transition off, as everywhere in the
 * editor). Every stage on the page is told, which is at most one.
 */
const GLIDE_MS = 320;
let glideTimer: ReturnType<typeof setTimeout> | undefined;

export function glide(): void {
  if (typeof document === 'undefined') return;
  const boards = document.querySelectorAll('[data-free-artboard]');
  for (const board of boards) board.setAttribute('data-glide', '');
  clearTimeout(glideTimer);
  glideTimer = setTimeout(() => {
    for (const board of document.querySelectorAll('[data-glide]')) {
      board.removeAttribute('data-glide');
    }
  }, GLIDE_MS);
}

export type FreeRestack = 'forward' | 'backward' | 'front' | 'back';

export interface FreeCommands {
  /** Change one element's frame; `coalesceKey` merges a run of them (typing in a field) into one step. */
  setFrame(id: NodeId, patch: Partial<FreeFrame>, coalesceKey?: string): void;
  /** Move by (`dx`, `dy`) units; nudges in a row make one undo step. */
  nudge(ids: readonly NodeId[], dx: number, dy: number): void;
  align(ids: readonly NodeId[], align: FreeAlign, board: Pick<FreeBoard, 'width' | 'height'>): void;
  distribute(ids: readonly NodeId[], axis: 'x' | 'y'): void;
  /** Up or down the stacking order — the last child is on top. */
  restack(id: NodeId, to: FreeRestack): boolean;
}

/**
 * The free canvas's changes as editor commands: each one undo step, through
 * the store's `updateDocument`. `decimals` is the unit's.
 */
export function useFreeCommands(decimals = 2): FreeCommands {
  const { store } = useEditorContext();
  return useMemo<FreeCommands>(() => {
    const update: EditorActions['updateDocument'] = (label, recipe, key) => {
      store.getState().updateDocument(label, recipe, key);
    };
    return {
      setFrame(id, patch, coalesceKey) {
        const node = store.getState().doc.nodes[id];
        if (!node || node.locked) return;
        update(
          'Layout',
          (draft) => {
            writeFrame(draft, id, { ...frameOf(draft.nodes[id]), ...patch }, decimals);
          },
          coalesceKey,
        );
      },
      nudge(ids, dx, dy) {
        if (ids.length === 0) return;
        update(
          'Nudge',
          (draft) => {
            moveFramesBy(draft, ids, dx, dy, decimals);
          },
          `free-nudge:${[...ids].sort().join(',')}`,
        );
      },
      align(ids, align, board) {
        update('Align', (draft) => {
          alignNodes(draft, ids, align, board, decimals);
        });
        glide();
      },
      distribute(ids, axis) {
        update('Spread evenly', (draft) => {
          distributeNodes(draft, ids, axis, decimals);
        });
        glide();
      },
      restack(id, to) {
        const state = store.getState();
        const parent = parentOf(state.doc, id);
        const count = parent?.children?.length ?? 0;
        if (!parent || count < 2) return false;
        const index = indexInParent(state.doc, id);
        // `moveNodes` takes the index among the children as they are now.
        const target =
          to === 'forward' ? index + 2 : to === 'backward' ? index - 1 : to === 'front' ? count : 0;
        if (target < 0 || target > count) return false;
        if ((to === 'forward' || to === 'front') && index === count - 1) return false;
        if ((to === 'backward' || to === 'back') && index === 0) return false;
        return state.moveNodes([id], parent.id, target);
      },
    };
  }, [store, decimals]);
}
