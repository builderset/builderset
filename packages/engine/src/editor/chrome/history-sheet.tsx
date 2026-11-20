'use client';

import { richTextToPlain, type BuilderNode, type EngineDocument, type RichText } from '../../core';
import { Button, Input, Spinner, EmptyState } from '../ui';
import { Clock, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import type { EditorMessages } from '../messages';
import type { RevisionSummary } from '../../host';
import { SideDrawer } from './side-drawer';

interface Change {
  kind: 'added' | 'removed' | 'changed';
  label: string;
  before?: string | undefined;
  after?: string | undefined;
}

/** A block's words, short: what a reader would recognise it by. */
function textOf(node: BuilderNode | undefined): string {
  if (!node) return '';
  const text = node.props.text;
  const value = Array.isArray(text)
    ? richTextToPlain(text as RichText)
    : typeof text === 'string'
      ? text
      : typeof node.props.title === 'string'
        ? node.props.title
        : typeof node.props.caption === 'string'
          ? node.props.caption
          : '';
  return value.length > 120 ? `${value.slice(0, 117)}…` : value;
}

/** What a version has that the draft does not, and the other way round. */
function diff(
  older: EngineDocument,
  current: EngineDocument,
  titleOf: (doc: EngineDocument) => string,
  messages: EditorMessages,
): Change[] {
  const changes: Change[] = [];
  const name = (node: BuilderNode) => node.name ?? messages.elements[node.type]?.name ?? node.type;
  const titleBefore = titleOf(older);
  const titleAfter = titleOf(current);
  if (titleBefore !== titleAfter) {
    changes.push({
      kind: 'changed',
      label: messages.title,
      before: titleBefore,
      after: titleAfter,
    });
  }
  // In the draft's reading order, then what only the version had.
  const order: string[] = [];
  const walk = (doc: EngineDocument, id: string) => {
    const node = doc.nodes[id];
    if (!node) return;
    if (id !== doc.root && !order.includes(id)) order.push(id);
    node.children?.forEach((child) => {
      walk(doc, child);
    });
  };
  walk(current, current.root);
  walk(older, older.root);
  for (const id of order) {
    const before = older.nodes[id];
    const after = current.nodes[id];
    if (after && !before) {
      changes.push({ kind: 'added', label: name(after), after: textOf(after) });
    } else if (before && !after) {
      changes.push({ kind: 'removed', label: name(before), before: textOf(before) });
    } else if (before && after) {
      const same =
        JSON.stringify(before.props) === JSON.stringify(after.props) &&
        JSON.stringify(before.style ?? null) === JSON.stringify(after.style ?? null) &&
        JSON.stringify(before.children ?? null) === JSON.stringify(after.children ?? null);
      if (!same) {
        const was = textOf(before);
        const now = textOf(after);
        changes.push({
          kind: 'changed',
          label: name(after),
          before: was !== now ? was : undefined,
          after: was !== now ? now : undefined,
        });
      }
    }
  }
  return changes;
}

/**
 * Saved versions: autosaves, named saves and what went live, as a timeline.
 * Pick one to see what changed from it to the draft; restoring it makes it
 * the working draft as ONE undo step — nothing reaches the site until the
 * writer publishes.
 */
export function HistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { host, messages, store, locale, profile } = useEditorContext();
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, EngineDocument | 'failed'>>({});

  useEffect(() => {
    if (!open || !host.loadRevisions) return;
    let alive = true;
    setRevisions(null);
    setPicked(null);
    void host.loadRevisions().then((rows) => {
      if (alive) setRevisions(rows);
    });
    return () => {
      alive = false;
    };
  }, [open, host]);

  // The picked version, loaded once.
  useEffect(() => {
    if (!picked || loaded[picked] || !host.loadRevision) return;
    let alive = true;
    host
      .loadRevision(picked)
      .then((doc) => {
        if (alive) setLoaded((current) => ({ ...current, [picked]: doc }));
      })
      .catch(() => {
        if (alive) setLoaded((current) => ({ ...current, [picked]: 'failed' }));
      });
    return () => {
      alive = false;
    };
  }, [picked, loaded, host]);

  const restore = async (revision: RevisionSummary) => {
    if (!host.loadRevision) return;
    setBusy(revision.id);
    try {
      const cached = loaded[revision.id];
      const doc = cached && cached !== 'failed' ? cached : await host.loadRevision(revision.id);
      store.getState().replaceDocument(doc, { keepHistory: true, label: messages.restoreRevision });
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const saveVersion = async () => {
    if (!host.saveRevision || !label.trim()) return;
    setBusy('new');
    try {
      if (await host.saveRevision(store.getState().doc, label.trim())) {
        setLabel('');
        host.toast('success', messages.saved);
        const rows = await host.loadRevisions?.();
        if (rows) setRevisions(rows);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <SideDrawer open={open} onClose={onClose} title={messages.revisions}>
      {host.saveRevision ? (
        <form
          className="bst:mb-4 bst:flex bst:gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveVersion();
          }}
        >
          <Input
            value={label}
            maxLength={120}
            placeholder={messages.versionLabel}
            aria-label={messages.versionLabel}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            loading={busy === 'new'}
            icon={<Save aria-hidden="true" />}
            disabled={!label.trim()}
          >
            {messages.saveVersion}
          </Button>
        </form>
      ) : null}
      {revisions === null ? (
        <div className="bst:flex bst:justify-center bst:py-10">
          <Spinner />
        </div>
      ) : revisions.length === 0 ? (
        <EmptyState
          size="compact"
          icon={<Clock aria-hidden="true" />}
          title={messages.noRevisions}
        />
      ) : (
        <ol className="bst:-mx-2">
          {revisions.map((revision, index) => {
            const on = picked === revision.id;
            const doc = loaded[revision.id];
            const changes =
              on && doc && doc !== 'failed'
                ? diff(doc, store.getState().doc, profile.titleOf, messages)
                : null;
            return (
              <li key={revision.id} className="bst:relative">
                {/* The timeline's line, through every dot. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'bst:absolute bst:left-[19px] bst:w-px bst:bg-border',
                    index === 0 ? 'bst:top-[18px]' : 'bst:top-0',
                    index === revisions.length - 1 ? 'bst:h-[18px]' : 'bst:bottom-0',
                  )}
                />
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => {
                    setPicked(on ? null : revision.id);
                  }}
                  className={cn(
                    'bst:relative bst:grid bst:w-full bst:cursor-pointer bst:grid-cols-[14px_minmax(0,1fr)] bst:gap-3 bst:rounded-lg bst:px-3 bst:py-2.5 bst:text-left bst:transition-colors',
                    on ? 'bst:bg-primary/10' : 'bst:hover:bg-accent',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'bst:relative bst:z-[1] bst:mt-[3px] bst:size-[13px] bst:rounded-full bst:border-2',
                      revision.kind === 'publish'
                        ? 'bst:border-ok bst:bg-ok'
                        : revision.kind === 'manual'
                          ? 'bst:border-primary bst:bg-primary'
                          : 'bst:border-border-strong bst:bg-card',
                    )}
                  />
                  <span className="bst:min-w-0">
                    <b className="bst:block bst:truncate bst:text-[13px] bst:font-semibold">
                      {revision.label ?? messages.revisionKinds[revision.kind] ?? revision.kind}
                    </b>
                    <small className="bst:block bst:truncate bst:text-xs bst:text-muted-foreground">
                      {new Date(revision.createdAt).toLocaleString(locale)}
                      {revision.author ? ` · ${revision.author}` : ''}
                    </small>
                  </span>
                </button>
                {on ? (
                  <div className="bst:mx-3 bst:mt-1 bst:mb-3 bst:ml-9 bst:grid bst:animate-[bst-rise_250ms_var(--bst-ease-enter)] bst:gap-2 bst:rounded-xl bst:border bst:border-border bst:bg-card bst:p-3 bst:text-[12.5px]">
                    <p className="bst:text-xs bst:text-muted-foreground">
                      <b className="bst:font-semibold bst:text-foreground">
                        {messages.whatChanged}
                      </b>{' '}
                      · {messages.comparedWithDraft}
                    </p>
                    {!doc ? (
                      <div className="bst:flex bst:justify-center bst:py-2">
                        <Spinner />
                      </div>
                    ) : changes === null ? null : changes.length === 0 ? (
                      <p className="bst:text-muted-foreground">{messages.sameAsDraft}</p>
                    ) : (
                      changes.slice(0, 10).map((change, at) => (
                        <div key={`${change.label}-${String(at)}`} className="bst:grid bst:gap-1">
                          <b className="bst:text-xs bst:font-semibold">
                            {change.label}
                            <span className="bst:ml-1.5 bst:font-medium bst:text-muted-foreground">
                              {messages[change.kind]}
                            </span>
                          </b>
                          {change.before ? (
                            <div className="bst:rounded-md bst:bg-destructive/10 bst:px-2 bst:py-1.5 bst:text-destructive bst:line-through">
                              {change.before}
                            </div>
                          ) : null}
                          {change.after ? (
                            <div className="bst:rounded-md bst:bg-ok/12 bst:px-2 bst:py-1.5 bst:text-ok">
                              {change.after}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                    <div className="bst:flex bst:gap-1.5 bst:pt-1">
                      <Button
                        type="button"
                        size="sm"
                        loading={busy === revision.id}
                        icon={<RotateCcw aria-hidden="true" />}
                        onClick={() => {
                          void restore(revision);
                        }}
                      >
                        {messages.restoreRevision}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </SideDrawer>
  );
}
