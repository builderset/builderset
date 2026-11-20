'use client';

import type { Breakpoint } from '../../core';
import { ArrowLeft, ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { VIEWPORT_WIDTH } from '../canvas/canvas';
import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { Button } from '../ui';
import { QuietBoundary, renderReadOnly } from './read-only';

const DEVICES: { value: Breakpoint; icon: ReactNode }[] = [
  { value: 'desktop', icon: <Monitor aria-hidden="true" /> },
  { value: 'tablet', icon: <Tablet aria-hidden="true" /> },
  { value: 'mobile', icon: <Smartphone aria-hidden="true" /> },
];

/**
 * The page as readers will see it, over the editor: nothing to click, a
 * device to choose, and the way back. "Open on the site" when the host can
 * show the draft on the real site.
 */
export function PreviewOverlay({
  open,
  onClose,
  onOpenSite,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSite?: (() => void) | undefined;
}) {
  const { profile, messages } = useEditorContext();
  const view = useEditor((state) => state.view);
  const lang = useEditor((state) => state.lang);
  const viewport = useEditor((state) => state.viewport);
  const [device, setDevice] = useState<Breakpoint>(viewport);

  useEffect(() => {
    if (open) setDevice(viewport);
  }, [open, viewport]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = profile.canvasWidths ?? VIEWPORT_WIDTH;
  // `none`: the kit's preview draws its own card (a form), so no page around it.
  const frameless = profile.canvasFrame === 'none';
  const bare = profile.canvasFrame === 'bare' || frameless;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={messages.preview}
      className="bst:fixed bst:inset-0 bst:z-[60] bst:flex bst:animate-[bst-fade-in_250ms_var(--bst-ease-enter)] bst:flex-col bst:bg-background"
    >
      <div className="bst:relative bst:flex bst:h-[52px] bst:shrink-0 bst:items-center bst:gap-2.5 bst:border-b bst:border-border bst:bg-card bst:px-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft aria-hidden="true" />}
          onClick={onClose}
        >
          {messages.backToEditing}
        </Button>
        <div
          role="group"
          aria-label={messages.breakpoint}
          className="bst:absolute bst:left-1/2 bst:flex bst:-translate-x-1/2 bst:gap-0.5 bst:rounded-[11px] bst:border bst:border-border bst:bg-card bst:p-[3px]"
        >
          {DEVICES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-label={messages[item.value]}
              aria-pressed={device === item.value}
              onClick={() => {
                setDevice(item.value);
              }}
              className={cn(
                'bld-focus bst:grid bst:size-8 bst:cursor-pointer bst:place-items-center bst:rounded-lg bst:transition-colors bst:[&_svg]:size-4',
                device === item.value
                  ? 'bst:bg-foreground bst:text-background'
                  : 'bst:text-muted-foreground bst:hover:bg-accent bst:hover:text-foreground',
              )}
            >
              {item.icon}
            </button>
          ))}
        </div>
        <div className="bst:ml-auto bst:flex bst:items-center bst:gap-2">
          {lang ? (
            <span className="bst:rounded-full bst:bg-muted bst:px-2 bst:py-0.5 bst:font-mono bst:text-[11px] bst:font-semibold bst:text-muted-foreground">
              {lang.toUpperCase()}
            </span>
          ) : null}
          {onOpenSite ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<ExternalLink aria-hidden="true" />}
              onClick={onOpenSite}
            >
              {messages.openOnSite}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="bld-scroll bst:flex bst:flex-1 bst:justify-center bst:overflow-auto bst:bg-muted bst:p-[30px]">
        <div
          style={{ width: widths[device] }}
          className={cn(
            'bst:h-fit bst:max-w-full bst:shrink-0 bst:animate-[bst-palette-in_450ms_cubic-bezier(.34,1.4,.5,1)] bst:transition-[width] bst:duration-500 bst:ease-[cubic-bezier(.2,.8,.2,1)]',
            !frameless &&
              'bst:rounded-[14px] bst:shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_20px_50px_rgb(20_23_30/0.14)]',
            frameless
              ? ''
              : bare
                ? 'bst:overflow-hidden'
                : 'bst:bg-background bst:px-6 bst:py-10 bst:sm:px-12',
            !frameless &&
              device === 'tablet' &&
              'bst:rounded-[22px] bst:shadow-[0_0_0_7px_#0c0d10,0_0_0_8px_#33363d,0_30px_60px_rgb(0_0_0/0.25)]',
            !frameless &&
              device === 'mobile' &&
              'bst:rounded-[30px] bst:shadow-[0_0_0_8px_#0c0d10,0_0_0_9px_#33363d,0_30px_60px_rgb(0_0_0/0.25)]',
          )}
        >
          <article className={bare ? undefined : 'bst:mx-auto bst:max-w-measure'}>
            {bare ? null : (
              <h1 className="bst:mb-8 bst:text-3xl bst:leading-tight bst:font-semibold bst:tracking-tight bst:text-balance bst:sm:text-4xl">
                {profile.titleOf(view) || messages.untitled}
              </h1>
            )}
            <QuietBoundary>
              {renderReadOnly(profile, { doc: view, viewport: device, locale: lang ?? undefined })}
            </QuietBoundary>
          </article>
        </div>
      </div>
    </div>
  );
}
