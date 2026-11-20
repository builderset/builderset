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
import { ChevronRight, Eye, EyeOff, Layers, ListTree, Lock, LockOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type DragEvent, type KeyboardEvent } from 'react';

import { DRAG_NODES_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { Button, SegmentedTabs } from '../ui';

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

  const { messages } = useEditorContext();
  const [view, setView] = useState<'blocks' | 'outline'>('blocks');

  // For the summary over the rows: what can fold, and how many blocks there are.
  const containers = Object.values(doc.nodes).filter(
    (node) => node.id !== doc.root && (node.children?.length ?? 0) > 0,
  );
  const leaves = Object.values(doc.nodes).filter((node) => !node.children).length;
  const anyOpen = containers.some((node) => !collapsed.has(node.id));

  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <SegmentedTabs
        aria-label={messages.layers}
        value={view}
        onValueChange={setView}
        tabs={[
          { value: 'blocks', label: messages.blocksView, icon: <Layers aria-hidden="true" /> },
          { value: 'outline', label: messages.outlineView, icon: <ListTree aria-hidden="true" /> },
        ]}
        className="bst:mx-3 bst:mb-2.5 bst:shrink-0 bst:rounded-[10px] bst:[&_[role=tab]]:h-[26px] bst:[&_[role=tab]]:text-xs"
      />
      {view === 'blocks' && containers.length > 0 ? (
        <div className="bst:flex bst:shrink-0 bst:items-center bst:justify-between bst:gap-2 bst:px-4 bst:pb-1.5 bst:text-[11.5px] bst:text-muted-foreground">
          <span className="bst:truncate bst:tabular-nums">
            {messages.layersSummary(root?.children?.length ?? 0, leaves)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setCollapsed(() =>
                anyOpen ? new Set(containers.map((node) => node.id)) : new Set<NodeId>(),
              );
            }}
          >
            {anyOpen ? messages.collapseAll : messages.expandAll}
          </Button>
        </div>
      ) : null}
      {view === 'blocks' ? (
        <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <div role="tree" aria-multiselectable="true" className="bst:px-2 bst:pb-2 bst:text-sm">
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
          <p className="bst:px-4 bst:pb-4 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
            {messages.layersHint}
          </p>
        </div>
      ) : (
        <Outline />
      )}
    </div>
  );
}

/** The words a node's own props show a reader — not its children's. */
function wordsIn(node: BuilderNode): number {
  let text = '';
  const collect = (value: unknown, key?: string) => {
    if (typeof value === 'string') {
      if (
        key === 'text' ||
        key === 'title' ||
        key === 'caption' ||
        key === 'question' ||
        key === 'answer' ||
        key === 'label'
      )
        text += ` ${value}`;
    } else if (Array.isArray(value)) {
      for (const item of value) collect(item, key);
    } else if (value && typeof value === 'object') {
      for (const [inner, child] of Object.entries(value))
        collect(child, inner === 'text' ? 'text' : inner);
    }
  };
  collect(node.props);
  return text.split(/s+/).filter(Boolean).length;
}

/**
 * The article as its headings make it: one row per section — and the
 * opening before the first heading — with how many words each holds. Click a
 * row to go to its heading.
 */
function Outline() {
  const { store, messages } = useEditorContext();
  const doc = useEditor((state) => state.view);
  const selection = useEditor((state) => state.selection);
  const root = doc.nodes[doc.root];
  const sections: { heading: BuilderNode | null; words: number }[] = [{ heading: null, words: 0 }];
  // In reading order, through sections and columns: a heading anywhere starts a section.
  const walk = (id: NodeId) => {
    const node = doc.nodes[id];
    if (!node) return;
    if (node.type === 'heading') sections.push({ heading: node, words: 0 });
    else {
      const last = sections[sections.length - 1];
      if (last) last.words += wordsIn(node);
    }
    node.children?.forEach(walk);
  };
  root?.children?.forEach(walk);
  const shown = sections.filter((section, index) => index > 0 || section.words > 0);
  return (
    <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto bst:px-2 bst:pb-2">
      {shown.map((section, index) => {
        const heading = section.heading;
        const level = typeof heading?.props.level === 'number' ? heading.props.level : 2;
        const on = heading ? selection.includes(heading.id) : false;
        return (
          <button
            key={heading?.id ?? `intro-${String(index)}`}
            type="button"
            disabled={!heading}
            onClick={() => {
              if (!heading) return;
              store.getState().select([heading.id]);
              document
                .querySelector(`[data-node="${CSS.escape(heading.id)}"]`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }}
            style={{ paddingLeft: level > 2 ? 26 : 8 }}
            className={cn(
              'bst:flex bst:h-[34px] bst:w-full bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-lg bst:pr-2 bst:text-left bst:transition-colors bst:disabled:cursor-default',
              on ? 'bst:bg-primary/12 bst:text-primary' : 'bst:hover:bg-accent',
            )}
          >
            <ElementIcon
              name={heading ? 'heading' : 'pilcrow'}
              className={cn(
                'bst:size-[15px] bst:shrink-0',
                on ? 'bst:text-primary' : 'bst:text-muted-foreground',
              )}
            />
            <b className="bst:min-w-0 bst:flex-1 bst:truncate bst:text-[12.5px] bst:font-semibold">
              {heading ? preview(heading) || messages.untitled : messages.intro}
            </b>
            <span className="bst:shrink-0 bst:text-xs bst:text-muted-foreground bst:tabular-nums">
              {messages.words(section.words)}
            </span>
          </button>
        );
      })}
      <p className="bst:px-2 bst:pt-2 bst:pb-4 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
        {messages.outlineHint}
      </p>
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
            { icon: registry.get(node.type)?.icon, detail: preview(node), count: ids.length },
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
          'bst:group bst:relative bst:flex bst:h-8 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-control bst:pr-1 bst:transition-[background-color,opacity] bst:duration-150 bst:outline-none bst:data-[dragging]:opacity-40',
          selected ? 'bst:bg-primary/10 bst:text-foreground' : 'bst:hover:bg-accent/60',
          'bst:focus-visible:ring-2 bst:focus-visible:ring-ring/50',
          showDrop === 'inside' && 'bst:ring-2 bst:ring-primary',
          node.hidden && 'bst:opacity-50',
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
                'bst:absolute bst:right-1 bst:left-1 bst:h-0.5 bst:rounded-full bst:bg-primary',
                showDrop === 'before' ? 'bst:-top-px' : 'bst:-bottom-px',
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
            'bst:flex bst:size-4 bst:shrink-0 bst:items-center bst:justify-center bst:text-muted-foreground',
            !hasChildren && 'bst:invisible',
          )}
        >
          <ChevronRight
            className={cn(
              'bst:size-3.5 bst:transition-transform bst:duration-150',
              open && 'bst:rotate-90',
            )}
          />
        </button>
        <ElementIcon
          name={definition?.icon ?? 'box'}
          className={cn(
            'bst:size-4 bst:shrink-0',
            selected ? 'bst:text-primary' : 'bst:text-muted-foreground',
          )}
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
            className="bst:h-6 bst:min-w-0 bst:flex-1 bst:rounded bst:border bst:border-input bst:bg-background bst:px-1.5 bst:text-sm bst:outline-none"
          />
        ) : (
          <span className="bst:min-w-0 bst:flex-1 bst:truncate">
            <span className="bst:font-medium">{label}</span>
            {detail ? <span className="bst:ml-1.5 bst:text-muted-foreground">{detail}</span> : null}
          </span>
        )}
        <span className="bst:flex bst:shrink-0 bst:items-center bst:opacity-0 bst:transition-opacity bst:group-focus-within:opacity-100 bst:group-hover:opacity-100">
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
          <span className="bst:flex bst:shrink-0 bst:items-center bst:gap-0.5 bst:text-muted-foreground bst:group-hover:hidden bst:[&_svg]:size-3">
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
      className="bst:flex bst:size-6 bst:items-center bst:justify-center bst:rounded bst:text-muted-foreground bst:hover:bg-accent bst:hover:text-foreground bst:[&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
