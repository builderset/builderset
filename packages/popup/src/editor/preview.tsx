'use client';

import type { Breakpoint } from '@builderset/engine';
import { Button } from '@builderset/engine/ui';
import { Clock, RotateCcw } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { exampleData, formatOf, type PopupDocument } from '../core';
import { memoryStore, PopupView } from '../render';
import { usePopup } from './context';

/**
 * The preview: a made-up page of a website, at a desktop's or a phone's size,
 * and the popup on it as a visitor meets it — its trigger (a delay shortened
 * to under a second), its motion, its closing, its form and thank-you. The
 * display rules are left out: the preview always shows it, and forgets it
 * when it is shown again.
 */

const HEIGHT: Record<Breakpoint, number> = { desktop: 640, tablet: 760, mobile: 760 };
/** What a click trigger listens for here: the page's own button stands in for the selector. */
const CLICK_TARGET = '[data-bsp-preview]';

export function PopupPreview({
  doc,
  viewport,
  locale,
}: {
  doc: PopupDocument;
  viewport: Breakpoint;
  locale?: string | undefined;
}): ReactNode {
  const { words, visitor, fields, assetUrl } = usePopup();
  const [run, setRun] = useState(0);
  const [scope, setScope] = useState<HTMLDivElement | null>(null);
  const format = formatOf(doc);
  const display = format.display;
  const phone = viewport === 'mobile';
  // A fresh memory for every showing, so "Show again" always shows it.
  const store = useMemo(() => memoryStore({}, { session: String(run) }), [run]);
  const shown = useMemo<PopupDocument>(
    () =>
      display.trigger === 'click'
        ? {
            ...doc,
            nodes: {
              ...doc.nodes,
              [doc.root]: {
                ...(doc.nodes[doc.root] ?? { id: doc.root, type: 'root', v: 1, props: {} }),
                props: { ...format, display: { ...display, selector: CLICK_TARGET } },
              },
            },
          }
        : doc,
    [doc, format, display],
  );
  const value =
    display.trigger === 'delay'
      ? String(display.delay)
      : display.trigger === 'scroll'
        ? String(display.scroll)
        : display.selector;

  const popup = scope ? (
    <PopupView
      key={run}
      document={shown}
      locale={locale}
      words={locale ? undefined : visitor}
      data={exampleData(fields)}
      assetUrl={assetUrl}
      store={store}
      rules={false}
      maxDelay={700}
      contained
      scope={scope}
      context={{ device: phone ? 'mobile' : 'desktop' }}
    />
  ) : null;

  return (
    <div className="bst:grid bst:gap-3">
      <div className="bst:flex bst:items-center bst:gap-3 bst:text-xs bst:text-muted-foreground bst:[&_svg]:size-3.5">
        <Clock aria-hidden="true" />
        <span>
          {words.opens[display.trigger](value)}
          {display.trigger === 'delay' && display.delay > 1 ? ` · ${words.shortened}` : ''}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bst:ml-auto"
          icon={<RotateCcw aria-hidden="true" />}
          onClick={() => {
            setRun((count) => count + 1);
          }}
        >
          {words.showAgain}
        </Button>
      </div>
      <div
        className="bst:relative bst:overflow-hidden bst:rounded-[14px] bst:bg-white bst:text-[#111827] bst:shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_20px_50px_rgb(20_23_30/0.14)]"
        style={{ height: HEIGHT[viewport] }}
      >
        <div ref={setScope} className="bld-scroll bst:absolute bst:inset-0 bst:overflow-y-auto">
          <MockSite phone={phone} inline={format.type === 'inline' ? popup : null} />
        </div>
        {format.type === 'inline' ? null : popup}
      </div>
    </div>
  );
}

/** A plain page to show the popup on: a header, a hero, three cards, room to scroll. */
function MockSite({ phone, inline }: { phone: boolean; inline: ReactNode }) {
  const { words } = usePopup();
  const site = words.site;
  const [brand, ...nav] = site.nav;
  return (
    <div className="bst:min-h-[200%] bst:font-sans">
      <header className="bst:flex bst:items-center bst:gap-6 bst:border-b bst:border-black/5 bst:px-8 bst:py-5">
        <b className="bst:text-lg bst:font-extrabold bst:tracking-tight">{brand}</b>
        {phone ? (
          <span
            className="bst:ml-auto bst:h-3 bst:w-5 bst:border-y-2 bst:border-[#111827]"
            aria-hidden="true"
          />
        ) : (
          <>
            <nav className="bst:ml-auto bst:flex bst:gap-6 bst:text-sm bst:text-[#4b5563]">
              {nav.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </nav>
            <span
              data-bsp-preview
              role="button"
              tabIndex={0}
              className="bst:cursor-pointer bst:rounded-[10px] bst:bg-[#e06a1b] bst:px-4 bst:py-2 bst:text-sm bst:font-semibold bst:text-white"
            >
              {site.cta}
            </span>
          </>
        )}
      </header>
      <section className={phone ? 'bst:px-6 bst:py-10' : 'bst:max-w-3xl bst:px-8 bst:py-16'}>
        <small className="bst:text-xs bst:font-semibold bst:tracking-wide bst:text-[#c2610c] bst:uppercase">
          {site.kicker}
        </small>
        <h1
          className={
            phone
              ? 'bst:mt-2 bst:text-3xl bst:leading-tight bst:font-bold'
              : 'bst:mt-3 bst:text-5xl bst:leading-tight bst:font-bold bst:tracking-tight'
          }
        >
          {site.title}
        </h1>
        <p className="bst:mt-4 bst:max-w-xl bst:text-[15px] bst:leading-relaxed bst:text-[#4b5563]">
          {site.body}
        </p>
        <div className="bst:mt-6 bst:flex bst:flex-wrap bst:gap-3">
          <span
            data-bsp-preview
            role="button"
            tabIndex={0}
            className="bst:cursor-pointer bst:rounded-[10px] bst:bg-[#e06a1b] bst:px-5 bst:py-3 bst:text-sm bst:font-semibold bst:text-white"
          >
            {site.cta}
          </span>
          <span className="bst:rounded-[10px] bst:border bst:border-black/10 bst:px-5 bst:py-3 bst:text-sm bst:font-semibold">
            {site.secondary}
          </span>
        </div>
      </section>
      {inline ? <div className="bst:px-8 bst:pb-10">{inline}</div> : null}
      <section
        className={
          phone ? 'bst:grid bst:gap-4 bst:px-6' : 'bst:grid bst:grid-cols-3 bst:gap-5 bst:px-8'
        }
      >
        {site.cards.map((card) => (
          <div
            key={card}
            className="bst:grid bst:gap-2 bst:rounded-[14px] bst:border bst:border-black/5 bst:p-5"
          >
            <i className="bst:size-7 bst:rounded-lg bst:bg-[#fdf1e9]" />
            <b className="bst:text-sm">{card}</b>
            <span className="bst:h-2 bst:rounded bst:bg-black/5" />
            <span className="bst:h-2 bst:w-2/3 bst:rounded bst:bg-black/5" />
          </div>
        ))}
      </section>
    </div>
  );
}
