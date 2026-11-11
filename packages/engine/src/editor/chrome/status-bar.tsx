'use client';

import { countWords, plainText, readingMinutes, type Issue } from '@motors/builder-core';
import { Popover, PopoverContent, PopoverTrigger } from '@motors/ui';
import {
  AlertCircle,
  AlertTriangle,
  Blocks,
  CheckCircle2,
  Clock,
  Keyboard,
  Monitor,
  Smartphone,
  Tablet,
  Type,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDeferredValue, useMemo, type ReactNode } from 'react';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';

const DEVICE_ICON = { desktop: Monitor, tablet: Tablet, mobile: Smartphone } as const;

function Stat({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums [&_svg]:size-3.5 [&_svg]:opacity-70">
      {icon}
      {children}
    </span>
  );
}

/**
 * The bottom strip: what the article is (left); how you are looking at it,
 * the shortcuts and whether it is ready (right).
 */
export function StatusBar({ issues, onShortcuts }: { issues: Issue[]; onShortcuts: () => void }) {
  const { registry, messages, store } = useEditorContext();
  const doc = useDeferredValue(useEditor((state) => state.doc));
  const viewport = useEditor((state) => state.viewport);
  const zoom = useEditor((state) => state.zoom);
  const { words, minutes, blocks } = useMemo(() => {
    const text = plainText(doc, registry);
    return {
      words: countWords(text),
      minutes: readingMinutes(doc, registry),
      blocks: Object.keys(doc.nodes).length - 1,
    };
  }, [doc, registry]);
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const Device = DEVICE_ICON[viewport];

  return (
    <footer className="border-border bg-sidebar text-muted-foreground flex h-9 shrink-0 items-center justify-between gap-3 border-t px-3 text-xs">
      {/* ── Left: the article in numbers ── */}
      <div className="flex min-w-0 items-center gap-4">
        <Stat icon={<Type aria-hidden="true" />}>{messages.words(words)}</Stat>
        <Stat icon={<Clock aria-hidden="true" />}>{messages.readingTime(minutes)}</Stat>
        <span className="hidden md:flex">
          <Stat icon={<Blocks aria-hidden="true" />}>{blocks}</Stat>
        </span>
      </div>

      {/* ── Right: how you are looking at it ── */}
      <div className="flex min-w-0 items-center justify-end gap-4">
        <span className="hidden md:flex">
          <Stat icon={<Device aria-hidden="true" />}>
            {messages[viewport]} · {zoom}%
          </Stat>
        </span>
        <button
          type="button"
          onClick={onShortcuts}
          className="hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        >
          <Keyboard className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{messages.shortcuts}</span>
        </button>
        {/* Is it ready — last, at the edge, where the eye ends the row. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-medium transition-[colors,transform] active:scale-95',
                issues.length === 0
                  ? 'border-ok/25 bg-ok/10 text-ok'
                  : errors
                    ? 'border-destructive/25 bg-destructive/10 text-destructive'
                    : 'border-warn/25 bg-warn/10 text-warn',
              )}
            >
              {issues.length === 0 ? (
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              ) : errors ? (
                <AlertCircle className="size-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-3.5" aria-hidden="true" />
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
            <PopoverContent align="end" side="top" className="max-h-80 w-80 overflow-y-auto p-1">
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
      </div>
    </footer>
  );
}
