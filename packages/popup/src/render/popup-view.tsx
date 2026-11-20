'use client';

import { localize, type BuilderNode } from '@builderset/engine';
import { Check, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
  type ReactNode,
} from 'react';

import {
  elementsOf,
  fillVariables,
  formatOf,
  POPUP_TYPES,
  validateSubmission,
  whyHidden,
  type PopupDocument,
  type SeenRecord,
  type ShowContext,
} from '../core';
import { frameStyle, PopupElementContent, type ElementContext } from './elements';
import { browserStore, type PopupStore } from './store';
import { inkOn, popupClassName, popupScale, popupStyle, type PopupViewport } from './style';
import { errorText, popupWords, type PopupWords } from './words';

/**
 * The popup on a real page: it waits for its display rules (`shouldShow`) and
 * its trigger — on load, after a delay, at a scroll depth, when the mouse
 * heads for the tab bar, on a click — then comes in with its motion, and goes
 * when it is closed (×, a "close" click, the page behind it, Esc, by itself).
 * The browser remembers when it was shown, closed and filled in, for its
 * frequency.
 *
 * A modal one takes the keyboard while open (focus inside, back where it was
 * after), and is announced as a dialog. It shrinks to fit a phone, and moves
 * without motion for a visitor who asked for less (`prefers-reduced-motion`).
 *
 * Load `@builderset/popup/popup.css` on the page. The server checks what
 * `onSubmit` sends again with `validateSubmission`.
 */

/** What the site counts: shown, closed, a link or button clicked, the inputs sent. */
export type PopupEvent = 'shown' | 'closed' | 'clicked' | 'submitted';

/** Why it closed. */
export type CloseReason = 'close' | 'outside' | 'esc' | 'auto' | 'action';

/** Which element a click or a submission came from, for a host that tells them apart. */
export interface PopupClick {
  action: 'link' | 'close' | 'submit';
  /** The element's id, and its name in the layers when it has one ("Accept all"). */
  id: string;
  name?: string | undefined;
  url?: string | undefined;
}

export interface PopupViewProps {
  document: PopupDocument;
  /** The visitor's language: the popup's words in it, when it has them, and the built-in words. */
  locale?: string | undefined;
  /** Words for a language that is not built in. */
  words?: PopupWords | undefined;
  /** The variables' values: `{ visitor: { first_name: 'Ana' } }`. */
  data?: unknown;
  /** Storage key → address, for pictures and logos. */
  assetUrl?: ((key: string) => string) | undefined;
  /** Under which name this browser remembers the popup: its id in your database. */
  storageKey?: string | undefined;
  /** Where it is remembered. Default: `localStorage` and `sessionStorage`. */
  store?: PopupStore | undefined;
  /** Facts the rules read, in place of the browser's: the path, the device, the language, now. */
  context?: Partial<ShowContext> | undefined;
  /** Apply the display rules. Off: only the trigger decides (a preview). Default: on. */
  rules?: boolean | undefined;
  /** The longest a delay trigger waits, in milliseconds (a preview shortens it). */
  maxDelay?: number | undefined;
  /**
   * Drawn inside its parent element instead of over the window, and the
   * triggers watch `scope`: a preview of a page inside a page.
   */
  contained?: boolean | undefined;
  /** Where a scroll, a mouse leaving and a click are watched. Default: the window. */
  scope?: HTMLElement | null | undefined;
  /**
   * The checked answers when a submit button is pressed. Resolve `false` (or
   * throw) to stay on the form; anything else shows the thank-you.
   */
  onSubmit?: ((values: Record<string, string>, details: PopupClick) => unknown) | undefined;
  /** For counting: shown, closed, clicked, submitted. */
  onEvent?: ((event: PopupEvent) => void) | undefined;
  /** Every click on a link, a "close" or a submit button, with the element it came from. */
  onClick?: ((click: PopupClick) => void) | undefined;
  onClose?: ((reason: CloseReason) => void) | undefined;
  className?: string | undefined;
}

type Phase = 'waiting' | 'open' | 'leaving' | 'closed';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** How long the way out takes, in milliseconds. */
export const EXIT_MS = 240;

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A storage name from the popup's working name, when the host gives none. */
function keyOf(doc: PopupDocument): string {
  const slug = doc.meta.name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `popup-${slug || 'default'}`;
}

export function PopupView({
  document: stored,
  locale,
  words: givenWords,
  data,
  assetUrl,
  storageKey,
  store: givenStore,
  context,
  rules = true,
  maxDelay,
  contained = false,
  scope,
  onSubmit,
  onEvent,
  onClick,
  onClose,
  className,
}: PopupViewProps): ReactNode {
  const doc = useMemo(() => (locale ? localize(stored, locale) : stored), [stored, locale]);
  const format = formatOf(doc);
  const type = POPUP_TYPES[format.type];
  const words = givenWords ?? popupWords(locale);
  const key = storageKey ?? keyOf(doc);
  const store = useMemo(() => givenStore ?? browserStore(), [givenStore]);

  const [phase, setPhase] = useState<Phase>('waiting');
  // The phase as the listeners see it, without waiting for a render.
  const phaseRef = useRef<Phase>('waiting');
  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const allowed = useRef<boolean | null>(null);
  const id = useId();
  const headingId = `${id}-heading`;

  // The latest callbacks and facts, read by listeners armed once: a parent
  // that renders again must not restart a delay.
  const callbacks = useRef({ onEvent, onClick, onClose, onSubmit });
  callbacks.current = { onEvent, onClick, onClose, onSubmit };
  const facts = useRef({ doc, key, store, context, rules });
  facts.current = { doc, key, store, context, rules };

  const remember = useCallback(
    (patch: SeenRecord) => {
      store.write(key, { ...store.read(key), ...patch });
    },
    [store, key],
  );

  const open = useCallback(() => {
    setThanks(null);
    setFailed(false);
    setErrors({});
    go('open');
    remember({ shownAt: Date.now(), session: store.session() });
    callbacks.current.onEvent?.('shown');
  }, [go, remember, store]);

  const close = useCallback(
    (reason: CloseReason) => {
      if (phaseRef.current !== 'open') return;
      // Closing by itself is not the visitor's answer: "until closed" still waits for one.
      if (reason !== 'auto') remember({ closedAt: Date.now() });
      go('leaving');
      callbacks.current.onEvent?.('closed');
      callbacks.current.onClose?.(reason);
    },
    [go, remember],
  );

  // Whether the rules let it show, once; then the trigger. A click trigger
  // arms again after it closes: each click is the visitor asking for it.
  const { trigger, delay, scroll, selector } = format.display;
  useEffect(() => {
    if (phase !== 'waiting' && !(phase === 'closed' && trigger === 'click')) return;
    if (allowed.current === null) {
      const { doc: popup, key: name, store: kept, context: given, rules: apply } = facts.current;
      const seenHere: ShowContext = {
        path: window.location.pathname,
        device: window.matchMedia('(max-width: 640px)').matches ? 'mobile' : 'desktop',
        language: window.document.documentElement.lang || undefined,
        now: Date.now(),
        returning: kept.returning(),
        seen: trigger === 'click' ? null : kept.read(name),
        session: kept.session(),
        ...given,
      };
      allowed.current = !apply || whyHidden(popup, seenHere) === null;
    }
    if (!allowed.current) return;

    const target: HTMLElement | Window = scope ?? window;
    switch (trigger) {
      case 'load': {
        open();
        return;
      }
      case 'delay': {
        const timer = window.setTimeout(open, Math.min(delay * 1000, maxDelay ?? Infinity));
        return () => {
          window.clearTimeout(timer);
        };
      }
      case 'scroll': {
        const check = () => {
          const element = scope ?? window.document.documentElement;
          const room = element.scrollHeight - element.clientHeight;
          const top = scope ? scope.scrollTop : window.scrollY;
          // A page too short to scroll has been read to the end.
          if (room <= 0 || top / room >= scroll / 100) open();
        };
        check();
        target.addEventListener('scroll', check, { passive: true });
        return () => {
          target.removeEventListener('scroll', check);
        };
      }
      case 'exit': {
        const leave = (event: MouseEvent) => {
          const top = scope ? scope.getBoundingClientRect().top : 0;
          if (event.clientY <= top && !event.relatedTarget) open();
        };
        const element: HTMLElement | Document = scope ?? window.document;
        const name = scope ? 'mouseleave' : 'mouseout';
        element.addEventListener(name, leave as EventListener);
        return () => {
          element.removeEventListener(name, leave as EventListener);
        };
      }
      case 'click': {
        const clicked = (event: Event) => {
          const from = event.target;
          if (!(from instanceof Element) || !selector.trim()) return;
          let match: Element | null = null;
          try {
            match = from.closest(selector);
          } catch {
            // Not a selector: `checkPopup` says so before it goes live.
          }
          if (!match) return;
          event.preventDefault();
          open();
        };
        target.addEventListener('click', clicked);
        return () => {
          target.removeEventListener('click', clicked);
        };
      }
    }
  }, [phase, trigger, delay, scroll, selector, maxDelay, scope, open]);

  // Leaving: the exit motion, then gone, focus back where it was.
  const exit = format.motion.exit;
  useEffect(() => {
    if (phase !== 'leaving') return;
    const ms = exit === 'none' || reducedMotion() ? 0 : EXIT_MS;
    const timer = window.setTimeout(() => {
      go('closed');
      returnFocus.current?.focus();
      returnFocus.current = null;
    }, ms);
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, exit, go]);

  // Open: the keyboard, closing by itself, the page behind held still.
  const { esc, autoClose } = format.motion;
  const modal = type.modal;
  useEffect(() => {
    if (phase !== 'open') return;
    const box = boxRef.current;
    if (modal && box) {
      returnFocus.current =
        window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
      (box.querySelector<HTMLElement>('input') ?? box).focus();
    }
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && esc) {
        close('esc');
        return;
      }
      if (event.key !== 'Tab' || !modal || !box) return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = window.document.activeElement;
      if (event.shiftKey && (active === first || active === box)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.document.addEventListener('keydown', keys);
    const timer = autoClose
      ? window.setTimeout(() => {
          close('auto');
        }, autoClose * 1000)
      : undefined;
    const body = window.document.body;
    const overflow = body.style.overflow;
    if (modal && !contained) body.style.overflow = 'hidden';
    return () => {
      window.document.removeEventListener('keydown', keys);
      window.clearTimeout(timer);
      if (modal && !contained) body.style.overflow = overflow;
    };
  }, [phase, esc, autoClose, modal, contained, close]);

  // Smaller than the design on a phone: scaled to fit, again whenever the room
  // changes — the window, or the element a preview or a page puts it in.
  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const room = contained || format.type === 'inline' ? rootRef.current?.parentElement : null;
    const measure = () => {
      const viewport: PopupViewport = room
        ? { width: room.clientWidth, height: room.clientHeight }
        : { width: window.innerWidth, height: window.innerHeight };
      setScale(viewport.width > 0 ? popupScale(format, viewport) : 1);
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = room ? new ResizeObserver(measure) : null;
    if (room) observer?.observe(room);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [phase, contained, format]);

  if (phase === 'waiting' || phase === 'closed') return null;

  const shown = elementsOf(doc).filter(
    (node) => !node.hidden && !(node.type === 'close' && !format.motion.closeX),
  );
  const heading = shown.find((node) => node.type === 'heading');
  const inputs = shown.filter((node) => node.type === 'input');
  const submitButtons = shown.filter(
    (node) => node.type === 'button' && node.props.action === 'submit',
  );
  const elementContext: ElementContext = { format, words, data: data ?? {}, assetUrl };

  const clickOf = (node: BuilderNode): PopupClick => ({
    action: node.type === 'close' ? 'close' : (node.props.action as PopupClick['action']),
    id: node.id,
    ...(node.name ? { name: node.name } : {}),
    ...(node.props.action === 'link' ? { url: String(node.props.url) } : {}),
  });

  const act = (node: BuilderNode) => {
    const click = clickOf(node);
    callbacks.current.onClick?.(click);
    callbacks.current.onEvent?.('clicked');
    close(click.action === 'close' ? 'close' : 'action');
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    if (sending) return;
    const submitter = event.nativeEvent.submitter;
    const button =
      submitButtons.find((node) => node.id === submitter?.getAttribute('data-node')) ??
      submitButtons[0];
    if (!button) return;
    const result = validateSubmission(doc, values);
    if (!result.ok) {
      setErrors(
        Object.fromEntries(
          Object.entries(result.errors).map(([name, found]) => [name, errorText(words, found)]),
        ),
      );
      const first = inputs.find((node) => result.errors[node.props.name as string]);
      boxRef.current
        ?.querySelector<HTMLInputElement>(`input[name="${String(first?.props.name)}"]`)
        ?.focus();
      return;
    }
    setErrors({});
    setFailed(false);
    setSending(true);
    const click = clickOf(button);
    let accepted = true;
    try {
      accepted = (await callbacks.current.onSubmit?.(result.values, click)) !== false;
    } catch {
      accepted = false;
    }
    setSending(false);
    if (!accepted) {
      setFailed(true);
      return;
    }
    remember({ submittedAt: Date.now() });
    callbacks.current.onClick?.(click);
    callbacks.current.onEvent?.('submitted');
    const said = fillVariables(String(button.props.thanks), data ?? {}).trim();
    if (said) setThanks(said);
    else close('action');
  };

  const stage = shown.map((node) => (
    <div key={node.id} className={`bsp-el bsp-e-${node.type}`} style={frameStyle(node)}>
      <PopupElementContent
        node={node}
        context={elementContext}
        live={{
          headingId: node === heading ? headingId : undefined,
          value: values[node.props.name as string],
          error: errors[node.props.name as string],
          errorId: `${id}-${node.id}-error`,
          onValue: (value) => {
            setValues((current) => ({ ...current, [node.props.name as string]: value }));
          },
          onAction: act,
          sending,
        }}
      />
    </div>
  ));

  const named = heading ? { 'aria-labelledby': headingId } : { 'aria-label': words.dialog };
  const ink = inkOn(format.background);

  return (
    <div
      ref={rootRef}
      className={[
        popupClassName(format),
        contained ? 'bsp-contained' : '',
        phase === 'leaving' ? 'bsp-leaving' : 'bsp-open',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={popupStyle(format, scale)}
    >
      {type.overlay ? (
        <div
          className="bsp-dim"
          aria-hidden="true"
          onClick={
            format.motion.outside
              ? () => {
                  close('outside');
                }
              : undefined
          }
        />
      ) : null}
      <div
        ref={boxRef}
        className="bsp-box"
        role={format.type === 'inline' ? 'region' : 'dialog'}
        aria-modal={modal ? true : undefined}
        tabIndex={-1}
        {...named}
      >
        {inputs.length || submitButtons.length ? (
          <form className="bsp-stage" noValidate onSubmit={(event) => void submit(event)}>
            {stage}
          </form>
        ) : (
          <div className="bsp-stage">{stage}</div>
        )}
        {failed ? (
          <p className="bsp-failed" role="alert">
            {words.failed}
          </p>
        ) : null}
        {thanks ? (
          <div className="bsp-thanks" role="status" style={{ color: ink }}>
            <Check className="bsp-thanks-icon" aria-hidden="true" />
            <p>{thanks}</p>
            {format.type === 'inline' ? null : (
              <button
                type="button"
                className="bsp-thanks-close"
                aria-label={words.close}
                onClick={() => {
                  close('close');
                }}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
