'use client';

import { countWords, plainText, readingMinutes, type Issue } from '@motors/builder-core';
import { Popover, PopoverContent, PopoverTrigger } from '@motors/ui';
import { AlertCircle, AlertTriangle, CheckCircle2, Keyboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useDeferredValue, useMemo } from 'react';

import { useEditor, useEditorContext } from '../context';

export function StatusBar({ issues, onShortcuts }: { issues: Issue[]; onShortcuts: () => void }) {
  const { registry, messages, store } = useEditorContext();
  const doc = useDeferredValue(useEditor((state) => state.doc));
  const { words, minutes } = useMemo(() => {
    const text = plainText(doc, registry);
    return { words: countWords(text), minutes: readingMinutes(doc, registry) };
  }, [doc, registry]);
  const errors = issues.filter((issue) => issue.severity === 'error').length;

  return (
    <footer className="border-border bg-sidebar text-muted-foreground flex h-8 shrink-0 items-center gap-4 border-t px-3 text-xs">
      <span className="tabular-nums">{messages.words(words)}</span>
      <span className="tabular-nums">{messages.readingTime(minutes)}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="hover:text-foreground flex items-center gap-1.5 rounded px-1 transition-colors"
          >
            {issues.length === 0 ? (
              <CheckCircle2 className="text-ok size-3.5" aria-hidden="true" />
            ) : errors ? (
              <AlertCircle className="text-destructive size-3.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="text-warn size-3.5" aria-hidden="true" />
            )}
            <motion.span
              key={issues.length}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="tabular-nums"
            >
              {issues.length ? messages.issues(issues.length) : messages.noIssues}
            </motion.span>
          </button>
        </PopoverTrigger>
        {issues.length ? (
          <PopoverContent align="start" className="max-h-80 w-80 overflow-y-auto p-1">
            {issues.map((issue, index) => (
              <div
                key={`${issue.code}-${issue.nodeId ?? ''}-${String(index)}`}
                className="hover:bg-accent/50 flex items-center gap-2 rounded px-2 py-1.5 text-sm"
              >
                {issue.severity === 'error' ? (
                  <AlertCircle className="text-destructive size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="text-warn size-4 shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {messages.issueText[issue.code] ?? issue.code}
                </span>
                {issue.nodeId ? (
                  <button
                    type="button"
                    className="text-primary shrink-0 text-xs font-medium hover:underline"
                    onClick={() => {
                      const id = issue.nodeId;
                      if (!id) return;
                      store.getState().select([id]);
                      document
                        .querySelector(`[data-node="${CSS.escape(id)}"]`)
                        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }}
                  >
                    {messages.jumpTo}
                  </button>
                ) : null}
              </div>
            ))}
          </PopoverContent>
        ) : null}
      </Popover>
      <button
        type="button"
        onClick={onShortcuts}
        className="hover:text-foreground ml-auto flex items-center gap-1.5 transition-colors"
      >
        <Keyboard className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{messages.shortcuts}</span>
      </button>
    </footer>
  );
}
