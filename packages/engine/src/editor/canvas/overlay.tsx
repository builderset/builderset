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
import { propsSchema } from '../inspector/schema';
import { AlignButtons } from '../inspector/type-fields';
import { InsertMenu } from '../panels/insert-menu';
import { DRAG_NODES_MIME, setActiveDrag, setDragChip, type DropTarget } from './drop';

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
    const read = () => {
      const next: Record<NodeId, Box> = {};
      for (const id of key ? key.split('|') : []) {
        const box = measure(page, id, scale);
        if (box) next[id] = box;
      }
      setBoxes(next);
    };
    // Synchronously first, so the outline is where the pointer is in the SAME
    // frame — a frame late is what reads as a laggy, jumpy hover.
    read();
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    // Images load late and change heights; the observer on the page sees that.
    const observer = new ResizeObserver(later);
    observer.observe(page);
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', later);
    };
  }, [pageRef, key, scale, revision, viewport]);

  return boxes;
}

/** One spring for everything that follows the pointer across blocks. */
const FOLLOW = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } as const;
const FADE = { duration: 0.12 } as const;

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
  const showHover = !drop && hoverId && !selection.includes(hoverId);
  const hoverBox = showHover && hoverId ? boxes[hoverId] : undefined;
  const hoverNode = hoverId ? doc.nodes[hoverId] : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* The hover outline: ONE element that glides from block to block,
          rather than a new one popping up on each. */}
      <AnimatePresence>
        {hoverBox && hoverNode ? (
          <motion.div
            key="hover"
            initial={{ opacity: 0, ...hoverBox }}
            animate={{ opacity: 1, ...hoverBox }}
            exit={{ opacity: 0, transition: FADE }}
            transition={{ ...FOLLOW, opacity: FADE }}
            className="border-primary/45 bg-primary/[0.025] absolute rounded-[4px] border border-dashed"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={hoverNode.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.12 }}
                className="bg-primary text-primary-foreground absolute -top-[19px] left-0 rounded-t-[4px] px-1.5 py-[3px] text-[10px] leading-none font-medium whitespace-nowrap shadow-sm"
              >
                {hoverNode.name ?? messages.elements[hoverNode.type]?.name ?? hoverNode.type}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* The selection: the primary outline also glides when the selection
          moves (arrow keys, Alt+↑/↓, a click elsewhere). */}
      <AnimatePresence>
        {primaryBox ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, ...grow(primaryBox, 2) }}
            animate={{ opacity: 1, ...grow(primaryBox, 2) }}
            exit={{ opacity: 0, transition: FADE }}
            transition={{ ...FOLLOW, opacity: FADE }}
            className="border-primary absolute rounded-[5px] border-2 shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]"
          />
        ) : null}
      </AnimatePresence>
      {selection.length > 1
        ? selection.map((id) => {
            const box = boxes[id];
            if (!box) return null;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={FADE}
                className="border-primary absolute rounded-[5px] border-2"
                style={grow(box, 2)}
              />
            );
          })
        : null}

      <AnimatePresence>
        {drop ? <DropIndicator key="drop" drop={drop} boxes={boxes} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {primary && primaryBox && !drop ? (
          <NodeToolbar key="toolbar" id={primary} box={primaryBox} />
        ) : null}
      </AnimatePresence>
      {primary &&
      primaryBox &&
      !drop &&
      doc.nodes[primary] &&
      !registry.get(doc.nodes[primary].type)?.internal ? (
        <InsertAfter id={primary} box={primaryBox} />
      ) : null}
    </div>
  );
}

function grow(box: Box, by: number): Box {
  return {
    top: box.top - by,
    left: box.left - by,
    width: box.width + by * 2,
    height: box.height + by * 2,
  };
}

/**
 * Where a drag will land: a line with a dot at each end between blocks, or a
 * tinted outline around a container being dropped INTO. One element that
 * springs between positions as the pointer moves, so the eye can follow it.
 */
function DropIndicator({ drop, boxes }: { drop: DropTarget; boxes: Record<NodeId, Box> }) {
  const box = boxes[drop.anchorId];
  if (!box) return null;
  const inside = drop.placement === 'inside';
  const target = inside
    ? { ...grow(box, 3), borderRadius: 6 }
    : {
        top: drop.placement === 'before' ? box.top - 6 : box.top + box.height + 3,
        left: box.left,
        width: box.width,
        height: 3,
        borderRadius: 3,
      };
  return (
    <motion.div
      initial={{ opacity: 0, ...target }}
      animate={{ opacity: 1, ...target }}
      exit={{ opacity: 0, transition: FADE }}
      transition={{ ...FOLLOW, opacity: FADE }}
      className={cn(
        'absolute',
        inside ? 'border-primary bg-primary/[0.06] border-2 border-dashed' : 'bg-primary',
      )}
    >
      {inside ? null : (
        <>
          <span className="bg-primary ring-background absolute -top-[4px] -left-[5px] size-[11px] rounded-full ring-2" />
          <span className="bg-primary ring-background absolute -top-[4px] -right-[5px] size-[11px] rounded-full ring-2" />
        </>
      )}
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
  // Quick positioning, for any block that has an alignment.
  const alignOptions = (propsSchema(registry, node.type)?.properties?.align?.enum ?? []).map(
    String,
  );
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
          setDragChip(
            event.dataTransfer,
            ids.length > 1
              ? messages.multipleSelected(ids.length)
              : (node.name ?? messages.elements[node.type]?.name ?? node.type),
          );
          // After the browser has taken its snapshot, or the fade would be in it.
          requestAnimationFrame(() => {
            setActiveDrag({ kind: 'nodes', ids });
          });
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
      <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden="true" />
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
      <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden="true" />
      {alignOptions.length && !node.locked ? (
        <>
          <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden="true" />
          <AlignButtons
            tone="toolbar"
            label={messages.align}
            value={typeof node.props.align === 'string' ? node.props.align : undefined}
            options={alignOptions.filter((option) => option !== 'stretch' && option !== 'justify')}
            onChange={(align) => {
              state().updateNode(id, { props: { align } }, messages.align);
            }}
          />
        </>
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
