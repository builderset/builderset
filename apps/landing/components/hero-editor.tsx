'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';

import { HERO_KITS, type HeroKitId } from './hero-kit-list';
import { useHeroKits, type Layer } from './hero-kits';
import type { HeroKitProps } from './hero-ready';

// Each editor is its own chunk, loaded in the browser only (hero-loaders.ts
// fetches the same chunks ahead of time).
const EDITORS: Record<HeroKitId, ComponentType<HeroKitProps>> = {
  article: dynamic(() => import('./hero-editor-article'), { ssr: false, loading: () => null }),
  email: dynamic(() => import('./hero-editor-email'), { ssr: false, loading: () => null }),
  form: dynamic(() => import('./hero-editor-form'), { ssr: false, loading: () => null }),
  card: dynamic(() => import('./hero-editor-card'), { ssr: false, loading: () => null }),
  popup: dynamic(() => import('./hero-editor-popup'), { ssr: false, loading: () => null }),
};

/** The size the editors are laid out at; they are scaled down to fit, never squeezed. */
const WIDTH = 1280;
const HEIGHT = 780;

/**
 * The hero's product shot: the five real editors — so it is always the
 * builders' current design — laid out at a desktop size and scaled to the
 * space there is. They take turns: the next one is mounted behind the one
 * shown and, once painted, rises in out of a blur while the other recedes
 * into the depth. Never more than two are mounted. They are `inert`: shown,
 * not used; the switcher above is the accessible part, and the live editor
 * further down is the one to try.
 */
export function HeroEditor() {
  const { layers, selected, ready, setPointer, setOffscreen } = useHeroKits();
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const fit = () => {
      setScale(element.clientWidth / WIDTH);
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(element);
    const seen = new IntersectionObserver((entries) => {
      setOffscreen(!entries.some((entry) => entry.isIntersecting));
    });
    seen.observe(element);
    return () => {
      resize.disconnect();
      seen.disconnect();
    };
  }, [setOffscreen]);

  const kit = HERO_KITS[selected] ?? HERO_KITS[0];
  const shown = layers.find((layer) => layer.phase === 'in');
  return (
    <div
      ref={box}
      id="lp-kit-panel"
      role="tabpanel"
      aria-labelledby={`lp-kit-tab-${kit.id}`}
      className="lp-shot"
      data-showing={shown ? '' : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setPointer(true);
      }}
      onPointerLeave={() => {
        setPointer(false);
      }}
    >
      <p className="sr-only">{kit.what}</p>
      <div className="lp-shot-wait" aria-hidden="true" />
      {scale
        ? layers.map((layer) => (
            <ShotLayer key={layer.kit} layer={layer} scale={scale} ready={ready} />
          ))
        : null}
      {/* A light passing over the glass as each editor comes in. */}
      {shown ? (
        <div key={`sheen-${String(shown.kit)}`} className="lp-shot-sheen" aria-hidden="true" />
      ) : null}
    </div>
  );
}

/** One editor in the shot: its phase changes, the editor inside is left alone. */
function ShotLayer({
  layer,
  scale,
  ready,
}: {
  layer: Layer;
  scale: number;
  ready: (kit: number) => void;
}) {
  const onReady = useCallback(() => {
    ready(layer.kit);
  }, [ready, layer.kit]);
  return (
    <div className="lp-shot-layer" data-phase={layer.phase} aria-hidden="true">
      <ShotEditor id={HERO_KITS[layer.kit]?.id ?? 'email'} scale={scale} onReady={onReady} />
    </div>
  );
}

/** The editor at its desktop size, scaled; memoised so the clock never re-renders it. */
const ShotEditor = memo(function ShotEditor({
  id,
  scale,
  onReady,
}: {
  id: HeroKitId;
  scale: number;
  onReady: () => void;
}) {
  const Editor = EDITORS[id];
  return (
    <div
      className="lp-shot-frame"
      inert
      style={{ width: WIDTH, height: HEIGHT, transform: `scale(${String(scale)})` }}
    >
      <Editor onReady={onReady} />
    </div>
  );
});
