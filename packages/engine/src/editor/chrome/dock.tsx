'use client';

import { countWords, plainText, readingMinutes, type Breakpoint, type Issue } from '../../core';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from '../ui';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Keyboard,
  Maximize2,
  Monitor,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDeferredValue, useMemo, type ReactNode } from 'react';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { useDragSession } from './drag-layer';
import { IssueList } from './issues';

const DEVICES: { value: Breakpoint; icon: ReactNode; keys: string }[] = [
  { value: 'desktop', icon: <Monitor aria-hidden="true" />, keys: 'Ctrl 1' },
  { value: 'tablet', icon: <Tablet aria-hidden="true" />, keys: 'Ctrl 2' },
  { value: 'mobile', icon: <Smartphone aria-hidden="true" />, keys: 'Ctrl 3' },
];

const ZOOMS = [50, 75, 100, 125, 150];

function Rule() {
  return <span className="bst:mx-[5px] bst:h-5 bst:w-px bst:bg-border" aria-hidden="true" />;
}

/**
 * The floating dock at the foot of the canvas: undo and redo, the device and
 * the zoom, the document in numbers, whether it is ready, focus mode and the
 * shortcuts. What you do to the page sits on the page.
 */
export function Dock({
  issues,
  focus,
  onFocus,
  onShortcuts,
}: {
  issues: Issue[];
  focus: boolean;
  onFocus: () => void;
  onShortcuts: () => void;
}) {
  const { store, messages, registry } = useEditorContext();
  const canUndo = useEditor((state) => state.canUndo);
  const canRedo = useEditor((state) => state.canRedo);
  const undoLabel = useEditor((state) => state.undoLabel);
  const redoLabel = useEditor((state) => state.redoLabel);
  const viewport = useEditor((state) => state.viewport);
  const zoom = useEditor((state) => state.zoom);
  const doc = useDeferredValue(useEditor((state) => state.doc));
  const { words, minutes } = useMemo(
    () => ({
      words: countWords(plainText(doc, registry)),
      minutes: readingMinutes(doc, registry),
    }),
    [doc, registry],
  );
  const open = issues.length;
  // Out of the way while something is dragged: the delete target takes its place.
  const dragging = useDragSession().payload !== null;

  const icon = 'bst:size-[34px] bst:rounded-[9px] bst:[&_svg]:size-4';

  return (
    <div
      role="toolbar"
      aria-label={messages.breakpoint}
      className={cn(
        'bld-dock bst:absolute bst:bottom-4 bst:left-1/2 bst:z-30 bst:flex bst:-translate-x-1/2 bst:transition-[opacity,translate] bst:duration-300 bst:ease-[cubic-bezier(.2,.8,.2,1)]',
        dragging && 'bst:pointer-events-none bst:translate-y-5 bst:opacity-0',
        'bst:items-center bst:gap-0.5 bst:rounded-[14px] bst:border bst:border-border bst:bg-card bst:p-[5px] bst:whitespace-nowrap bst:shadow-[0_2px_6px_rgb(20_23_30/0.08),0_24px_60px_rgb(20_23_30/0.18)]',
      )}
    >
      <Tooltip content={canUndo ? `${messages.undo}: ${undoLabel ?? ''}` : messages.nothingToUndo}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.undo}
          disabled={!canUndo}
          className={icon}
          onClick={() => {
            store.getState().undo();
          }}
        >
          <Undo2 />
        </Button>
      </Tooltip>
      <Tooltip content={canRedo ? `${messages.redo}: ${redoLabel ?? ''}` : messages.nothingToRedo}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.redo}
          disabled={!canRedo}
          className={icon}
          onClick={() => {
            store.getState().redo();
          }}
        >
          <Redo2 />
        </Button>
      </Tooltip>
      <Rule />
      {DEVICES.map((device) => (
        <Tooltip key={device.value} content={`${messages[device.value]} · ${device.keys}`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages[device.value]}
            aria-pressed={viewport === device.value}
            className={cn(
              icon,
              viewport === device.value &&
                'bst:bg-foreground bst:text-background bst:hover:bg-foreground/90',
            )}
            onClick={() => {
              store.getState().setViewport(device.value);
            }}
          >
            {device.icon}
          </Button>
        </Tooltip>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={messages.zoom}
            className="bld-focus bst:inline-flex bst:h-[34px] bst:cursor-pointer bst:items-center bst:gap-1 bst:rounded-[9px] bst:pr-2 bst:pl-2.5 bst:font-mono bst:text-xs bst:font-medium bst:text-foreground/85 bst:tabular-nums bst:transition-colors bst:hover:bg-accent bst:aria-expanded:bg-accent"
          >
            {zoom}%
            <ChevronDown className="bst:size-3.5 bst:opacity-70" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top">
          {ZOOMS.map((value) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => {
                store.getState().setZoom(value);
              }}
            >
              {value}%
              {value === zoom ? (
                <Check className="bst:ml-auto bst:size-4" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Rule />
      <span className="bst:hidden bst:px-1.5 bst:font-mono bst:text-xs bst:text-muted-foreground bst:tabular-nums bst:xl:inline">
        {messages.words(words)} · {messages.readingTime(minutes)}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'bld-focus bst:inline-flex bst:h-[30px] bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-[9px] bst:px-2.5 bst:text-xs bst:font-semibold bst:transition-transform bst:active:scale-95',
              open ? 'bst:bg-warn/14 bst:text-warn' : 'bst:bg-ok/12 bst:text-ok',
            )}
          >
            {open ? (
              <AlertTriangle className="bst:size-3.5" aria-hidden="true" />
            ) : (
              <Check className="bst:size-3.5" aria-hidden="true" />
            )}
            <motion.span
              key={open}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="bst:tabular-nums"
            >
              {open ? messages.toCheck(open) : messages.ready}
            </motion.span>
          </button>
        </PopoverTrigger>
        {open ? (
          <PopoverContent
            side="top"
            align="center"
            sideOffset={12}
            className="bst:max-h-96 bst:w-[340px] bst:overflow-y-auto bst:p-2"
          >
            <p className="bst:px-2 bst:pt-1 bst:pb-1.5 bst:text-[12.5px] bst:font-semibold">
              {messages.issues(open)}
            </p>
            <IssueList issues={issues} />
          </PopoverContent>
        ) : null}
      </Popover>
      <Rule />
      <Tooltip content={`${messages.focusMode} · Ctrl \\`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.focusMode}
          aria-pressed={focus}
          className={cn(icon, focus && 'bst:bg-primary/12 bst:text-primary')}
          onClick={onFocus}
        >
          <Maximize2 />
        </Button>
      </Tooltip>
      <Tooltip content={`${messages.shortcuts} · ?`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.shortcuts}
          className={icon}
          onClick={onShortcuts}
        >
          <Keyboard />
        </Button>
      </Tooltip>
    </div>
  );
}
