'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface Feature {
  key: string;
  label: string;
  title: string;
  text: string;
  link: { href: string; label: string };
  demo: ReactNode;
}

const DWELL = 7000;

/**
 * What every kit gets, one at a time. The tabs move on by themselves (a line
 * fills under the current one) until the visitor picks one; hovering or
 * focusing the panel holds it.
 */
export function Features({ features }: { features: Feature[] }) {
  const [at, setAt] = useState(0);
  const [auto, setAuto] = useState(true);
  const [held, setHeld] = useState(false);
  const [round, setRound] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false);
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const running = auto && !held && visible;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setAt((current) => (current + 1) % features.length);
      setRound((current) => current + 1);
    }, DWELL);
    return () => {
      window.clearTimeout(timer);
    };
  }, [running, at, features.length]);

  const choose = (index: number) => {
    setAuto(false);
    setAt(index);
  };

  return (
    <div
      ref={root}
      className={running ? 'lp-features is-running' : 'lp-features'}
      onMouseEnter={() => {
        setHeld(true);
      }}
      onMouseLeave={() => {
        setHeld(false);
      }}
    >
      <div className="lp-tabs" role="tablist" aria-label="What every kit gets">
        {features.map((feature, index) => (
          <button
            key={feature.key}
            id={`tab-${feature.key}`}
            type="button"
            role="tab"
            aria-selected={index === at}
            aria-controls={`panel-${feature.key}`}
            tabIndex={index === at ? 0 : -1}
            className="lp-tab"
            onClick={() => {
              choose(index);
            }}
            onKeyDown={(event) => {
              const step =
                event.key === 'ArrowDown' || event.key === 'ArrowRight'
                  ? 1
                  : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
                    ? -1
                    : 0;
              if (!step) return;
              event.preventDefault();
              const next = (at + step + features.length) % features.length;
              choose(next);
              document.getElementById(`tab-${features[next]?.key ?? ''}`)?.focus();
            }}
          >
            <span className="n">{String(index + 1).padStart(2, '0')}</span>
            <span className="l">{feature.label}</span>
            <span className="lp-tab-text">{feature.text}</span>
            {index === at ? (
              <span
                key={`${String(round)}-${String(running)}`}
                className="lp-tab-time"
                style={{ animationDuration: `${String(DWELL)}ms` }}
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="lp-panels">
        {features.map((feature, index) => (
          <div
            key={feature.key}
            id={`panel-${feature.key}`}
            role="tabpanel"
            aria-labelledby={`tab-${feature.key}`}
            hidden={index !== at}
            className="lp-panel"
            onFocus={() => {
              setHeld(true);
            }}
            onBlur={() => {
              setHeld(false);
            }}
          >
            <div className="lp-panel-h">
              <h3>{feature.title}</h3>
              <a className="lp-link" href={feature.link.href}>
                {feature.link.label} →
              </a>
            </div>
            {feature.demo}
          </div>
        ))}
      </div>
    </div>
  );
}
