'use client';

import {
  DRAG_TYPE_MIME,
  setActiveDrag,
  setDragChip,
  useEditor,
  useEditorContext,
} from '@builderset/engine/editor';
import { Check } from 'lucide-react';

import {
  fieldLabel,
  formatOf,
  sideOf,
  TEXT_TYPES,
  type CardDocument,
  type CardField,
} from '../core';
import { useCard } from './context';

/**
 * The Members tab: the example members the design is tried with, and the
 * fields a card can show. Picking a member fills the canvas with their data;
 * a field is dragged onto the card (a member field, or a photo frame for a
 * photo), or clicked to go at the end of the selected text.
 */

/** Avatar colours, one per member in turn. */
const TONES = ['#4b5563', '#6b4f3a', '#3a4d6b', '#4d6b3a', '#6b3a5a'];
/** The words a field can be added to: every text but the logo. */
const WORDS = new Set<string>(TEXT_TYPES.filter((type) => type !== 'logo'));

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

/** What dropping or clicking a field adds: a member field, or a photo frame. */
function elementFor(field: CardField): { type: string; props: Record<string, unknown> } {
  return field.kind === 'photo'
    ? { type: 'photo', props: { bind: field.path } }
    : { type: 'field', props: { text: `{{${field.path}}}` } };
}

export function MembersPanel() {
  const { store } = useEditorContext<CardDocument>();
  const {
    words,
    records,
    recordIndex,
    setRecordIndex,
    exampleData,
    setExampleData,
    fields,
    locale,
    face,
    memberCount,
  } = useCard();
  const source = useEditor<string, CardDocument>((state) => formatOf(state.doc).source);
  const record = exampleData ? records[recordIndex] : records[0];

  const addField = (field: CardField) => {
    const state = store.getState();
    const selected =
      state.selection.length === 1 ? state.doc.nodes[state.selection[0] ?? ''] : undefined;
    if (field.kind === 'text' && selected && WORDS.has(selected.type) && !selected.locked) {
      const text = typeof selected.props.text === 'string' ? selected.props.text : '';
      state.updateNode(
        selected.id,
        { props: { text: `${text}{{${field.path}}}` } },
        words.insertField,
      );
      return;
    }
    const side = sideOf(state.doc, face);
    if (!side) return;
    const { type, props } = elementFor(field);
    const id = state.insertElement(
      type,
      { parentId: side.id, index: side.children?.length ?? 0 },
      props,
    );
    if (id) state.select([id]);
  };

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-5">
      {records.length ? (
        <section className="bst:grid bst:gap-1 bst:px-3 bst:pt-1">
          <h3 className="bst:flex bst:items-baseline bst:justify-between bst:px-1 bst:py-2 bst:text-[12.5px] bst:font-semibold">
            {words.members}
            {source ? (
              <span className="bst:text-[11px] bst:font-normal bst:text-muted-foreground">
                {words.inList(memberCount ?? records.length, source)}
              </span>
            ) : null}
          </h3>
          {records.map((member, index) => {
            const on = exampleData && index === recordIndex;
            const name = member['member.name'] ?? Object.values(member)[0] ?? '';
            const detail = [member['member.number'], member['member.tier']]
              .filter(Boolean)
              .join(' · ');
            return (
              <button
                key={`${name}-${String(index)}`}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setRecordIndex(index);
                  setExampleData(true);
                }}
                className={
                  on
                    ? 'bst:grid bst:cursor-pointer bst:grid-cols-[32px_minmax(0,1fr)_16px] bst:items-center bst:gap-2.5 bst:rounded-lg bst:bg-primary/10 bst:px-2 bst:py-1.5 bst:text-left'
                    : 'bst:grid bst:cursor-pointer bst:grid-cols-[32px_minmax(0,1fr)_16px] bst:items-center bst:gap-2.5 bst:rounded-lg bst:px-2 bst:py-1.5 bst:text-left bst:transition-colors bst:hover:bg-accent'
                }
              >
                <span
                  aria-hidden="true"
                  className="bst:grid bst:size-8 bst:place-items-center bst:rounded-full bst:text-[11px] bst:font-semibold bst:text-white"
                  style={{ background: TONES[index % TONES.length] }}
                >
                  {initials(name)}
                </span>
                <span className="bst:min-w-0">
                  <b className="bst:block bst:truncate bst:text-[13px] bst:font-semibold">{name}</b>
                  <small className="bst:block bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                    {detail}
                  </small>
                </span>
                {on ? (
                  <Check className="bst:size-4 bst:text-primary" aria-hidden="true" />
                ) : (
                  <span />
                )}
              </button>
            );
          })}
        </section>
      ) : null}
      <section className="bst:grid bst:gap-1.5 bst:px-3 bst:pt-2">
        <h3 className="bst:px-1 bst:py-2 bst:text-[12.5px] bst:font-semibold">{words.fields}</h3>
        {fields.map((field) => {
          const label = fieldLabel(field, locale);
          const value = field.kind === 'photo' ? words.photo : (record?.[field.path] ?? label);
          return (
            <button
              key={field.path}
              type="button"
              draggable
              title={label}
              aria-label={`${label} · ${field.path}`}
              onDragStart={(event) => {
                const { type, props } = elementFor(field);
                event.dataTransfer.setData(DRAG_TYPE_MIME, type);
                event.dataTransfer.effectAllowed = 'copy';
                setDragChip(event.dataTransfer, label, { detail: field.path });
                setActiveDrag({ kind: 'type', type, props });
              }}
              onDragEnd={() => {
                setActiveDrag(null);
              }}
              onClick={() => {
                addField(field);
              }}
              className="bst:grid bst:cursor-grab bst:grid-cols-[minmax(0,auto)_minmax(0,1fr)] bst:items-center bst:gap-2 bst:rounded-lg bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-2 bst:text-left bst:transition-colors bst:hover:border-primary/40 bst:active:cursor-grabbing"
            >
              <code className="bst:truncate bst:rounded bst:bg-primary/10 bst:px-1.5 bst:py-0.5 bst:font-mono bst:text-[11px] bst:text-primary">
                {field.path}
              </code>
              <span className="bst:truncate bst:text-right bst:text-xs bst:text-muted-foreground">
                {value}
              </span>
            </button>
          );
        })}
        <p className="bst:px-1 bst:pt-2 bst:text-xs bst:text-muted-foreground">
          {words.fieldsHint}
        </p>
      </section>
    </div>
  );
}
