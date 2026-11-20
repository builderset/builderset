'use client';

import { DockToggle, useEditor } from '@builderset/engine/editor';
import { Button, Tooltip } from '@builderset/engine/ui';
import { Database, FlipHorizontal2, Grid3x3 } from 'lucide-react';
import { useEffect } from 'react';

import { formatOf, type CardDocument } from '../core';
import { useCard, type CardFace } from './context';

/**
 * The card's own controls in the dock: which side is shown and the flip (F),
 * the guides (G) and the example member's data (Ctrl Shift E).
 */

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export function CardDockItems() {
  const { words, face, setFace, guides, setGuides, exampleData, setExampleData } = useCard();
  const sides = useEditor<number, CardDocument>((state) => formatOf(state.doc).sides);
  const other: CardFace = face === 'front' ? 'back' : 'front';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typing(event.target) || event.altKey) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setExampleData(!exampleData);
      } else if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        setGuides(!guides);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [exampleData, setExampleData, guides, setGuides]);

  return (
    <>
      <div
        role="group"
        aria-label={words.sides}
        className="bst:flex bst:items-center bst:gap-0.5 bst:rounded-[10px] bst:bg-accent bst:p-[3px]"
      >
        {(['front', 'back'] as const).map((side) => (
          <button
            key={side}
            type="button"
            aria-pressed={face === side}
            disabled={side === 'back' && sides < 2}
            onClick={() => {
              setFace(side);
            }}
            className={
              face === side
                ? 'bst:h-7 bst:cursor-pointer bst:rounded-[8px] bst:bg-card bst:px-3 bst:text-xs bst:font-semibold bst:shadow-[0_1px_2px_rgb(20_23_30/0.12)]'
                : 'bst:h-7 bst:cursor-pointer bst:rounded-[8px] bst:px-3 bst:text-xs bst:font-medium bst:text-muted-foreground bst:hover:text-foreground bst:disabled:cursor-not-allowed bst:disabled:opacity-40'
            }
          >
            {side === 'front' ? words.front : words.back}
          </button>
        ))}
      </div>
      <Tooltip content={`${words.flip} · F`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={words.flipTo(other === 'front' ? words.front : words.back)}
          disabled={sides < 2}
          className="bst:size-[34px] bst:rounded-[9px] bst:[&_svg]:size-4"
          onClick={() => {
            setFace(other);
          }}
        >
          <FlipHorizontal2 aria-hidden="true" />
        </Button>
      </Tooltip>
      <DockToggle label={words.guides} keys="G" pressed={guides} onPressedChange={setGuides}>
        <Grid3x3 aria-hidden="true" />
      </DockToggle>
      <DockToggle
        label={words.exampleData}
        keys="Ctrl Shift E"
        pressed={exampleData}
        onPressedChange={setExampleData}
      >
        <Database aria-hidden="true" />
      </DockToggle>
    </>
  );
}
