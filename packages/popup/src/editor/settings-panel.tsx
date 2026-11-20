'use client';

import {
  ColorField,
  languageName,
  MultilingualToggle,
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
  ToggleFlag,
} from '@builderset/engine/ui';
import {
  AppWindow,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock,
  FileText,
  Info,
  LogOut,
  Maximize2,
  MousePointerClick,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  SquareDashed,
  Target,
  Wand,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  AUDIENCES,
  defaultFormat,
  ENTER_MOTIONS,
  EXIT_MOTIONS,
  FREQUENCIES,
  formatOf,
  hasOverlay,
  PAGE_MODES,
  POPUP_ROOT,
  POPUP_TYPE_KEYS,
  POPUP_TYPES,
  popupTips,
  positionOf,
  TRIGGERS,
  type PopupDisplay,
  type PopupDocument,
  type PopupFormat,
  type PopupMeta,
  type PopupMotion,
  type PopupPosition,
  type PopupType,
} from '../core';
import { usePopup } from './context';
import { Group, Row } from './ui';

/**
 * The popup's own settings — shown when nothing is selected, in three tabs:
 *
 * - Format: what to check before publishing, the name, the type, the size
 *   and where it sits, its background, corners, shadow and the page behind.
 * - Display: when it shows (the trigger), on which pages, to whom, in which
 *   language, how often, between which days, on which devices.
 * - Motion: how it comes and goes, and what closes it.
 */

type Tab = 'format' | 'display' | 'motion';

export const TYPE_ICONS: Record<PopupType, ReactNode> = {
  modal: <AppWindow aria-hidden="true" />,
  slidein: <SquareDashed aria-hidden="true" />,
  bartop: <PanelTop aria-hidden="true" />,
  barbottom: <PanelBottom aria-hidden="true" />,
  fullscreen: <Maximize2 aria-hidden="true" />,
  drawer: <PanelRight aria-hidden="true" />,
  inline: <Square aria-hidden="true" />,
};

/** The popup's format and its changes, each a named undo step that coalesces while typing. */
export function useFormat() {
  const { store } = useEditorContext<PopupDocument>();
  const format = useEditor<PopupFormat, PopupDocument>((state) => formatOf(state.doc));
  const set = (patch: Partial<PopupFormat>, label: string) => {
    store.getState().updateNode(POPUP_ROOT, { props: patch }, label, `popup:format:${label}`);
  };
  const setDisplay = (patch: Partial<PopupDisplay>, label: string) => {
    set({ display: { ...format.display, ...patch } }, label);
  };
  const setMotion = (patch: Partial<PopupMotion>, label: string) => {
    set({ motion: { ...format.motion, ...patch } }, label);
  };
  return { format, set, setDisplay, setMotion };
}

/**
 * Another type: its size and place, and the elements scaled to the new size,
 * in one undo step. A dark surface stays dark only for a bar or a full screen.
 */
export function changeType(draft: PopupDocument, type: PopupType) {
  const root = draft.nodes[draft.root];
  if (!root) return;
  const current = root.props as PopupFormat;
  const next = defaultFormat(type);
  const sx = next.width / current.width;
  const sy = next.height / current.height;
  for (const id of root.children ?? []) {
    const node = draft.nodes[id];
    const frame = node?.props.frame as { x: number; y: number; w: number; h: number } | undefined;
    if (!node || !frame) continue;
    node.props = {
      ...node.props,
      frame: {
        ...frame,
        x: Math.round(frame.x * sx),
        y: Math.round(frame.y * sy),
        w: Math.max(1, Math.round(frame.w * sx)),
        h: Math.max(1, Math.round(frame.h * sy)),
      },
    };
  }
  const dark = POPUP_TYPES[type].fill === 'width' || POPUP_TYPES[type].fill === 'both';
  root.props = {
    ...current,
    type,
    width: next.width,
    height: next.height,
    position: positionOf(type, current.position),
    background: dark
      ? current.background === '#ffffff'
        ? next.background
        : current.background
      : current.background === '#111827'
        ? '#ffffff'
        : current.background,
  };
}

export function PopupSettingsPanel() {
  const { messages } = useEditorContext<PopupDocument>();
  const { words } = usePopup();
  const [tab, setTab] = useState<Tab>('format');
  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <SegmentedTabs
        aria-label={messages.document}
        stacked
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'format', label: words.format, icon: <AppWindow aria-hidden="true" /> },
          { value: 'display', label: words.display, icon: <Target aria-hidden="true" /> },
          { value: 'motion', label: words.motion, icon: <Sparkles aria-hidden="true" /> },
        ]}
        className="bst:mx-4 bst:mt-1 bst:mb-1 bst:shrink-0"
      />
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:space-y-4 bst:overflow-y-auto bst:px-4 bst:pt-3.5 bst:pb-6">
        {tab === 'format' ? <Format /> : null}
        {tab === 'display' ? <Display /> : null}
        {tab === 'motion' ? <Motion /> : null}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: ReactNode;
}) {
  return (
    <Row label={label} hint={hint}>
      {(id) => (
        <NumberStepper
          id={id}
          value={value}
          min={min}
          max={max}
          step={step}
          integer
          suffix={suffix}
          onChange={(next) => {
            if (next !== null) onChange(next);
          }}
        />
      )}
    </Row>
  );
}

const WIDE = 'bst:w-full bst:[&>*]:flex-1';

function Format() {
  const { messages, record, store, host } = useEditorContext<PopupDocument>();
  const { words } = usePopup();
  const { format, set } = useFormat();
  const issues = useIssues();
  const doc = useEditor<PopupDocument, PopupDocument>((state) => state.doc);
  const meta = useEditor<PopupMeta, PopupDocument>((state) => state.view.meta);
  const spec = POPUP_TYPES[format.type];
  const tips = popupTips(doc);
  const sizes = spec.sizes as readonly (readonly [string, number, number])[];
  const size = sizes.find(([, w, h]) => w === format.width && h === format.height)?.[0] ?? '';

  return (
    <>
      <ReadyCard
        issues={issues}
        action={record.status === 'published' ? messages.update : messages.publish}
      />
      {tips.map((tip) => (
        <p
          key={tip.code}
          className="bst:flex bst:gap-2 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2.5 bst:text-xs bst:text-muted-foreground bst:[&_svg]:mt-px bst:[&_svg]:size-3.5 bst:[&_svg]:shrink-0"
        >
          <Info aria-hidden="true" />
          {words.tips.scaledOnPhones(format.width)}
        </p>
      ))}
      <Row label={words.name} hint={words.nameHint}>
        {(id) => (
          <Input
            id={id}
            maxLength={120}
            value={meta.name}
            onChange={(event) => {
              store
                .getState()
                .updateMeta({ name: event.target.value }, words.name, 'popup:meta:name');
            }}
          />
        )}
      </Row>
      <MultilingualToggle />
      <Row label={words.popupType}>
        {() => (
          <div
            role="radiogroup"
            aria-label={words.popupType}
            className="bst:grid bst:grid-cols-2 bst:gap-2"
          >
            {POPUP_TYPE_KEYS.map((type) => (
              <TypeCard
                key={type}
                type={type}
                selected={format.type === type}
                onPick={() => {
                  if (type === format.type) return;
                  store.getState().updateDocument(words.popupType, (draft) => {
                    changeType(draft, type);
                  });
                  host.toast('info', words.scaledToType(words.types[type]));
                }}
              />
            ))}
          </div>
        )}
      </Row>
      {sizes.length ? (
        <Row label={words.size}>
          {() => (
            <SegmentedControl
              aria-label={words.size}
              value={size}
              onValueChange={(value) => {
                const picked = sizes.find(([name]) => name === value);
                if (picked) set({ width: picked[1], height: picked[2] }, words.size);
              }}
              options={sizes.map(([name, w, h]) => ({
                value: name,
                label: `${name.toUpperCase()} · ${String(w)}×${String(h)}`,
              }))}
              className={WIDE}
            />
          )}
        </Row>
      ) : null}
      <div className="bst:grid bst:gap-1.5">
        <div className="bst:grid bst:grid-cols-2 bst:gap-3">
          <Stepper
            label={words.width}
            value={format.width}
            min={120}
            max={1600}
            step={10}
            suffix="px"
            onChange={(width) => {
              set({ width }, words.width);
            }}
          />
          <Stepper
            label={words.height}
            value={format.height}
            min={32}
            max={1200}
            step={spec.fill === 'width' ? 4 : 10}
            suffix="px"
            onChange={(height) => {
              set({ height }, words.height);
            }}
          />
        </div>
        {spec.fill === 'none' ? null : (
          <p className="bst:text-xs bst:text-muted-foreground">
            {spec.fill === 'height' ? words.fullHeight : words.fullWidth}
          </p>
        )}
      </div>
      <Position
        format={format}
        onChange={(position) => {
          set({ position }, words.position);
        }}
      />
      <ColorField
        name="background"
        value={format.background}
        nullable={false}
        onChange={(background) => {
          if (background) set({ background }, words.background);
        }}
      />
      {spec.fill === 'none' ? (
        <div className="bst:grid bst:grid-cols-2 bst:gap-3">
          <Stepper
            label={words.corners}
            value={format.radius}
            min={0}
            max={64}
            step={2}
            suffix="px"
            onChange={(radius) => {
              set({ radius }, words.corners);
            }}
          />
          <Row label={words.shadow}>
            {(id) => (
              <Select
                id={id}
                value={format.shadow}
                onValueChange={(shadow) => {
                  set({ shadow: shadow as PopupFormat['shadow'] }, words.shadow);
                }}
                options={(['none', 'soft', 'strong'] as const).map((value) => ({
                  value,
                  label: words.shadows[value],
                }))}
              />
            )}
          </Row>
        </div>
      ) : null}
      {hasOverlay(format) ? (
        <Group title={words.pageBehind}>
          <Stepper
            label={words.dimmed(format.overlay)}
            value={format.overlay}
            min={0}
            max={90}
            step={5}
            suffix="%"
            onChange={(overlay) => {
              set({ overlay }, words.pageBehind);
            }}
          />
          <ToggleFlag
            title={words.blur}
            description={words.blurHint}
            checked={format.blur}
            onCheckedChange={(blur) => {
              set({ blur }, words.blur);
            }}
          />
        </Group>
      ) : null}
    </>
  );
}

function TypeCard({
  type,
  selected,
  onPick,
}: {
  type: PopupType;
  selected: boolean;
  onPick: () => void;
}) {
  const { words } = usePopup();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={
        selected
          ? 'bld-focus bst:grid bst:cursor-pointer bst:gap-1 bst:rounded-card bst:border bst:border-primary bst:bg-primary/8 bst:p-2.5 bst:text-left bst:[&_svg]:size-4 bst:[&_svg]:text-primary'
          : 'bld-focus bst:grid bst:cursor-pointer bst:gap-1 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-2.5 bst:text-left bst:transition-colors bst:hover:border-primary/40 bst:[&_svg]:size-4 bst:[&_svg]:text-muted-foreground'
      }
    >
      {TYPE_ICONS[type]}
      <b className="bst:text-[12.5px] bst:font-semibold">{words.types[type]}</b>
      <small className="bst:text-[11px] bst:leading-snug bst:text-muted-foreground">
        {words.typeHints[type]}
      </small>
    </button>
  );
}

/** Where it sits: a corner for a slide-in, a side for a drawer. */
function Position({
  format,
  onChange,
}: {
  format: PopupFormat;
  onChange: (position: PopupPosition) => void;
}) {
  const { words } = usePopup();
  const allowed = POPUP_TYPES[format.type].positions as readonly PopupPosition[];
  const current = positionOf(format.type, format.position);
  if (format.type === 'modal') {
    return (
      <Row label={words.position}>
        {() => <p className="bst:text-xs bst:text-muted-foreground">{words.alwaysCentred}</p>}
      </Row>
    );
  }
  if (allowed.length === 4) {
    return (
      <Row label={words.position}>
        {() => (
          <div
            role="radiogroup"
            aria-label={words.position}
            className="bst:grid bst:w-40 bst:grid-cols-2 bst:gap-1.5"
          >
            {allowed.map((position) => (
              <button
                key={position}
                type="button"
                role="radio"
                aria-checked={current === position}
                aria-label={words.positions[position]}
                title={words.positions[position]}
                onClick={() => {
                  onChange(position);
                }}
                className={
                  current === position
                    ? 'bld-focus bst:relative bst:h-12 bst:cursor-pointer bst:rounded-control bst:border bst:border-primary bst:bg-primary/8'
                    : 'bld-focus bst:relative bst:h-12 bst:cursor-pointer bst:rounded-control bst:border bst:border-border bst:bg-card bst:hover:border-primary/40'
                }
              >
                <i
                  className={[
                    'bst:absolute bst:size-3 bst:rounded-[3px]',
                    current === position ? 'bst:bg-primary' : 'bst:bg-muted-foreground/40',
                    position.includes('top') ? 'bst:top-1.5' : 'bst:bottom-1.5',
                    position.includes('left') ? 'bst:left-1.5' : 'bst:right-1.5',
                  ].join(' ')}
                />
              </button>
            ))}
          </div>
        )}
      </Row>
    );
  }
  if (allowed.length === 2) {
    return (
      <Row label={words.position}>
        {() => (
          <SegmentedControl
            aria-label={words.position}
            value={current}
            onValueChange={onChange}
            options={allowed.map((position) => ({
              value: position,
              label: (
                <span className="bst:inline-flex bst:items-center bst:gap-1.5 bst:[&_svg]:size-3.5">
                  {position === 'left' ? (
                    <PanelLeft aria-hidden="true" />
                  ) : (
                    <PanelRight aria-hidden="true" />
                  )}
                  {words.positions[position]}
                </span>
              ),
            }))}
            className={WIDE}
          />
        )}
      </Row>
    );
  }
  return null;
}

const TRIGGER_ICONS: Record<(typeof TRIGGERS)[number], ReactNode> = {
  load: <FileText aria-hidden="true" />,
  delay: <Clock aria-hidden="true" />,
  scroll: <ArrowDown aria-hidden="true" />,
  exit: <LogOut aria-hidden="true" />,
  click: <MousePointerClick aria-hidden="true" />,
};

function Display() {
  const { words } = usePopup();
  const { messages, contentLocales } = useEditorContext<PopupDocument>();
  const { format, setDisplay } = useFormat();
  const d = format.display;
  const value =
    d.trigger === 'delay'
      ? String(d.delay)
      : d.trigger === 'scroll'
        ? String(d.scroll)
        : d.selector;
  const languages = [
    ...new Set([...contentLocales, ...(d.language === 'all' ? [] : [d.language])]),
  ];

  return (
    <>
      <Row label={words.showIt} hint={words.triggerHint[d.trigger](value)}>
        {() => (
          <SegmentedControl
            aria-label={words.showIt}
            value={d.trigger}
            onValueChange={(trigger) => {
              setDisplay({ trigger }, words.showIt);
            }}
            options={TRIGGERS.map((trigger) => ({
              value: trigger,
              label: TRIGGER_ICONS[trigger],
              ariaLabel: words.triggers[trigger],
            }))}
            className={WIDE}
          />
        )}
      </Row>
      {d.trigger === 'delay' ? (
        <Stepper
          label={words.delay}
          value={d.delay}
          min={0}
          max={600}
          suffix={words.seconds}
          onChange={(delay) => {
            setDisplay({ delay }, words.delay);
          }}
        />
      ) : null}
      {d.trigger === 'scroll' ? (
        <Stepper
          label={words.scrolled}
          value={d.scroll}
          min={0}
          max={100}
          step={5}
          suffix="%"
          onChange={(scroll) => {
            setDisplay({ scroll }, words.scrolled);
          }}
        />
      ) : null}
      {d.trigger === 'click' ? (
        <Row label={words.selector} hint={words.selectorHint}>
          {(id) => (
            <Input
              id={id}
              maxLength={200}
              placeholder="#vlereso"
              className="bst:font-mono bst:text-xs"
              value={d.selector}
              onChange={(event) => {
                setDisplay({ selector: event.target.value }, words.selector);
              }}
            />
          )}
        </Row>
      ) : null}
      <Row label={words.pages}>
        {() => (
          <div className="bst:grid bst:gap-2">
            <SegmentedControl
              aria-label={words.pages}
              value={d.pages}
              onValueChange={(pages) => {
                setDisplay(
                  { pages, rules: pages !== 'all' && d.rules.length === 0 ? ['/'] : d.rules },
                  words.pages,
                );
              }}
              options={PAGE_MODES.map((mode) => ({ value: mode, label: words.pageModes[mode] }))}
              className={WIDE}
            />
            {d.pages !== 'all' ? (
              <>
                {d.rules.map((rule, index) => (
                  // Rules are plain strings with no identity; a row is its place in the list.
                  <div key={index} className="bst:flex bst:items-center bst:gap-1.5">
                    <Input
                      aria-label={words.pageRule(index + 1)}
                      maxLength={200}
                      className="bst:font-mono bst:text-xs"
                      value={rule}
                      onChange={(event) => {
                        const rules = [...d.rules];
                        rules[index] = event.target.value;
                        setDisplay({ rules }, words.pages);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={words.removePage}
                      onClick={() => {
                        setDisplay(
                          { rules: d.rules.filter((_, at) => at !== index) },
                          words.removePage,
                        );
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Plus aria-hidden="true" />}
                  disabled={d.rules.length >= 30}
                  className="bst:justify-self-start bst:border-dashed"
                  onClick={() => {
                    setDisplay({ rules: [...d.rules, '/'] }, words.addPage);
                  }}
                >
                  {words.addPage}
                </Button>
                <p className="bst:text-xs bst:text-muted-foreground">{words.wildcardHint}</p>
              </>
            ) : null}
          </div>
        )}
      </Row>
      <Row label={words.audience}>
        {() => (
          <SegmentedControl
            aria-label={words.audience}
            value={d.audience}
            onValueChange={(audience) => {
              setDisplay({ audience }, words.audience);
            }}
            options={AUDIENCES.map((audience) => ({
              value: audience,
              label: words.audiences[audience],
            }))}
            className={WIDE}
          />
        )}
      </Row>
      {languages.length ? (
        <Row label={words.language}>
          {(id) => (
            <Select
              id={id}
              value={d.language}
              onValueChange={(language) => {
                setDisplay({ language }, words.language);
              }}
              options={[
                { value: 'all', label: words.allLanguages },
                ...languages.map((code) => ({
                  value: code,
                  label: languageName(code, messages.languages),
                })),
              ]}
            />
          )}
        </Row>
      ) : null}
      <Row label={words.frequency}>
        {(id) => (
          <div className="bst:grid bst:gap-2">
            <Select
              id={id}
              value={d.frequency}
              onValueChange={(frequency) => {
                setDisplay({ frequency: frequency as PopupDisplay['frequency'] }, words.frequency);
              }}
              options={FREQUENCIES.map((frequency) => ({
                value: frequency,
                label: words.frequencies[frequency],
              }))}
            />
            {d.frequency === 'days' ? (
              <NumberStepper
                aria-label={words.everyDays}
                value={d.days}
                min={1}
                max={365}
                integer
                suffix={words.days}
                onChange={(days) => {
                  if (days !== null) setDisplay({ days }, words.frequency);
                }}
              />
            ) : null}
          </div>
        )}
      </Row>
      <div className="bst:grid bst:grid-cols-2 bst:gap-3">
        {(['starts', 'ends'] as const).map((key) => (
          <Row key={key} label={words[key]}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={d[key]}
                onChange={(event) => {
                  setDisplay({ [key]: event.target.value }, words[key]);
                }}
              />
            )}
          </Row>
        ))}
      </div>
      <Group title={words.devices}>
        <ToggleFlag
          title={words.desktop}
          checked={d.desktop}
          onCheckedChange={(desktop) => {
            setDisplay({ desktop }, words.desktop);
          }}
        />
        <ToggleFlag
          title={words.phones}
          checked={d.mobile}
          onCheckedChange={(mobile) => {
            setDisplay({ mobile }, words.phones);
          }}
        />
      </Group>
      <Stepper
        label={words.priority}
        hint={words.priorityHint}
        value={d.priority}
        min={0}
        max={1000}
        onChange={(priority) => {
          setDisplay({ priority }, words.priority);
        }}
      />
    </>
  );
}

const ENTER_ICONS: Record<(typeof ENTER_MOTIONS)[number], ReactNode> = {
  fade: <Wand aria-hidden="true" />,
  scale: <Maximize2 aria-hidden="true" />,
  up: <ArrowUp aria-hidden="true" />,
  side: <ArrowRight aria-hidden="true" />,
  none: <X aria-hidden="true" />,
};

function Motion() {
  const { words, replay } = usePopup();
  const { format, setMotion } = useFormat();
  const m = format.motion;
  return (
    <>
      <Row label={words.appearsWith} hint={words.enters[m.enter]}>
        {() => (
          <SegmentedControl
            aria-label={words.appearsWith}
            value={m.enter}
            onValueChange={(enter) => {
              setMotion({ enter }, words.appearsWith);
            }}
            options={ENTER_MOTIONS.map((enter) => ({
              value: enter,
              label: ENTER_ICONS[enter],
              ariaLabel: words.enters[enter],
            }))}
            className={WIDE}
          />
        )}
      </Row>
      <Stepper
        label={words.duration}
        value={m.duration}
        min={0}
        max={3000}
        step={40}
        suffix="ms"
        onChange={(duration) => {
          setMotion({ duration }, words.duration);
        }}
      />
      <Row label={words.leavesWith}>
        {() => (
          <SegmentedControl
            aria-label={words.leavesWith}
            value={m.exit}
            onValueChange={(exit) => {
              setMotion({ exit }, words.leavesWith);
            }}
            options={EXIT_MOTIONS.map((exit) => ({ value: exit, label: words.exits[exit] }))}
            className={WIDE}
          />
        )}
      </Row>
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={<RotateCcw aria-hidden="true" />}
        className="bst:justify-self-start"
        onClick={replay}
      >
        {words.replayOnCanvas}
      </Button>
      <Group title={words.closing}>
        <ToggleFlag
          title={words.closeButton}
          description={words.closeButtonHint}
          checked={m.closeX}
          onCheckedChange={(closeX) => {
            setMotion({ closeX }, words.closeButton);
          }}
        />
        {hasOverlay(format) ? (
          <ToggleFlag
            title={words.outside}
            description={words.outsideHint}
            checked={m.outside}
            onCheckedChange={(outside) => {
              setMotion({ outside }, words.outside);
            }}
          />
        ) : null}
        <ToggleFlag
          title={words.esc}
          checked={m.esc}
          onCheckedChange={(esc) => {
            setMotion({ esc }, words.esc);
          }}
        />
        <Stepper
          label={words.autoClose}
          hint={words.autoCloseHint}
          value={m.autoClose}
          min={0}
          max={600}
          suffix={words.seconds}
          onChange={(autoClose) => {
            setMotion({ autoClose }, words.autoClose);
          }}
        />
      </Group>
    </>
  );
}
