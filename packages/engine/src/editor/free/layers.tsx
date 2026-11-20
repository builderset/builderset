'use client';

import { richTextToPlain, type BuilderNode, type NodeId, type RichText } from '../../core';
import { Eye, EyeOff, GripVertical, Lock, LockOpen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';

import { DRAG_NODES_MIME, activeDrag, setActiveDrag, setDragChip } from '../canvas/drop';
import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { nameOf } from './stage';

export interface FreeLayersPanelProps {
  /** The artboard whose elements are listed. */
  artboardId: NodeId;
  /** Over the rows, on the left: "Front · 12 layers". Default: "12 layers". */
  summary?: ReactNode;
  /** Under the rows. Default: how to restack and rename. */
  hint?: ReactNode;
  /** A row's icon. Default: the element's registry icon. */
  iconOf?: ((node: BuilderNode) => ReactNode) | undefined;
  /** A row's text after the name. Default: `props.text` as plain text. */
  previewOf?: ((node: BuilderNode) => string) | undefined;
}

/** `props.text` as a short line, rich or plain. */
function defaultPreview(node: BuilderNode): string {
  const text = node.props.text;
  if (Array.isArray(text)) return richTextToPlain(text as RichText).slice(0, 60);
  if (typeof text === 'string') return text.slice(0, 60);
  return '';
}

/**
 * The Layers tab for a free canvas: the artboard's elements, the TOPMOST
 * first — the reverse of the document's order, where the last child is drawn
 * on top. Select, rename (double-click or F2), hide, lock, and drag a row to
 * change what sits on top.
 */
export function FreeLayersPanel({
  artboardId,
  summary,
  hint,
  iconOf,
  previewOf = defaultPreview,
}: FreeLayersPanelProps) {
  const { store, messages } = useEditorContext();
  const words = messages.free;
  const children = useEditor((state) => state.view.nodes[artboardId]?.children);
  const nodes = useEditor((state) => state.view.nodes);
  const rows = [...(children ?? [])].reverse();
  const listRef = useRef<HTMLDivElement>(null);
  /** The gap a dragged row would land in: 0 is above the first row. */
  const [slot, setSlot] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const still = useReducedMotion();

  const slotAt = (clientY: number): number => {
    const elements = listRef.current?.querySelectorAll<HTMLElement>('[data-free-layer]') ?? [];
    let index = 0;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return index;
      index += 1;
    }
    return index;
  };

  const dragged = (): NodeId[] | null => {
    const payload = activeDrag();
    if (payload?.kind !== 'nodes') return null;
    return payload.ids.every((id) => rows.includes(id)) ? payload.ids : null;
  };

  const onDragOver = (event: DragEvent) => {
    if (!dragged()) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const next = slotAt(event.clientY);
    if (next !== slot) setSlot(next);
  };

  const onDrop = (event: DragEvent) => {
    const ids = dragged();
    const at = slot;
    setSlot(null);
    setActiveDrag(null);
    if (!ids || at === null) return;
    event.preventDefault();
    // Gap `at` among the rows (topmost first) is index `n - at` among the
    // children (topmost last), counted before the moved rows are taken out.
    const state = store.getState();
    const count = state.doc.nodes[artboardId]?.children?.length ?? 0;
    const before = state.doc.nodes[artboardId]?.children?.join('|');
    if (state.moveNodes(ids, artboardId, count - at)) {
      if (store.getState().doc.nodes[artboardId]?.children?.join('|') !== before) {
        setAnnouncement(words.restacked);
      }
    }
  };

  /** Where the indicator sits: the top of a row, or the bottom of the last. */
  const indicatorTop = (): number | null => {
    if (slot === null) return null;
    const elements = listRef.current?.querySelectorAll<HTMLElement>('[data-free-layer]');
    if (!elements?.length) return 0;
    const row = elements[Math.min(slot, elements.length - 1)];
    if (!row) return null;
    return slot < elements.length ? row.offsetTop : row.offsetTop + row.offsetHeight;
  };
  const top = indicatorTop();

  return (
    <div data-free-scope="" data-free-layers="" className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:flex bst:shrink-0 bst:items-center bst:justify-between bst:gap-2 bst:px-4 bst:pb-2 bst:text-xs bst:text-muted-foreground">
        <span className="bst:truncate bst:tabular-nums">
          {summary ?? words.layerCount(rows.length)}
        </span>
        <span className="bst:shrink-0 bst:text-[11px]">{words.topFirst}</span>
      </div>
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
        {rows.length === 0 ? (
          <p className="bst:px-4 bst:py-6 bst:text-center bst:text-[12.5px] bst:leading-snug bst:text-muted-foreground">
            {words.noLayers}
          </p>
        ) : (
          <div
            ref={listRef}
            role="tree"
            aria-label={messages.layers}
            aria-multiselectable="true"
            className="bst:relative bst:px-2 bst:pb-3"
            onDragOver={onDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSlot(null);
            }}
            onDrop={onDrop}
          >
            {rows.map((id) => {
              const node = nodes[id];
              return node ? (
                <motion.div
                  key={id}
                  layout={still ? false : 'position'}
                  transition={{ type: 'spring', stiffness: 520, damping: 44 }}
                >
                  <LayerRow
                    node={node}
                    icon={iconOf?.(node)}
                    preview={node.name ? '' : previewOf(node)}
                  />
                </motion.div>
              ) : null;
            })}
            {top !== null ? (
              <span
                aria-hidden="true"
                className="bst:pointer-events-none bst:absolute bst:right-2.5 bst:left-2.5 bst:h-0.5 bst:rounded-full bst:bg-primary bst:transition-[top] bst:duration-150 bst:before:absolute bst:before:top-[-3px] bst:before:left-[-4px] bst:before:size-2 bst:before:rounded-full bst:before:border-2 bst:before:border-primary bst:before:bg-card"
                style={{ top: top - 1 }}
              />
            ) : null}
          </div>
        )}
        <p className="bst:px-4 bst:pt-1 bst:pb-4 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
          {hint ?? words.layersHint}
        </p>
      </div>
      <p role="status" aria-live="polite" className="bst:sr-only">
        {announcement}
      </p>
    </div>
  );
}

function LayerRow({
  node,
  icon,
  preview,
}: {
  node: BuilderNode;
  icon: ReactNode;
  preview: string;
}) {
  const { store, messages, registry } = useEditorContext();
  const id = node.id;
  const selected = useEditor((state) => state.selection.includes(id));
  const [renaming, setRenaming] = useState(false);
  const name = nameOf(node, messages.elements);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'F2') {
      event.preventDefault();
      setRenaming(true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      store.getState().select([id]);
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !event.altKey) {
      // Walk the rows; the one reached is selected, as on the canvas.
      event.preventDefault();
      const rows = [
        ...(event.currentTarget
          .closest('[role="tree"]')
          ?.querySelectorAll<HTMLElement>('[data-free-layer]') ?? []),
      ];
      const index = rows.indexOf(event.currentTarget);
      const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (next) {
        next.focus();
        const nextId = next.dataset.freeLayer;
        if (nextId) store.getState().select([nextId]);
      }
    }
  };

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-label={preview ? `${name}, ${preview}` : name}
      tabIndex={0}
      data-free-layer={id}
      data-layer={id}
      draggable={!node.locked && !renaming}
      onDragStart={(event) => {
        const state = store.getState();
        const ids = state.selection.includes(id)
          ? state.selection.filter((other) => !state.doc.nodes[other]?.locked)
          : [id];
        event.dataTransfer.setData(DRAG_NODES_MIME, JSON.stringify(ids));
        event.dataTransfer.effectAllowed = 'move';
        setDragChip(
          event.dataTransfer,
          ids.length > 1 ? messages.free.selectedCount(ids.length) : name,
          {
            icon: registry.get(node.type)?.icon,
            detail: messages.free.topFirst,
            count: ids.length,
          },
        );
        requestAnimationFrame(() => {
          setActiveDrag({ kind: 'nodes', ids });
        });
      }}
      onDragEnd={() => {
        setActiveDrag(null);
      }}
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
        if (store.getState().hoverId === id) store.getState().hover(null);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        'bst:group bst:relative bst:flex bst:h-[34px] bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-lg bst:pr-1.5 bst:pl-1 bst:transition-colors bst:duration-150 bst:outline-none bst:select-none',
        'bst:focus-visible:ring-2 bst:focus-visible:ring-ring/50 bst:data-[dragging]:opacity-35',
        selected ? 'bst:bg-primary/10 bst:text-primary' : 'bst:hover:bg-accent',
      )}
    >
      <GripVertical
        aria-hidden="true"
        className={cn(
          'bst:size-3 bst:shrink-0 bst:text-muted-foreground bst:opacity-0 bst:transition-opacity bst:group-hover:opacity-100',
          node.locked && 'bst:invisible',
        )}
      />
      <span
        className={cn(
          'bst:flex bst:size-[15px] bst:shrink-0 bst:items-center bst:justify-center bst:[&_svg]:size-[15px]',
          selected ? 'bst:text-primary' : 'bst:text-muted-foreground',
        )}
      >
        {icon ?? <ElementIcon name={registry.get(node.type)?.icon ?? 'box'} />}
      </span>
      {renaming ? (
        <input
          autoFocus
          defaultValue={node.name ?? ''}
          placeholder={messages.elements[node.type]?.name ?? node.type}
          aria-label={messages.rename}
          maxLength={80}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value !== (node.name ?? '')) {
              store.getState().updateNode(id, { name: value || null }, 'Rename');
            }
            setRenaming(false);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') setRenaming(false);
          }}
          className="bst:h-6 bst:min-w-0 bst:flex-1 bst:rounded-md bst:border bst:border-primary bst:bg-card bst:px-1.5 bst:text-[12.5px] bst:text-foreground bst:outline-none"
        />
      ) : (
        <span
          className={cn(
            'bst:flex bst:min-w-0 bst:flex-1 bst:items-baseline bst:gap-2',
            node.hidden && 'bst:line-through bst:opacity-45',
          )}
        >
          <b className="bst:shrink-0 bst:text-[12.5px] bst:font-semibold bst:whitespace-nowrap">
            {name}
          </b>
          {preview ? (
            <span className="bst:min-w-0 bst:truncate bst:text-xs bst:text-muted-foreground">
              {preview}
            </span>
          ) : null}
        </span>
      )}
      <span
        className={cn(
          'bst:flex bst:shrink-0 bst:items-center bst:transition-opacity',
          node.hidden || node.locked
            ? 'bst:opacity-100'
            : 'bst:opacity-0 bst:group-focus-within:opacity-100 bst:group-hover:opacity-100',
        )}
      >
        <RowToggle
          label={node.hidden ? messages.show : messages.hide}
          on={!!node.hidden}
          onClick={() => {
            store
              .getState()
              .updateNode(id, { hidden: !node.hidden }, node.hidden ? 'Show' : 'Hide');
          }}
        >
          {node.hidden ? <EyeOff /> : <Eye />}
        </RowToggle>
        <RowToggle
          label={node.locked ? messages.unlock : messages.lock}
          on={!!node.locked}
          onClick={() => {
            store
              .getState()
              .updateNode(id, { locked: !node.locked }, node.locked ? 'Unlock' : 'Lock');
          }}
        >
          {node.locked ? <Lock /> : <LockOpen />}
        </RowToggle>
      </span>
    </div>
  );
}

function RowToggle({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  children: ReactNode;
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
      onDoubleClick={(event) => {
        event.stopPropagation();
      }}
      className={cn(
        'bst:flex bst:size-6 bst:items-center bst:justify-center bst:rounded-md bst:hover:bg-card bst:hover:text-foreground bst:[&_svg]:size-3.5',
        on ? 'bst:text-foreground' : 'bst:text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}
