'use client';

import { Popover, PopoverContent, PopoverTrigger } from '../ui';
import { Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { elementChoices, matchChoices } from '../text/slash-menu';

/** A searchable element list in a popover — the "+" on the canvas opens it. */
export function InsertMenu({
  open,
  onOpenChange,
  onChoose,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (type: string) => void;
  children: ReactNode;
}) {
  const { registry, messages } = useEditorContext();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matches = matchChoices(registry, elementChoices(registry, messages), query);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="center">
        <div className="border-border mb-1 flex items-center gap-2 border-b px-2 pb-1.5">
          <Search className="text-muted-foreground size-4" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => Math.min(matches.length - 1, index + 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const chosen = matches[active];
                if (chosen) onChoose(chosen.type);
              }
            }}
            placeholder={messages.searchElements}
            className="h-8 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto" role="listbox">
          {matches.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">{messages.noElementsFound}</p>
          ) : (
            matches.map((choice, index) => (
              <button
                key={choice.type}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => {
                  setActive(index);
                }}
                onClick={() => {
                  onChoose(choice.type);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5 text-left',
                  index === active ? 'bg-accent' : '',
                )}
              >
                <ElementIcon name={choice.icon} className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate text-sm">{choice.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
