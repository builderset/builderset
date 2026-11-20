'use client';

import { frameOf, type BuilderNode, type NodeId } from '../../core';
import { useEffect, useRef } from 'react';

import { useEditorContext } from '../context';
import { useFreeCommands } from './commands';
import { formatUnit, unionBounds } from './geometry';
import type { FreeUnit } from './types';

/** Whether a key press is going into a field or into text being written. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/**
 * The free canvas's keys, taken BEFORE the editor's own (a capture listener on
 * the window): arrows nudge rather than do nothing, Escape lets go rather than
 * selecting the artboard, Alt + ↑/↓ restacks with "up" meaning "on top".
 *
 * They act when nothing is focused, or the focus is on the stage or the free
 * layers (`data-free-scope`) — never while typing, and never in a menu or the
 * inspector, where an arrow means what it always means.
 */
export function useFreeKeys({
  artboardId,
  unit,
  editable,
  onAnnounce,
}: {
  artboardId: NodeId;
  unit: FreeUnit;
  editable?: ((node: BuilderNode) => boolean) | undefined;
  onAnnounce: (text: string) => void;
}): void {
  const { store, messages } = useEditorContext();
  const commands = useFreeCommands(unit.decimals);
  const latest = useRef({ artboardId, unit, editable, onAnnounce, commands, messages });
  latest.current = { artboardId, unit, editable, onAnnounce, commands, messages };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTyping(event.target)) return;
      const target = event.target;
      const inScope =
        target === document.body ||
        target === document.documentElement ||
        (target instanceof Element && target.closest('[data-free-scope]') !== null);
      if (!inScope) return;
      const { artboardId: boardId, unit: u, editable: canEdit, commands: run } = latest.current;
      const words = latest.current.messages.free;
      const state = store.getState();
      const children = state.doc.nodes[boardId]?.children ?? [];
      const ids = state.selection.filter((id) => children.includes(id));
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key;
      const inLayers = target instanceof Element && target.closest('[data-free-layers]') !== null;

      const take = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      if (key.startsWith('Arrow') && event.altKey && !mod) {
        // Alt + ↑/↓: a layer up (on top) or down. ← and → are left alone.
        const first = ids[0];
        if (ids.length !== 1 || !first || (key !== 'ArrowUp' && key !== 'ArrowDown')) return;
        take();
        run.restack(first, key === 'ArrowUp' ? 'forward' : 'backward');
        return;
      }
      if (key.startsWith('Arrow') && !mod) {
        // In the layers, ↑ and ↓ walk the rows (the panel handles them).
        if (inLayers || ids.length === 0) return;
        take();
        const step = event.shiftKey ? u.bigNudge : u.nudge;
        const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
        const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
        run.nudge(ids, dx, dy);
        const moved = store.getState().doc.nodes;
        const box = unionBounds(ids.map((id) => frameOf(moved[id])));
        if (box)
          latest.current.onAnnounce(words.movedTo(formatUnit(box.x, u), formatUnit(box.y, u)));
        return;
      }
      if (key === 'Enter' && !mod && !inLayers) {
        const first = ids[0];
        const node = first ? state.doc.nodes[first] : undefined;
        if (ids.length !== 1 || !node || node.locked || !canEdit?.(node)) return;
        take();
        state.setEditing(node.id);
        return;
      }
      if (key === 'Escape') {
        if (ids.length === 0) return;
        take();
        state.select([]);
        return;
      }
      if (mod && key.toLowerCase() === 'a') {
        take();
        state.select(
          children.filter((id) => {
            const node = state.doc.nodes[id];
            return !!node && !node.hidden && !node.locked;
          }),
        );
        return;
      }
      if (mod && (key === ']' || key === '[')) {
        const first = ids[0];
        if (ids.length !== 1 || !first) return;
        take();
        run.restack(first, key === ']' ? 'forward' : 'backward');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [store]);
}
