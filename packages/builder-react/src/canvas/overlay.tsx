'use client';

import { indexInParent, parentOf, replaceableTypes, type NodeId } from '@motors/builder-core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@motors/ui';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpLeft,
  Copy,
  EyeOff,
  GripVertical,
  Lock,
  MoreHorizontal,
  Plus,
  Repeat2,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { InsertMenu } from '../panels/insert-menu';
import { DRAG_NODES_MIME, setActiveDrag, type DropTarget } from './drop';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where a node's element sits inside the page, in the page's own (unzoomed) pixels. */
function measure(page: HTMLElement, id: NodeId, scale: number): Box | null {
  const element = page.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
  if (!element) return null;
  const outer = page.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  // `zoom` on an ancestor: rects come back scaled, positions inside do not.
  return {
    top: (rect.top - outer.top) / scale,
    left: (rect.left - outer.left) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

/** Re-measure whenever anything that moves blocks around changes. */
function useBoxes(
  pageRef: RefObject<HTMLDivElement | null>,
  ids: readonly NodeId[],
  scale: number,
): Record<NodeId, Box> {
  const revision = useEditor((state) => state.revision);
  const viewport = useEditor((state) => state.viewport);
  const [boxes, setBoxes] = useState<Record<NodeId, Box>>({});
  const key = ids.join('|');

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next: Record<NodeId, Box> = {};
        for (const id of key ? key.split('|') : []) {
          const box = measure(page, id, scale);
          if (box) next[id] = box;
        }
        setBoxes(next);
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(page);
    window.addEventListener('resize', update);
    // Images load late and change heights; the observer on the page sees that.
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [pageRef, key, scale, revision, viewport]);

  return boxes;
}

export function Overlay({
  pageRef,
  scale,
  drop,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
  scale: number;
  drop: DropTarget | null;
}) {
  const selection = useEditor((state) => state.selection);
  const hoverId = useEditor((state) => state.hoverId);
  const doc = useEditor((state) => state.doc);
  const { messages, registry } = useEditorContext();

  const ids = [...selection];
  if (hoverId && !ids.includes(hoverId)) ids.push(hoverId);
  if (drop && !ids.includes(drop.anchorId)) ids.push(drop.anchorId);
  const boxes = useBoxes(pageRef, ids, scale);

  const primary = selection.length === 1 ? selection[0] : undefined;
  const primaryBox = primary ? boxes[primary] : undefined;
  const hoverBox = hoverId && !selection.includes(hoverId) ? boxes[hoverId] : undefined;
  const hoverNode = hoverId ? doc.nodes[hoverId] : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden={false}>
      {hoverBox && hoverNode ? (
        <div
          className="border-primary/50 absolute rounded-[3px] border border-dashed transition-all duration-75"
          style={hoverBox}
        >
          <span className="bg-primary/80 text-primary-foreground absolute -top-5 left-0 rounded-t-[3px] px-1.5 py-0.5 text-[10px] leading-none font-medium">
            {messages.elements[hoverNode.type]?.name ?? hoverNode.type}
          </span>
        </div>
      ) : null}

      {selection.map((id) => {
        const box = boxes[id];
        if (!box) return null;
        return (
          <motion.div
            key={id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
            className="border-primary absolute rounded-[3px] border-2"
            style={{
              top: box.top - 2,
              left: box.left - 2,
              width: box.width + 4,
              height: box.height + 4,
            }}
          />
        );
      })}

      {drop ? <DropIndicator drop={drop} boxes={boxes} /> : null}

      <AnimatePresence>
        {primary && primaryBox ? <NodeToolbar key={primary} id={primary} box={primaryBox} /> : null}
      </AnimatePresence>
      {primary &&
      primaryBox &&
      doc.nodes[primary] &&
      !registry.get(doc.nodes[primary].type)?.internal ? (
        <InsertAfter id={primary} box={primaryBox} />
      ) : null}
    </div>
  );
}

function DropIndicator({ drop, boxes }: { drop: DropTarget; boxes: Record<NodeId, Box> }) {
  const box = boxes[drop.anchorId];
  if (!box) return null;
  if (drop.placement === 'inside') {
    return (
      <div className="border-primary bg-primary/5 absolute rounded-[4px] border-2" style={box} />
    );
  }
  const top = drop.placement === 'before' ? box.top - 3 : box.top + box.height + 1;
  return (
    <motion.div
      layout
      className="bg-primary absolute h-[3px] rounded-full"
      style={{ top, left: box.left, width: box.width }}
    >
      <span className="bg-primary absolute -top-[3px] -left-1 size-[9px] rounded-full" />
    </motion.div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'flex size-7 items-center justify-center rounded-md transition-[transform,background-color] active:scale-95 disabled:opacity-40 [&_svg]:size-3.5',
        danger ? 'hover:bg-destructive hover:text-destructive-foreground' : 'hover:bg-white/15',
      )}
    >
      {children}
    </button>
  );
}

function NodeToolbar({ id, box }: { id: NodeId; box: Box }) {
  const { messages, store, registry } = useEditorContext();
  const node = useEditor((state) => state.doc.nodes[id]);
  const doc = useEditor((state) => state.doc);
  if (!node) return null;
  const definition = registry.get(node.type);
  const parent = parentOf(doc, id);
  const index = indexInParent(doc, id);
  const siblings = parent?.children?.length ?? 0;
  const turnInto = replaceableTypes(node);
  // Below the block when there is no room above it.
  const above = box.top > 40;
  const state = () => store.getState();

  return (
    <motion.div
      initial={{ opacity: 0, y: above ? 4 : -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.14 }}
      className="bg-foreground text-background pointer-events-auto absolute z-20 flex items-center gap-0.5 rounded-lg p-0.5 shadow-lg"
      style={{
        left: box.left,
        top: above ? box.top - 38 : box.top + box.height + 6,
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <span
        draggable={!node.locked}
        onDragStart={(event) => {
          const ids = state().selection.includes(id) ? state().selection : [id];
          event.dataTransfer.setData(DRAG_NODES_MIME, JSON.stringify(ids));
          event.dataTransfer.effectAllowed = 'move';
          setActiveDrag({ kind: 'nodes', ids });
        }}
        onDragEnd={() => {
          setActiveDrag(null);
        }}
        className="flex h-7 cursor-grab items-center gap-1.5 rounded-md px-1.5 text-xs font-medium active:cursor-grabbing"
        title={messages.dragToMove}
      >
        <GripVertical className="size-3.5 opacity-70" aria-hidden="true" />
        <ElementIcon name={definition?.icon ?? 'box'} className="size-3.5" />
        {node.name ?? messages.elements[node.type]?.name ?? node.type}
        {node.locked ? <Lock className="size-3" aria-hidden="true" /> : null}
        {node.hidden ? <EyeOff className="size-3" aria-hidden="true" /> : null}
      </span>
      <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden="true" />
      <ToolbarButton
        label={messages.moveUp}
        disabled={index <= 0 || !!node.locked}
        onClick={() => state().moveBy(id, -1)}
      >
        <ArrowUp />
      </ToolbarButton>
      <ToolbarButton
        label={messages.moveDown}
        disabled={index >= siblings - 1 || !!node.locked}
        onClick={() => state().moveBy(id, 1)}
      >
        <ArrowDown />
      </ToolbarButton>
      <ToolbarButton label={messages.duplicate} onClick={() => state().duplicateNodes([id])}>
        <Copy />
      </ToolbarButton>
      {parent && parent.id !== doc.root ? (
        <ToolbarButton
          label={messages.selectParent}
          onClick={() => {
            state().select([parent.id]);
          }}
        >
          <ArrowUpLeft />
        </ToolbarButton>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={messages.turnInto}
            title={messages.turnInto}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            className="flex size-7 items-center justify-center rounded-md hover:bg-white/15 [&_svg]:size-3.5"
          >
            <MoreHorizontal />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {turnInto.length ? (
            <>
              <DropdownMenuLabel className="flex items-center gap-2">
                <Repeat2 className="size-3.5" aria-hidden="true" />
                {messages.turnInto}
              </DropdownMenuLabel>
              {turnInto.map((type) => (
                <DropdownMenuItem key={type} onSelect={() => state().turnInto(id, type)}>
                  <ElementIcon name={registry.get(type)?.icon ?? 'box'} className="size-4" />
                  {messages.elements[type]?.name ?? type}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            onSelect={() =>
              state().updateNode(id, { hidden: !node.hidden }, node.hidden ? 'Show' : 'Hide')
            }
          >
            <EyeOff className="size-4" aria-hidden="true" />
            {node.hidden ? messages.show : messages.hide}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              state().updateNode(id, { locked: !node.locked }, node.locked ? 'Unlock' : 'Lock')
            }
          >
            <Lock className="size-4" aria-hidden="true" />
            {node.locked ? messages.unlock : messages.lock}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarButton
        label={messages.delete}
        danger
        disabled={!!node.locked}
        onClick={() => state().removeNodes([id])}
      >
        <Trash2 />
      </ToolbarButton>
    </motion.div>
  );
}

/** The round "+" on the selected block's bottom edge: insert right after it. */
function InsertAfter({ id, box }: { id: NodeId; box: Box }) {
  const { messages, store } = useEditorContext();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [id]);
  return (
    <div
      className="pointer-events-auto absolute z-20 -translate-x-1/2"
      style={{ left: box.left + box.width / 2, top: box.top + box.height - 10 }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <InsertMenu
        open={open}
        onOpenChange={setOpen}
        onChoose={(type) => {
          const state = store.getState();
          const parent = parentOf(state.doc, id);
          if (!parent) return;
          state.insertElement(type, {
            parentId: parent.id,
            index: indexInParent(state.doc, id) + 1,
          });
          setOpen(false);
        }}
      >
        <button
          type="button"
          aria-label={messages.insertAfter}
          title={messages.insertAfter}
          className="bg-primary text-primary-foreground ring-background flex size-5 items-center justify-center rounded-full shadow ring-2 transition-transform hover:scale-110 active:scale-95"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </InsertMenu>
    </div>
  );
}
