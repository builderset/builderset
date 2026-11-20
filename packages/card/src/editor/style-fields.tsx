'use client';

import type { BuilderNode, MediaRef } from '@builderset/engine';
import { ColorField, MediaField, NumberStepper, useEditorContext } from '@builderset/engine/editor';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  SegmentedControl,
  Select,
  Textarea,
} from '@builderset/engine/ui';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Braces,
  Car,
  Check,
  Clock,
  Crosshair,
  Gift,
  Globe,
  Heart,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Ticket,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import {
  CARD_FONTS,
  CARD_ICONS,
  CHIP_ZONE,
  fieldLabel,
  type CardDocument,
  type CardFont,
  type CardIcon,
} from '../core';
import { useCard } from './context';
import { Pair, Row } from './ui';

/**
 * The Style tab of a selected element: what it looks like, by its type —
 * type for words, fill and outline for shapes, the picture for an image, what
 * a code encodes. Every change is one undo step, coalesced while typing.
 */

const ICONS: Record<CardIcon, LucideIcon> = {
  star: Star,
  check: Check,
  car: Car,
  wrench: Wrench,
  'shield-check': ShieldCheck,
  'key-round': KeyRound,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  'map-pin': MapPin,
  clock: Clock,
  gift: Gift,
  ticket: Ticket,
  heart: Heart,
};

const WEIGHTS = [400, 500, 600, 700, 800];
const FONT_OPTIONS = (Object.keys(CARD_FONTS) as CardFont[]).map((key) => ({
  value: key,
  label: CARD_FONTS[key].label,
}));

export type Update = (props: Record<string, unknown>, label: string) => void;

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

/**
 * A colour from the palette or typed in; `nullable` offers "none", stored as
 * empty. `labelKey` names the field when the prop's own name would say the
 * wrong thing (a text's `background` is its highlight).
 */
function Colour({
  name,
  labelKey = name,
  value,
  update,
  nullable = false,
  label,
}: {
  name: string;
  labelKey?: string;
  value: unknown;
  update: Update;
  nullable?: boolean;
  label: string;
}) {
  const current = str(value);
  return (
    <ColorField
      name={labelKey}
      value={current || null}
      nullable={nullable}
      onChange={(next) => {
        update({ [name]: next ?? '' }, label);
      }}
    />
  );
}

function Stepper({
  label,
  value,
  onChange,
  step = 0.5,
  min = 0,
  max = 100,
  suffix,
  hint,
  aside,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
  aside?: string;
}) {
  const { messages } = useEditorContext();
  return (
    <Row
      label={label}
      hint={hint}
      aside={
        aside ? (
          <small className="bst:font-mono bst:text-[11px] bst:text-muted-foreground">{aside}</small>
        ) : undefined
      }
    >
      {(id) => (
        <NumberStepper
          id={id}
          value={value}
          step={step}
          min={min}
          max={max}
          suffix={suffix}
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

function Opacity({ value, update }: { value: unknown; update: Update }) {
  const { words } = useCard();
  const opacity = num(value, 1);
  return (
    <Row
      label={words.opacity}
      aside={
        <small className="bst:text-[11px] bst:text-muted-foreground">{`${String(Math.round(opacity * 100))} %`}</small>
      }
    >
      {(id) => (
        <input
          id={id}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          className="bst:w-full bst:accent-primary"
          onChange={(event) => {
            update({ opacity: Number(event.target.value) }, words.opacity);
          }}
        />
      )}
    </Row>
  );
}

function TextInput({
  label,
  value,
  onChange,
  mono = false,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  hint?: string;
  maxLength: number;
}) {
  return (
    <Row label={label} hint={hint}>
      {(id) => (
        <Input
          id={id}
          value={value}
          maxLength={maxLength}
          className={mono ? 'bst:font-mono bst:text-xs' : undefined}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </Row>
  );
}

/** The words of a text, and a menu that puts a member field where they end. */
function Words({ node, update }: { node: BuilderNode; update: Update }) {
  const { words, fields, locale } = useCard();
  const text = str(node.props.text);
  return (
    <Row
      label={words.text}
      aside={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={words.insertField}
              title={words.insertField}
            >
              <Braces aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {fields
              .filter((field) => field.kind === 'text')
              .map((field) => (
                <DropdownMenuItem
                  key={field.path}
                  onSelect={() => {
                    update({ text: `${text}{{${field.path}}}` }, words.insertField);
                  }}
                >
                  <span>{fieldLabel(field, locale)}</span>
                  <code className="bst:ml-auto bst:pl-3 bst:font-mono bst:text-[11px] bst:text-muted-foreground">
                    {field.path}
                  </code>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {(id) => (
        <Textarea
          id={id}
          rows={3}
          maxLength={500}
          value={text}
          onChange={(event) => {
            update({ text: event.target.value }, words.text);
          }}
        />
      )}
    </Row>
  );
}

function TypeFields({ node, update }: { node: BuilderNode; update: Update }) {
  const { words } = useCard();
  const p = node.props;
  const size = num(p.size, 8);
  return (
    <>
      <Words node={node} update={update} />
      <Pair>
        <Row label={words.font}>
          {(id) => (
            <Select
              id={id}
              value={str(p.font)}
              options={FONT_OPTIONS}
              onValueChange={(font) => {
                update({ font }, words.font);
              }}
            />
          )}
        </Row>
        <Row label={words.weight}>
          {(id) => (
            <Select
              id={id}
              value={String(num(p.weight, 400))}
              options={WEIGHTS.map((weight) => ({ value: String(weight), label: String(weight) }))}
              onValueChange={(weight) => {
                update({ weight: Number(weight) }, words.weight);
              }}
            />
          )}
        </Row>
      </Pair>
      <Pair>
        <Stepper
          label={words.size}
          value={size}
          min={2}
          max={120}
          suffix="pt"
          onChange={(next) => {
            update({ size: next }, words.size);
          }}
        />
        <Stepper
          label={words.lineHeight}
          value={num(p.lineHeight, 1.25)}
          step={0.05}
          min={0.6}
          max={3}
          onChange={(next) => {
            update({ lineHeight: next }, words.lineHeight);
          }}
        />
      </Pair>
      <Pair>
        <Stepper
          label={words.letterSpacing}
          value={num(p.letterSpacing)}
          step={0.01}
          min={-0.2}
          max={1}
          suffix="em"
          onChange={(next) => {
            update({ letterSpacing: next }, words.letterSpacing);
          }}
        />
        <Row label={words.capitals}>
          {() => (
            <SegmentedControl
              aria-label={words.capitals}
              value={p.upper ? 'upper' : 'normal'}
              onValueChange={(value) => {
                update({ upper: value === 'upper' }, words.capitals);
              }}
              options={[
                { value: 'normal', label: 'Aa' },
                { value: 'upper', label: 'AA' },
              ]}
              className="bst:w-full bst:[&>*]:flex-1"
            />
          )}
        </Row>
      </Pair>
      <Row label={words.alignment}>
        {() => (
          <SegmentedControl
            aria-label={words.alignment}
            value={str(p.align) || 'left'}
            onValueChange={(align) => {
              update({ align }, words.alignment);
            }}
            options={[
              {
                value: 'left',
                label: <AlignLeft className="bst:size-4" aria-hidden="true" />,
                ariaLabel: words.alignLeft,
              },
              {
                value: 'center',
                label: <AlignCenter className="bst:size-4" aria-hidden="true" />,
                ariaLabel: words.alignCenter,
              },
              {
                value: 'right',
                label: <AlignRight className="bst:size-4" aria-hidden="true" />,
                ariaLabel: words.alignRight,
              },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      <Row label={words.vertical}>
        {() => (
          <SegmentedControl
            aria-label={words.vertical}
            value={str(p.valign) || 'top'}
            onValueChange={(valign) => {
              update({ valign }, words.vertical);
            }}
            options={[
              { value: 'top', label: words.valignTop },
              { value: 'middle', label: words.valignMiddle },
              { value: 'bottom', label: words.valignBottom },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      <Colour name="color" label={words.colourLabel} value={p.color} update={update} nullable />
      <Colour
        name="background"
        labelKey="highlight"
        label={words.highlight}
        value={p.background}
        update={update}
        nullable
      />
      {str(p.background) ? (
        <Stepper
          label={words.highlightCorners}
          value={num(p.backgroundRadius)}
          step={0.1}
          max={30}
          suffix="mm"
          onChange={(next) => {
            update({ backgroundRadius: next }, words.highlightCorners);
          }}
        />
      ) : null}
    </>
  );
}

export function StyleFields({ node, update }: { node: BuilderNode; update: Update }) {
  const { words } = useCard();
  const { store } = useEditorContext<CardDocument>();
  const p = node.props;
  switch (node.type) {
    case 'heading':
    case 'text':
    case 'label':
    case 'field':
      return <TypeFields node={node} update={update} />;
    case 'logo':
      return (
        <>
          <TextInput
            label={words.logoText}
            value={str(p.text)}
            maxLength={80}
            onChange={(text) => {
              update({ text }, words.logoText);
            }}
          />
          <Pair>
            <Row label={words.font}>
              {(id) => (
                <Select
                  id={id}
                  value={str(p.font)}
                  options={FONT_OPTIONS}
                  onValueChange={(font) => {
                    update({ font }, words.font);
                  }}
                />
              )}
            </Row>
            <Stepper
              label={words.size}
              value={num(p.size, 10)}
              min={2}
              max={120}
              suffix="pt"
              onChange={(next) => {
                update({ size: next }, words.size);
              }}
            />
          </Pair>
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
          <Row label={words.logoFile}>
            {(id) => (
              <MediaField
                id={id}
                value={(p.media as MediaRef | null) ?? null}
                onChange={(media) => {
                  update({ media }, words.logoFile);
                }}
              />
            )}
          </Row>
        </>
      );
    case 'rect':
    case 'ellipse':
      return (
        <>
          <Colour name="fill" label={words.fill} value={p.fill} update={update} nullable />
          <Colour name="stroke" label={words.outline} value={p.stroke} update={update} nullable />
          {str(p.stroke) ? (
            <Stepper
              label={words.outlineWidth}
              value={num(p.strokeWidth, 0.2)}
              step={0.05}
              max={10}
              suffix="mm"
              onChange={(next) => {
                update({ strokeWidth: next }, words.outlineWidth);
              }}
            />
          ) : null}
          {node.type === 'rect' ? (
            <Stepper
              label={words.corners}
              value={num(p.radius)}
              step={0.1}
              suffix="mm"
              onChange={(next) => {
                update({ radius: next }, words.corners);
              }}
            />
          ) : null}
          <Opacity value={p.opacity} update={update} />
        </>
      );
    case 'line':
      return (
        <>
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
          <Opacity value={p.opacity} update={update} />
        </>
      );
    case 'stripe':
      return (
        <>
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
          <p className="bst:text-xs bst:text-muted-foreground">{words.stripeHint}</p>
        </>
      );
    case 'image':
      return (
        <>
          <Row label={words.image}>
            {(id) => (
              <MediaField
                id={id}
                value={(p.media as MediaRef | null) ?? null}
                onChange={(media) => {
                  update({ media }, words.image);
                }}
              />
            )}
          </Row>
          <Row label={words.fit}>
            {() => (
              <SegmentedControl
                aria-label={words.fit}
                value={str(p.fit) || 'cover'}
                onValueChange={(fit) => {
                  update({ fit }, words.fit);
                }}
                options={[
                  { value: 'cover', label: words.fitCover },
                  { value: 'contain', label: words.fitContain },
                ]}
                className="bst:w-full bst:[&>*]:flex-1"
              />
            )}
          </Row>
          <Stepper
            label={words.corners}
            value={num(p.radius)}
            step={0.1}
            suffix="mm"
            onChange={(next) => {
              update({ radius: next }, words.corners);
            }}
          />
          <Opacity value={p.opacity} update={update} />
          <Colour name="tone" label={words.placeholderTone} value={p.tone} update={update} />
        </>
      );
    case 'photo':
      return (
        <>
          <Stepper
            label={words.corners}
            value={num(p.radius)}
            step={0.1}
            suffix="mm"
            onChange={(next) => {
              update({ radius: next }, words.corners);
            }}
          />
          <Colour name="tone" label={words.placeholderTone} value={p.tone} update={update} />
          <p className="bst:text-xs bst:text-muted-foreground">{words.photoHint}</p>
        </>
      );
    case 'icon':
      return (
        <>
          <Row label={words.icons}>
            {() => (
              <div
                role="radiogroup"
                aria-label={words.icons}
                className="bst:grid bst:grid-cols-7 bst:gap-1.5"
              >
                {CARD_ICONS.map((name) => {
                  const Icon = ICONS[name];
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
                        update({ name }, words.icon);
                      }}
                      className={
                        on
                          ? 'bst:grid bst:aspect-square bst:cursor-pointer bst:place-items-center bst:rounded-lg bst:border bst:border-primary bst:bg-primary/10 bst:text-primary bst:[&_svg]:size-4'
                          : 'bst:grid bst:aspect-square bst:cursor-pointer bst:place-items-center bst:rounded-lg bst:border bst:border-border bst:bg-card bst:hover:bg-accent bst:[&_svg]:size-4'
                      }
                    >
                      <Icon aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </Row>
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
        </>
      );
    case 'nfc':
      return <Colour name="color" label={words.colourLabel} value={p.color} update={update} />;
    case 'qr':
      return (
        <>
          <TextInput
            label={words.qrData}
            value={str(p.data)}
            maxLength={500}
            mono
            onChange={(data) => {
              update({ data }, words.qrData);
            }}
          />
          <Row label={words.qrLevel}>
            {() => (
              <SegmentedControl
                aria-label={words.qrLevel}
                value={str(p.level) || 'M'}
                onValueChange={(level) => {
                  update({ level }, words.qrLevel);
                }}
                options={(['L', 'M', 'Q', 'H'] as const).map((level) => ({
                  value: level,
                  label: level,
                  ariaLabel: words.qrLevels[level],
                }))}
                className="bst:w-full bst:[&>*]:flex-1"
              />
            )}
          </Row>
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
          <Colour
            name="background"
            label={words.qrBackground}
            value={p.background}
            update={update}
          />
        </>
      );
    case 'barcode':
      return (
        <>
          <TextInput
            label={words.barcodeData}
            value={str(p.data)}
            maxLength={80}
            mono
            hint={words.barcodeHint}
            onChange={(data) => {
              update({ data }, words.barcodeData);
            }}
          />
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
        </>
      );
    case 'sign':
      return (
        <>
          <TextInput
            label={words.signLabel}
            value={str(p.label)}
            maxLength={60}
            hint={words.signHint}
            onChange={(label) => {
              update({ label }, words.signLabel);
            }}
          />
          <Colour name="color" label={words.colourLabel} value={p.color} update={update} />
        </>
      );
    case 'chip':
      return (
        <>
          <Row label={words.chipFinish}>
            {() => (
              <SegmentedControl
                aria-label={words.chipFinish}
                value={p.finish === 'silver' ? 'silver' : 'gold'}
                onValueChange={(finish) => {
                  update({ finish }, words.chipFinish);
                }}
                options={[
                  { value: 'gold', label: words.chipGold },
                  { value: 'silver', label: words.chipSilver },
                ]}
                className="bst:w-full bst:[&>*]:flex-1"
              />
            )}
          </Row>
          <p className="bst:text-xs bst:text-muted-foreground">{words.chipHint}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Crosshair aria-hidden="true" />}
            className="bst:justify-self-start"
            disabled={node.locked}
            onClick={() => {
              store.getState().updateNode(
                node.id,
                {
                  props: {
                    frame: {
                      x: CHIP_ZONE.x,
                      y: CHIP_ZONE.y,
                      w: CHIP_ZONE.width,
                      h: CHIP_ZONE.height,
                      r: 0,
                    },
                  },
                },
                words.snapToIso,
              );
            }}
          >
            {words.snapToIso}
          </Button>
        </>
      );
    default:
      return null;
  }
}
