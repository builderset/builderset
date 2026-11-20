'use client';

import { useEditor, useEditorContext } from '@builderset/engine/editor';
import { Button } from '@builderset/engine/ui';
import { useMemo } from 'react';

import { CARD_FORMATS, changeFormat, formatOf, type CardDocument } from '../core';
import { CardView } from '../render';
import {
  buildTemplateCard,
  CARD_TEMPLATE_CATEGORIES,
  CARD_TEMPLATES,
  type CardTemplate,
} from '../templates';
import { useCard } from './context';
import { FormatIcon } from './format-icon';

/**
 * The Templates tab: card designs by category, each drawn small from its own
 * front, and the formats. "Use" replaces both sides and the format with the
 * design's in one undo step; the card keeps its name. A format keeps the
 * design and fits it to the new size.
 */

function name(words: Record<string, string>, locale: string): string {
  return words[locale] ?? words[locale.split('-')[0] ?? ''] ?? words.en ?? '';
}

function Design({ template, doc }: { template: CardTemplate; doc: CardDocument }) {
  const { store, host } = useEditorContext<CardDocument>();
  const { words, viewer, locale, setFace, assetUrl, records } = useCard();
  const format = formatOf(doc);
  // About 108 px across whichever side is longer.
  const scale = 108 / Math.max(format.width, format.height);
  return (
    <li className="bst:grid bst:grid-cols-[112px_minmax(0,1fr)_auto] bst:items-center bst:gap-3 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2">
      <div className="bst:grid bst:h-[72px] bst:place-items-center" aria-hidden="true">
        <CardView
          document={doc}
          scale={scale}
          record={records[0]}
          words={viewer}
          assetUrl={assetUrl}
        />
      </div>
      <div className="bst:min-w-0">
        <b className="bst:block bst:truncate bst:text-[13px] bst:font-semibold">
          {name(template.name, locale)}
        </b>
        <small className="bst:line-clamp-2 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
          {name(template.description, locale)}
        </small>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`${words.use}: ${name(template.name, locale)}`}
        onClick={() => {
          store.getState().updateDocument(words.applied, (draft) => {
            draft.nodes = structuredClone(doc.nodes);
          });
          store.getState().select([]);
          setFace('front');
          host.toast('success', words.applied);
        }}
      >
        {words.use}
      </Button>
    </li>
  );
}

export function CardTemplatesPanel() {
  const { registry, store } = useEditorContext<CardDocument>();
  const { words, locale } = useCard();
  const current = useEditor<string, CardDocument>((state) => formatOf(state.doc).format);
  // Built once: a design's look does not change while the editor is open.
  const designs = useMemo(
    () =>
      CARD_TEMPLATES.map((template) => ({ template, doc: buildTemplateCard(registry, template) })),
    [registry],
  );

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:px-3 bst:pb-6">
      <h3 className="bst:px-1 bst:pt-1 bst:pb-2 bst:text-[12.5px] bst:font-semibold">
        {words.designs}
      </h3>
      {CARD_TEMPLATE_CATEGORIES.map((category) => {
        const inside = designs.filter(({ template }) => template.category === category.id);
        if (!inside.length) return null;
        return (
          <section key={category.id} className="bst:grid bst:gap-1.5 bst:pb-3">
            <h4 className="bst:px-1 bst:text-[11px] bst:font-semibold bst:tracking-wide bst:text-muted-foreground bst:uppercase">
              {name(category.name, locale)}
            </h4>
            <ul className="bst:grid bst:gap-1.5">
              {inside.map(({ template, doc }) => (
                <Design key={template.id} template={template} doc={doc} />
              ))}
            </ul>
          </section>
        );
      })}
      <h3 className="bst:px-1 bst:pt-2 bst:pb-2 bst:text-[12.5px] bst:font-semibold">
        {words.format}
      </h3>
      <div
        role="radiogroup"
        aria-label={words.cardType}
        className="bst:grid bst:grid-cols-2 bst:gap-1.5"
      >
        {CARD_FORMATS.map((spec) => {
          const on = current === spec.id;
          return (
            <button
              key={spec.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                store.getState().updateDocument(words.cardType, (draft) => {
                  changeFormat(draft, spec.id);
                });
              }}
              className={
                on
                  ? 'bst:grid bst:cursor-pointer bst:justify-items-start bst:gap-1 bst:rounded-card bst:border bst:border-primary bst:bg-primary/8 bst:p-2.5 bst:text-left bst:[&_svg]:size-4 bst:[&_svg]:text-primary'
                  : 'bst:grid bst:cursor-pointer bst:justify-items-start bst:gap-1 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2.5 bst:text-left bst:transition-colors bst:hover:border-primary/40 bst:[&_svg]:size-4 bst:[&_svg]:text-muted-foreground'
              }
            >
              <FormatIcon format={spec.id} />
              <b className="bst:text-[12.5px] bst:font-semibold">{words.formats[spec.id].name}</b>
              <small className="bst:font-mono bst:text-[11px] bst:text-muted-foreground">{`${String(spec.width)} × ${String(spec.height)} mm`}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
