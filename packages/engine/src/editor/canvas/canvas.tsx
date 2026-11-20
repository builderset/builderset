'use client';

import type { EditableTextField } from '../../core';
import { EmptyState } from '../ui';
import { FilePlus2, PenLine } from 'lucide-react';
import { motion } from 'motion/react';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { languageName } from '../messages';
import { InlineText } from '../text/inline-text';
import {
  activeDrag,
  dropAtEnd,
  dropTargetAt,
  readPayload,
  setActiveDrag,
  type DragPayload,
  type DropTarget,
} from './drop';
import { useFlip } from './flip';
import { Overlay } from './overlay';

/**
 * The widest the page gets per device, in CSS pixels, before zoom. Desktop is a
 * ceiling — it fills whatever room the panels leave; tablet and mobile are the
 * devices' own widths, shrunk only if the window cannot fit them.
 */
export const VIEWPORT_WIDTH = { desktop: 1200, tablet: 820, mobile: 390 } as const;

/** Breathing room around the page inside the canvas, per side. */
const GUTTER = 24;

/** The canvas area's width, kept current as panels open and the window resizes. */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => {
      setWidth(element.clientWidth);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return width;
}

function nodeElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('[data-node]') : null;
}

/**
 * The document as it will look, editable.
 *
 * The kit's `renderCanvas` draws it — for an article, the SAME renderer as the
 * public site in `editing` mode — so what the writer sees is what the reader
 * gets. Selection outlines, the
 * toolbar and the drop indicator live on an overlay above it, measured from
 * each element's `data-node`, rather than wrapping every block in extra
 * markup that would change the layout it is showing.
 */
export function Canvas() {
  const { registry, messages, store, profile } = useEditorContext();
  const widths = profile.canvasWidths ?? VIEWPORT_WIDTH;
  const bare = profile.canvasFrame === 'bare';
  const doc = useEditor((state) => state.doc);
  // What is drawn: the document in the language being written.
  const view = useEditor((state) => state.view);
  const lang = useEditor((state) => state.lang);
  const multilingual = useEditor((state) => state.doc.i18n?.enabled === true);
  const viewport = useEditor((state) => state.viewport);
  const zoom = useEditor((state) => state.zoom);
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const scale = zoom / 100;
  useFlip(pageRef, doc, scale);
  const available = useWidth(scrollRef);
  // In page pixels: what fits beside the gutters at this zoom, never more than
  // the device's width. Until the first measure, the device width.
  const pageWidth = available
    ? Math.max(320, Math.min(widths[viewport], (available - GUTTER * 2) / scale))
    : widths[viewport];

  const editText = useCallback(
    (field: EditableTextField) => (
      <InlineText key={`${field.nodeId}:${field.path}`} field={field} />
    ),
    [],
  );

  const body = useMemo(
    () => profile.renderCanvas({ doc: view, editText, viewport, locale: lang ?? undefined }),
    [view, lang, editText, profile, viewport],
  );
  const Header = bare ? undefined : profile.canvasHeader;

  const empty = (doc.nodes[doc.root]?.children?.length ?? 0) === 0;

  const onClick = (event: MouseEvent) => {
    // Links in the canvas never navigate.
    if (event.target instanceof Element && event.target.closest('a')) event.preventDefault();
    const element = nodeElement(event.target);
    const state = store.getState();
    if (!element) {
      if (event.target === event.currentTarget) state.select([]);
      return;
    }
    const id = element.dataset.node;
    if (!id) return;
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      const has = state.selection.includes(id);
      state.select(
        has ? state.selection.filter((other) => other !== id) : [...state.selection, id],
      );
      return;
    }
    if (state.selection.length !== 1 || state.selection[0] !== id) state.select([id]);
    // Typing goes to the block that was clicked; clicking elsewhere stops it.
    if (!(event.target instanceof Element && event.target.closest('[data-inline-text]'))) {
      state.setEditing(null);
    }
  };

  const payloadOf = (event: DragEvent): DragPayload | null =>
    activeDrag() ?? readPayload(event.dataTransfer);

  /** Near the top or bottom edge while dragging: scroll, faster the closer. */
  const autoScroll = (clientY: number) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const edge = 80;
    if (clientY < rect.top + edge) {
      scroller.scrollBy({ top: -Math.ceil(((rect.top + edge - clientY) / edge) * 18) });
    } else if (clientY > rect.bottom - edge) {
      scroller.scrollBy({ top: Math.ceil(((clientY - (rect.bottom - edge)) / edge) * 18) });
    }
  };

  const onDragOver = (event: DragEvent) => {
    const payload = payloadOf(event);
    if (!payload) return;
    autoScroll(event.clientY);
    const element = nodeElement(event.target);
    const id = element?.dataset.node;
    const target =
      element && id
        ? dropTargetAt(doc, registry, id, element.getBoundingClientRect(), event.clientY, payload)
        : dropAtEnd(doc, registry, payload);
    if (target) {
      event.preventDefault();
      event.dataTransfer.dropEffect = payload.kind === 'nodes' ? 'move' : 'copy';
    }
    setDrop((current) =>
      current?.anchorId === target?.anchorId && current?.placement === target?.placement
        ? current
        : target,
    );
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const payload = payloadOf(event);
    const target = drop;
    setDrop(null);
    setActiveDrag(null);
    if (!payload || !target) return;
    const state = store.getState();
    if (payload.kind === 'type') {
      state.insertElement(payload.type, { parentId: target.parentId, index: target.index });
    } else if (payload.kind === 'fragment') {
      state.insertFragment(payload.build(), { parentId: target.parentId, index: target.index });
    } else {
      state.moveNodes(payload.ids, target.parentId, target.index);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="bld-canvas bst:relative bst:h-full bst:overflow-x-hidden bst:overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) store.getState().select([]);
      }}
    >
      {lang ? (
        <p role="status" className="bst:sr-only">
          {messages.writingIn(languageName(lang, messages.languages))}
        </p>
      ) : null}
      <motion.div
        className={cn('bst:mx-auto bst:pb-[130px]', multilingual ? 'bst:pt-[60px]' : 'bst:pt-8')}
        initial={false}
        animate={{ width: pageWidth * scale }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      >
        <div
          style={{ width: pageWidth, zoom: scale }}
          data-device={viewport}
          className={cn(
            'bld-page bst:min-h-[70vh] bst:rounded-[14px] bst:shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_20px_50px_rgb(20_23_30/0.14)] bst:transition-[border-radius] bst:duration-400',
            bare ? 'bst:overflow-hidden' : 'bst:bg-background',
            viewport === 'tablet' &&
              'bst:rounded-[22px] bst:shadow-[0_0_0_7px_#0c0d10,0_0_0_8px_#33363d,0_30px_60px_rgb(0_0_0/0.25)]',
            viewport === 'mobile' &&
              'bst:rounded-[30px] bst:shadow-[0_0_0_8px_#0c0d10,0_0_0_9px_#33363d,0_30px_60px_rgb(0_0_0/0.25)]',
          )}
        >
          <div
            ref={pageRef}
            role="presentation"
            className={
              bare
                ? 'bst:relative bst:min-h-[70vh]'
                : 'bst:relative bst:px-6 bst:py-10 bst:sm:px-12'
            }
            onClick={onClick}
            onMouseOver={(event) => {
              if (activeDrag()) return;
              store.getState().hover(nodeElement(event.target)?.dataset.node ?? null);
            }}
            onMouseLeave={() => {
              store.getState().hover(null);
            }}
            onDragOver={onDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null);
            }}
            onDrop={onDrop}
          >
            <article className={bare ? 'bst:min-h-[70vh]' : 'bst:mx-auto bst:max-w-measure'}>
              {Header ? <Header /> : null}
              {empty ? (
                <EmptyState
                  size="compact"
                  icon={<FilePlus2 aria-hidden="true" />}
                  title={messages.emptyTitle}
                  description={messages.emptyBody}
                  action={
                    <button
                      type="button"
                      className="bst:inline-flex bst:h-9 bst:items-center bst:gap-2 bst:rounded-control bst:bg-primary bst:px-3 bst:text-sm bst:font-medium bst:text-primary-foreground bst:transition-transform bst:active:scale-95"
                      onClick={() => {
                        const state = store.getState();
                        // Through `insertElement`, so a host whose text must sit
                        // in containers (an email) gets them built around it.
                        const id = state.insertElement(profile.paragraphType, {
                          parentId: doc.root,
                          index: 0,
                        });
                        if (id) state.setEditing(id);
                      }}
                    >
                      <PenLine className="bst:size-4" aria-hidden="true" />
                      {messages.startWriting}
                    </button>
                  }
                />
              ) : (
                body
              )}
            </article>
            <Overlay pageRef={pageRef} scale={scale} drop={drop} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
