'use client';

import {
  Button,
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
  ChevronDown,
  CloudOff,
  Copy,
  Eye,
  History,
  PanelLeft,
  PanelRight,
  Rocket,
  Save,
  Search,
  Trash2,
  Undo,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';

export interface TopBarActions {
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onSchedule: () => void;
  onCommand: () => void;
  onUnpublish?: (() => void) | undefined;
  onPreview?: (() => void) | undefined;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  onHistory?: (() => void) | undefined;
  busy: boolean;
}

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

/** A dot and a few words: saved (green), unsaved or saving (amber), failed (red). */
function SaveIndicator() {
  const { messages, locale } = useEditorContext();
  const saveState = useEditor((state) => state.saveState);
  const dirty = useEditor((state) => state.revision !== state.savedRevision);
  const lastSavedAt = useEditor((state) => state.lastSavedAt);
  const now = useNow(30_000);

  let dot = 'bst:bg-ok';
  let text: string;
  let icon: ReactNode = null;
  if (saveState === 'saving') {
    dot = 'bst:bg-warn bst:animate-pulse';
    text = messages.saveSaving;
  } else if (saveState === 'conflict') {
    icon = <AlertTriangle className="bst:size-3.5 bst:text-destructive" aria-hidden="true" />;
    text = messages.saveConflict;
  } else if (saveState === 'error') {
    icon = <CloudOff className="bst:size-3.5 bst:text-warn" aria-hidden="true" />;
    text = messages.saveError;
  } else if (dirty) {
    dot = 'bst:bg-warn';
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
    text = messages.savedAgo(when);
  } else {
    text = messages.saveIdle;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="bst:hidden bst:items-center bst:gap-1.5 bst:px-2 bst:text-xs bst:whitespace-nowrap bst:text-muted-foreground bst:lg:inline-flex"
    >
      {icon ?? (
        <span
          className={cn('bst:size-[7px] bst:rounded-full bst:transition-colors', dot)}
          aria-hidden="true"
        />
      )}
      <span className="bst:hidden bst:xl:inline">{text}</span>
    </span>
  );
}

/** Where the document is: draft, scheduled, live — and live with changes not out yet. */
function StatusPill() {
  const { messages, record } = useEditorContext();
  const dirty = useEditor((state) => state.revision !== state.savedRevision);
  const published = record.status === 'published';
  const scheduled = !published && !!record.scheduledAt;
  const base =
    'bst:hidden bst:h-[22px] bst:shrink-0 bst:items-center bst:gap-[5px] bst:rounded-full bst:px-2 bst:text-[11.5px] bst:font-semibold bst:whitespace-nowrap bst:sm:inline-flex';
  if (scheduled) {
    return (
      <span className={cn(base, 'bst:bg-warn/14 bst:text-warn')}>
        <CalendarClock className="bst:size-3" aria-hidden="true" />
        {messages.status_scheduled}
      </span>
    );
  }
  if (published) {
    return (
      <span
        className={cn(base, dirty ? 'bst:bg-warn/14 bst:text-warn' : 'bst:bg-ok/12 bst:text-ok')}
      >
        <i className="bst:size-1.5 bst:rounded-full bst:bg-current" aria-hidden="true" />
        {dirty ? messages.publishedEdited : messages.status_published}
      </span>
    );
  }
  return (
    <span className={cn(base, 'bst:bg-muted bst:text-muted-foreground')}>
      {messages.status_draft}
    </span>
  );
}

const iconButton = 'bst:size-8 bst:rounded-lg bst:text-muted-foreground bst:hover:text-foreground';

/**
 * The top bar: where you are (back, the blocks panel, "Articles / title" and
 * its state) on the left; what you do with it (saved, the command menu,
 * history, preview, publish, the settings panel) on the right. How you look at
 * the page — undo, the device, the zoom — is on the dock over the canvas.
 */
export function TopBar(actions: TopBarActions) {
  const { store, messages, record, profile } = useEditorContext();
  const title = useEditor((state) => profile.titleOf(state.view));
  const leftOpen = useEditor((state) => state.leftOpen);
  const rightOpen = useEditor((state) => state.rightOpen);
  const published = record.status === 'published';
  const Actions = profile.topBarActions;

  return (
    <header className="bst:relative bst:z-30 bst:flex bst:h-[58px] bst:shrink-0 bst:items-center bst:gap-2 bst:bg-background bst:px-3">
      <Tooltip content={messages.back} side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.back}
          className={iconButton}
          onClick={actions.onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip content={`${messages.add} · [`} side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={messages.add}
          aria-pressed={leftOpen}
          className={cn(
            iconButton,
            'bst:hidden bst:md:inline-flex',
            leftOpen && 'bst:bg-primary/12 bst:text-primary bst:hover:text-primary',
          )}
          onClick={() => {
            store.getState().toggleLeft();
          }}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* "Articles / Title" and the state it is in. */}
      <div className="bst:ml-1 bst:flex bst:min-w-0 bst:items-center bst:gap-1.5 bst:text-[12.5px] bst:text-muted-foreground">
        <span className="bst:hidden bst:whitespace-nowrap bst:2xl:inline">{messages.back}</span>
        <span className="bst:hidden bst:text-muted-foreground/60 bst:2xl:inline">/</span>
        <b className="bst:max-w-[280px] bst:truncate bst:text-[13.5px] bst:font-semibold bst:text-foreground">
          {title || messages.untitled}
        </b>
        <StatusPill />
      </div>

      <div className="bst:ml-auto bst:flex bst:min-w-0 bst:items-center bst:gap-1">
        <SaveIndicator />
        <button
          type="button"
          onClick={actions.onCommand}
          aria-label={messages.commandSearch}
          className="bld-focus bst:mx-1 bst:inline-flex bst:h-[34px] bst:w-[34px] bst:cursor-pointer bst:items-center bst:justify-center bst:gap-2 bst:rounded-[10px] bst:border bst:border-border bst:bg-card bst:text-[12.5px] bst:text-muted-foreground bst:transition-colors bst:hover:border-border-strong bst:hover:text-foreground bst:2xl:w-auto bst:2xl:min-w-[250px] bst:2xl:justify-start bst:2xl:pr-1.5 bst:2xl:pl-[11px]"
        >
          <Search className="bst:size-4 bst:shrink-0" aria-hidden="true" />
          <span className="bst:hidden bst:flex-1 bst:text-left bst:2xl:inline">
            {messages.commandSearch}
          </span>
          <kbd className="bst:hidden bst:rounded-[5px] bst:border bst:border-border bst:bg-background bst:px-[5px] bst:py-[3px] bst:font-mono bst:text-[11px] bst:leading-none bst:text-muted-foreground bst:2xl:inline">
            Ctrl K
          </kbd>
        </button>
        {actions.onHistory ? (
          <Tooltip content={messages.revisions} side="bottom">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={messages.revisions}
              className={iconButton}
              onClick={actions.onHistory}
            >
              <History aria-hidden="true" />
            </Button>
          </Tooltip>
        ) : null}
        {Actions ? <Actions /> : null}
        {actions.onPreview ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Eye aria-hidden="true" />}
            onClick={actions.onPreview}
            className="bst:h-8 bst:rounded-[9px] bst:bg-card"
          >
            <span className="bst:hidden bst:lg:inline">{messages.preview}</span>
          </Button>
        ) : null}

        {/* Publish, and everything else you can do with the document. */}
        <div className="bst:ml-1 bst:flex bst:items-center bst:overflow-hidden bst:rounded-[9px] bst:shadow-[0_1px_2px_rgb(0_0_0/0.15)]">
          <Button
            type="button"
            size="sm"
            loading={actions.busy}
            icon={<Rocket aria-hidden="true" />}
            onClick={actions.onPublish}
            className="bst:h-8 bst:min-w-[104px] bst:rounded-none bst:font-semibold"
          >
            {published ? messages.update : messages.publish}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                aria-label={messages.moreOptions}
                className="bst:h-8 bst:w-[30px] bst:rounded-none bst:border-l bst:border-primary-foreground/25"
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

        <Tooltip content={`${messages.settings} · ]`} side="bottom">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.settings}
            aria-pressed={rightOpen}
            className={cn(
              iconButton,
              'bst:ml-0.5 bst:hidden bst:md:inline-flex',
              rightOpen && 'bst:bg-primary/12 bst:text-primary bst:hover:text-primary',
            )}
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
