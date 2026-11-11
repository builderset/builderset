'use client';

import {
  checkDocument,
  parseDocument,
  type BuilderDocument,
  type ElementRegistry,
  type Issue,
} from '@motors/builder-core';
import {
  Button,
  ConfirmDialog,
  DatePicker,
  Label,
  Sheet,
  TimePicker,
  TooltipProvider,
  useMediaQuery,
} from '@motors/ui';
import { Layers, LayoutTemplate, Plus, Redo2, Settings2, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Canvas } from './canvas/canvas';
import { HistorySheet } from './chrome/history-sheet';
import { PANEL_CSS } from './chrome/panel-css';
import { SideDrawer } from './chrome/side-drawer';
import { StatusBar } from './chrome/status-bar';
import { TopBar } from './chrome/top-bar';
import { cn } from './cn';
import {
  EditorProvider,
  useEditor,
  useProfile,
  type ArticleFacts,
  type EditorContextValue,
} from './context';
import type { BuilderHost } from './host';
import type { EditorProfile } from './profile';
import { Inspector } from './inspector/inspector';
import { editorMessages, type EditorMessages } from './messages';
import { AddPanel } from './panels/add-panel';
import { LayersPanel } from './panels/layers-panel';
import { TemplatesPanel } from './panels/templates-panel';
import { createEditorStore, type EditorStore, type LeftTab } from './store';

export interface BuilderEditorProps {
  document: BuilderDocument;
  registry: ElementRegistry;
  host: BuilderHost;
  article: ArticleFacts;
  onArticleChange: (patch: Partial<ArticleFacts>) => void;
  onBack: () => void;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
  messages?: Partial<EditorMessages> | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  /** When the server copy was last saved — a local copy newer than this is offered back. */
  savedAt?: string | null | undefined;
  /** What kind of document this is. Omitted: an article. */
  profile?: EditorProfile | undefined;
}

const AUTOSAVE_MS = 2000;
const EMPTY_PROFILE: EditorProfile = {};
const RETRY_MS = 8000;

function readLocal(key: string | undefined): { doc: unknown; at: number } | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { doc: unknown; at: number }) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string | undefined, doc: BuilderDocument | null) {
  if (!key) return;
  try {
    if (doc) window.localStorage.setItem(key, JSON.stringify({ doc, at: Date.now() }));
    else window.localStorage.removeItem(key);
  } catch {
    /* storage full or blocked — the server copy is still the real one */
  }
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/**
 * The whole builder: top bar, left rail, canvas, inspector, status bar.
 *
 * The host passes the document and an adapter (`BuilderHost`) for everything
 * that leaves the browser; this component owns the editing session — undo,
 * selection, autosave, the crash-safety copy, shortcuts and the dialogs.
 */
export function BuilderEditor(props: BuilderEditorProps) {
  const messages = useMemo(
    () => editorMessages(props.host.locale, props.messages),
    [props.host.locale, props.messages],
  );
  const hostRef = useRef(props.host);
  hostRef.current = props.host;
  const [store] = useState<EditorStore>(() =>
    createEditorStore({
      document: props.document,
      registry: props.registry,
      onNodeUpdated: props.profile?.onNodeUpdated,
      onRefused: (code) => {
        hostRef.current.toast(
          'error',
          code === 'placement.notAllowed'
            ? messages.cannotPlace
            : (messages.issueText[code] ?? code),
        );
      },
    }),
  );

  const { onArticleChange } = props;
  const setArticle = useCallback(
    (patch: Partial<ArticleFacts>) => {
      onArticleChange(patch);
      store.getState().touch();
    },
    [onArticleChange, store],
  );

  const value = useMemo<EditorContextValue>(
    () => ({
      store,
      registry: props.registry,
      host: props.host,
      messages,
      article: props.article,
      setArticle,
      profile: props.profile ?? EMPTY_PROFILE,
    }),
    [store, props.registry, props.host, messages, props.article, setArticle, props.profile],
  );

  return (
    <EditorProvider value={value}>
      <TooltipProvider>
        <style>{PANEL_CSS}</style>
        <Workspace {...props} store={store} messages={messages} />
      </TooltipProvider>
    </EditorProvider>
  );
}

function Workspace({
  store,
  messages,
  registry,
  host,
  article,
  onBack,
  onDuplicate,
  onDelete,
  storageKey,
  savedAt,
  profile = EMPTY_PROFILE,
}: BuilderEditorProps & { store: EditorStore; messages: EditorMessages }) {
  const check = useCallback(
    (doc: BuilderDocument) => (profile.check ? profile.check(doc) : checkDocument(doc, registry)),
    [profile, registry],
  );
  const doc = useEditor((state) => state.doc);
  const deferred = useDeferredValue(doc);
  const issues: Issue[] = useMemo(() => check(deferred), [check, deferred]);
  const leftOpen = useEditor((state) => state.leftOpen);
  const rightOpen = useEditor((state) => state.rightOpen);
  const leftTab = useEditor((state) => state.leftTab);
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const phone = !useMediaQuery('(min-width: 640px)', true);

  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState<Issue[] | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [history, setHistory] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoreOffer, setRestoreOffer] = useState<BuilderDocument | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'left' | 'right' | null>(null);
  const saving = useRef(false);

  // ── Saving ────────────────────────────────────────────────────────────────

  const save = useCallback(
    async (reason: 'autosave' | 'manual', force = false): Promise<boolean> => {
      if (saving.current) return false;
      const state = store.getState();
      if (reason === 'autosave' && state.revision === state.savedRevision) return true;
      if (state.saveState === 'conflict' && !force) return false;
      saving.current = true;
      const revision = state.revision;
      state.markSaving();
      try {
        const result = await host.save(state.doc, reason, { force });
        if (result.ok) {
          store.getState().markSaved(revision, Date.parse(result.savedAt) || Date.now());
          if (store.getState().revision === revision) writeLocal(storageKey, null);
          if (reason === 'manual') host.toast('success', messages.saved);
          return true;
        }
        store.getState().markSaveFailed(result.conflict);
        if (reason === 'manual' || result.conflict) host.toast('error', result.message);
        return false;
      } catch {
        store.getState().markSaveFailed(false);
        return false;
      } finally {
        saving.current = false;
      }
    },
    [host, messages, store, storageKey],
  );

  // Autosave two seconds after the last change; retry a failed one later.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.revision !== previous.revision) {
        writeLocal(storageKey, state.doc);
        clearTimeout(timer);
        timer = setTimeout(() => void save('autosave'), AUTOSAVE_MS);
      }
      if (state.saveState === 'error' && previous.saveState !== 'error') {
        clearTimeout(timer);
        timer = setTimeout(() => void save('autosave'), RETRY_MS);
      }
    });
    const flush = () => {
      if (document.visibilityState === 'hidden') void save('autosave');
    };
    document.addEventListener('visibilitychange', flush);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', flush);
    };
  }, [store, save, storageKey]);

  // Leaving with unsaved work.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const state = store.getState();
      if (state.revision !== state.savedRevision) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [store]);

  // A newer local copy than the server's: offer it back once.
  useEffect(() => {
    const local = readLocal(storageKey);
    if (!local) return;
    const serverAt = savedAt ? Date.parse(savedAt) : 0;
    if (local.at <= serverAt + 1000) {
      writeLocal(storageKey, null);
      return;
    }
    const restored = profile.parse
      ? profile.parse(local.doc)
      : (() => {
          const parsed = parseDocument(local.doc, registry);
          return parsed.ok ? parsed.doc : null;
        })();
    if (restored && JSON.stringify(restored) !== JSON.stringify(store.getState().doc)) {
      setRestoreOffer(restored);
    }
    // Only on mount: this is about what was left behind last time.
  }, []);

  // ── Publishing ────────────────────────────────────────────────────────────

  const publish = async (scheduledAt?: string | null) => {
    if (!host.publish) return;
    const current = store.getState().doc;
    const errors = check(current).filter((issue) => issue.severity === 'error');
    if (errors.length) {
      setBlocking(errors);
      return;
    }
    setBusy(true);
    const revision = store.getState().revision;
    try {
      const result = await host.publish(current, scheduledAt);
      if (result.ok) {
        store.getState().markSaved(revision, Date.parse(result.savedAt) || Date.now());
        writeLocal(storageKey, null);
        host.toast('success', scheduledAt ? messages.scheduled : messages.published);
      } else {
        store.getState().markSaveFailed(result.conflict);
        host.toast('error', result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const unpublish = host.unpublish
    ? async () => {
        setBusy(true);
        try {
          const result = await host.unpublish?.();
          if (result?.ok) host.toast('success', messages.unpublished);
          else if (result) host.toast('error', result.message);
        } finally {
          setBusy(false);
        }
      }
    : undefined;

  const preview = host.previewUrl
    ? async () => {
        // Opened before the await so the browser treats it as a user action.
        const tab = window.open('about:blank', '_blank');
        await save('autosave');
        const state = store.getState();
        const url = await host.previewUrl?.(state.doc, state.lang ?? undefined);
        if (tab && url) tab.location.href = url;
        else tab?.close();
      }
    : undefined;

  const back = () => {
    const state = store.getState();
    if (state.revision !== state.savedRevision) setLeaving(true);
    else onBack();
  };

  // ── Shortcuts ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const state = store.getState();
      const typing = isTyping(event.target);
      const key = event.key.toLowerCase();

      if (mod && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        state.undo();
      } else if (mod && ((key === 'z' && event.shiftKey) || key === 'y')) {
        event.preventDefault();
        state.redo();
      } else if (mod && key === 's') {
        event.preventDefault();
        void save('manual');
      } else if (mod && key === 'enter') {
        event.preventDefault();
        void publish();
      } else if (mod && ['1', '2', '3'].includes(key)) {
        event.preventDefault();
        state.setViewport(key === '1' ? 'desktop' : key === '2' ? 'tablet' : 'mobile');
      } else if (mod && key === '0') {
        event.preventDefault();
        state.setZoom(100);
      } else if (typing) {
        if (key === 'escape' && state.editingId) {
          state.setEditing(null);
          (event.target as HTMLElement).blur();
        }
      } else if (mod && key === 'd' && state.selection.length) {
        event.preventDefault();
        state.duplicateNodes(state.selection);
      } else if ((key === 'delete' || key === 'backspace') && state.selection.length) {
        event.preventDefault();
        state.removeNodes(state.selection);
      } else if (event.altKey && (key === 'arrowup' || key === 'arrowdown') && state.selection[0]) {
        event.preventDefault();
        state.moveBy(state.selection[0], key === 'arrowup' ? -1 : 1);
      } else if (key === 'escape') {
        const first = state.selection[0];
        const parent = first
          ? Object.values(state.doc.nodes).find((node) => node.children?.includes(first))
          : undefined;
        state.select(parent && parent.id !== state.doc.root ? [parent.id] : []);
      } else if (key === '[') {
        state.toggleLeft();
      } else if (key === ']') {
        state.toggleRight();
      } else if (key === '?') {
        setShortcuts(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  });

  // ── Layout ────────────────────────────────────────────────────────────────

  const leftPanel = (
    <LeftRail
      tab={leftTab}
      onTab={(tab) => {
        store.getState().setLeftTab(tab);
      }}
      messages={messages}
    />
  );
  const rightPanel = <Inspector />;

  return (
    <div className="bg-background text-foreground fixed inset-0 z-40 flex flex-col">
      <TopBar
        busy={busy}
        onBack={back}
        onSave={() => void save('manual')}
        onPublish={() => void publish()}
        onSchedule={() => {
          setScheduling(true);
        }}
        onUnpublish={unpublish ? () => void unpublish() : undefined}
        onPreview={preview ? () => void preview() : undefined}
        onDuplicate={onDuplicate}
        onDelete={
          onDelete
            ? () => {
                setDeleting(true);
              }
            : undefined
        }
        onHistory={
          host.loadRevisions
            ? () => {
                setHistory(true);
              }
            : undefined
        }
      />

      <div className="relative flex min-h-0 flex-1">
        {desktop ? (
          <>
            <SidePanel open={leftOpen} side="left">
              {leftPanel}
            </SidePanel>
            <main className="min-w-0 flex-1">
              <Canvas />
            </main>
            <SidePanel open={rightOpen} side="right">
              {rightPanel}
            </SidePanel>
          </>
        ) : (
          <>
            <main className="min-w-0 flex-1">
              <Canvas />
            </main>
            {phone ? (
              <>
                <Sheet
                  open={mobilePanel === 'left'}
                  onClose={() => {
                    setMobilePanel(null);
                  }}
                  title={messages[leftTab]}
                >
                  <div className="bld-panel h-[60vh]">{leftPanel}</div>
                </Sheet>
                <Sheet
                  open={mobilePanel === 'right'}
                  onClose={() => {
                    setMobilePanel(null);
                  }}
                  title={messages.settings}
                >
                  <div className="bld-panel h-[65vh]">{rightPanel}</div>
                </Sheet>
              </>
            ) : (
              <>
                <OverlayPanel
                  open={leftOpen}
                  side="left"
                  onClose={() => {
                    store.getState().toggleLeft(false);
                  }}
                >
                  {leftPanel}
                </OverlayPanel>
                <OverlayPanel
                  open={rightOpen}
                  side="right"
                  onClose={() => {
                    store.getState().toggleRight(false);
                  }}
                >
                  {rightPanel}
                </OverlayPanel>
              </>
            )}
          </>
        )}
      </div>

      {phone ? (
        <nav className="border-border bg-sidebar grid h-14 shrink-0 grid-cols-5 border-t">
          <BottomAction
            label={messages.add}
            onClick={() => {
              store.getState().setLeftTab('add');
              setMobilePanel('left');
            }}
          >
            <Plus />
          </BottomAction>
          <BottomAction
            label={messages.layers}
            onClick={() => {
              store.getState().setLeftTab('layers');
              setMobilePanel('left');
            }}
          >
            <Layers />
          </BottomAction>
          <BottomAction
            label={messages.settings}
            onClick={() => {
              setMobilePanel('right');
            }}
          >
            <Settings2 />
          </BottomAction>
          <BottomAction
            label={messages.undo}
            onClick={() => {
              store.getState().undo();
            }}
          >
            <Undo2 />
          </BottomAction>
          <BottomAction
            label={messages.redo}
            onClick={() => {
              store.getState().redo();
            }}
          >
            <Redo2 />
          </BottomAction>
        </nav>
      ) : (
        <StatusBar
          issues={issues}
          onShortcuts={() => {
            setShortcuts(true);
          }}
        />
      )}

      {/* ── Dialogs ── */}
      <ConfirmDialog
        open={blocking !== null}
        onOpenChange={(open) => {
          if (!open) setBlocking(null);
        }}
        tone="destructive"
        title={messages.publishBlocked}
        description={
          <ul className="mt-2 list-disc space-y-1 pl-5 text-left">
            {(blocking ?? []).slice(0, 8).map((issue, index) => (
              <li key={`${issue.code}-${String(index)}`}>
                {messages.issueText[issue.code] ?? issue.code}
              </li>
            ))}
          </ul>
        }
        confirmLabel={messages.jumpTo}
        cancelLabel={messages.cancel}
        onConfirm={() => {
          const first = blocking?.find((issue) => issue.nodeId)?.nodeId;
          if (first) store.getState().select([first]);
          setBlocking(null);
        }}
      />

      <ScheduleDialog
        open={scheduling}
        onClose={() => {
          setScheduling(false);
        }}
        initial={article.scheduledAt}
        messages={messages}
        onConfirm={(iso) => {
          setScheduling(false);
          void publish(iso);
        }}
      />

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        tone="destructive"
        title={messages.leaveTitle}
        description={messages.leaveBody}
        confirmLabel={messages.leave}
        cancelLabel={messages.stay}
        onConfirm={() => {
          setLeaving(false);
          writeLocal(storageKey, null);
          onBack();
        }}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        tone="destructive"
        title={messages.deleteTitle}
        description={messages.deleteBody}
        confirmLabel={messages.delete}
        cancelLabel={messages.cancel}
        onConfirm={async () => {
          if (await onDelete?.()) writeLocal(storageKey, null);
          setDeleting(false);
        }}
      />

      <ConfirmDialog
        open={restoreOffer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreOffer(null);
            writeLocal(storageKey, null);
          }
        }}
        title={messages.restoreTitle}
        description={messages.restoreBody}
        confirmLabel={messages.restore}
        cancelLabel={messages.discard}
        onConfirm={() => {
          if (restoreOffer) {
            store
              .getState()
              .replaceDocument(restoreOffer, { keepHistory: true, label: messages.restore });
          }
          setRestoreOffer(null);
        }}
      />

      <ConflictDialog store={store} messages={messages} host={host} save={save} />

      {profile.overlays ? <profile.overlays /> : null}

      <HistorySheet
        open={history}
        onClose={() => {
          setHistory(false);
        }}
      />

      <SideDrawer
        open={shortcuts}
        onClose={() => {
          setShortcuts(false);
        }}
        title={messages.shortcuts}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {messages.shortcutList.map(([keys, action]) => (
            <div key={keys} className="contents">
              <dt>
                <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono text-xs">
                  {keys}
                </kbd>
              </dt>
              <dd className="text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </SideDrawer>
    </div>
  );
}

/** The left rail's third tab: the profile's, or the article templates. */
function ThirdTab() {
  const Panel = useProfile().templatesPanel ?? TemplatesPanel;
  return <Panel />;
}

function LeftRail({
  tab,
  onTab,
  messages,
}: {
  tab: LeftTab;
  onTab: (tab: LeftTab) => void;
  messages: EditorMessages;
}) {
  const tabs: { value: LeftTab; label: string; icon: ReactNode }[] = [
    { value: 'add', label: messages.add, icon: <Plus className="size-4" aria-hidden="true" /> },
    {
      value: 'layers',
      label: messages.layers,
      icon: <Layers className="size-4" aria-hidden="true" />,
    },
    {
      value: 'templates',
      label: messages.templates,
      icon: <LayoutTemplate className="size-4" aria-hidden="true" />,
    },
  ];
  return (
    <div className="flex h-full flex-col">
      <div
        role="tablist"
        className="border-border mx-3 mt-1 grid shrink-0 grid-cols-[1fr_1fr_1.35fr] border-b"
      >
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => {
              onTab(item.value);
            }}
            className={cn(
              'relative flex h-7 min-w-0 cursor-pointer items-center justify-center gap-1 px-1.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
              tab === item.value
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon}
            {item.label}
            {tab === item.value ? (
              <motion.span
                layoutId="bld-left-tab"
                className="bg-primary absolute inset-x-0 -bottom-px h-0.5 rounded-full"
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="h-full"
          >
            {tab === 'add' ? <AddPanel /> : tab === 'layers' ? <LayersPanel /> : <ThirdTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidePanel({
  open,
  side,
  children,
}: {
  open: boolean;
  side: 'left' | 'right';
  children: ReactNode;
}) {
  const width = side === 'left' ? 288 : 336;
  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? width : 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className={cn(
        'bg-sidebar border-border shrink-0 overflow-hidden',
        side === 'left' ? 'border-r' : 'border-l',
        !open && 'border-0',
      )}
    >
      <div style={{ width }} className="bld-panel h-full">
        {children}
      </div>
    </motion.aside>
  );
}

function OverlayPanel({
  open,
  side,
  onClose,
  children,
}: {
  open: boolean;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="backdrop"
            className="absolute inset-0 z-30 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: side === 'left' ? -320 : 360 }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? -320 : 360 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className={cn(
              'bld-panel bg-sidebar border-border absolute inset-y-0 z-40 w-80 shadow-xl',
              side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
            )}
          >
            {children}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function BottomAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground active:text-foreground flex flex-col items-center justify-center gap-0.5 text-[11px] transition-transform active:scale-95 [&_svg]:size-5"
    >
      {children}
      {label}
    </button>
  );
}

function ScheduleDialog({
  open,
  onClose,
  initial,
  messages,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  initial: string | null;
  messages: EditorMessages;
  onConfirm: (iso: string) => void;
}) {
  const start = initial ? new Date(initial) : new Date(Date.now() + 24 * 3600_000);
  const [date, setDate] = useState(start.toISOString().slice(0, 10));
  const [time, setTime] = useState(start.toTimeString().slice(0, 5));
  const when = new Date(`${date}T${time || '09:00'}`);
  const valid = !Number.isNaN(when.getTime()) && when.getTime() > Date.now();

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={messages.schedule.replace('…', '')}
      description={messages.scheduleHint}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{messages.publishAt}</Label>
            <DatePicker
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={setDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">&nbsp;</Label>
            <TimePicker value={time} onChange={setTime} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {messages.cancel}
          </Button>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => {
              onConfirm(when.toISOString());
            }}
          >
            {messages.schedule.replace('…', '')}
          </Button>
        </div>
      </div>
    </SideDrawer>
  );
}

function ConflictDialog({
  store,
  messages,
  host,
  save,
}: {
  store: EditorStore;
  messages: EditorMessages;
  host: BuilderHost;
  save: (reason: 'autosave' | 'manual', force?: boolean) => Promise<boolean>;
}) {
  const conflict = useEditor((state) => state.saveState === 'conflict');
  return (
    <ConfirmDialog
      open={conflict}
      onOpenChange={(open) => {
        if (!open) store.getState().markSaveFailed(false);
      }}
      title={messages.conflictTitle}
      description={messages.conflictBody}
      confirmLabel={messages.keepMine}
      cancelLabel={messages.cancel}
      {...(host.reload
        ? {
            secondaryLabel: messages.loadTheirs,
            onSecondary: () => {
              void host.reload?.().then((doc) => {
                store.getState().replaceDocument(doc);
                store.getState().markSaved(store.getState().revision);
              });
            },
          }
        : {})}
      onConfirm={async () => {
        await save('manual', true);
      }}
    />
  );
}
