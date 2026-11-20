'use client';

import { AppWindow, ClipboardList, IdCard, Mail, Newspaper, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { CopyButton } from './copy-button';
import { HERO_KITS, type HeroKitId } from './hero-kit-list';
import { preloadKit } from './hero-loaders';

/*
 * The hero's five kits: the word in the headline, the switcher, the install
 * line and the product shot all follow one clock. It advances every INTERVAL
 * while the hero is on screen, the tab visible and nobody is pointing at or
 * focused on the switcher; a click holds it for a while; with reduced motion
 * it never advances by itself.
 */

/** How long each editor is shown. */
export const INTERVAL = 6000;
/** How long the shot's change takes (the CSS transitions on .lp-shot-layer). */
export const SWAP = 1100;
/** How long a click holds the clock. */
const HOLD = 14000;
/** How long after an editor comes in the next one is mounted, hidden, behind it. */
const PREMOUNT = 2200;

const ICONS: Record<HeroKitId, LucideIcon> = {
  article: Newspaper,
  email: Mail,
  form: ClipboardList,
  card: IdCard,
  popup: AppWindow,
};

/**
 * An editor in the shot. `wait`: mounted, hidden behind the one shown, until it
 * has painted; `in`: shown; `out`: on its way out. Never more than two.
 */
export interface Layer {
  kit: number;
  phase: 'wait' | 'in' | 'out';
  ready: boolean;
}

interface HeroKitsValue {
  /** The switcher's choice. */
  selected: number;
  /** The editor in the shot (or, before any has loaded, the choice). */
  shown: number;
  layers: readonly Layer[];
  /** The clock is counting: the progress line fills. */
  running: boolean;
  /** Reduced motion: no clock, instant changes. */
  still: boolean;
  select: (kit: number, byUser?: boolean) => void;
  advance: () => void;
  ready: (kit: number) => void;
  setPointer: (on: boolean) => void;
  setFocus: (on: boolean) => void;
  setOffscreen: (on: boolean) => void;
}

const HeroKitsContext = createContext<HeroKitsValue | null>(null);

export function useHeroKits(): HeroKitsValue {
  const value = useContext(HeroKitsContext);
  if (!value) throw new Error('The hero’s kit parts must be inside <HeroKits>.');
  return value;
}

const REDUCED = '(prefers-reduced-motion: reduce)';
function subscribeReduced(change: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener('change', change);
  return () => {
    query.removeEventListener('change', change);
  };
}
function subscribeHidden(change: () => void) {
  document.addEventListener('visibilitychange', change);
  return () => {
    document.removeEventListener('visibilitychange', change);
  };
}

/** Swap `kit` in: the one shown goes out, anything else is dropped. */
function swapIn(layers: readonly Layer[], kit: number): Layer[] {
  const current = layers.find((layer) => layer.phase === 'in');
  const next = layers.find((layer) => layer.kit === kit);
  if (!next) return [...layers];
  return [
    ...(current && current.kit !== kit ? [{ ...current, phase: 'out' as const }] : []),
    { ...next, phase: 'in' as const },
  ];
}

export function HeroKits({ children }: { children: ReactNode }) {
  const still = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const hidden = useSyncExternalStore(
    subscribeHidden,
    () => document.hidden,
    () => false,
  );
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const [layers, setLayers] = useState<readonly Layer[]>([{ kit: 0, phase: 'wait', ready: false }]);
  const [pointer, setPointer] = useState(false);
  const [focus, setFocus] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [held, setHeld] = useState(false);
  const holdTimer = useRef(0);

  const select = useCallback((kit: number, byUser = false) => {
    selectedRef.current = kit;
    setSelected(kit);
    preloadKit(HERO_KITS[kit]?.id ?? 'article');
    if (byUser) {
      setHeld(true);
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => {
        setHeld(false);
      }, HOLD);
    }
    setLayers((layers) => {
      const current = layers.find((layer) => layer.phase === 'in');
      // Back to the one shown: drop whatever was waiting, let the leaving one finish.
      if (current?.kit === kit) return layers.filter((layer) => layer.phase !== 'wait');
      const existing = layers.find((layer) => layer.kit === kit);
      // Already mounted and painted (waiting behind, or on its way out): straight in.
      if (existing?.ready) return swapIn(layers, kit);
      const base = current ? [current] : [];
      return [...base, existing ?? { kit, phase: 'wait', ready: false }];
    });
  }, []);

  const advance = useCallback(() => {
    select((selectedRef.current + 1) % HERO_KITS.length);
  }, [select]);

  const ready = useCallback((kit: number) => {
    setLayers((layers) => {
      const layer = layers.find((candidate) => candidate.kit === kit);
      if (!layer || layer.ready) return layers;
      const marked = layers.map((candidate) =>
        candidate === layer ? { ...candidate, ready: true } : candidate,
      );
      return layer.phase === 'wait' && kit === selectedRef.current ? swapIn(marked, kit) : marked;
    });
  }, []);

  // The one on its way out is unmounted once its transition is over.
  const leaving = layers.find((layer) => layer.phase === 'out')?.kit ?? -1;
  useEffect(() => {
    if (leaving < 0) return;
    const timer = window.setTimeout(
      () => {
        setLayers((layers) =>
          layers.filter((layer) => !(layer.kit === leaving && layer.phase === 'out')),
        );
      },
      still ? 0 : SWAP,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [leaving, still]);

  const current = layers.find((layer) => layer.phase === 'in');
  const shown = current?.kit ?? selected;
  // The chosen one is in and nothing is leaving (one may wait behind it).
  const settled = current?.kit === selected && !layers.some((layer) => layer.phase === 'out');
  const running = !still && !hidden && !offscreen && !pointer && !focus && !held && settled;

  // While one is shown and the clock runs, the next is fetched and mounted behind it.
  useEffect(() => {
    if (!settled || still || hidden || offscreen) return;
    const next = (selected + 1) % HERO_KITS.length;
    const timer = window.setTimeout(() => {
      setLayers((layers) =>
        layers.length === 1 && layers[0]?.kit === selectedRef.current
          ? [...layers, { kit: next, phase: 'wait', ready: false }]
          : layers,
      );
    }, PREMOUNT);
    return () => {
      window.clearTimeout(timer);
    };
  }, [settled, selected, still, hidden, offscreen]);

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current);
    },
    [],
  );

  const value = useMemo<HeroKitsValue>(
    () => ({
      selected,
      shown,
      layers,
      running,
      still,
      select,
      advance,
      ready,
      setPointer,
      setFocus,
      setOffscreen,
    }),
    [selected, shown, layers, running, still, select, advance, ready],
  );
  return <HeroKitsContext.Provider value={value}>{children}</HeroKitsContext.Provider>;
}

/**
 * The headline's changing word: the old one rolls up and out of focus, the
 * new one rises into it, and the box between them resizes so the rest of the
 * line glides instead of jumping. Screen readers get the whole list instead.
 */
export function KitWord() {
  const { shown } = useHeroKits();
  const [state, setState] = useState({ current: shown, leaving: -1, changes: 0 });
  if (state.current !== shown) {
    setState({ current: shown, leaving: state.current, changes: state.changes + 1 });
  }
  const measure = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<number[] | null>(null);

  useEffect(() => {
    const box = measure.current;
    if (!box) return;
    const read = () => {
      setWidths(
        Array.from(box.children, (child) => (child as HTMLElement).getBoundingClientRect().width),
      );
    };
    read();
    const observer = new ResizeObserver(read);
    for (const child of Array.from(box.children)) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, []);

  const width = widths?.[state.current];
  const word = (index: number) => HERO_KITS[index]?.word ?? '';
  return (
    <span
      className="lp-word"
      style={width ? ({ '--word-w': `${String(width)}px` } as CSSProperties) : undefined}
      data-measured={width ? '' : undefined}
    >
      <span className="sr-only">emails, articles, forms, cards and popups</span>
      <span className="lp-word-sizer" aria-hidden="true">
        {word(state.current)}
      </span>
      {state.leaving >= 0 ? (
        <span
          key={`out-${String(state.changes)}`}
          className="lp-word-face out"
          aria-hidden="true"
          onAnimationEnd={() => {
            setState((now) => ({ ...now, leaving: -1 }));
          }}
        >
          <span className="lp-word-ink">{word(state.leaving)}</span>
        </span>
      ) : null}
      <span
        key={`in-${String(state.changes)}`}
        className={state.changes ? 'lp-word-face in' : 'lp-word-face'}
        aria-hidden="true"
      >
        <span className="lp-word-ink">{word(state.current)}</span>
      </span>
      <span ref={measure} className="lp-word-measure" aria-hidden="true">
        {HERO_KITS.map((kit) => (
          <span key={kit.id}>{kit.word}</span>
        ))}
      </span>
    </span>
  );
}

/** The install line, for the kit in the shot. */
export function KitInstall() {
  const { shown } = useHeroKits();
  const id = HERO_KITS[shown]?.id ?? 'email';
  const text = `npm install @builderset/${id}`;
  return (
    <>
      <code>
        npm install @builderset/
        <span key={id} className="lp-install-kit">
          {id}
        </span>
      </code>
      <CopyButton text={text} />
    </>
  );
}

/**
 * The switcher: five tabs over the shot. The pill behind the chosen one
 * glides to it; a line under it fills while the clock counts. Arrow keys,
 * Home and End move between them.
 */
export function KitTabs() {
  const { selected, running, still, select, advance, setPointer, setFocus } = useHeroKits();
  const list = useRef<HTMLDivElement>(null);
  const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const place = () => {
      const tab = Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]')).at(selected);
      if (tab) setGlider({ x: tab.offsetLeft, w: tab.offsetWidth });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [selected]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = HERO_KITS.length;
    const moves: Partial<Record<string, number>> = {
      ArrowRight: (selected + 1) % count,
      ArrowDown: (selected + 1) % count,
      ArrowLeft: (selected - 1 + count) % count,
      ArrowUp: (selected - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div
      className="lp-kit-switch"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setPointer(true);
      }}
      onPointerLeave={() => {
        setPointer(false);
      }}
    >
      <div
        ref={list}
        role="tablist"
        aria-label="Kits"
        className="lp-kit-tabs"
        data-placed={glider ? '' : undefined}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          // Only a keyboard's focus holds the clock; a click holds it by itself.
          if (event.target.matches(':focus-visible')) setFocus(true);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
        }}
      >
        <span
          className="lp-kit-glider"
          aria-hidden="true"
          style={
            glider
              ? ({
                  '--x': `${String(glider.x)}px`,
                  '--w': `${String(glider.w)}px`,
                } as CSSProperties)
              : undefined
          }
        />
        {HERO_KITS.map((kit, index) => {
          const Icon = ICONS[kit.id];
          const active = index === selected;
          return (
            <button
              key={kit.id}
              type="button"
              role="tab"
              id={`lp-kit-tab-${kit.id}`}
              className="lp-kit-tab"
              aria-selected={active}
              aria-controls="lp-kit-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => {
                select(index, true);
              }}
              onPointerEnter={() => {
                preloadKit(kit.id);
              }}
            >
              <Icon className="icon" size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>{kit.label}</span>
              {active && !still ? (
                <span className="lp-kit-progress" aria-hidden="true">
                  <i
                    key={selected}
                    style={{
                      animationDuration: `${String(INTERVAL)}ms`,
                      animationPlayState: running ? 'running' : 'paused',
                    }}
                    onAnimationEnd={advance}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
