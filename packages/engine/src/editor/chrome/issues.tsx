'use client';

import type { Issue } from '../../core';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useDeferredValue, useMemo } from 'react';

import { useEditor, useEditorContext } from '../context';

/** The document's open issues, from the kit's checks, a beat behind the typing. */
export function useIssues(): Issue[] {
  const { profile } = useEditorContext();
  const doc = useDeferredValue(useEditor((state) => state.doc));
  return useMemo(() => profile.check(doc), [profile, doc]);
}

/** Selects the block an issue is about and brings it into view. */
export function useJumpToIssue() {
  const { store } = useEditorContext();
  return (issue: Issue) => {
    const id = issue.nodeId;
    if (!id) return;
    store.getState().select([id]);
    document
      .querySelector(`[data-node="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
}

/** The issues, one row each, with a jump to the block when there is one. */
export function IssueList({ issues }: { issues: readonly Issue[] }) {
  const { messages } = useEditorContext();
  const jump = useJumpToIssue();
  return (
    <div className="bst:grid bst:gap-0.5">
      {issues.map((issue, index) => (
        <button
          key={`${issue.code}-${issue.nodeId ?? ''}-${String(index)}`}
          type="button"
          disabled={!issue.nodeId}
          onClick={() => {
            jump(issue);
          }}
          className="bst:group bst:grid bst:w-full bst:cursor-pointer bst:grid-cols-[18px_minmax(0,1fr)_auto] bst:items-start bst:gap-2 bst:rounded-lg bst:px-2 bst:py-[7px] bst:text-left bst:text-[12.5px] bst:transition-colors bst:hover:bg-accent bst:disabled:cursor-default bst:disabled:hover:bg-transparent"
        >
          <span
            className={
              issue.severity === 'error'
                ? 'bst:mt-px bst:grid bst:size-4 bst:place-items-center bst:rounded-full bst:bg-destructive/12 bst:text-destructive'
                : 'bst:mt-px bst:grid bst:size-4 bst:place-items-center bst:rounded-full bst:bg-warn/14 bst:text-warn'
            }
          >
            {issue.severity === 'error' ? (
              <AlertCircle className="bst:size-[11px]" aria-hidden="true" />
            ) : (
              <AlertTriangle className="bst:size-[11px]" aria-hidden="true" />
            )}
          </span>
          <span className="bst:min-w-0">{messages.issueText[issue.code] ?? issue.code}</span>
          {issue.nodeId ? (
            <span className="bst:text-[11.5px] bst:font-semibold bst:text-primary bst:opacity-0 bst:transition-opacity bst:group-hover:opacity-100">
              {messages.fix}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/**
 * "Things to check before you publish": the document's open issues as a card,
 * each with a Fix that jumps to its block — or a green "Ready" when there are
 * none. For the top of a kit's document settings.
 */
export function ReadyCard({ issues, action }: { issues: readonly Issue[]; action: string }) {
  const { messages } = useEditorContext();
  const jump = useJumpToIssue();
  const ok = issues.length === 0;
  return (
    <div
      className={
        ok
          ? 'bst:grid bst:gap-1 bst:rounded-card bst:border bst:border-ok/35 bst:bg-ok/10 bst:p-2.5'
          : 'bst:grid bst:gap-1 bst:rounded-card bst:border bst:border-warn/40 bst:bg-warn/10 bst:p-2.5'
      }
    >
      <div
        className={
          ok
            ? 'bst:flex bst:items-center bst:gap-2 bst:px-1 bst:pb-1 bst:text-ok'
            : 'bst:flex bst:items-center bst:gap-2 bst:px-1 bst:pb-1 bst:text-warn'
        }
      >
        {ok ? (
          <span className="bst:grid bst:size-4 bst:place-items-center bst:rounded-full bst:bg-ok bst:text-[10px] bst:font-bold bst:text-background">
            ✓
          </span>
        ) : (
          <AlertTriangle className="bst:size-4" aria-hidden="true" />
        )}
        <b className="bst:text-[12.5px] bst:font-semibold bst:text-foreground">
          {ok ? messages.readyOk(action) : messages.readyTitle(issues.length, action)}
        </b>
      </div>
      {issues.slice(0, 6).map((issue, index) => (
        <button
          key={`${issue.code}-${issue.nodeId ?? ''}-${String(index)}`}
          type="button"
          disabled={!issue.nodeId}
          onClick={() => {
            jump(issue);
          }}
          className="bst:flex bst:cursor-pointer bst:items-center bst:justify-between bst:gap-2 bst:rounded-lg bst:bg-card bst:px-2.5 bst:py-[7px] bst:text-left bst:text-[12.5px] bst:transition-transform bst:duration-200 bst:hover:translate-x-0.5 bst:disabled:cursor-default bst:disabled:hover:translate-x-0"
        >
          <span
            className={
              issue.severity === 'error'
                ? 'bst:size-1.5 bst:shrink-0 bst:rounded-full bst:bg-destructive'
                : 'bst:size-1.5 bst:shrink-0 bst:rounded-full bst:bg-warn'
            }
            aria-hidden="true"
          />
          <span className="bst:min-w-0 bst:flex-1">
            {messages.issueText[issue.code] ?? issue.code}
          </span>
          {issue.nodeId ? (
            <em className="bst:text-xs bst:font-semibold bst:text-primary bst:not-italic">
              {messages.fix}
            </em>
          ) : null}
        </button>
      ))}
    </div>
  );
}
