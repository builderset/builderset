'use client';

import { countWords, plainText, readingMinutes, type Issue } from '../../core';
import { Popover, PopoverContent, PopoverTrigger } from '../ui';
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
    <span className="bst:flex bst:items-center bst:gap-1.5 bst:whitespace-nowrap bst:tabular-nums bst:[&_svg]:size-3.5 bst:[&_svg]:opacity-70">
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
    <footer className="bst:flex bst:h-9 bst:shrink-0 bst:items-center bst:justify-between bst:gap-3 bst:border-t bst:border-border bst:bg-sidebar bst:px-3 bst:text-xs bst:text-muted-foreground">
      {/* ── Left: the article in numbers ── */}
      <div className="bst:flex bst:min-w-0 bst:items-center bst:gap-4">
        <Stat icon={<Type aria-hidden="true" />}>{messages.words(words)}</Stat>
        <Stat icon={<Clock aria-hidden="true" />}>{messages.readingTime(minutes)}</Stat>
        <span className="bst:hidden bst:md:flex">
          <Stat icon={<Blocks aria-hidden="true" />}>{blocks}</Stat>
        </span>
      </div>

      {/* ── Right: how you are looking at it ── */}
      <div className="bst:flex bst:min-w-0 bst:items-center bst:justify-end bst:gap-4">
        <span className="bst:hidden bst:md:flex">
          <Stat icon={<Device aria-hidden="true" />}>
            {messages[viewport]} · {zoom}%
          </Stat>
        </span>
        <button
          type="button"
          onClick={onShortcuts}
          className="bst:flex bst:cursor-pointer bst:items-center bst:gap-1.5 bst:transition-colors bst:hover:text-foreground"
        >
          <Keyboard className="bst:size-3.5" aria-hidden="true" />
          <span className="bst:hidden bst:sm:inline">{messages.shortcuts}</span>
        </button>
        {/* Is it ready — last, at the edge, where the eye ends the row. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'bst:flex bst:h-6 bst:items-center bst:gap-1.5 bst:rounded-full bst:border bst:px-2.5 bst:font-medium bst:transition-[colors,transform] bst:active:scale-95',
                issues.length === 0
                  ? 'bst:border-ok/25 bst:bg-ok/10 bst:text-ok'
                  : errors
                    ? 'bst:border-destructive/25 bst:bg-destructive/10 bst:text-destructive'
                    : 'bst:border-warn/25 bst:bg-warn/10 bst:text-warn',
              )}
            >
              {issues.length === 0 ? (
                <CheckCircle2 className="bst:size-3.5" aria-hidden="true" />
              ) : errors ? (
                <AlertCircle className="bst:size-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="bst:size-3.5" aria-hidden="true" />
              )}
              <motion.span
                key={issues.length}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="bst:tabular-nums"
              >
                {issues.length ? messages.issues(issues.length) : messages.noIssues}
              </motion.span>
            </button>
          </PopoverTrigger>
          {issues.length ? (
            <PopoverContent
              align="end"
              side="top"
              className="bst:max-h-80 bst:w-80 bst:overflow-y-auto bst:p-1"
            >
              {issues.map((issue, index) => (
                <div
                  key={`${issue.code}-${issue.nodeId ?? ''}-${String(index)}`}
                  className="bst:flex bst:items-center bst:gap-2 bst:rounded bst:px-2 bst:py-1.5 bst:text-sm bst:hover:bg-accent/50"
                >
                  {issue.severity === 'error' ? (
                    <AlertCircle
                      className="bst:size-4 bst:shrink-0 bst:text-destructive"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertTriangle
                      className="bst:size-4 bst:shrink-0 bst:text-warn"
                      aria-hidden="true"
                    />
                  )}
                  <span className="bst:min-w-0 bst:flex-1 bst:truncate">
                    {messages.issueText[issue.code] ?? issue.code}
                  </span>
                  {issue.nodeId ? (
                    <button
                      type="button"
                      className="bst:shrink-0 bst:text-xs bst:font-medium bst:text-primary bst:hover:underline"
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
