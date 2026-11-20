'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import type { LiveSettings } from './live-editor';

// The editor runs in the browser only, and is the heavy part of this page: it
// is fetched when its frame comes near the screen, never for a phone.
const LiveEditor = dynamic(() => import('./live-editor').then((module) => module.LiveEditor), {
  ssr: false,
  loading: () => <Assembling />,
});

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sq', label: 'Shqip' },
  { code: 'de', label: 'Deutsch' },
] as const;

/** `--builderset-primary` choices: the docs' cobalt, and three a project might bring. */
const ACCENTS = [
  { value: '#2a5bd7', label: 'Cobalt' },
  { value: '#da6c1e', label: 'Ember' },
  { value: '#1f7a4d', label: 'Pine' },
  { value: '#a3346b', label: 'Berry' },
] as const;

const MODES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/** The live editor, and the three props a visitor can try on it. */
export function LiveDemo({ playground }: { playground: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [wide, setWide] = useState(true);
  const [settings, setSettings] = useState<LiveSettings>({
    locale: 'en',
    primary: ACCENTS[0].value,
    mode: 'light',
  });

  useEffect(() => {
    const query = window.matchMedia('(min-width: 860px)');
    const update = () => {
      setWide(query.matches);
    };
    update();
    query.addEventListener('change', update);
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', update);
    };
  }, []);

  const set = (patch: Partial<LiveSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  return (
    <div className="lp-demo">
      <div className="lp-controls" role="group" aria-label="Try the editor's props">
        <Control label="locale">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              className="lp-seg"
              aria-pressed={settings.locale === language.code}
              onClick={() => {
                set({ locale: language.code });
              }}
            >
              {language.label}
            </button>
          ))}
        </Control>
        <Control label="tokens.primary">
          {ACCENTS.map((accent) => (
            <button
              key={accent.value}
              type="button"
              className="lp-swatch"
              aria-pressed={settings.primary === accent.value}
              aria-label={accent.label}
              title={`${accent.label} ${accent.value}`}
              style={{ background: accent.value }}
              onClick={() => {
                set({ primary: accent.value });
              }}
            />
          ))}
        </Control>
        <Control label="theme">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className="lp-seg"
              aria-pressed={settings.mode === mode.value}
              onClick={() => {
                set({ mode: mode.value });
              }}
            >
              {mode.label}
            </button>
          ))}
        </Control>
      </div>

      <div className="lp-window">
        <div className="lp-window-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <p>
            <b>your-app.com</b>/emails/welcome/edit
          </p>
        </div>
        <div ref={frame} className="lp-frame">
          {wide ? (
            near ? (
              <LiveEditor {...settings} />
            ) : (
              <Assembling />
            )
          ) : (
            <div className="lp-narrow">
              <Assembling />
              <p>
                The editor is made for a larger screen. <a href={playground}>Open the playground</a>{' '}
                on one, or keep reading.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lp-control">
      <code>{label}</code>
      <div className="lp-control-in">{children}</div>
    </div>
  );
}

/** A document assembling itself from blocks, while the editor loads. */
function Assembling() {
  return (
    <div className="lp-assembling" aria-label="Loading the editor">
      <div className="lp-doc">
        <span className="row r1" />
        <span className="row r2" />
        <span className="split">
          <span className="cell c1" />
          <span className="cell c2" />
        </span>
        <span className="row r3" />
        <span className="btn" />
      </div>
    </div>
  );
}
