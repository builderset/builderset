'use client';

import { Button, Input, Spinner, EmptyState } from '../ui';
import { Clock, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useEditorContext } from '../context';
import type { RevisionSummary } from '../../host';
import { SideDrawer } from './side-drawer';

/**
 * Saved versions of the article: autosaves, named saves and what went live.
 * Restoring one makes it the working draft as ONE undo step — nothing reaches
 * the site until the writer publishes it.
 */
export function HistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { host, messages, store, locale } = useEditorContext();
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !host.loadRevisions) return;
    let alive = true;
    setRevisions(null);
    void host.loadRevisions().then((rows) => {
      if (alive) setRevisions(rows);
    });
    return () => {
      alive = false;
    };
  }, [open, host]);

  const restore = async (revision: RevisionSummary) => {
    if (!host.loadRevision) return;
    setBusy(revision.id);
    try {
      const doc = await host.loadRevision(revision.id);
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
        <ol className="bst:space-y-1.5">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="bst:flex bst:items-center bst:gap-3 bst:rounded-control bst:border bst:border-border bst:bg-card bst:px-3 bst:py-2"
            >
              <div className="bst:min-w-0 bst:flex-1">
                <p className="bst:truncate bst:text-sm bst:font-medium">
                  {revision.label ?? messages.revisionKinds[revision.kind] ?? revision.kind}
                </p>
                <p className="bst:truncate bst:text-xs bst:text-muted-foreground">
                  {new Date(revision.createdAt).toLocaleString(locale)}
                  {revision.author ? ` · ${revision.author}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={busy === revision.id}
                icon={<RotateCcw aria-hidden="true" />}
                onClick={() => {
                  void restore(revision);
                }}
              >
                {messages.restore}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </SideDrawer>
  );
}
