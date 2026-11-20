'use client';

import { DockToggle, useEditor } from '@builderset/engine/editor';
import { Button, Tooltip } from '@builderset/engine/ui';
import { Database, Grid3x3, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { formatOf, POPUP_TYPES, type PopupDocument, type PopupFormat } from '../core';
import { usePopup } from './context';

/**
 * The popup's own controls in the dock: replay the entrance, the snap guides
 * (G), the example data, and the size it is designed at.
 */
export function PopupDockItems() {
  const { words, replay, guides, setGuides, exampleData, setExampleData } = usePopup();
  const format = useEditor<PopupFormat, PopupDocument>((state) => formatOf(state.view));

  // G turns the guides on and off while nobody is typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      )
        return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== 'g') return;
      setGuides(!guides);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [guides, setGuides]);

  return (
    <>
      <Tooltip content={`${words.replay} · R`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={words.replay}
          className="bst:size-[34px] bst:rounded-[9px] bst:[&_svg]:size-4"
          onClick={replay}
        >
          <RotateCcw />
        </Button>
      </Tooltip>
      <DockToggle label={words.guides} keys="G" pressed={guides} onPressedChange={setGuides}>
        <Grid3x3 aria-hidden="true" />
      </DockToggle>
      <DockToggle label={words.exampleData} pressed={exampleData} onPressedChange={setExampleData}>
        <Database aria-hidden="true" />
      </DockToggle>
      <span className="bst:px-1.5 bst:font-mono bst:text-xs bst:text-muted-foreground bst:tabular-nums">
        {words.sizeOf(format.width, format.height, POPUP_TYPES[format.type].fill)}
      </span>
    </>
  );
}
