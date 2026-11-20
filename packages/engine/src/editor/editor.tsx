'use client';

import {
  themeVariables,
  type ElementRegistry,
  type EngineDocument,
  type Issue,
  type ThemeMode,
  type ThemeTokens,
} from '../core';
import {
  Button,
  ConfirmDialog,
  DateTimeField,
  Label,
  SegmentedTabs,
  Sheet,
  TooltipProvider,
  useMediaQuery,
} from './ui';
import { Layers, LayoutTemplate, Plus, Redo2, Settings2, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Canvas } from './canvas/canvas';
import { PortalProvider } from './ui/portal';
import { HistorySheet } from './chrome/history-sheet';
import { SideDrawer } from './chrome/side-drawer';
import { CommandPalette } from './chrome/command-palette';
import { Dock } from './chrome/dock';
import { LanguageBar } from './chrome/language-switch';
import { TopBar } from './chrome/top-bar';
import { cn } from './cn';
import { registerEngine } from './one-engine';
import {
  EditorProvider,
  useEditor,
  useProfile,
  type EditorContextValue,
  type RecordFacts,
} from './context';
import type { BuilderHost } from '../host';
import type { EditorProfile } from './profile';
import { Inspector } from './inspector/inspector';
import { en } from '../locales/en';
import { useHtmlLang } from './locale';
import { resolveMessages, type DeepPartial, type EditorMessages } from './messages';
import { AddPanel } from './panels/add-panel';
import { LayersPanel } from './panels/layers-panel';
import { TemplatesPanel } from './panels/templates-panel';
import { createEditorStore, type EditorStore, type LeftTab } from './store';

export interface BuilderEditorProps<
  TDoc extends EngineDocument = EngineDocument,
  TRecord extends RecordFacts = RecordFacts,
> {
  /**
   * The document to edit. Read once, when the editor mounts: to load another,
   * remount it (a new `key`).
   */
  document: TDoc;
  /** The elements a document can hold: how each is drawn, edited and checked. */
  registry: ElementRegistry;
  /** The adapter for everything that leaves the browser: saving, publishing, uploads, media URLs, notices. */
  host: BuilderHost<TDoc>;
  /** What kind of document this is: the kit's canvas, checks and panels. */
  profile: EditorProfile<TDoc>;
  /** The stored record's facts (status, schedule), when it has any. Default: a draft. */
  record?: TRecord | undefined;
  /**
   * Called with the facts the writer changed in the editor. Keep them and pass
   * the updated record back as `record`; the change also counts as unsaved work.
   */
  onRecordChange?: ((patch: Partial<TRecord>) => void) | undefined;
  /**
   * Called to leave the editor (the back button). With unsaved changes the
   * writer is asked first; the editor does not navigate by itself.
   */
  onBack: () => void;
  /** Adds "Duplicate" to the publish menu; called when the writer picks it. */
  onDuplicate?: (() => void) | undefined;
  /**
   * Adds "Delete" to the publish menu; called once the writer confirms. Resolve
   * `true` once it is deleted; leaving the editor afterwards is up to the host.
   */
  onDelete?: (() => Promise<boolean>) | undefined;
  /** The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`. */
  locale?: string | undefined;
  /** Other languages for the editor's words, by code (`@builderset/engine/locales/sq`). English is built in. */
  locales?: Readonly<Record<string, DeepPartial<EditorMessages> | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: DeepPartial<EditorMessages> | undefined;
  /**
   * The languages a document can be written in. One language: no language
   * switch and no multi-language setting. Default: `[defaultContentLocale]`.
   */
  contentLocales?: readonly string[] | undefined;
  /**
   * The language a document's tree is written in when it does not say (a new
   * document). Default: the first of `contentLocales`, else the editor's
   * language.
   */
  defaultContentLocale?: string | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  /** When the server copy was last saved — a local copy newer than this is offered back. */
  savedAt?: string | null | undefined;
  /**
   * 'light' (the default), 'dark', or 'auto' to follow the page: an ancestor
   * marked `dark` or `light` (a class, or `data-theme`), else the operating
   * system. Menus and dialogs follow it too.
   */
  theme?: ThemeMode | undefined;
  /**
   * Theme values from JavaScript, by the public variables' names without their
   * prefix: `{ primary: '#da6c1e' }` sets `--builderset-primary`. CSS on the page
   * can set the same variables instead.
   */
  tokens?: ThemeTokens | undefined;
  /** Applied to the editor's root element, the one that carries the theme. */
  className?: string | undefined;
  /**
   * Previews of the font choices, loaded from the address the kit names (the
   * email kit's: Google Fonts) when a font menu opens. `false`: never — for a
   * page whose Content-Security-Policy allows no font host, or that may not
   * call a third party. Default: `true`.
   */
  fontPreviews?: boolean | undefined;
}

const AUTOSAVE_MS = 2000;
const RETRY_MS = 8000;
const DRAFT: RecordFacts = { status: 'draft', scheduledAt: null, publishedAt: null };

function readLocal(key: string | undefined): { doc: unknown; at: number } | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { doc: unknown; at: number }) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string | undefined, doc: EngineDocument | null) {
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
export function BuilderEditor<
  TDoc extends EngineDocument = EngineDocument,
  TRecord extends RecordFacts = RecordFacts,
>(props: BuilderEditorProps<TDoc, TRecord>) {
  const htmlLang = useHtmlLang();
  const locale = props.locale === 'auto' ? htmlLang : (props.locale ?? 'en');
  useEffect(() => {
    registerEngine();
  }, []);
  // fontPreviews={false}: no font host is ever asked for a preview.
  const profile = useMemo(
    () =>
      props.fontPreviews === false
        ? { ...props.profile, fontsPreviewUrl: undefined }
        : props.profile,
    [props.profile, props.fontPreviews],
  );
  const messages = useMemo(
    () => resolveMessages<EditorMessages>(en, locale, props.locales, props.messages),
    [locale, props.locales, props.messages],
  );
  const defaultContentLocale = props.defaultContentLocale ?? props.contentLocales?.[0] ?? locale;
  const contentLocales = useMemo(
    () => props.contentLocales ?? [defaultContentLocale],
    [props.contentLocales, defaultContentLocale],
  );
  const hostRef = useRef(props.host);
  hostRef.current = props.host;
  const [store] = useState<EditorStore<TDoc>>(() =>
    createEditorStore<TDoc>({
      document: props.document,
      registry: props.registry,
      onNodeUpdated: props.profile.onNodeUpdated,
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

  const { onRecordChange } = props;
  const setRecord = useCallback(
    (patch: Partial<RecordFacts>) => {
      // The context is typed with the engine's facts; the kit's own fields
      // (an article's slug) arrive here through `useRecord<ArticleFacts>()`.
      onRecordChange?.(patch as Partial<TRecord>);
      store.getState().touch();
    },
    [onRecordChange, store],
  );

  const value = useMemo<EditorContextValue<TDoc>>(
    () => ({
      store,
      registry: props.registry,
      host: props.host,
      messages,
      locale,
      contentLocales,
      defaultContentLocale,
      record: props.record ?? DRAFT,
      setRecord,
      profile,
    }),
    [
      store,
      props.registry,
      props.host,
      messages,
      locale,
      contentLocales,
      defaultContentLocale,
      props.record,
      setRecord,
      profile,
    ],
  );

  // The root carries the theme: its class scopes the stylesheet, its attribute
  // picks the scheme, its style holds the tokens. The portal container is
  // inside it, so menus and dialogs inherit all three.
  return (
    <div
      className={cn('builderset', props.className)}
      data-builderset-theme={props.theme ?? 'light'}
      style={themeVariables(props.tokens)}
    >
      <EditorProvider value={value}>
        <PortalProvider>
          <TooltipProvider>
            <Workspace {...props} store={store} messages={messages} />
          </TooltipProvider>
        </PortalProvider>
      </EditorProvider>
    </div>
  );
}

function Workspace<TDoc extends EngineDocument, TRecord extends RecordFacts>({
  store,
  messages,
  host,
  record = DRAFT as TRecord,
  onBack,
  onDuplicate,
  onDelete,
  storageKey,
  savedAt,
  profile,
}: Omit<BuilderEditorProps<TDoc, TRecord>, 'messages'> & {
  store: EditorStore<TDoc>;
  messages: EditorMessages;
}) {
  const check = profile.check;
  const doc = useEditor<TDoc, TDoc>((state) => state.doc);
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
  const [command, setCommand] = useState(false);
  // Focus mode: both panels away, and back as they were.
  const [focus, setFocus] = useState<{ left: boolean; right: boolean } | null>(null);
  const toggleFocus = useCallback(() => {
    const state = store.getState();
    if (focus) {
      state.toggleLeft(focus.left);
      state.toggleRight(focus.right);
      setFocus(null);
    } else {
      setFocus({ left: state.leftOpen, right: state.rightOpen });
      state.toggleLeft(false);
      state.toggleRight(false);
    }
  }, [focus, store]);
  // A panel opened by hand ends focus mode.
  useEffect(() => {
    if (focus && (leftOpen || rightOpen)) setFocus(null);
  }, [focus, leftOpen, rightOpen]);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoreOffer, setRestoreOffer] = useState<TDoc | null>(null);
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
    const restored = profile.parse(local.doc);
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

      if (mod && key === 'k') {
        event.preventDefault();
        setCommand(true);
      } else if (mod && key === '\\') {
        event.preventDefault();
        toggleFocus();
      } else if (mod && key === 'z' && !event.shiftKey) {
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
      } else if (key === '/') {
        event.preventDefault();
        state.setLeftTab('add');
        state.toggleLeft(true);
        requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>('[data-library-search]')?.focus();
        });
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
    <div className="bst:fixed bst:inset-0 bst:z-40 bst:flex bst:flex-col bst:bg-background bst:text-foreground">
      <TopBar
        busy={busy}
        onCommand={() => {
          setCommand(true);
        }}
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

      <div className="bst:relative bst:flex bst:min-h-0 bst:flex-1 bst:pb-2.5">
        {desktop ? (
          <>
            <SidePanel open={leftOpen} side="left">
              {leftPanel}
            </SidePanel>
            <section
              className={cn(
                'bld-board bst:relative bst:min-w-0 bst:flex-1 bst:overflow-hidden bst:rounded-2xl bst:border bst:border-border bst:bg-muted bst:shadow-[inset_0_1px_3px_rgb(20_23_30/0.05)] bst:transition-[margin] bst:duration-[450ms] bst:ease-[cubic-bezier(.2,.8,.2,1)]',
                !leftOpen && 'bst:ml-2.5',
                !rightOpen && 'bst:mr-2.5',
              )}
            >
              <Canvas />
              <LanguageBar />
              <Dock
                issues={issues}
                focus={focus !== null}
                onFocus={toggleFocus}
                onShortcuts={() => {
                  setShortcuts(true);
                }}
              />
            </section>
            <SidePanel open={rightOpen} side="right">
              {rightPanel}
            </SidePanel>
          </>
        ) : (
          <>
            <main className="bst:relative bst:mx-2 bst:min-w-0 bst:flex-1 bst:overflow-hidden bst:rounded-2xl bst:border bst:border-border bst:bg-muted">
              <Canvas />
              <LanguageBar />
              {phone ? null : (
                <Dock
                  issues={issues}
                  focus={focus !== null}
                  onFocus={toggleFocus}
                  onShortcuts={() => {
                    setShortcuts(true);
                  }}
                />
              )}
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
                  <div className="bld-panel bst:h-[60vh]">{leftPanel}</div>
                </Sheet>
                <Sheet
                  open={mobilePanel === 'right'}
                  onClose={() => {
                    setMobilePanel(null);
                  }}
                  title={messages.settings}
                >
                  <div className="bld-panel bst:h-[65vh]">{rightPanel}</div>
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
        <nav className="bst:grid bst:h-14 bst:shrink-0 bst:grid-cols-5 bst:border-t bst:border-border bst:bg-sidebar">
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
      ) : null}

      {/* ── Dialogs ── */}
      <CommandPalette
        open={command}
        onClose={() => {
          setCommand(false);
        }}
        actions={{
          onPublish: () => void publish(),
          onSave: () => void save('manual'),
          onFocus: toggleFocus,
          onShortcuts: () => {
            setShortcuts(true);
          },
          onPreview: preview ? () => void preview() : undefined,
          onHistory: host.loadRevisions
            ? () => {
                setHistory(true);
              }
            : undefined,
        }}
      />
      <ConfirmDialog
        open={blocking !== null}
        onOpenChange={(open) => {
          if (!open) setBlocking(null);
        }}
        tone="destructive"
        title={messages.publishBlocked}
        description={
          <ul className="bst:mt-2 bst:list-disc bst:space-y-1 bst:pl-5 bst:text-left">
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
        initial={record.scheduledAt}
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
        <dl className="bst:grid bst:grid-cols-[auto_1fr] bst:gap-x-6 bst:gap-y-2 bst:text-sm">
          {messages.shortcutList.map(([keys, action]) => (
            <div key={keys} className="bst:contents">
              <dt>
                <kbd className="bst:rounded bst:border bst:border-border bst:bg-muted bst:px-1.5 bst:py-0.5 bst:font-mono bst:text-xs">
                  {keys}
                </kbd>
              </dt>
              <dd className="bst:text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </SideDrawer>
    </div>
  );
}

/** The left rail's third tab: the profile's, or the templates and saved sections. */
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
  const order: LeftTab[] = ['add', 'layers', 'templates'];
  const [from, setFrom] = useState(tab);
  // Which way the new pane slides in: from the side of the tab it came from.
  const direction = Math.sign(order.indexOf(tab) - order.indexOf(from)) || 1;
  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <SegmentedTabs
        aria-label={messages.add}
        stacked
        value={tab}
        onValueChange={(value) => {
          setFrom(tab);
          onTab(value);
        }}
        tabs={[
          { value: 'add', label: messages.add, icon: <Plus aria-hidden="true" /> },
          { value: 'layers', label: messages.layers, icon: <Layers aria-hidden="true" /> },
          {
            value: 'templates',
            label: messages.templates,
            icon: <LayoutTemplate aria-hidden="true" />,
          },
        ]}
        className="bst:mx-3 bst:mt-0.5 bst:mb-3 bst:shrink-0"
      />
      <div className="bst:relative bst:min-h-0 bst:flex-1 bst:overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={tab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -26 }}
            transition={{ duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
            className="bst:h-full"
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
  const width = side === 'left' ? 316 : 348;
  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? width : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="bst:shrink-0 bst:overflow-hidden bst:bg-background"
    >
      <div style={{ width }} className="bld-panel bst:h-full">
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
            className="bst:absolute bst:inset-0 bst:z-30 bst:bg-black/20"
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
              'bld-panel bst:absolute bst:inset-y-0 bst:z-40 bst:w-80 bst:border-border bst:bg-sidebar bst:shadow-xl',
              side === 'left' ? 'bst:left-0 bst:border-r' : 'bst:right-0 bst:border-l',
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
      className="bst:flex bst:flex-col bst:items-center bst:justify-center bst:gap-0.5 bst:text-[11px] bst:text-muted-foreground bst:transition-transform bst:active:scale-95 bst:active:text-foreground bst:[&_svg]:size-5"
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
  const [when, setWhen] = useState<string | null>(
    () => initial ?? new Date(Date.now() + 24 * 3600_000).toISOString(),
  );
  const valid = when !== null && Date.parse(when) > Date.now();
  const id = useId();

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={messages.schedule.replace('…', '')}
      description={messages.scheduleHint}
    >
      <div className="bst:space-y-4">
        <div className="bst:space-y-1.5">
          <Label htmlFor={id} className="bst:text-xs bst:font-medium">
            {messages.publishAt}
          </Label>
          <DateTimeField id={id} value={when} min={new Date().toISOString()} onChange={setWhen} />
        </div>
        <div className="bst:grid bst:grid-cols-2 bst:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {messages.cancel}
          </Button>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => {
              if (when) onConfirm(when);
            }}
          >
            {messages.schedule.replace('…', '')}
          </Button>
        </div>
      </div>
    </SideDrawer>
  );
}

function ConflictDialog<TDoc extends EngineDocument>({
  store,
  messages,
  host,
  save,
}: {
  store: EditorStore<TDoc>;
  messages: EditorMessages;
  host: BuilderHost<TDoc>;
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
