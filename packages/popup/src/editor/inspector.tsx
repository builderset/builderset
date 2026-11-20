'use client';

import type { BuilderNode, MediaRef, RichText } from '@builderset/engine';
import {
  ColorField,
  FontField,
  FreeArrange,
  FreeLayoutFields,
  MediaField,
  NumberStepper,
  RichTextInput,
  useEditor,
  useEditorContext,
} from '@builderset/engine/editor';
import { Input, SegmentedControl, SegmentedTabs, Select, ToggleFlag } from '@builderset/engine/ui';
import { AlignCenter, AlignLeft, AlignRight, Brush, Crosshair, Ratio } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  BUTTON_ACTIONS,
  formatOf,
  INPUT_KINDS,
  POPUP_ICONS,
  POPUP_ROOT,
  TEXT_ACTIONS,
  WEIGHTS,
  type PopupDocument,
  type PopupFormat,
} from '../core';
import { POPUP_ICON_COMPONENTS } from '../render';
import { usePopup } from './context';
import { PX } from './stage';
import { Row } from './ui';

/**
 * A selected element's inspector, in place of the engine's tabs: Style (its
 * words and look), Layout (aligned to the popup, its frame, locked, hidden,
 * its name) and, for what a visitor clicks or types into, Action.
 */

type Tab = 'style' | 'layout' | 'action';

const ACTIONABLE = new Set(['heading', 'text', 'label', 'button', 'input', 'close']);
const TEXTS = new Set(['heading', 'text', 'label']);

/** The element and its changes, each a named undo step that coalesces while typing. */
function useElement(id: string) {
  const { store } = useEditorContext<PopupDocument>();
  const node = useEditor<BuilderNode | undefined, PopupDocument>((state) => state.view.nodes[id]);
  const set = (patch: Record<string, unknown>, label: string) => {
    store.getState().updateNode(id, { props: patch }, label, `popup:${id}:${label}`);
  };
  return { node, set };
}

export function PopupNodePanel({ id }: { id: string }): ReactNode {
  const { words } = usePopup();
  const { node } = useElement(id);
  const [tab, setTab] = useState<Tab>('style');
  if (!node || node.id === POPUP_ROOT) return null;
  const tabs = [
    { value: 'style' as const, label: words.style, icon: <Brush aria-hidden="true" /> },
    { value: 'layout' as const, label: words.layout, icon: <Ratio aria-hidden="true" /> },
    ...(ACTIONABLE.has(node.type)
      ? [{ value: 'action' as const, label: words.action, icon: <Crosshair aria-hidden="true" /> }]
      : []),
  ];
  const shown = tabs.some((candidate) => candidate.value === tab) ? tab : 'style';
  return (
    <div className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col">
      <SegmentedTabs
        aria-label={words.style}
        value={shown}
        onValueChange={setTab}
        tabs={tabs}
        className="bst:mx-4 bst:mt-3 bst:mb-1 bst:shrink-0"
      />
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:space-y-4 bst:overflow-y-auto bst:px-4 bst:pt-3.5 bst:pb-6">
        {shown === 'style' ? <StyleTab node={node} /> : null}
        {shown === 'layout' ? <LayoutTab id={id} /> : null}
        {shown === 'action' ? <ActionTab node={node} /> : null}
      </div>
    </div>
  );
}

// #region controls
function NumberRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Row label={label}>
      {(id) => (
        <NumberStepper
          id={id}
          value={value}
          min={min}
          max={max}
          step={step}
          integer={Number.isInteger(step)}
          suffix={suffix}
          onChange={(next) => {
            if (next !== null) onChange(next);
          }}
        />
      )}
    </Row>
  );
}

function Pair({ children }: { children: ReactNode }) {
  return <div className="bst:grid bst:grid-cols-2 bst:gap-3">{children}</div>;
}

function Colour({
  name,
  value,
  nullable,
  onChange,
}: {
  name: string;
  value: string;
  nullable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <ColorField
      name={name}
      value={value}
      nullable={nullable}
      onChange={(next) => {
        onChange(next ?? '');
      }}
    />
  );
}

function Opacity({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { words } = usePopup();
  return (
    <NumberRow
      label={words.opacity}
      value={Math.round(value * 100)}
      min={0}
      max={100}
      step={5}
      suffix="%"
      onChange={(next) => {
        onChange(next / 100);
      }}
    />
  );
}
// #endregion controls

function StyleTab({ node }: { node: BuilderNode }) {
  const { words } = usePopup();
  const { set } = useElement(node.id);
  const p = node.props;
  const str = (key: string) => (typeof p[key] === 'string' ? p[key] : '');
  const num = (key: string) => (typeof p[key] === 'number' ? p[key] : 0);
  const weight = (
    <Row label={words.weight}>
      {(id) => (
        <Select
          id={id}
          value={String(num('weight'))}
          onValueChange={(value) => {
            set({ weight: Number(value) }, words.weight);
          }}
          options={WEIGHTS.map((value) => ({ value: String(value), label: String(value) }))}
        />
      )}
    </Row>
  );
  const font = (
    // The font field carries its own label.
    <FontField
      value={str('font')}
      nullable={false}
      onChange={(value) => {
        if (value) set({ font: value }, words.font);
      }}
    />
  );
  const colour = (key: string, nullable: boolean) => (
    <Colour
      name={key}
      value={str(key)}
      nullable={nullable}
      onChange={(value) => {
        set({ [key]: value }, key);
      }}
    />
  );

  if (TEXTS.has(node.type)) {
    return (
      <>
        <Row label={words.text}>
          {(id) => (
            <RichTextInput
              id={id}
              value={p.text as RichText}
              onChange={(value) => {
                set({ text: value }, words.text);
              }}
            />
          )}
        </Row>
        {font}
        <Pair>
          {weight}
          <NumberRow
            label={words.textSize}
            value={num('size')}
            min={6}
            max={200}
            suffix="px"
            onChange={(size) => {
              set({ size }, words.textSize);
            }}
          />
        </Pair>
        <Pair>
          <NumberRow
            label={words.lineHeight}
            value={num('lineHeight')}
            min={0.8}
            max={3}
            step={0.05}
            onChange={(lineHeight) => {
              set({ lineHeight }, words.lineHeight);
            }}
          />
          <NumberRow
            label={words.letterSpacing}
            value={num('letterSpacing')}
            min={-5}
            max={20}
            step={0.1}
            onChange={(letterSpacing) => {
              set({ letterSpacing }, words.letterSpacing);
            }}
          />
        </Pair>
        <Row label={words.capitals}>
          {() => (
            <SegmentedControl
              aria-label={words.capitals}
              value={p.uppercase ? 'upper' : 'normal'}
              onValueChange={(value) => {
                set({ uppercase: value === 'upper' }, words.capitals);
              }}
              options={[
                { value: 'normal', label: 'Aa' },
                { value: 'upper', label: 'AA' },
              ]}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          )}
        </Row>
        <Row label={words.alignment}>
          {() => (
            <SegmentedControl
              aria-label={words.alignment}
              value={str('align')}
              onValueChange={(align) => {
                set({ align }, words.alignment);
              }}
              options={[
                {
                  value: 'left',
                  label: <AlignLeft aria-hidden="true" />,
                  ariaLabel: words.aligns.left,
                },
                {
                  value: 'center',
                  label: <AlignCenter aria-hidden="true" />,
                  ariaLabel: words.aligns.center,
                },
                {
                  value: 'right',
                  label: <AlignRight aria-hidden="true" />,
                  ariaLabel: words.aligns.right,
                },
              ]}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          )}
        </Row>
        {colour('color', true)}
        {colour('highlight', true)}
        {str('highlight') ? (
          <NumberRow
            label={words.highlightCorners}
            value={num('highlightRadius')}
            min={0}
            max={64}
            suffix="px"
            onChange={(highlightRadius) => {
              set({ highlightRadius }, words.highlightCorners);
            }}
          />
        ) : null}
      </>
    );
  }

  switch (node.type) {
    case 'button':
      return (
        <>
          <Row label={words.buttonText}>
            {(id) => (
              <RichTextInput
                id={id}
                multiline={false}
                value={p.text as RichText}
                onChange={(value) => {
                  set({ text: value }, words.buttonText);
                }}
              />
            )}
          </Row>
          {font}
          <Pair>
            {weight}
            <NumberRow
              label={words.textSize}
              value={num('size')}
              min={8}
              max={64}
              suffix="px"
              onChange={(size) => {
                set({ size }, words.textSize);
              }}
            />
          </Pair>
          {colour('fill', true)}
          {colour('color', false)}
          <NumberRow
            label={words.corners}
            value={num('radius')}
            min={0}
            max={500}
            suffix="px"
            onChange={(radius) => {
              set({ radius }, words.corners);
            }}
          />
        </>
      );
    case 'input':
      return (
        <>
          <Row label={words.placeholder}>
            {(id) => (
              <Input
                id={id}
                maxLength={120}
                value={str('placeholder')}
                onChange={(event) => {
                  set({ placeholder: event.target.value }, words.placeholder);
                }}
              />
            )}
          </Row>
          <Pair>
            <NumberRow
              label={words.textSize}
              value={num('size')}
              min={10}
              max={32}
              suffix="px"
              onChange={(size) => {
                set({ size }, words.textSize);
              }}
            />
            <NumberRow
              label={words.corners}
              value={num('radius')}
              min={0}
              max={500}
              suffix="px"
              onChange={(radius) => {
                set({ radius }, words.corners);
              }}
            />
          </Pair>
          {colour('color', false)}
          {colour('fill', false)}
          {colour('border', true)}
        </>
      );
    case 'close':
      return (
        <>
          {colour('color', false)}
          {colour('fill', true)}
        </>
      );
    case 'countdown':
      return (
        <>
          <Row label={words.countsTo} hint={words.countsToHint}>
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={str('to')}
                onChange={(event) => {
                  if (event.target.value)
                    set({ to: event.target.value.slice(0, 16) }, words.countsTo);
                }}
              />
            )}
          </Row>
          {font}
          <NumberRow
            label={words.textSize}
            value={num('size')}
            min={10}
            max={96}
            suffix="px"
            onChange={(size) => {
              set({ size }, words.textSize);
            }}
          />
          {colour('color', false)}
        </>
      );
    case 'rect':
    case 'ellipse':
      return (
        <>
          {colour('fill', true)}
          {colour('stroke', true)}
          {str('stroke') ? (
            <NumberRow
              label={words.outlineWidth}
              value={num('strokeWidth')}
              min={0}
              max={20}
              step={0.5}
              suffix="px"
              onChange={(strokeWidth) => {
                set({ strokeWidth }, words.outlineWidth);
              }}
            />
          ) : null}
          {node.type === 'rect' ? (
            <NumberRow
              label={words.corners}
              value={num('radius')}
              min={0}
              max={500}
              suffix="px"
              onChange={(radius) => {
                set({ radius }, words.corners);
              }}
            />
          ) : null}
          <Opacity
            value={num('opacity')}
            onChange={(opacity) => {
              set({ opacity }, words.opacity);
            }}
          />
        </>
      );
    case 'line':
      return (
        <>
          {colour('color', false)}
          <Opacity
            value={num('opacity')}
            onChange={(opacity) => {
              set({ opacity }, words.opacity);
            }}
          />
        </>
      );
    case 'image':
      return (
        <>
          <Row label={words.picture} hint={words.pictureHint}>
            {(id) => (
              <MediaField
                id={id}
                value={p.media as MediaRef | null}
                onChange={(media) => {
                  set({ media }, words.picture);
                }}
              />
            )}
          </Row>
          <Row label={words.alt} hint={words.altHint}>
            {(id) => (
              <Input
                id={id}
                maxLength={300}
                value={str('alt')}
                onChange={(event) => {
                  set({ alt: event.target.value }, words.alt);
                }}
              />
            )}
          </Row>
          <Row label={words.fit}>
            {() => (
              <SegmentedControl
                aria-label={words.fit}
                value={str('fit')}
                onValueChange={(fit) => {
                  set({ fit }, words.fit);
                }}
                options={[
                  { value: 'cover', label: words.fits.cover },
                  { value: 'contain', label: words.fits.contain },
                ]}
                className="bst:w-full bst:[&>*]:flex-1"
              />
            )}
          </Row>
          <NumberRow
            label={words.corners}
            value={num('radius')}
            min={0}
            max={500}
            suffix="px"
            onChange={(radius) => {
              set({ radius }, words.corners);
            }}
          />
          <Opacity
            value={num('opacity')}
            onChange={(opacity) => {
              set({ opacity }, words.opacity);
            }}
          />
          {colour('tone', false)}
        </>
      );
    case 'icon':
      return (
        <>
          <Row label={words.icon}>
            {() => (
              <div
                role="radiogroup"
                aria-label={words.icon}
                className="bst:grid bst:grid-cols-5 bst:gap-1.5"
              >
                {POPUP_ICONS.map((name) => {
                  const Icon = POPUP_ICON_COMPONENTS[name];
                  const on = p.name === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={name}
                      title={name}
                      onClick={() => {
                        set({ name }, words.icon);
                      }}
                      className={
                        on
                          ? 'bld-focus bst:grid bst:h-9 bst:cursor-pointer bst:place-items-center bst:rounded-control bst:border bst:border-primary bst:bg-primary/10 bst:text-primary bst:[&_svg]:size-4'
                          : 'bld-focus bst:grid bst:h-9 bst:cursor-pointer bst:place-items-center bst:rounded-control bst:border bst:border-border bst:bg-card bst:text-muted-foreground bst:hover:text-foreground bst:[&_svg]:size-4'
                      }
                    >
                      <Icon aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </Row>
          {colour('color', false)}
          <NumberRow
            label={words.iconWidth}
            value={num('strokeWidth')}
            min={0.5}
            max={4}
            step={0.25}
            onChange={(strokeWidth) => {
              set({ strokeWidth }, words.iconWidth);
            }}
          />
        </>
      );
    case 'logo':
      return (
        <>
          <Row label={words.logoText}>
            {(id) => (
              <Input
                id={id}
                maxLength={80}
                value={str('text')}
                onChange={(event) => {
                  set({ text: event.target.value }, words.logoText);
                }}
              />
            )}
          </Row>
          <Row label={words.logoFile}>
            {(id) => (
              <MediaField
                id={id}
                value={p.media as MediaRef | null}
                onChange={(media) => {
                  set({ media }, words.logoFile);
                }}
              />
            )}
          </Row>
          <Pair>
            {weight}
            <NumberRow
              label={words.textSize}
              value={num('size')}
              min={6}
              max={200}
              suffix="px"
              onChange={(size) => {
                set({ size }, words.textSize);
              }}
            />
          </Pair>
          {colour('color', true)}
        </>
      );
    case 'qr':
      return (
        <>
          <Row label={words.qrData} hint={words.qrHint}>
            {(id) => (
              <Input
                id={id}
                maxLength={500}
                className="bst:font-mono bst:text-xs"
                value={str('data')}
                onChange={(event) => {
                  if (event.target.value) set({ data: event.target.value }, words.qrData);
                }}
              />
            )}
          </Row>
          {colour('color', false)}
          {colour('background', false)}
        </>
      );
    default:
      return null;
  }
}

function LayoutTab({ id }: { id: string }) {
  const { words } = usePopup();
  const format = useEditor<PopupFormat, PopupDocument>((state) => formatOf(state.view));
  return (
    <>
      <FreeArrange
        ids={[id]}
        artboard={{ id: POPUP_ROOT, width: format.width, height: format.height }}
        title={words.alignTo}
        decimals={0}
      />
      <FreeLayoutFields id={id} unit={PX} />
    </>
  );
}

function ActionTab({ node }: { node: BuilderNode }) {
  const { words } = usePopup();
  const { set } = useElement(node.id);
  const p = node.props;
  const str = (key: string) => (typeof p[key] === 'string' ? p[key] : '');

  if (node.type === 'close')
    return <p className="bst:text-xs bst:text-muted-foreground">{words.closeHint}</p>;

  if (node.type === 'input') {
    return (
      <>
        <Row label={words.fieldName} hint={words.fieldNameHint}>
          {(id) => (
            <Input
              id={id}
              maxLength={40}
              className="bst:font-mono bst:text-xs"
              value={str('name')}
              onChange={(event) => {
                // Only what a submission's names may hold: a letter first, then a-z, 0-9 and _.
                const name = event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, '_')
                  .replace(/^[^a-z]+/, '');
                set({ name }, words.fieldName);
              }}
            />
          )}
        </Row>
        <Row label={words.inputLabel} hint={words.inputLabelHint}>
          {(id) => (
            <Input
              id={id}
              maxLength={120}
              value={str('label')}
              onChange={(event) => {
                set({ label: event.target.value }, words.inputLabel);
              }}
            />
          )}
        </Row>
        <ToggleFlag
          title={words.required}
          description={words.requiredHint}
          checked={p.required === true}
          onCheckedChange={(required) => {
            set({ required }, words.required);
          }}
        />
        <Row label={words.inputKind}>
          {(id) => (
            <Select
              id={id}
              value={str('kind')}
              onValueChange={(kind) => {
                set({ kind }, words.inputKind);
              }}
              options={INPUT_KINDS.map((kind) => ({ value: kind, label: words.kinds[kind] }))}
            />
          )}
        </Row>
      </>
    );
  }

  const actions = node.type === 'button' ? BUTTON_ACTIONS : TEXT_ACTIONS;
  const action = str('action');
  return (
    <>
      <Row label={words.whenClicked}>
        {() => (
          <SegmentedControl
            aria-label={words.whenClicked}
            value={action}
            onValueChange={(value) => {
              set({ action: value }, words.whenClicked);
            }}
            options={actions.map((value) => ({ value, label: words.actions[value] }))}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      {action === 'link' ? (
        <>
          <Row label={words.link}>
            {(id) => (
              <Input
                id={id}
                maxLength={2000}
                placeholder="/vleresim"
                className="bst:font-mono bst:text-xs"
                value={str('url')}
                onChange={(event) => {
                  set({ url: event.target.value }, words.link);
                }}
              />
            )}
          </Row>
          <ToggleFlag
            title={words.newTab}
            checked={p.newTab === true}
            onCheckedChange={(newTab) => {
              set({ newTab }, words.newTab);
            }}
          />
        </>
      ) : null}
      {action === 'submit' ? (
        <>
          <p className="bst:text-xs bst:text-muted-foreground">{words.submitHint}</p>
          <Row label={words.thanks} hint={words.thanksHint}>
            {(id) => (
              <Input
                id={id}
                maxLength={300}
                value={str('thanks')}
                onChange={(event) => {
                  set({ thanks: event.target.value }, words.thanks);
                }}
              />
            )}
          </Row>
        </>
      ) : null}
    </>
  );
}
