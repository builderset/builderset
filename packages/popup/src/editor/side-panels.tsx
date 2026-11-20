'use client';

import { rt, type BuilderNode } from '@builderset/engine';
import {
  insertVariableAtCaret,
  setActiveDrag,
  setVariableDragData,
  useEditor,
  useEditorContext,
} from '@builderset/engine/editor';
import { Button } from '@builderset/engine/ui';
import { Braces } from 'lucide-react';

import {
  exampleData,
  formatOf,
  lookup,
  POPUP_ROOT,
  POPUP_TYPE_KEYS,
  type PopupDocument,
  type PopupType,
} from '../core';
import { PopupPicture } from '../render';
import {
  buildTemplatePopup,
  POPUP_TEMPLATE_CATEGORIES,
  POPUP_TEMPLATES,
  type PopupTemplate,
} from '../templates';
import { usePopup } from './context';
import { changeType, TYPE_ICONS } from './settings-panel';

/**
 * The left rail's popup tabs: Fields — the variables to drag into a text or
 * onto the popup, and the inputs it collects — and Templates — the seven
 * types and the starting layouts, by purpose.
 */

const HEADING =
  'bst:px-4 bst:pt-4 bst:pb-2 bst:text-xs bst:font-semibold bst:text-muted-foreground';
const CHIP =
  'bld-focus bst:grid bst:w-full bst:cursor-grab bst:grid-cols-[minmax(0,1fr)_auto] bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-[7px] bst:text-left bst:transition-[border-color,translate] bst:select-none bst:hover:translate-x-0.5 bst:hover:border-primary/40 bst:active:cursor-grabbing';

export function FieldsPanel() {
  const { host, store } = useEditorContext<PopupDocument>();
  const { words, fields } = usePopup();
  const examples = exampleData(fields);
  const inputs = useEditor<string, PopupDocument>((state) =>
    JSON.stringify(
      (state.view.nodes[POPUP_ROOT]?.children ?? [])
        .map((id) => state.view.nodes[id])
        .filter((node): node is BuilderNode => node?.type === 'input')
        .map((node) => ({ id: node.id, name: node.props.name, required: node.props.required })),
    ),
  );
  const list = JSON.parse(inputs) as { id: string; name: string; required: boolean }[];

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-4">
      <h3 className={HEADING}>{words.personalFields}</h3>
      <ul className="bst:grid bst:gap-1.5 bst:px-3">
        {fields.map((field) => (
          <li key={field.path}>
            <button
              type="button"
              draggable
              title={field.label}
              // Keeps the caret where it is in the text being written.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onDragStart={(event) => {
                setVariableDragData(event.dataTransfer, field.path);
                // Dropped on the popup, it becomes a text of its own.
                setActiveDrag({
                  kind: 'type',
                  type: 'text',
                  props: { text: rt(`{{${field.path}}}`) },
                });
              }}
              onDragEnd={() => {
                setActiveDrag(null);
              }}
              onClick={() => {
                if (!insertVariableAtCaret(field.path)) host.toast('info', words.clickTextFirst);
              }}
              className={CHIP}
            >
              <span className="bst:flex bst:min-w-0 bst:items-center bst:gap-1.5">
                <Braces className="bst:size-3.5 bst:shrink-0 bst:text-primary" aria-hidden="true" />
                <code className="bst:truncate bst:font-mono bst:text-[11.5px]">{field.path}</code>
              </span>
              <span className="bst:max-w-28 bst:truncate bst:text-[11px] bst:text-muted-foreground">
                {lookup(examples, field.path) || field.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="bst:px-4 bst:pt-2 bst:text-xs bst:text-muted-foreground">
        {words.personalHint}
      </p>
      <h3 className={HEADING}>{words.formFields}</h3>
      {list.length ? (
        <ul className="bst:grid bst:gap-1.5 bst:px-3">
          {list.map((input) => (
            <li key={input.id}>
              <button
                type="button"
                className={`${CHIP} bst:cursor-pointer`}
                onClick={() => {
                  store.getState().select([input.id]);
                }}
              >
                <code className="bst:truncate bst:font-mono bst:text-[11.5px]">
                  {input.name || '—'}
                </code>
                <span className="bst:text-[11px] bst:text-muted-foreground">
                  {input.required ? words.required : words.optional}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bst:px-4 bst:text-xs bst:text-muted-foreground">{words.formFieldsEmpty}</p>
      )}
    </div>
  );
}

export function PopupTemplatesPanel() {
  const { store, registry, host, locale } = useEditorContext<PopupDocument>();
  const { words, visitor, replay } = usePopup();
  const type = useEditor<PopupType, PopupDocument>((state) => formatOf(state.doc).type);
  // The editor's language, English when a template has no words in it.
  const language = locale.split('-')[0] ?? 'en';
  const said = (text: Readonly<Record<string, string>>) => text[language] ?? text.en ?? '';

  const pickType = (next: PopupType) => {
    if (next === type) return;
    store.getState().updateDocument(words.popupType, (draft) => {
      changeType(draft, next);
    });
    host.toast('info', words.scaledToType(words.types[next]));
    replay();
  };

  const use = (template: PopupTemplate) => {
    const built = buildTemplatePopup(registry, template);
    const name = said(template.name);
    store.getState().updateDocument(words.applied(name), (draft) => {
      const root = draft.nodes[draft.root];
      const source = built.nodes[built.root];
      if (!root || !source) return;
      for (const id of root.children ?? []) Reflect.deleteProperty(draft.nodes, id);
      for (const id of source.children ?? []) {
        const node = built.nodes[id];
        if (node) draft.nodes[id] = node;
      }
      root.props = source.props;
      root.children = [...(source.children ?? [])];
    });
    store.getState().select([]);
    host.toast('success', words.applied(name));
    replay();
  };

  return (
    <div className="bld-scroll bst:h-full bst:overflow-y-auto bst:pb-4">
      <h3 className={HEADING}>{words.popupTypes}</h3>
      <div
        role="radiogroup"
        aria-label={words.popupTypes}
        className="bst:grid bst:grid-cols-2 bst:gap-1.5 bst:px-3"
      >
        {POPUP_TYPE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={key === type}
            onClick={() => {
              pickType(key);
            }}
            className={
              key === type
                ? 'bld-focus bst:flex bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-primary bst:bg-primary/8 bst:px-2.5 bst:py-2 bst:text-left bst:text-xs bst:font-semibold bst:[&_svg]:size-4 bst:[&_svg]:text-primary'
                : 'bld-focus bst:flex bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-2 bst:text-left bst:text-xs bst:font-medium bst:hover:border-primary/40 bst:[&_svg]:size-4 bst:[&_svg]:text-muted-foreground'
            }
          >
            {TYPE_ICONS[key]}
            {words.types[key]}
          </button>
        ))}
      </div>
      <p className="bst:px-4 bst:pt-3 bst:text-xs bst:text-muted-foreground">{words.starters}</p>
      {POPUP_TEMPLATE_CATEGORIES.map((category) => (
        <section key={category.id}>
          <h3 className={HEADING}>{said(category.name)}</h3>
          <ul className="bst:grid bst:gap-2 bst:px-3">
            {POPUP_TEMPLATES.filter((template) => template.category === category.id).map(
              (template) => {
                const doc = buildTemplatePopup(registry, template, { stable: true });
                const width = formatOf(doc).width;
                return (
                  <li
                    key={template.id}
                    className="bst:grid bst:grid-cols-[72px_minmax(0,1fr)_auto] bst:items-center bst:gap-2.5 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2"
                  >
                    <span
                      aria-hidden="true"
                      className="bst:grid bst:h-12 bst:place-items-center bst:overflow-hidden bst:rounded-md bst:bg-muted"
                    >
                      <PopupPicture document={doc} words={visitor} scale={64 / width} />
                    </span>
                    <span className="bst:grid bst:min-w-0 bst:gap-0.5">
                      <b className="bst:truncate bst:text-[12.5px] bst:font-semibold">
                        {said(template.name)}
                      </b>
                      <small className="bst:line-clamp-2 bst:text-[11px] bst:leading-snug bst:text-muted-foreground">
                        {said(template.description)}
                      </small>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`${words.use}: ${said(template.name)}`}
                      onClick={() => {
                        use(template);
                      }}
                    >
                      {words.use}
                    </Button>
                  </li>
                );
              },
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
