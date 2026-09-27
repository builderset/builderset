'use client';

import type { Breakpoint } from '@motors/builder-core';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SegmentedControl,
  Tooltip,
} from '@motors/ui';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  CloudOff,
  Copy,
  Eye,
  History,
  Loader2,
  Monitor,
  PanelLeft,
  PanelRight,
  Redo2,
  Rocket,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Undo,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';

import { useEditor, useEditorContext } from '../context';

export interface TopBarActions {
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onSchedule: () => void;
  onUnpublish?: (() => void) | undefined;
  onPreview?: (() => void) | undefined;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  onHistory?: (() => void) | undefined;
  busy: boolean;
}

const DEVICES: { value: Breakpoint; icon: ReactNode }[] = [
  { value: 'desktop', icon: <Monitor className="size-4" aria-hidden="true" /> },
  { value: 'tablet', icon: <Tablet className="size-4" aria-hidden="true" /> },
  { value: 'mobile', icon: <Smartphone className="size-4" aria-hidden="true" /> },
];

const ZOOMS = [50, 75, 100, 125, 150];

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}

/** "Saved · 2 min ago", "Saving…", "Conflict" — with a small pop on each change. */
function SaveIndicator() {
  const { messages } = useEditorContext();
  const saveState = useEditor((state) => state.saveState);
  const dirty = useEditor((state) => state.revision !== state.savedRevision);
  const lastSavedAt = useEditor((state) => state.lastSavedAt);
  const now = useNow(30_000);

  let icon: ReactNode;
  let text: string;
  let tone = 'text-muted-foreground';
  if (saveState === 'saving') {
    icon = <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />;
    text = messages.saveSaving;
  } else if (saveState === 'conflict') {
    icon = <AlertTriangle className="size-3.5" aria-hidden="true" />;
    text = messages.saveConflict;
    tone = 'text-destructive';
  } else if (saveState === 'error') {
    icon = <CloudOff className="size-3.5" aria-hidden="true" />;
    text = messages.saveError;
    tone = 'text-warn';
  } else if (dirty) {
    icon = <span className="bg-warn size-2 rounded-full" aria-hidden="true" />;
    text = messages.saveDirty;
  } else if (lastSavedAt) {
    const minutes = Math.floor((now - lastSavedAt) / 60_000);
    const when =
      minutes < 1
        ? messages.justNow
        : minutes < 60
          ? messages.minutesAgo(minutes)
          : messages.hoursAgo(Math.floor(minutes / 60));
    icon = <Check className="text-ok size-3.5" aria-hidden="true" />;
    text = messages.savedAgo(when);
  } else {
    icon = <Check className="size-3.5" aria-hidden="true" />;
    text = messages.saveIdle;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`hidden items-center gap-1.5 text-xs lg:flex ${tone}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${saveState}-${String(dirty)}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className="flex"
        >
          {icon}
        </motion.span>
      </AnimatePresence>
      <span className="whitespace-nowrap">{text}</span>
    </span>
  );
}

export function TopBar(actions: TopBarActions) {
  const { store, messages, article } = useEditorContext();
  const canUndo = useEditor((state) => state.canUndo);
  const canRedo = useEditor((state) => state.canRedo);
  const undoLabel = useEditor((state) => state.undoLabel);
  const redoLabel = useEditor((state) => state.redoLabel);
  const viewport = useEditor((state) => state.viewport);
  const zoom = useEditor((state) => state.zoom);
  const title = useEditor((state) => state.doc.meta.title);
  const leftOpen = useEditor((state) => state.leftOpen);
  const rightOpen = useEditor((state) => state.rightOpen);
  const published = article.status === 'published';
  const scheduled = !published && !!article.scheduledAt;
  const statusKey = scheduled ? 'status_scheduled' : (`status_${article.status}` as 'status_draft');

  return (
    <header className="border-border bg-sidebar flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      <Tooltip content={messages.back}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.back}
          onClick={actions.onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip content="[">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.add}
          aria-pressed={leftOpen}
          className="hidden md:inline-flex"
          onClick={() => {
            store.getState().toggleLeft();
          }}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
      </Tooltip>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-semibold">{title || messages.untitled}</span>
        <Badge
          tone={published ? 'finalized' : scheduled ? 'scheduled' : 'pending'}
          className="hidden sm:inline-flex"
        >
          {messages[statusKey]}
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip
          content={canUndo ? `${messages.undo}: ${undoLabel ?? ''}` : messages.nothingToUndo}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.undo}
            disabled={!canUndo}
            onClick={() => {
              store.getState().undo();
            }}
          >
            <Undo2 aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip
          content={canRedo ? `${messages.redo}: ${redoLabel ?? ''}` : messages.nothingToRedo}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.redo}
            disabled={!canRedo}
            onClick={() => {
              store.getState().redo();
            }}
          >
            <Redo2 aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>

      <SegmentedControl
        aria-label={messages.breakpoint}
        value={viewport}
        onValueChange={(value) => {
          store.getState().setViewport(value);
        }}
        options={DEVICES.map((device) => ({
          value: device.value,
          label: device.icon,
          ariaLabel: messages[device.value],
        }))}
        className="hidden md:flex"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden tabular-nums lg:inline-flex"
          >
            {zoom}%
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ZOOMS.map((value) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => {
                store.getState().setZoom(value);
              }}
            >
              {value}%
              {value === zoom ? <Check className="ml-auto size-4" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveIndicator />

      {actions.onHistory ? (
        <Tooltip content={messages.revisions}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.revisions}
            onClick={actions.onHistory}
          >
            <History aria-hidden="true" />
          </Button>
        </Tooltip>
      ) : null}

      {actions.onPreview ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Eye aria-hidden="true" />}
          onClick={actions.onPreview}
          className="hidden sm:inline-flex"
        >
          {messages.preview}
        </Button>
      ) : null}

      <div className="flex items-center">
        <Button
          type="button"
          size="sm"
          loading={actions.busy}
          icon={<Rocket aria-hidden="true" />}
          onClick={actions.onPublish}
          className="rounded-r-none"
        >
          {published ? messages.update : messages.publish}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              aria-label={messages.moreOptions}
              className="border-primary-foreground/20 rounded-l-none border-l"
              disabled={actions.busy}
            >
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={actions.onSave}>
              <Save className="size-4" aria-hidden="true" />
              {messages.saveDraft}
              <span className="text-muted-foreground ml-auto text-xs">Ctrl S</span>
            </DropdownMenuItem>
            {!published ? (
              <DropdownMenuItem onSelect={actions.onSchedule}>
                <CalendarClock className="size-4" aria-hidden="true" />
                {messages.schedule}
              </DropdownMenuItem>
            ) : null}
            {published && actions.onUnpublish ? (
              <DropdownMenuItem onSelect={actions.onUnpublish}>
                <Undo className="size-4" aria-hidden="true" />
                {messages.unpublish}
              </DropdownMenuItem>
            ) : null}
            {actions.onDuplicate ? (
              <DropdownMenuItem onSelect={actions.onDuplicate}>
                <Copy className="size-4" aria-hidden="true" />
                {messages.duplicateArticle}
              </DropdownMenuItem>
            ) : null}
            {actions.onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={actions.onDelete} className="text-destructive">
                  <Trash2 className="size-4" aria-hidden="true" />
                  {messages.deleteArticle}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tooltip content="]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.settings}
          aria-pressed={rightOpen}
          className="hidden md:inline-flex"
          onClick={() => {
            store.getState().toggleRight();
          }}
        >
          <PanelRight aria-hidden="true" />
        </Button>
      </Tooltip>
    </header>
  );
}
