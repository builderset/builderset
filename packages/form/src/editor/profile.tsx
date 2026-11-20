'use client';

import type { BuilderNode, ElementRegistry } from '@builderset/engine';
import type { EditorProfile } from '@builderset/engine/editor';
import { Inbox } from 'lucide-react';
import type { RefObject } from 'react';

import {
  buildForm,
  checkForm,
  field,
  FORM_CATEGORIES,
  parseForm,
  step,
  stepsOf,
  takesAnswer,
  type FormDocument,
} from '../core';
import { FormView } from '../render';
import { FORM_TEMPLATE_CATEGORIES, FORM_TEMPLATES, toTemplateSpec } from '../templates';
import { FormCanvas } from './canvas';
import { FormDockItems, ShareButton } from './canvas-actions';
import { keysInUse, uniqueKey } from './field-helpers';
import { FieldPanel } from './field-panel';
import type { FormKitWords } from './messages';
import { ResponsesPanel } from './responses-panel';
import { FormSettingsPanel } from './settings-panel';

/**
 * The form builder, as a profile of the shared editor: the canvas draws the
 * form a step at a time (`FormCanvas`), a selected field gets the form's own
 * inspector (Field, Checks, Logic, More), settings are the form's (General,
 * Submit, Rules, Style), checks are `checkForm`'s, and a new field lands in
 * the step being edited with an answer key of its own.
 */

export interface FormProfileOptions {
  registry: ElementRegistry;
  words: FormKitWords;
  /** The visitor's language for the preview. */
  locale: string;
  /** The languages a form may be written in; others block publishing. */
  contentLocales?: readonly string[] | undefined;
  /** The step the canvas shows, for where a new field goes. */
  stepRef: RefObject<number>;
  assetUrl: (key: string) => string;
}

/** The form templates as the editor's, built once. */
const TEMPLATES = FORM_TEMPLATES.map(toTemplateSpec);

/** One field in a form of its own, for the library's peek at it. */
function sampleOf(registry: ElementRegistry, type: string): FormDocument | null {
  if (type === 'step' || type === 'root' || !registry.has(type)) return null;
  try {
    return buildForm(registry, { stable: true }, [step('', [field(type)])]);
  } catch {
    return null;
  }
}

/** Every key-holding node added: one whose key another field already has gets its own. */
function giveOwnKeys(draft: FormDocument, ids: string[]) {
  const visit = (id: string) => {
    const node: BuilderNode | undefined = draft.nodes[id];
    if (!node) return;
    if (takesAnswer(node)) {
      const used = keysInUse(draft, id);
      const key = node.props.key as string;
      if (used.has(key)) node.props = { ...node.props, key: uniqueKey(key, used) };
    }
    node.children?.forEach(visit);
  };
  ids.forEach(visit);
}

export function formProfile({
  registry,
  words,
  locale,
  contentLocales,
  stepRef,
  assetUrl,
}: FormProfileOptions): EditorProfile<FormDocument> {
  return {
    renderCanvas: ({ doc, viewport }) => <FormCanvas doc={doc} viewport={viewport} />,
    renderPreview: ({ doc, viewport, locale: reading }) => (
      <div className="bst:px-4 bst:py-8">
        <FormView
          document={doc}
          locale={reading ?? locale}
          words={reading ? undefined : words.visitor}
          device={viewport === 'mobile' ? 'mobile' : 'desktop'}
          assetUrl={assetUrl}
        />
      </div>
    ),
    sampleOf: (type) => sampleOf(registry, type),
    canvasFrame: 'none',
    canvasWidths: { desktop: 1000, tablet: 760, mobile: 440 },
    settingsPanel: FormSettingsPanel,
    nodePanel: ({ id }) => <FieldPanel id={id} />,
    templates: TEMPLATES,
    templateCategories: FORM_TEMPLATE_CATEGORIES,
    mediaTab: false,
    sideTabs: [
      {
        id: 'responses',
        label: words.form.responses,
        icon: <Inbox aria-hidden="true" />,
        panel: ResponsesPanel,
      },
    ],
    dockItems: FormDockItems,
    topBarActions: ShareButton,
    defaultParent: (doc) => {
      const steps = stepsOf(doc);
      return steps[Math.min(stepRef.current, steps.length - 1)]?.id ?? null;
    },
    canRemove: (node) => !node.props.lock && node.props.protect !== true,
    onNodesAdded: (draft, ids) => {
      giveOwnKeys(draft, ids);
    },
    check: (doc) => checkForm(doc, registry, { locales: contentLocales }),
    parse: (raw) => parseForm(raw, registry),
    categories: FORM_CATEGORIES.filter((category) => category !== 'structure'),
    paragraphType: 'text',
    titleOf: (doc) => doc.meta.name,
    summaryOf: (doc) => {
      const fields = Object.values(doc.nodes).filter((node) => takesAnswer(node)).length;
      return words.form.summary(fields, stepsOf(doc).length);
    },
    styleTab: false,
  };
}
