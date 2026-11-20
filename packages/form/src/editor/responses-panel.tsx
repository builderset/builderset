'use client';

import { useEditor } from '@builderset/engine/editor';
import { EmptyState, Spinner } from '@builderset/engine/ui';
import { Inbox } from 'lucide-react';
import { useEffect, useState } from 'react';

import { stepsOf, type FormDocument } from '../core';
import { useForm, type FormResponses } from './context';

/**
 * The Responses tab: the numbers at a glance — how many, this week, how many
 * finish, how long it takes — how far people get step by step, and the
 * latest responses, each opening in the host's own screen. All of it comes
 * from the host's `loadResponses`; without it the tab says where responses
 * will show.
 */
export function ResponsesPanel() {
  const { words, loadResponses, onOpenResponse } = useForm();
  const titles = useEditor<string, FormDocument>((state) =>
    JSON.stringify(stepsOf(state.doc).map((step) => (step.props.title as string) || '')),
  );
  const [data, setData] = useState<FormResponses | null | undefined>(
    loadResponses ? undefined : null,
  );

  useEffect(() => {
    if (!loadResponses) return;
    let alive = true;
    loadResponses()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [loadResponses]);

  if (data === undefined) {
    return (
      <div className="bst:flex bst:justify-center bst:py-8">
        <Spinner />
      </div>
    );
  }
  if (!data || data.total === 0) {
    return (
      <EmptyState
        size="compact"
        icon={<Inbox aria-hidden="true" />}
        title={words.noResponses}
        description={words.noResponsesHint}
      />
    );
  }

  const stats: [string, string][] = [
    [data.total.toLocaleString(), words.total],
    ...(data.thisWeek !== undefined
      ? [[data.thisWeek.toLocaleString(), words.thisWeek] as [string, string]]
      : []),
    ...(data.completion !== undefined
      ? [[`${String(Math.round(data.completion * 100))}%`, words.completion] as [string, string]]
      : []),
    ...(data.averageSeconds !== undefined
      ? [
          [
            `${String(Math.floor(data.averageSeconds / 60))}:${String(Math.round(data.averageSeconds % 60)).padStart(2, '0')}`,
            words.averageTime,
          ] as [string, string],
        ]
      : []),
  ];
  const steps = JSON.parse(titles) as string[];

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-4">
      <div className="bst:grid bst:grid-cols-2 bst:gap-2 bst:px-3 bst:pb-3">
        {stats.map(([value, label]) => (
          <div
            key={label}
            className="bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-3"
          >
            <b className="bst:block bst:text-xl bst:font-bold bst:tracking-tight bst:tabular-nums">
              {value}
            </b>
            <small className="bst:text-[11.5px] bst:text-muted-foreground">{label}</small>
          </div>
        ))}
      </div>
      {data.reached?.length ? (
        <div className="bst:grid bst:gap-1.5 bst:px-3 bst:pb-2">
          {data.reached.map((share, index) => (
            <div
              key={index}
              className="bst:grid bst:grid-cols-[80px_minmax(0,1fr)_38px] bst:items-center bst:gap-2 bst:text-xs"
            >
              <span className="bst:truncate bst:text-muted-foreground">
                {steps[index] ?? String(index + 1)}
              </span>
              <i
                className="bst:block bst:h-2 bst:origin-left bst:animate-[bst-rise_600ms_var(--bst-ease-enter)] bst:rounded bst:bg-primary"
                style={{ width: `${String(Math.round(share * 100))}%` }}
              />
              <b className="bst:text-right bst:font-mono bst:text-[11.5px]">{`${String(Math.round(share * 100))}%`}</b>
            </div>
          ))}
        </div>
      ) : null}
      <h3 className="bst:px-4 bst:pt-3 bst:pb-2 bst:text-xs bst:font-semibold bst:text-muted-foreground">
        {words.latest}
      </h3>
      <div className="bst:grid bst:gap-1.5 bst:px-3">
        {data.latest.map((response) => (
          <button
            key={response.id}
            type="button"
            disabled={!onOpenResponse}
            onClick={() => {
              onOpenResponse?.(response.id);
            }}
            className="bld-focus bst:grid bst:w-full bst:grid-cols-[32px_minmax(0,1fr)_auto] bst:items-center bst:gap-2.5 bst:rounded-[11px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-2 bst:text-left bst:transition-[border-color,translate] bst:enabled:cursor-pointer bst:enabled:hover:translate-x-0.5 bst:enabled:hover:border-primary/40"
          >
            <span className="bst:grid bst:size-8 bst:place-items-center bst:rounded-full bst:bg-accent bst:text-xs bst:font-bold">
              {response.title.charAt(0).toUpperCase()}
            </span>
            <span className="bst:min-w-0">
              <b className="bst:block bst:truncate bst:text-[12.5px] bst:font-semibold">
                {response.title}
              </b>
              {response.detail ? (
                <small className="bst:block bst:truncate bst:text-[11px] bst:text-muted-foreground">
                  {response.detail}
                </small>
              ) : null}
            </span>
            <span className="bst:grid bst:justify-items-end bst:gap-0.5">
              {response.status ? (
                <span className="bst:rounded-md bst:bg-primary/12 bst:px-1.5 bst:py-0.5 bst:text-[10.5px] bst:font-bold bst:text-primary">
                  {response.status}
                </span>
              ) : null}
              <small className="bst:text-[11px] bst:text-muted-foreground">{response.when}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
