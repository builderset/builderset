'use client';

import {
  Children,
  isValidElement,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

interface TabProps {
  title: string;
  children: ReactNode;
}

/** One tab of a `<Tabs>`: its title on the strip, its content below. */
export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

/**
 * Files that belong together, one tab each: the models of a backend, grouped
 * the way the code is. Every panel is in the page (search and Ctrl+F find it);
 * only the chosen one is shown.
 */
export function Tabs({ label, children }: { label?: string; children: ReactNode }) {
  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<TabProps> =>
      isValidElement<TabProps>(child) && typeof child.props.title === 'string',
  );
  const [active, setActive] = useState(0);
  const id = useId();
  const strip = useRef<HTMLDivElement>(null);

  const choose = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    strip.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step) choose(active + step);
    else if (event.key === 'Home') choose(0);
    else if (event.key === 'End') choose(tabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="bs-tabs">
      <div
        ref={strip}
        className="bs-tabs-strip"
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {label ? <span className="bs-tabs-label">{label}</span> : null}
        {tabs.map((tab, index) => (
          <button
            key={tab.props.title}
            type="button"
            role="tab"
            id={`${id}-t${String(index)}`}
            aria-controls={`${id}-p${String(index)}`}
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            onClick={() => {
              setActive(index);
            }}
          >
            {tab.props.title}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.props.title}
          className="bs-tabs-panel"
          role="tabpanel"
          id={`${id}-p${String(index)}`}
          aria-labelledby={`${id}-t${String(index)}`}
          hidden={index !== active}
        >
          {tab}
        </div>
      ))}
    </div>
  );
}
