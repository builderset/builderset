'use client';

import type { Breakpoint } from '../../core';
import {
  Badge,
  Button,
  SegmentedControl,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '../ui';
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
import { LanguageSwitch } from './language-switch';

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
  { value: 'desktop', icon: <Monitor className="bst:size-4" aria-hidden="true" /> },
  { value: 'tablet', icon: <Tablet className="bst:size-4" aria-hidden="true" /> },
  { value: 'mobile', icon: <Smartphone className="bst:size-4" aria-hidden="true" /> },
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
  const { messages, locale } = useEditorContext();
  const saveState = useEditor((state) => state.saveState);
  const dirty = useEditor((state) => state.revision !== state.savedRevision);
  const lastSavedAt = useEditor((state) => state.lastSavedAt);
  const now = useNow(30_000);

  let icon: ReactNode;
  let text: string;
  let tone = 'bst:text-muted-foreground';
  if (saveState === 'saving') {
    icon = <Loader2 className="bst:size-3.5 bst:animate-spin" aria-hidden="true" />;
    text = messages.saveSaving;
  } else if (saveState === 'conflict') {
    icon = <AlertTriangle className="bst:size-3.5" aria-hidden="true" />;
    text = messages.saveConflict;
    tone = 'bst:text-destructive';
  } else if (saveState === 'error') {
    icon = <CloudOff className="bst:size-3.5" aria-hidden="true" />;
    text = messages.saveError;
    tone = 'bst:text-warn';
  } else if (dirty) {
    icon = <span className="bst:size-2 bst:rounded-full bst:bg-warn" aria-hidden="true" />;
    text = messages.saveDirty;
  } else if (lastSavedAt) {
    const minutes = Math.floor((now - lastSavedAt) / 60_000);
    // The platform words relative time in every language: "now", "5 min. ago".
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    const when =
      minutes < 1
        ? relative.format(0, 'second')
        : minutes < 60
          ? relative.format(-minutes, 'minute')
          : relative.format(-Math.floor(minutes / 60), 'hour');
    icon = <Check className="bst:size-3.5 bst:text-ok" aria-hidden="true" />;
    text = messages.savedAgo(when);
  } else {
    icon = <Check className="bst:size-3.5" aria-hidden="true" />;
    text = messages.saveIdle;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`bst:hidden bst:items-center bst:gap-1.5 bst:text-xs bst:lg:flex ${tone}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${saveState}-${String(dirty)}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className="bst:flex"
        >
          {icon}
        </motion.span>
      </AnimatePresence>
      <span className="bst:whitespace-nowrap">{text}</span>
    </span>
  );
}

export function TopBar(actions: TopBarActions) {
  const { store, messages, record } = useEditorContext();
  const canUndo = useEditor((state) => state.canUndo);
  const canRedo = useEditor((state) => state.canRedo);
  const undoLabel = useEditor((state) => state.undoLabel);
  const redoLabel = useEditor((state) => state.redoLabel);
  const viewport = useEditor((state) => state.viewport);
  const zoom = useEditor((state) => state.zoom);
  const { profile } = useEditorContext();
  const title = useEditor((state) => profile.titleOf(state.view));
  const multilingual = useEditor((state) => state.doc.i18n?.enabled === true);
  const leftOpen = useEditor((state) => state.leftOpen);
  const rightOpen = useEditor((state) => state.rightOpen);
  const published = record.status === 'published';
  const scheduled = !published && !!record.scheduledAt;
  const statusKey = scheduled ? 'status_scheduled' : (`status_${record.status}` as 'status_draft');

  return (
    // Three zones: where you are (left), how you are looking at it (center),
    // what you do with it (right). The outer two share the leftover width
    // equally, so the center group sits in the true middle of the window.
    <header className="bst:grid bst:h-14 bst:shrink-0 bst:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] bst:items-center bst:gap-3 bst:border-b bst:border-border bst:bg-sidebar bst:px-2 bst:sm:px-3">
      {/* ── Left: navigation and identity ── */}
      <div className="bst:flex bst:min-w-0 bst:items-center bst:gap-1">
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
        <Divider />
        <Tooltip content={`${messages.add} · [`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.add}
            aria-pressed={leftOpen}
            className="bst:hidden bst:md:inline-flex"
            onClick={() => {
              store.getState().toggleLeft();
            }}
          >
            <PanelLeft aria-hidden="true" />
          </Button>
        </Tooltip>
        <div className="bst:ml-1 bst:flex bst:min-w-0 bst:items-center bst:gap-2">
          <span className="bst:truncate bst:text-sm bst:font-semibold">
            {title || messages.untitled}
          </span>
          <Badge
            tone={published ? 'published' : scheduled ? 'scheduled' : 'draft'}
            className="bst:hidden bst:shrink-0 bst:sm:inline-flex"
          >
            {messages[statusKey]}
          </Badge>
        </div>
      </div>

      {/* ── Center: view controls, one group ── */}
      <div className="bst:flex bst:items-center bst:gap-0.5 bst:rounded-control bst:border bst:border-border bst:bg-background/70 bst:p-0.5 bst:shadow-xs">
        <Tooltip
          content={canUndo ? `${messages.undo}: ${undoLabel ?? ''}` : messages.nothingToUndo}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
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
            size="icon-sm"
            aria-label={messages.redo}
            disabled={!canRedo}
            onClick={() => {
              store.getState().redo();
            }}
          >
            <Redo2 aria-hidden="true" />
          </Button>
        </Tooltip>
        {multilingual ? (
          <>
            <span className="bst:mx-1 bst:h-5 bst:w-px bst:bg-border" aria-hidden="true" />
            <LanguageSwitch className="bst:border-0 bst:bg-transparent bst:p-0" />
          </>
        ) : null}
        <span
          className="bst:mx-1 bst:hidden bst:h-5 bst:w-px bst:bg-border bst:md:block"
          aria-hidden="true"
        />
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
          className="bst:hidden bst:border-0 bst:bg-transparent bst:p-0 bst:md:flex"
        />
        <span
          className="bst:mx-1 bst:hidden bst:h-5 bst:w-px bst:bg-border bst:lg:block"
          aria-hidden="true"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={messages.zoom}
              className="bst:hidden bst:w-[4.5rem] bst:justify-between bst:tabular-nums bst:lg:inline-flex"
            >
              {zoom}%
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
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
      </div>

      {/* ── Right: saving and publishing ── */}
      <div className="bst:flex bst:min-w-0 bst:items-center bst:justify-end bst:gap-1">
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
          <Tooltip content={messages.preview}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={messages.preview}
              onClick={actions.onPreview}
            >
              <Eye aria-hidden="true" />
            </Button>
          </Tooltip>
        ) : null}
        <div className="bst:ml-1 bst:flex bst:items-center">
          <Button
            type="button"
            size="sm"
            loading={actions.busy}
            icon={<Rocket aria-hidden="true" />}
            onClick={actions.onPublish}
            className="bst:rounded-r-none"
          >
            {published ? messages.update : messages.publish}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                aria-label={messages.moreOptions}
                className="bst:rounded-l-none bst:border-l bst:border-primary-foreground/20"
                disabled={actions.busy}
              >
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bst:w-56">
              <DropdownMenuItem onSelect={actions.onSave}>
                <Save className="bst:size-4" aria-hidden="true" />
                {messages.saveDraft}
                <span className="bst:ml-auto bst:text-xs bst:text-muted-foreground">Ctrl S</span>
              </DropdownMenuItem>
              {!published ? (
                <DropdownMenuItem onSelect={actions.onSchedule}>
                  <CalendarClock className="bst:size-4" aria-hidden="true" />
                  {messages.schedule}
                </DropdownMenuItem>
              ) : null}
              {published && actions.onUnpublish ? (
                <DropdownMenuItem onSelect={actions.onUnpublish}>
                  <Undo className="bst:size-4" aria-hidden="true" />
                  {messages.unpublish}
                </DropdownMenuItem>
              ) : null}
              {actions.onDuplicate ? (
                <DropdownMenuItem onSelect={actions.onDuplicate}>
                  <Copy className="bst:size-4" aria-hidden="true" />
                  {messages.duplicateDocument}
                </DropdownMenuItem>
              ) : null}
              {actions.onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={actions.onDelete} className="bst:text-destructive">
                    <Trash2 className="bst:size-4" aria-hidden="true" />
                    {messages.deleteDocument}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Divider />
        <Tooltip content={`${messages.settings} · ]`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.settings}
            aria-pressed={rightOpen}
            className="bst:hidden bst:md:inline-flex"
            onClick={() => {
              store.getState().toggleRight();
            }}
          >
            <PanelRight aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}

function Divider() {
  return (
    <span
      className="bst:mx-1 bst:hidden bst:h-6 bst:w-px bst:bg-border bst:md:block"
      aria-hidden="true"
    />
  );
}
