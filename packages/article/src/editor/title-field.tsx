'use client';

import { useEffect, useRef } from 'react';

import { useEditorContext } from '@builderset/engine/editor';

import { useArticle } from './hooks';

/**
 * The article's H1, typed in place.
 *
 * It is the document's `meta.title`, which the API copies into the row's
 * title column on every save — so this and the settings panel edit one value.
 * A textarea that grows, rather than a rich-text field: a title has no marks.
 */
export function TitleField() {
  const { store, messages } = useEditorContext();
  const title = useArticle((state) => state.view.meta.title);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${String(element.scrollHeight)}px`;
  }, [title]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={title}
      placeholder={messages.untitled}
      aria-label={messages.title}
      maxLength={200}
      onFocus={() => {
        store.getState().select([]);
      }}
      onChange={(event) => {
        store
          .getState()
          .updateMeta(
            { title: event.target.value.replace(/\n/g, ' ') },
            'Edit title',
            'meta:title',
          );
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault();
      }}
      className="bst:mb-8 bst:block bst:w-full bst:resize-none bst:overflow-hidden bst:bg-transparent bst:text-3xl bst:leading-tight bst:font-semibold bst:tracking-tight bst:text-balance bst:text-foreground bst:outline-none bst:placeholder:text-muted-foreground/60 bst:sm:text-4xl"
    />
  );
}
