'use client';

import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Logo } from './logo';

/** One block of the starter email: its id and type, and a few of its real props. */
export interface HeroBlock {
  id: string;
  type: string;
  props: [key: string, value: string][];
}

const LABEL: Record<string, string> = {
  logo: 'Logo',
  heading: 'Heading',
  text: 'Text',
  button: 'Button',
  divider: 'Divider',
  footer: 'Footer',
};

/**
 * The hero: the kit's own starter email, block by block, with the document it
 * is — the selected block's node, from the fixture, as JSON. The selection
 * moves by itself until the visitor points at a block.
 */
export function HeroBuild({ blocks }: { blocks: HeroBlock[] }) {
  const [at, setAt] = useState(1);
  const [auto, setAuto] = useState(true);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // Move by itself, only while on screen and only with motion allowed.
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = true;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    });
    if (root.current) observer.observe(root.current);
    const order = [1, 2, 3, 5, 0, 4];
    let step = 0;
    const timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      step = (step + 1) % order.length;
      setAt(order[step] ?? 1);
    }, 2600);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [auto]);

  // The pointer goes to the selected block.
  useEffect(() => {
    const box = canvas.current;
    const block = box?.querySelectorAll<HTMLElement>('[data-block]')[at];
    if (!box || !block) return;
    const place = () => {
      setCursor({
        x: block.offsetLeft + Math.min(block.offsetWidth - 18, 150),
        y: block.offsetTop + block.offsetHeight / 2 + 4,
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
    };
  }, [at]);

  const selected = blocks[at];
  const pick = (index: number) => () => {
    setAuto(false);
    setAt(index);
  };

  const block = (index: number, children: ReactNode) => (
    <div
      key={index}
      data-block
      className={index === at ? 'hb-block is-selected' : 'hb-block'}
      style={{ '--i': index } as React.CSSProperties}
      onMouseEnter={pick(index)}
      onClick={pick(index)}
    >
      <span className="hb-tag">{LABEL[blocks[index]?.type ?? ''] ?? ''}</span>
      {children}
    </div>
  );

  return (
    <div className="hb" ref={root}>
      <div className="hb-app">
        <div className="hb-bar">
          <span className="hb-back" aria-hidden="true">
            <ChevronLeft size={15} />
          </span>
          <span className="hb-title">Welcome</span>
          <span className="hb-status">Draft</span>
          <span className="hb-saved">
            <i aria-hidden="true" /> All changes saved
          </span>
          <span className="hb-cta">Activate</span>
        </div>
        <div className="hb-body">
          <ul className="hb-rail" aria-label="Blocks">
            {blocks.map((block, index) => (
              <li key={block.id} className={index === at ? 'is-on' : undefined}>
                <RailIcon type={block.type} />
                {LABEL[block.type]}
              </li>
            ))}
          </ul>
          <div className="hb-stage">
            <div className="hb-paper" ref={canvas}>
              {block(
                0,
                <>
                  <div className="hb-logo">
                    <Logo size={22} />
                  </div>
                </>,
              )}
              {block(
                1,
                <>
                  <p className="hb-h">
                    Hello <span className="hb-var">recipient.name</span>
                  </p>
                </>,
              )}
              {block(
                2,
                <>
                  <p className="hb-p">Write something your reader will want to read.</p>
                </>,
              )}
              {block(
                3,
                <>
                  <span className="hb-button">Get started</span>
                </>,
              )}
              {block(
                4,
                <>
                  <hr className="hb-hr" />
                </>,
              )}
              {block(
                5,
                <>
                  <p className="hb-foot">
                    You are receiving this email from <span className="hb-var">brand.name</span>
                  </p>
                </>,
              )}
              {cursor ? (
                <svg
                  className="hb-cursor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ transform: `translate(${String(cursor.x)}px, ${String(cursor.y)}px)` }}
                >
                  <path d="M5 3l14 7.5-6.2 1.6L10 18.5z" />
                </svg>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="hb-json" aria-label="The selected block, as stored">
        <div className="hb-json-h">
          <span>document.json</span>
          <span className="hb-json-path">nodes.{selected.id}</span>
        </div>
        <pre key={at}>
          <code>
            <span className="p">{'{'}</span>
            {'\n  '}
            <span className="k">&quot;type&quot;</span>
            <span className="p">: </span>
            <span className="s">&quot;{selected.type}&quot;</span>
            <span className="p">,</span>
            {'\n  '}
            <span className="k">&quot;props&quot;</span>
            <span className="p">: {'{'}</span>
            {selected.props.map(([key, value], index) => (
              <span key={key} className="hb-line" style={{ '--l': index } as React.CSSProperties}>
                {'\n    '}
                <span className="k">&quot;{key}&quot;</span>
                <span className="p">: </span>
                <Value value={value} />
                <span className="p">{index < selected.props.length - 1 ? ',' : ''}</span>
              </span>
            ))}
            {'\n  '}
            <span className="p">{'}'}</span>
            {'\n'}
            <span className="p">{'}'}</span>
          </code>
        </pre>
      </div>
    </div>
  );
}

/** A JSON value, already printed: strings, numbers and the rest coloured apart. */
function Value({ value }: { value: string }) {
  if (value.startsWith('"')) return <span className="s">{value}</span>;
  if (/^-?\d/.test(value)) return <span className="n">{value}</span>;
  return <span className="o">{value}</span>;
}

function RailIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    logo: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h16v7H4z',
    heading: 'M6 4v16M18 4v16M6 12h12',
    text: 'M4 6h16M4 12h16M4 18h10',
    button: 'M3 8h18v8H3zM8 12h8',
    divider: 'M3 12h18',
    footer: 'M4 15h16M4 19h10M4 4h16v7H4z',
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[type] ?? ''} />
    </svg>
  );
}
