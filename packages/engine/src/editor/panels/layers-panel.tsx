'use client';

import {
  ancestors,
  contains,
  indexInParent,
  parentOf,
  richTextToPlain,
  type NodeTree,
  type BuilderNode,
  type NodeId,
  type RichText,
} from '../../core';
import { ChevronRight, Eye, EyeOff, Lock, LockOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type DragEvent, type KeyboardEvent } from 'react';

import { DRAG_NODES_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';

/** A short preview of a node's text, so ten paragraphs are not ten "Paragraph"s. */
function preview(node: BuilderNode): string {
  const text = node.props.text;
  if (Array.isArray(text)) return richTextToPlain(text as RichText).slice(0, 48);
  if (typeof text === 'string') return text.slice(0, 48);
  if (typeof node.props.title === 'string') return node.props.title.slice(0, 48);
  return '';
}

interface Drop {
  id: NodeId;
  placement: 'before' | 'after' | 'inside';
}

/**
 * The document as a tree (ARIA `tree`): select, expand, rename (double-click
 * or F2), hide, lock, and drag to reorder or move into another container.
 * Selection is the store's, so it follows the canvas both ways.
 */
export function LayersPanel() {
  const doc = useEditor((state) => state.doc);
  const selection = useEditor((state) => state.selection);
  const [collapsed, setCollapsed] = useState<Set<NodeId>>(new Set());
  const [drop, setDrop] = useState<Drop | null>(null);
  const root = doc.nodes[doc.root];

  // Open the path to whatever gets selected on the canvas.
  useEffect(() => {
    const last = selection[selection.length - 1];
    if (!last) return;
    const path = ancestors(doc, last).map((node) => node.id);
    setCollapsed((current) => {
      if (!path.some((id) => current.has(id))) return current;
      const next = new Set(current);
      for (const id of path) next.delete(id);
      return next;
    });
  }, [doc, selection]);

  return (
    <div role="tree" aria-multiselectable="true" className="h-full overflow-y-auto p-2 text-sm">
      {root?.children?.map((id) => (
        <Row
          key={id}
          id={id}
          depth={0}
          doc={doc}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          drop={drop}
          setDrop={setDrop}
        />
      ))}
    </div>
  );
}

function Row({
  id,
  depth,
  doc,
  collapsed,
  setCollapsed,
  drop,
  setDrop,
}: {
  id: NodeId;
  depth: number;
  doc: NodeTree;
  collapsed: Set<NodeId>;
  setCollapsed: (update: (current: Set<NodeId>) => Set<NodeId>) => void;
  drop: Drop | null;
  setDrop: (drop: Drop | null) => void;
}) {
  const { store, messages, registry } = useEditorContext();
  const selected = useEditor((state) => state.selection.includes(id));
  const [renaming, setRenaming] = useState(false);
  const node = doc.nodes[id];
  if (!node) return null;
  const definition = registry.get(node.type);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const open = !collapsed.has(id);
  const label = node.name ?? messages.elements[node.type]?.name ?? node.type;
  const detail = node.name ? '' : preview(node);

  const toggle = () => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const placement: Drop['placement'] =
      node.children && ratio > 0.3 && ratio < 0.7 ? 'inside' : ratio < 0.5 ? 'before' : 'after';
    if (drop?.id !== id || drop.placement !== placement) setDrop({ id, placement });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDrop(null);
    setActiveDrag(null);
    const raw = event.dataTransfer.getData(DRAG_NODES_MIME);
    if (!raw || !drop) return;
    const ids = JSON.parse(raw) as NodeId[];
    const state = store.getState();
    if (ids.some((moving) => moving === id || contains(state.doc, moving, id))) return;
    if (drop.placement === 'inside') {
      state.moveNodes(ids, id, node.children?.length ?? 0);
      return;
    }
    const parent = parentOf(state.doc, id);
    if (!parent) return;
    const index = indexInParent(state.doc, id) + (drop.placement === 'after' ? 1 : 0);
    if (!state.moveNodes(ids, parent.id, index)) {
      state.select(ids);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'F2') {
      event.preventDefault();
      setRenaming(true);
    } else if (event.key === 'ArrowRight' && hasChildren && !open) toggle();
    else if (event.key === 'ArrowLeft' && hasChildren && open) toggle();
  };

  const showDrop = drop?.id === id ? drop.placement : null;

  return (
    <motion.div
      layout="position"
      transition={{ type: 'spring', stiffness: 520, damping: 44 }}
      role="treeitem"
      aria-selected={selected}
      aria-expanded={hasChildren ? open : undefined}
    >
      <div
        data-layer={id}
        tabIndex={0}
        draggable={!node.locked && !renaming}
        onDragStart={(event) => {
          const state = store.getState();
          const ids = state.selection.includes(id) ? state.selection : [id];
          event.dataTransfer.setData(DRAG_NODES_MIME, JSON.stringify(ids));
          event.dataTransfer.effectAllowed = 'move';
          setDragChip(
            event.dataTransfer,
            ids.length > 1 ? messages.multipleSelected(ids.length) : label,
          );
          requestAnimationFrame(() => {
            setActiveDrag({ kind: 'nodes', ids });
          });
        }}
        onDragEnd={() => {
          setDrop(null);
          setActiveDrag(null);
        }}
        onDragOver={onDragOver}
        onDragLeave={() => {
          if (drop?.id === id) setDrop(null);
        }}
        onDrop={onDrop}
        onClick={(event) => {
          const state = store.getState();
          if (event.shiftKey || event.metaKey || event.ctrlKey) {
            state.select(
              selected ? state.selection.filter((other) => other !== id) : [...state.selection, id],
            );
          } else {
            state.select([id]);
          }
        }}
        onDoubleClick={() => {
          setRenaming(true);
        }}
        onMouseEnter={() => {
          store.getState().hover(id);
        }}
        onMouseLeave={() => {
          store.getState().hover(null);
        }}
        onKeyDown={onKeyDown}
        style={{ paddingLeft: 6 + depth * 14 }}
        className={cn(
          'group rounded-control relative flex h-8 cursor-pointer items-center gap-1.5 pr-1 transition-[background-color,opacity] duration-150 outline-none data-[dragging]:opacity-40',
          selected ? 'bg-primary/10 text-foreground' : 'hover:bg-accent/60',
          'focus-visible:ring-ring/50 focus-visible:ring-2',
          showDrop === 'inside' && 'ring-primary ring-2',
          node.hidden && 'opacity-50',
        )}
      >
        <AnimatePresence>
          {showDrop === 'before' || showDrop === 'after' ? (
            <motion.span
              key={showDrop}
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className={cn(
                'bg-primary absolute right-1 left-1 h-0.5 rounded-full',
                showDrop === 'before' ? '-top-px' : '-bottom-px',
              )}
            />
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden={!hasChildren}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          className={cn(
            'text-muted-foreground flex size-4 shrink-0 items-center justify-center',
            !hasChildren && 'invisible',
          )}
        >
          <ChevronRight
            className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')}
          />
        </button>
        <ElementIcon
          name={definition?.icon ?? 'box'}
          className={cn('size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}
        />
        {renaming ? (
          <input
            autoFocus
            defaultValue={node.name ?? ''}
            placeholder={messages.elements[node.type]?.name ?? node.type}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onBlur={(event) => {
              store
                .getState()
                .updateNode(id, { name: event.target.value.trim() || null }, 'Rename');
              setRenaming(false);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setRenaming(false);
            }}
            className="border-input bg-background h-6 min-w-0 flex-1 rounded border px-1.5 text-sm outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{label}</span>
            {detail ? <span className="text-muted-foreground ml-1.5">{detail}</span> : null}
          </span>
        )}
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <IconToggle
            label={node.hidden ? messages.show : messages.hide}
            onClick={() =>
              store
                .getState()
                .updateNode(id, { hidden: !node.hidden }, node.hidden ? 'Show' : 'Hide')
            }
          >
            {node.hidden ? <EyeOff /> : <Eye />}
          </IconToggle>
          <IconToggle
            label={node.locked ? messages.unlock : messages.lock}
            onClick={() =>
              store
                .getState()
                .updateNode(id, { locked: !node.locked }, node.locked ? 'Unlock' : 'Lock')
            }
          >
            {node.locked ? <Lock /> : <LockOpen />}
          </IconToggle>
        </span>
        {node.locked || node.hidden ? (
          <span className="text-muted-foreground flex shrink-0 items-center gap-0.5 group-hover:hidden [&_svg]:size-3">
            {node.hidden ? <EyeOff aria-hidden="true" /> : null}
            {node.locked ? <Lock aria-hidden="true" /> : null}
          </span>
        ) : null}
      </div>
      {hasChildren && open ? (
        <div role="group">
          {node.children?.map((child) => (
            <Row
              key={child}
              id={child}
              depth={depth + 1}
              doc={doc}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              drop={drop}
              setDrop={setDrop}
            />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

function IconToggle({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-6 items-center justify-center rounded [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
