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
      <PopoverContent className="bst:w-72 bst:p-1" align="center">
        <div className="bst:mb-1 bst:flex bst:items-center bst:gap-2 bst:border-b bst:border-border bst:px-2 bst:pb-1.5">
          <Search className="bst:size-4 bst:text-muted-foreground" aria-hidden="true" />
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
            className="bst:h-8 bst:w-full bst:bg-transparent bst:text-sm bst:outline-none"
          />
        </div>
        <div className="bst:max-h-72 bst:overflow-y-auto" role="listbox">
          {matches.length === 0 ? (
            <p className="bst:px-3 bst:py-2 bst:text-sm bst:text-muted-foreground">
              {messages.noElementsFound}
            </p>
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
                  'bst:flex bst:w-full bst:items-center bst:gap-3 bst:rounded-control bst:px-2 bst:py-1.5 bst:text-left',
                  index === active ? 'bst:bg-accent' : '',
                )}
              >
                <ElementIcon
                  name={choice.icon}
                  className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
                />
                <span className="bst:truncate bst:text-sm">{choice.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
