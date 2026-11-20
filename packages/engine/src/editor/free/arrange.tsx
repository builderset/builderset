'use client';

import { frameOf, type NodeId } from '../../core';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { useEditor, useEditorContext } from '../context';
import { NumberStepper } from '../inspector/number-stepper';
import { Button, Input, Label, ToggleFlag, Tooltip } from '../ui';
import { useFreeCommands } from './commands';
import type { FreeAlign, FreeBoard, FreeUnit } from './types';

const ALIGNS: readonly { value: FreeAlign; icon: ReactNode }[] = [
  { value: 'left', icon: <AlignStartVertical /> },
  { value: 'hcenter', icon: <AlignCenterVertical /> },
  { value: 'right', icon: <AlignEndVertical /> },
  { value: 'top', icon: <AlignStartHorizontal /> },
  { value: 'vcenter', icon: <AlignCenterHorizontal /> },
  { value: 'bottom', icon: <AlignEndHorizontal /> },
];

function Heading({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="bst:text-xs bst:font-medium">
      {children}
    </Label>
  );
}

/** A row of icon buttons on a muted track, like the concept's. */
function IconRow({ children }: { children: ReactNode }) {
  return (
    <div className="bst:flex bst:items-center bst:justify-between bst:gap-0.5 bst:rounded-[10px] bst:bg-muted bst:p-1">
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="bst:flex-1 bst:text-muted-foreground bst:hover:bg-card bst:hover:text-foreground"
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export interface FreeArrangeProps {
  /** The selected elements. */
  ids: readonly NodeId[];
  /** The artboard they sit on: one element aligns to it. */
  artboard: FreeBoard;
  /** Replaces the alignment heading ("Align to card"). */
  title?: ReactNode;
  /** The unit's decimals, so aligned frames are rounded as the kit keeps them. Default: 2. */
  decimals?: number | undefined;
}

/**
 * Arrange, for the inspector: the six alignments (one element to the board,
 * several to each other), spread evenly (three or more), and the stacking
 * order (one element). Each press is one undo step, and the elements glide.
 */
export function FreeArrange({ ids, artboard, title, decimals = 2 }: FreeArrangeProps) {
  const { messages } = useEditorContext();
  const words = messages.free;
  const commands = useFreeCommands(decimals);
  const order = useEditor((state) => state.doc.nodes[artboard.id]?.children);
  const locked = useEditor((state) => ids.every((id) => state.doc.nodes[id]?.locked));
  const first = ids[0];
  const index = first && order ? order.indexOf(first) : -1;
  const count = order?.length ?? 0;

  return (
    <div className="bst:space-y-4">
      <div className="bst:space-y-1.5">
        <Heading>{title ?? (ids.length > 1 ? words.alignToEachOther : words.alignToBoard)}</Heading>
        <IconRow>
          {ALIGNS.map(({ value, icon }) => (
            <IconButton
              key={value}
              label={words.align[value]}
              disabled={locked}
              onClick={() => {
                commands.align(ids, value, artboard);
              }}
            >
              {icon}
            </IconButton>
          ))}
        </IconRow>
      </div>
      {ids.length > 1 ? (
        <div className="bst:space-y-1.5">
          <Heading>{words.spread}</Heading>
          {ids.length >= 3 ? (
            <div className="bst:grid bst:grid-cols-2 bst:gap-1 bst:rounded-[10px] bst:bg-muted bst:p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="bst:hover:bg-card"
                onClick={() => {
                  commands.distribute(ids, 'x');
                }}
              >
                <AlignHorizontalDistributeCenter aria-hidden="true" />
                {words.spreadAcross}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="bst:hover:bg-card"
                onClick={() => {
                  commands.distribute(ids, 'y');
                }}
              >
                <AlignVerticalDistributeCenter aria-hidden="true" />
                {words.spreadDown}
              </Button>
            </div>
          ) : (
            <p className="bst:text-xs bst:text-muted-foreground">{words.spreadHint}</p>
          )}
        </div>
      ) : null}
      {ids.length === 1 && first ? (
        <div className="bst:space-y-1.5">
          <Heading>{words.order}</Heading>
          <IconRow>
            <IconButton
              label={words.sendToBack}
              disabled={index <= 0}
              onClick={() => commands.restack(first, 'back')}
            >
              <ArrowDownToLine />
            </IconButton>
            <IconButton
              label={words.sendBackward}
              disabled={index <= 0}
              onClick={() => commands.restack(first, 'backward')}
            >
              <ArrowDown />
            </IconButton>
            <IconButton
              label={words.bringForward}
              disabled={index < 0 || index >= count - 1}
              onClick={() => commands.restack(first, 'forward')}
            >
              <ArrowUp />
            </IconButton>
            <IconButton
              label={words.bringToFront}
              disabled={index < 0 || index >= count - 1}
              onClick={() => commands.restack(first, 'front')}
            >
              <ArrowUpToLine />
            </IconButton>
          </IconRow>
        </div>
      ) : null}
    </div>
  );
}

export interface FreeLayoutFieldsProps {
  id: NodeId;
  unit: FreeUnit;
}

/**
 * One element's place in the kit's unit — X, Y, width, height, rotation — and
 * its lock, its visibility and its name in the layers. Typing in one field is
 * one undo step.
 */
export function FreeLayoutFields({ id, unit }: FreeLayoutFieldsProps) {
  const { store, messages } = useEditorContext();
  const words = messages.free;
  const node = useEditor((state) => state.doc.nodes[id]);
  const commands = useFreeCommands(unit.decimals);
  const base = useId();
  if (!node) return null;
  const frame = frameOf(node);
  const step = unit.decimals > 0 ? 10 ** -Math.min(unit.decimals, 1) : 1;
  const locked = !!node.locked;

  const field = (key: 'x' | 'y' | 'w' | 'h' | 'r', label: string) => {
    const rotation = key === 'r';
    return (
      <div className="bst:space-y-1.5">
        <Heading htmlFor={`${base}-${key}`}>{label}</Heading>
        <NumberStepper
          id={`${base}-${key}`}
          size="sm"
          value={rotation ? Math.round(frame.r) : frame[key]}
          step={rotation ? 1 : step}
          min={
            rotation ? -360 : key === 'w' || key === 'h' ? (unit.minSize ?? unit.nudge) : undefined
          }
          max={rotation ? 360 : undefined}
          integer={rotation || unit.decimals === 0}
          suffix={rotation ? '°' : unit.label}
          decreaseLabel={messages.decrease}
          increaseLabel={messages.increase}
          onChange={(value) => {
            if (value === null || locked) return;
            commands.setFrame(id, { [key]: value }, `free-field:${id}:${key}`);
          }}
        />
      </div>
    );
  };

  return (
    <div className="bst:space-y-4">
      <fieldset disabled={locked} className="bst:grid bst:grid-cols-2 bst:gap-x-3 bst:gap-y-3">
        <legend className="bst:sr-only">{words.position}</legend>
        {field('x', words.x)}
        {field('y', words.y)}
        {field('w', words.width)}
        {field('h', words.height)}
        {field('r', words.rotation)}
      </fieldset>
      <div className="bst:space-y-2">
        <ToggleFlag
          title={messages.locked}
          description={messages.lockedHint}
          checked={locked}
          onCheckedChange={(checked) => {
            store.getState().updateNode(id, { locked: checked }, checked ? 'Lock' : 'Unlock');
          }}
        />
        <ToggleFlag
          title={messages.hidden}
          description={messages.hiddenHint}
          checked={!!node.hidden}
          disabled={locked}
          onCheckedChange={(checked) => {
            store.getState().updateNode(id, { hidden: checked }, checked ? 'Hide' : 'Show');
          }}
        />
      </div>
      <div className="bst:space-y-1.5">
        <Heading htmlFor={`${base}-name`}>{messages.elementName}</Heading>
        <Input
          key={`${id}:${node.name ?? ''}`}
          id={`${base}-name`}
          defaultValue={node.name ?? ''}
          placeholder={messages.elements[node.type]?.name ?? node.type}
          maxLength={80}
          disabled={locked}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if ((node.name ?? '') !== value) {
              store.getState().updateNode(id, { name: value || null }, 'Rename');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}
