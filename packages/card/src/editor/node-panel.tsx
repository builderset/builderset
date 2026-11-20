'use client';

import type { BuilderNode } from '@builderset/engine';
import {
  FreeArrange,
  FreeLayoutFields,
  useEditor,
  useEditorContext,
} from '@builderset/engine/editor';
import { SegmentedTabs, Select } from '@builderset/engine/ui';
import { Braces, Paintbrush, Ratio } from 'lucide-react';
import { useState } from 'react';

import { fieldLabel, fillText, formatOf, variablesIn, type CardDocument } from '../core';
import { useCard } from './context';
import { MM } from './stage';
import { StyleFields, type Update } from './style-fields';
import { Row } from './ui';

/**
 * The inspector for a selected element, in place of the shared one: three
 * tabs, as the concept has them.
 *
 * - Style: how it looks, by its type (`StyleFields`).
 * - Layout: align it to the card, its stacking order, X, Y, width, height
 *   and rotation in millimetres, locked, hidden, its name in the layers.
 * - Data: which member field fills it — words, a code, or a photo. Shapes
 *   and marks have none.
 *
 * With several selected, `CardSelectionPanel` aligns and spreads them.
 */

type Tab = 'style' | 'layout' | 'data';

/** Elements whose content can come from a member: what their Data tab sets. */
const DATA_PROP: Readonly<Record<string, 'text' | 'data' | 'bind'>> = {
  heading: 'text',
  text: 'text',
  label: 'text',
  field: 'text',
  qr: 'data',
  barcode: 'data',
  photo: 'bind',
};

/** The side an element sits on, and the card's size: what aligning to the card needs. */
function useBoard(id: string) {
  return useEditor<string, CardDocument>((state) => {
    const format = formatOf(state.doc);
    const side = Object.values(state.doc.nodes).find((node) => node.children?.includes(id));
    return JSON.stringify({ id: side?.id ?? '', width: format.width, height: format.height });
  });
}

function DataTab({ node, update }: { node: BuilderNode; update: Update }) {
  const { words, fields, locale, records, recordIndex } = useCard();
  const prop = DATA_PROP[node.type];
  if (!prop) return null;
  const record = records[recordIndex] ?? records[0];
  const member = record?.['member.name'] ?? record?.[fields[0]?.path ?? ''] ?? '';

  if (prop === 'bind') {
    return (
      <Row label={words.photoField} hint={words.photoHint}>
        {(id) => (
          <Select
            id={id}
            value={typeof node.props.bind === 'string' ? node.props.bind : ''}
            options={fields
              .filter((field) => field.kind === 'photo')
              .map((field) => ({ value: field.path, label: fieldLabel(field, locale) }))}
            onValueChange={(bind) => {
              update({ bind }, words.photoField);
            }}
          />
        )}
      </Row>
    );
  }

  const raw = node.props[prop];
  const value = typeof raw === 'string' ? raw : '';
  const used = variablesIn(value);
  // One variable and nothing else: the element shows that field. Anything
  // else (fixed words, words around a field) is "fixed text" here.
  const bound = used.length === 1 && value.trim() === `{{${used[0] ?? ''}}}` ? (used[0] ?? '') : '';
  const label = prop === 'text' ? words.fillFrom : words.codeFrom;
  return (
    <Row label={label} hint={member ? words.fillHint(member) : undefined}>
      {(id) => (
        <Select
          id={id}
          value={bound}
          options={[
            { value: '', label: words.fixedText },
            ...fields
              .filter((field) => field.kind === 'text')
              .map((field) => ({
                value: field.path,
                label: `${fieldLabel(field, locale)} · ${field.path}`,
              })),
          ]}
          onValueChange={(path) => {
            // Back to fixed words: what the example member would have read.
            update({ [prop]: path ? `{{${path}}}` : fillText(value, record) }, label);
          }}
        />
      )}
    </Row>
  );
}

export function CardNodePanel({ id }: { id: string }) {
  const { words } = useCard();
  const { store } = useEditorContext<CardDocument>();
  const node = useEditor<BuilderNode | undefined, CardDocument>((state) => state.view.nodes[id]);
  const board = JSON.parse(useBoard(id)) as { id: string; width: number; height: number };
  const [tab, setTab] = useState<Tab>('style');
  if (!node || node.type === 'side' || node.type === 'root') return null;

  const update: Update = (props, label) => {
    store.getState().updateNode(id, { props }, label, `card:${id}:${label}`);
  };
  const tabs = [
    { value: 'style' as const, label: words.styleTab, icon: <Paintbrush aria-hidden="true" /> },
    { value: 'layout' as const, label: words.layoutTab, icon: <Ratio aria-hidden="true" /> },
    ...(DATA_PROP[node.type]
      ? [{ value: 'data' as const, label: words.dataTab, icon: <Braces aria-hidden="true" /> }]
      : []),
  ];
  const shown = tabs.some((candidate) => candidate.value === tab) ? tab : 'style';

  return (
    <div className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col">
      <SegmentedTabs
        aria-label={words.styleTab}
        value={shown}
        onValueChange={setTab}
        tabs={tabs}
        className="bst:mx-4 bst:mt-3 bst:mb-1 bst:shrink-0"
      />
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:space-y-4 bst:overflow-y-auto bst:px-4 bst:pt-3.5 bst:pb-6">
        {shown === 'style' ? <StyleFields node={node} update={update} /> : null}
        {shown === 'layout' ? (
          <>
            <FreeArrange
              ids={[id]}
              artboard={board}
              title={words.alignToCard}
              decimals={MM.decimals}
            />
            <FreeLayoutFields id={id} unit={MM} />
          </>
        ) : null}
        {shown === 'data' ? <DataTab node={node} update={update} /> : null}
      </div>
    </div>
  );
}

/** Several elements selected: align them to each other, spread them evenly. */
export function CardSelectionPanel({ ids }: { ids: readonly string[] }) {
  const first = ids[0] ?? '';
  const board = JSON.parse(useBoard(first)) as { id: string; width: number; height: number };
  return <FreeArrange ids={ids} artboard={board} decimals={MM.decimals} />;
}
