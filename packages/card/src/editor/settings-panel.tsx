'use client';

import type { MediaRef } from '@builderset/engine';
import {
  ColorField,
  MediaField,
  NumberStepper,
  ReadyCard,
  useEditor,
  useEditorContext,
  useIssues,
} from '@builderset/engine/editor';
import {
  Button,
  Input,
  SegmentedControl,
  SegmentedTabs,
  Select,
  Tabs,
  TabsContent,
  ToggleFlag,
} from '@builderset/engine/ui';
import { ChevronLeft, ChevronRight, CreditCard, Plus, Printer, Users } from 'lucide-react';
import { useState } from 'react';

import {
  CARD_FORMATS,
  cardSizeOf,
  CSS_DPI,
  changeFormat,
  elementsOf,
  fieldLabel,
  fieldsUsed,
  formatOf,
  formatSpec,
  mmToPx,
  resizeCard,
  roundTo,
  sideOf,
  type CardDocument,
  type CardFormatProps,
  type CardPrint,
} from '../core';
import { useCard } from './context';
import { FormatIcon } from './format-icon';
import { PrintButton } from './print';
import { Pair, Row, Soft } from './ui';

/**
 * The card's own settings — shown when nothing is selected, in three tabs:
 *
 * - Format: what to fix before printing, the name, the card type, its size,
 *   orientation, sides and corners, the background of the side shown.
 * - Print: the printed size, bleed and safe margin, resolution, colour,
 *   material, finish, how many, and the print-ready sheet.
 * - Data: example member data on the canvas, the member list, which fields
 *   the design uses, and printing one card per member.
 */

type Tab = 'format' | 'print' | 'data';

const mm = (value: number) => String(roundTo(value, 2));

/** The root's props, and a setter that is one undo step per label. */
function useFormat() {
  const { store } = useEditorContext<CardDocument>();
  const format = useEditor<CardFormatProps, CardDocument>((state) => formatOf(state.view));
  const update = (label: string, recipe: (draft: CardDocument) => void) => {
    store.getState().updateDocument(label, recipe, `card:format:${label}`);
  };
  const set = (patch: Partial<CardFormatProps>, label: string) => {
    update(label, (draft) => {
      const root = draft.nodes[draft.root];
      if (root) root.props = { ...root.props, ...patch };
    });
  };
  const setPrint = (patch: Partial<CardPrint>, label: string) => {
    set({ print: { ...format.print, ...patch } }, label);
  };
  return { format, update, set, setPrint };
}

function Mm({
  label,
  value,
  onChange,
  min = 0,
  max = 300,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const { messages } = useEditorContext();
  return (
    <Row label={label}>
      {(id) => (
        <NumberStepper
          id={id}
          value={value}
          step={0.5}
          min={min}
          max={max}
          suffix="mm"
          decreaseLabel={messages.decrease}
          increaseLabel={messages.increase}
          onChange={(next) => {
            if (next !== null) onChange(next);
          }}
        />
      )}
    </Row>
  );
}

function FormatTab() {
  const { messages, store } = useEditorContext<CardDocument>();
  const { words, face } = useCard();
  const issues = useIssues();
  const { format, update, set } = useFormat();
  const name = useEditor<string, CardDocument>((state) => state.view.meta.name);
  // A string, so the panel re-renders only when the side's look changes.
  const side = useEditor<string, CardDocument>((state) => {
    const node = sideOf(state.view, face);
    return node
      ? JSON.stringify({
          id: node.id,
          background: node.props.background,
          image: node.props.image ?? null,
        })
      : '';
  });
  const current = side
    ? (JSON.parse(side) as { id: string; background: string; image: MediaRef | null })
    : null;
  const hasChip = useEditor<boolean, CardDocument>((state) =>
    elementsOf(state.doc, 'front').some((node) => node.type === 'chip'),
  );
  const faceName = face === 'front' ? words.front : words.back;
  const landscape = format.width >= format.height;

  const setSide = (props: Record<string, unknown>, label: string) => {
    if (current) store.getState().updateNode(current.id, { props }, label, `card:side:${label}`);
  };

  return (
    <>
      <ReadyCard issues={issues} action={messages.publish} />
      <Row label={words.name} hint={words.nameHint}>
        {(id) => (
          <Input
            id={id}
            maxLength={120}
            value={name}
            onChange={(event) => {
              store
                .getState()
                .updateMeta({ name: event.target.value }, words.name, 'card:meta:name');
            }}
          />
        )}
      </Row>
      <Row label={words.cardType}>
        {() => (
          <div
            role="radiogroup"
            aria-label={words.cardType}
            className="bst:grid bst:grid-cols-2 bst:gap-2"
          >
            {CARD_FORMATS.map((spec) => {
              const on = format.format === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    update(words.cardType, (draft) => {
                      changeFormat(draft, spec.id);
                    });
                  }}
                  className={
                    on
                      ? 'bst:grid bst:cursor-pointer bst:content-start bst:gap-1 bst:rounded-card bst:border bst:border-primary bst:bg-primary/8 bst:p-2.5 bst:text-left bst:[&_svg]:size-4 bst:[&_svg]:text-primary'
                      : 'bst:grid bst:cursor-pointer bst:content-start bst:gap-1 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2.5 bst:text-left bst:transition-colors bst:hover:border-primary/40 bst:[&_svg]:size-4 bst:[&_svg]:text-muted-foreground'
                  }
                >
                  <FormatIcon format={spec.id} />
                  <b className="bst:text-[12.5px] bst:font-semibold">
                    {words.formats[spec.id].name}
                  </b>
                  <small className="bst:text-[11px] bst:leading-snug bst:text-muted-foreground">
                    {words.formats[spec.id].description}
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </Row>
      <Pair>
        <Mm
          label={words.width}
          value={format.width}
          min={20}
          onChange={(width) => {
            update(words.width, (draft) => {
              resizeCard(draft, width, format.height);
            });
          }}
        />
        <Mm
          label={words.height}
          value={format.height}
          min={20}
          onChange={(height) => {
            update(words.height, (draft) => {
              resizeCard(draft, format.width, height);
            });
          }}
        />
      </Pair>
      <Row label={words.orientation}>
        {() => (
          <SegmentedControl
            aria-label={words.orientation}
            value={landscape ? 'landscape' : 'portrait'}
            onValueChange={(value) => {
              if ((value === 'landscape') === landscape) return;
              update(words.orientation, (draft) => {
                resizeCard(draft, format.height, format.width);
              });
            }}
            options={[
              { value: 'landscape', label: words.landscape },
              { value: 'portrait', label: words.portrait },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      <Row label={words.sides}>
        {() => (
          <SegmentedControl
            aria-label={words.sides}
            value={String(format.sides)}
            onValueChange={(value) => {
              set({ sides: value === '1' ? 1 : 2 }, words.sides);
            }}
            options={[
              { value: '1', label: words.frontOnly },
              { value: '2', label: words.frontAndBack },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      <Row label={words.corners}>
        {() => (
          <SegmentedControl
            aria-label={words.corners}
            value={String(format.radius)}
            onValueChange={(value) => {
              set({ radius: Number(value) }, words.corners);
            }}
            options={[
              { value: '0', label: words.cornersSquare },
              { value: '3.18', label: words.cornersIso },
              { value: '5', label: words.cornersRound },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      {format.format === 'bank' && !hasChip ? (
        <Soft>
          <p className="bst:text-xs bst:text-muted-foreground">{words.bankParts}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus aria-hidden="true" />}
            className="bst:justify-self-start"
            onClick={() => {
              const state = store.getState();
              const front = sideOf(state.doc, 'front');
              const back = sideOf(state.doc, 'back');
              const chip = cardSizeOf('chip', format.width);
              const stripe = cardSizeOf('stripe', format.width);
              if (front) {
                state.insertElement(
                  'chip',
                  { parentId: front.id, index: front.children?.length ?? 0 },
                  { frame: { x: chip.x ?? 0, y: chip.y ?? 0, w: chip.w, h: chip.h, r: 0 } },
                );
              }
              if (back) {
                state.insertElement(
                  'stripe',
                  { parentId: back.id, index: 0 },
                  { frame: { x: stripe.x ?? 0, y: stripe.y ?? 0, w: stripe.w, h: stripe.h, r: 0 } },
                );
              }
            }}
          >
            {words.addBankParts}
          </Button>
        </Soft>
      ) : null}
      {current ? (
        <>
          <ColorField
            name="background"
            value={current.background}
            nullable={false}
            onChange={(background) => {
              if (background) setSide({ background }, words.background(faceName));
            }}
          />
          <p className="bst:-mt-2.5 bst:text-[11px] bst:text-muted-foreground">
            {words.background(faceName)}
          </p>
          <Row label={words.backgroundImage(faceName)} hint={words.backgroundImageHint}>
            {(id) => (
              <MediaField
                id={id}
                value={current.image}
                onChange={(image) => {
                  setSide({ image }, words.backgroundImage(faceName));
                }}
              />
            )}
          </Row>
        </>
      ) : null}
    </>
  );
}

function PrintTab() {
  const { messages } = useEditorContext();
  const { words, showBleed, setShowBleed, showSafe, setShowSafe } = useCard();
  const { format, setPrint } = useFormat();
  const print = format.print;
  const printed = formatSpec(format.format).print;

  if (!printed) {
    return (
      <>
        <Soft>
          <b className="bst:text-[13px]">{words.digitalCard}</b>
          <p className="bst:text-xs bst:text-muted-foreground">{words.digitalCardHint}</p>
          <p className="bst:font-mono bst:text-xs bst:text-muted-foreground">
            {words.pixelsAt(
              Math.round(mmToPx(format.width, CSS_DPI * 3)),
              Math.round(mmToPx(format.height, CSS_DPI * 3)),
              CSS_DPI * 3,
            )}
          </p>
        </Soft>
        <Row label={words.output}>{() => <PrintButton>{words.printSheet}</PrintButton>}</Row>
      </>
    );
  }

  const choice = (
    key: 'colour' | 'material' | 'finish',
    label: string,
    options: Readonly<Record<string, string>>,
  ) => (
    <Row label={label}>
      {(id) => (
        <Select
          id={id}
          value={print[key]}
          options={Object.entries(options).map(([value, text]) => ({ value, label: text }))}
          onValueChange={(value) => {
            // The options are the setting's own values, so the pick is one of them.
            setPrint({ [key]: value }, label);
          }}
        />
      )}
    </Row>
  );

  return (
    <>
      <Soft>
        <b className="bst:font-mono bst:text-[13px]">{`${mm(format.width)} × ${mm(format.height)} mm`}</b>
        <p className="bst:text-xs bst:text-muted-foreground">
          {words.printedSize} ·{' '}
          {words.withBleed(mm(format.width + 2 * print.bleed), mm(format.height + 2 * print.bleed))}
        </p>
        <p className="bst:font-mono bst:text-[11px] bst:text-muted-foreground">
          {words.pixelsAt(
            Math.round(mmToPx(format.width, print.dpi)),
            Math.round(mmToPx(format.height, print.dpi)),
            print.dpi,
          )}
        </p>
      </Soft>
      <Pair>
        <Mm
          label={words.bleed}
          value={print.bleed}
          max={10}
          onChange={(bleed) => {
            setPrint({ bleed }, words.bleed);
          }}
        />
        <Mm
          label={words.safeMargin}
          value={print.safe}
          max={15}
          onChange={(safe) => {
            setPrint({ safe }, words.safeMargin);
          }}
        />
      </Pair>
      <div className="bst:grid bst:gap-2">
        <ToggleFlag
          title={words.showBleed}
          description={words.showBleedHint}
          checked={showBleed}
          onCheckedChange={setShowBleed}
        />
        <ToggleFlag
          title={words.showSafe}
          description={words.showSafeHint}
          checked={showSafe}
          onCheckedChange={setShowSafe}
        />
      </div>
      <Pair>
        <Row label={words.resolution}>
          {(id) => (
            <Select
              id={id}
              value={String(print.dpi)}
              options={[
                { value: '300', label: '300 dpi' },
                { value: '600', label: '600 dpi' },
              ]}
              onValueChange={(value) => {
                setPrint({ dpi: value === '600' ? 600 : 300 }, words.resolution);
              }}
            />
          )}
        </Row>
        {choice('colour', words.colour, words.colours)}
      </Pair>
      <Pair>
        {choice('material', words.material, words.materials)}
        {choice('finish', words.finish, words.finishes)}
      </Pair>
      <Row label={words.quantity}>
        {(id) => (
          <NumberStepper
            id={id}
            value={print.quantity}
            step={10}
            min={1}
            max={1_000_000}
            integer
            suffix={words.cardsUnit}
            decreaseLabel={messages.decrease}
            increaseLabel={messages.increase}
            onChange={(quantity) => {
              if (quantity !== null) setPrint({ quantity }, words.quantity);
            }}
          />
        )}
      </Row>
      <Row label={words.output} hint={words.printSheetHint(mm(print.bleed))}>
        {() => <PrintButton>{words.printSheet}</PrintButton>}
      </Row>
    </>
  );
}

function DataTab() {
  const {
    words,
    exampleData,
    setExampleData,
    records,
    recordIndex,
    setRecordIndex,
    fields,
    locale,
    memberCount,
  } = useCard();
  const { format, set } = useFormat();
  const used = JSON.parse(
    useEditor<string, CardDocument>((state) => JSON.stringify(fieldsUsed(state.view))),
  ) as string[];
  const record = records[recordIndex] ?? records[0];
  const total = memberCount ?? records.length;
  const step = (delta: number) => {
    if (!records.length) return;
    setRecordIndex((recordIndex + delta + records.length) % records.length);
  };

  return (
    <>
      <ToggleFlag
        title={words.showData}
        description={words.showDataHint}
        checked={exampleData}
        onCheckedChange={setExampleData}
      />
      <Row label={words.source}>
        {(id) => (
          <Input
            id={id}
            maxLength={120}
            value={format.source}
            placeholder={words.sourcePlaceholder}
            onChange={(event) => {
              set({ source: event.target.value }, words.source);
            }}
          />
        )}
      </Row>
      {record ? (
        <Row label={words.exampleMember}>
          {() => (
            <div className="bst:grid bst:grid-cols-[auto_minmax(0,1fr)_auto] bst:items-center bst:gap-2 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={words.previousMember}
                onClick={() => {
                  step(-1);
                }}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <div className="bst:min-w-0 bst:text-center">
                <b className="bst:block bst:truncate bst:text-[13px]">
                  {record['member.name'] ?? Object.values(record)[0]}
                </b>
                <small className="bst:text-[11px] bst:text-muted-foreground">
                  {words.recordOf(recordIndex + 1, total)}
                </small>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={words.nextMember}
                onClick={() => {
                  step(1);
                }}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </Row>
      ) : null}
      <Row label={words.fieldsOnCard}>
        {() =>
          used.length ? (
            <ul className="bst:grid bst:gap-1">
              {used.map((path) => {
                const field = fields.find((one) => one.path === path);
                return (
                  <li
                    key={path}
                    className="bst:grid bst:gap-0.5 bst:rounded-lg bst:bg-accent/60 bst:px-2.5 bst:py-1.5"
                  >
                    <b className="bst:text-xs">{field ? fieldLabel(field, locale) : path}</b>
                    <code className="bst:truncate bst:font-mono bst:text-[11px] bst:text-muted-foreground">
                      {field?.kind === 'photo'
                        ? words.photoFromProfile
                        : (record?.[path] ?? `{{${path}}}`)}
                    </code>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="bst:text-xs bst:text-muted-foreground">{words.noFieldsOnCard}</p>
          )
        }
      </Row>
      {total > 0 ? <PrintButton>{words.printAll(total)}</PrintButton> : null}
    </>
  );
}

export function CardSettingsPanel() {
  const { words } = useCard();
  const [tab, setTab] = useState<Tab>('format');
  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as Tab);
        }}
        className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col"
      >
        <SegmentedTabs
          aria-label={words.crumb}
          stacked
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'format', label: words.format, icon: <CreditCard aria-hidden="true" /> },
            { value: 'print', label: words.print, icon: <Printer aria-hidden="true" /> },
            { value: 'data', label: words.data, icon: <Users aria-hidden="true" /> },
          ]}
          className="bst:mx-4 bst:mt-1 bst:mb-1 bst:shrink-0"
        />
        <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <TabsContent value="format" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <FormatTab />
          </TabsContent>
          <TabsContent value="print" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <PrintTab />
          </TabsContent>
          <TabsContent value="data" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <DataTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
