'use client';

import {
  BREAKPOINTS,
  replaceableTypes,
  resolveStyle,
  setStyleValue,
  styleValuesSchema,
  type Breakpoint,
  type MediaKind,
  type NodeId,
  type StyleValues,
} from '../../core';
import {
  Button,
  Input,
  Label,
  SegmentedControl,
  ToggleFlag,
  Select,
  SegmentedTabs,
  Tabs,
  TabsContent,
} from '../ui';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Monitor,
  Paintbrush,
  Pilcrow,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '../cn';
import { useEditor, useEditorContext, useProfile } from '../context';
import { ElementIcon } from '../icons';
import { humanize } from '../messages';
import { MediaField } from './media-field';
import { propsSchema, type JsonSchema } from './schema';
import { ObjectFields } from './schema-fields';
import type { RightTab } from '../store';

const MEDIA_KIND: Record<string, MediaKind> = { video: 'video', audio: 'audio', file: 'file' };

export function Inspector() {
  const selection = useEditor((state) => state.selection);
  const { messages } = useEditorContext();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={selection.length === 1 ? selection[0] : String(selection.length)}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.14 }}
        className="bst:h-full"
      >
        {selection.length === 0 ? (
          <Settings />
        ) : selection.length === 1 && selection[0] ? (
          <NodeInspector id={selection[0]} />
        ) : (
          <MultiInspector ids={selection} label={messages.multipleSelected(selection.length)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/** With nothing selected: the kit's document settings, or nothing when it has none. */
function Settings() {
  const Panel = useProfile().settingsPanel;
  return Panel ? <Panel /> : null;
}

function MultiInspector({ ids, label }: { ids: NodeId[]; label: string }) {
  const { store, messages } = useEditorContext();
  return (
    <div className="bst:space-y-3 bst:p-4">
      <p className="bst:text-sm bst:font-medium">{label}</p>
      <div className="bst:flex bst:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Copy aria-hidden="true" />}
          onClick={() => store.getState().duplicateNodes(ids)}
        >
          {messages.duplicate}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          icon={<Trash2 aria-hidden="true" />}
          onClick={() => store.getState().removeNodes(ids)}
        >
          {messages.delete}
        </Button>
      </div>
    </div>
  );
}

function NodeInspector({ id }: { id: NodeId }) {
  const { registry, messages, store, profile } = useEditorContext();
  // As it reads in the language being written: its words are that language's.
  const node = useEditor((state) => state.view.nodes[id]);
  const storedTab = useEditor((state) => state.rightTab);
  const showStyle = profile.styleTab !== false;
  const tab = !showStyle && storedTab === 'style' ? 'content' : storedTab;
  if (!node) return null;
  const definition = registry.get(node.type);
  const schema = propsSchema(registry, node.type);

  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      {/* Document › Paragraph: the way back to the document's settings. */}
      <div className="bst:flex bst:shrink-0 bst:items-center bst:gap-1.5 bst:px-4 bst:pt-1 bst:text-xs bst:text-muted-foreground">
        <button
          type="button"
          className="bst:cursor-pointer bst:font-medium bst:text-primary bst:hover:underline"
          onClick={() => {
            store.getState().select([]);
          }}
        >
          {messages.document}
        </button>
        <ChevronRight className="bst:size-3.5" aria-hidden="true" />
        <span className="bst:truncate">{messages.elements[node.type]?.name ?? node.type}</span>
      </div>
      <div className="bst:grid bst:shrink-0 bst:grid-cols-[minmax(0,1fr)_auto] bst:items-start bst:gap-2 bst:px-4 bst:pt-2">
        <div className="bst:min-w-0">
          <p className="bst:flex bst:items-center bst:gap-2 bst:truncate bst:text-[13.5px] bst:font-semibold">
            <ElementIcon
              name={definition?.icon ?? 'box'}
              className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
            />
            {node.name ?? messages.elements[node.type]?.name ?? node.type}
          </p>
          <p className="bst:mt-0.5 bst:text-xs bst:text-muted-foreground">
            {messages.elements[node.type]?.description}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={messages.close}
          onClick={() => {
            store.getState().select([]);
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          store.getState().setRightTab(value as RightTab);
        }}
        className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col"
      >
        <SegmentedTabs
          aria-label={messages.settings}
          value={tab}
          onValueChange={(value) => {
            store.getState().setRightTab(value);
          }}
          tabs={[
            { value: 'content', label: messages.content, icon: <Pilcrow aria-hidden="true" /> },
            ...(showStyle
              ? [
                  {
                    value: 'style' as const,
                    label: messages.style,
                    icon: <Paintbrush aria-hidden="true" />,
                  },
                ]
              : []),
            {
              value: 'advanced',
              label: messages.advanced,
              icon: <SlidersHorizontal aria-hidden="true" />,
            },
          ]}
          className="bst:mx-4 bst:mt-3.5 bst:mb-1 bst:shrink-0"
        />
        <div className="bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <TabsContent value="content" className="bst:px-4 bst:pt-3.5 bst:pb-6">
            {schema && Object.keys(schema.properties ?? {}).length ? (
              <fieldset disabled={!!node.locked} className="bst:disabled:opacity-60">
                <ObjectFields
                  schema={schema}
                  value={node.props}
                  mediaKind={MEDIA_KIND[node.type] ?? 'image'}
                  onChange={(props) => {
                    const changed = Object.keys(props).find(
                      (key) => props[key] !== node.props[key],
                    );
                    const patch: Record<string, unknown> = { ...props };
                    // A freshly uploaded picture replaces one still waiting to be.
                    if (node.type === 'image' && changed === 'media' && props.media) {
                      patch.pendingUrl = null;
                    }
                    store
                      .getState()
                      .updateNode(
                        id,
                        { props: patch },
                        `Edit ${changed ?? 'block'}`,
                        `prop:${id}:${changed ?? ''}`,
                      );
                  }}
                />
              </fieldset>
            ) : (
              <p className="bst:text-sm bst:text-muted-foreground">—</p>
            )}
          </TabsContent>
          <TabsContent value="style" className="bst:px-4 bst:pt-3.5 bst:pb-6">
            <StylePanel id={id} />
          </TabsContent>
          <TabsContent value="advanced" className="bst:px-4 bst:pt-3.5 bst:pb-6">
            <AdvancedPanel id={id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ── Style ───────────────────────────────────────────────────────────────────

const STYLE_SCHEMA = z.toJSONSchema(styleValuesSchema, {
  io: 'input',
  unrepresentable: 'any',
  reused: 'inline',
}) as JsonSchema;

const STYLE_GROUPS: {
  title: 'spacing' | 'layout' | 'typography' | 'appearance';
  keys: (keyof StyleValues)[];
}[] = [
  { title: 'spacing', keys: ['marginTop', 'marginBottom', 'paddingY', 'paddingX'] },
  { title: 'layout', keys: ['width', 'align'] },
  { title: 'typography', keys: ['textAlign', 'fontSize', 'textColor'] },
  { title: 'appearance', keys: ['background', 'borderWidth', 'borderColor', 'radius', 'shadow'] },
];

/** The segmented controls' "Auto": no value set (Radix reads '' as nothing chosen). */
const UNSET = '__unset';

const DEVICE_ICON: Record<Breakpoint, ReactNode> = {
  desktop: <Monitor className="bst:size-4" aria-hidden="true" />,
  tablet: <Tablet className="bst:size-4" aria-hidden="true" />,
  mobile: <Smartphone className="bst:size-4" aria-hidden="true" />,
};

function StylePanel({ id }: { id: NodeId }) {
  const { store, messages } = useEditorContext();
  const node = useEditor((state) => state.doc.nodes[id]);
  const viewport = useEditor((state) => state.viewport);
  const resolved = useMemo(() => resolveStyle(node?.style, viewport), [node?.style, viewport]);
  const [closed, setClosed] = useState<Set<string>>(
    () => new Set(['appearance', 'image', 'visibility']),
  );
  const toggle = (group: string) => {
    setClosed((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  if (!node) return null;
  const own = node.style?.[viewport] ?? {};

  const set = <K extends keyof StyleValues>(key: K, value: StyleValues[K] | undefined) => {
    store
      .getState()
      .updateNode(
        id,
        { style: setStyleValue(node.style, viewport, key, value) ?? null },
        `Style ${key}`,
        `style:${id}:${viewport}:${key}`,
      );
  };

  return (
    <div className="bst:grid bst:gap-4">
      <div className="bst:space-y-1.5">
        <Label className="bst:text-xs bst:font-medium">{messages.breakpoint}</Label>
        <SegmentedControl
          aria-label={messages.breakpoint}
          value={viewport}
          onValueChange={(value) => {
            store.getState().setViewport(value);
          }}
          options={BREAKPOINTS.map((bp) => ({
            value: bp,
            label: DEVICE_ICON[bp],
            ariaLabel: messages[bp],
          }))}
          className="bst:w-full bst:[&>*]:flex-1"
        />
      </div>

      {STYLE_GROUPS.map((group) => (
        <StyleGroup
          key={group.title}
          title={messages[group.title]}
          open={!closed.has(group.title)}
          onToggle={() => {
            toggle(group.title);
          }}
        >
          {group.keys.map((key) => {
            const options = (STYLE_SCHEMA.properties?.[key]?.enum ?? []).map(String);
            const value = (resolved[key] as string | undefined) ?? '';
            // A choice that is itself 'auto' stands for the default; no second Auto.
            const hasAuto = options.includes('auto');
            return (
              <StyleRow
                key={key}
                label={messages.styleKeys[key] ?? humanize(key)}
                inherited={own[key] === undefined && resolved[key] !== undefined}
                set={own[key] !== undefined}
                onReset={() => {
                  set(key, undefined);
                }}
                resetLabel={messages.reset}
                inheritedLabel={messages.inherited}
              >
                {(controlId) =>
                  // A few choices: all in view, "Auto" first. Many: a select.
                  options.length <= 5 ? (
                    <SegmentedControl
                      aria-label={messages.styleKeys[key] ?? humanize(key)}
                      value={value || (hasAuto ? 'auto' : UNSET)}
                      onValueChange={(next) => {
                        set(key, (next === UNSET ? undefined : next) as never);
                      }}
                      options={[
                        ...(hasAuto ? [] : [{ value: UNSET, label: messages.styleAuto }]),
                        ...options.map((option) => ({
                          value: option,
                          label: option === 'auto' ? messages.styleAuto : humanize(option),
                        })),
                      ]}
                      className="bst:w-full bst:[&>*]:flex-1"
                    />
                  ) : (
                    <Select
                      id={controlId}
                      value={value || undefined}
                      placeholder={messages.styleAuto}
                      onValueChange={(next) => {
                        set(key, next as never);
                      }}
                      options={options.map((option) => ({
                        value: option,
                        label: humanize(option),
                      }))}
                    />
                  )
                }
              </StyleRow>
            );
          })}
        </StyleGroup>
      ))}

      <StyleGroup
        title={`${messages.styleKeys.background ?? 'Background'} · ${messages.chooseImage}`}
        open={!closed.has('image')}
        onToggle={() => {
          toggle('image');
        }}
      >
        <MediaField
          kind="image"
          value={resolved.backgroundImage?.media ?? null}
          onChange={(media) => {
            set(
              'backgroundImage',
              media ? { media, overlay: resolved.backgroundImage?.overlay ?? 40 } : null,
            );
          }}
        />
        {resolved.backgroundImage ? (
          <input
            type="range"
            min={0}
            max={90}
            aria-label="Overlay"
            value={resolved.backgroundImage.overlay}
            onChange={(event) => {
              const current = resolved.backgroundImage;
              if (current)
                set('backgroundImage', { ...current, overlay: Number(event.target.value) });
            }}
            className="bst:w-full bst:accent-primary"
          />
        ) : null}
      </StyleGroup>

      <StyleGroup
        title={messages.visibility}
        open={!closed.has('visibility')}
        onToggle={() => {
          toggle('visibility');
        }}
      >
        <ToggleFlag
          title={messages.hideAt}
          description={messages[viewport]}
          checked={resolved.hidden === true}
          onCheckedChange={(checked) => {
            set('hidden', checked ? true : undefined);
          }}
        />
      </StyleGroup>
    </div>
  );
}

/** A group of style settings under a header that folds it away. */
function StyleGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="bst:grid bst:gap-3 bst:border-t bst:border-border bst:pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="bst:flex bst:w-full bst:cursor-pointer bst:items-center bst:justify-between bst:text-left bst:text-xs bst:font-semibold bst:text-foreground"
      >
        {title}
        <ChevronDown
          className={cn(
            'bst:size-[15px] bst:text-muted-foreground bst:transition-transform bst:duration-200',
            !open && 'bst:-rotate-90',
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="bst:grid bst:gap-3">{children}</div> : null}
    </section>
  );
}

function StyleRow({
  label,
  inherited,
  set,
  onReset,
  resetLabel,
  inheritedLabel,
  children,
}: {
  label: string;
  inherited: boolean;
  set: boolean;
  onReset: () => void;
  resetLabel: string;
  inheritedLabel: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="bst:space-y-1.5">
      <div className="bst:flex bst:items-center bst:justify-between bst:gap-2">
        <Label htmlFor={id} className="bst:text-xs bst:font-medium">
          {label}
          {inherited ? (
            <span className="bst:ml-1.5 bst:font-normal bst:text-muted-foreground">
              · {inheritedLabel}
            </span>
          ) : null}
        </Label>
        {set ? (
          <button
            type="button"
            onClick={onReset}
            title={resetLabel}
            aria-label={resetLabel}
            className="bst:text-muted-foreground bst:hover:text-foreground"
          >
            <RotateCcw className="bst:size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className={cn(inherited && 'bst:opacity-70')}>{children(id)}</div>
    </div>
  );
}

// ── Advanced ────────────────────────────────────────────────────────────────

const ANCHOR = /^[a-z][a-z0-9-]{0,63}$/;

function AdvancedPanel({ id }: { id: NodeId }) {
  const { store, messages, registry } = useEditorContext();
  const node = useEditor((state) => state.doc.nodes[id]);
  const doc = useEditor((state) => state.doc);
  const [anchor, setAnchor] = useState(node?.anchor ?? '');
  if (!node) return null;

  const taken = Object.values(doc.nodes).some(
    (other) => other.id !== id && other.anchor && other.anchor === anchor,
  );
  const anchorError = anchor && (!ANCHOR.test(anchor) || taken);
  const turnInto = replaceableTypes(node);

  return (
    <div className="bst:space-y-5">
      <div className="bst:space-y-1.5">
        <Label htmlFor={`${id}-name`} className="bst:text-xs bst:font-medium">
          {messages.elementName}
        </Label>
        <Input
          id={`${id}-name`}
          defaultValue={node.name ?? ''}
          placeholder={messages.elements[node.type]?.name}
          maxLength={80}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if ((node.name ?? '') !== value) {
              store.getState().updateNode(id, { name: value || null }, 'Rename');
            }
          }}
        />
      </div>
      <div className="bst:space-y-1.5">
        <Label htmlFor={`${id}-anchor`} className="bst:text-xs bst:font-medium">
          {messages.anchor}
        </Label>
        <Input
          id={`${id}-anchor`}
          value={anchor}
          aria-invalid={anchorError ? true : undefined}
          className="bst:font-mono bst:text-xs"
          onChange={(event) => {
            setAnchor(event.target.value.toLowerCase());
          }}
          onBlur={() => {
            if (anchorError) return;
            if ((node.anchor ?? '') !== anchor) {
              store.getState().updateNode(id, { anchor: anchor || null }, 'Anchor');
            }
          }}
        />
        <p
          className={cn(
            'bst:text-xs',
            anchorError ? 'bst:text-destructive' : 'bst:text-muted-foreground',
          )}
        >
          {messages.anchorHint}
        </p>
      </div>
      {turnInto.length ? (
        <div className="bst:space-y-1.5">
          <Label className="bst:text-xs bst:font-medium">{messages.turnInto}</Label>
          <Select
            value=""
            placeholder={messages.elements[node.type]?.name}
            onValueChange={(type) => {
              store.getState().turnInto(id, type);
            }}
            options={turnInto.map((type) => ({
              value: type,
              label: messages.elements[type]?.name ?? registry.get(type)?.type ?? type,
            }))}
          />
        </div>
      ) : null}
      <ToggleFlag
        title={messages.hidden}
        description={messages.hiddenHint}
        checked={!!node.hidden}
        onCheckedChange={(checked) => {
          store.getState().updateNode(id, { hidden: checked }, checked ? 'Hide' : 'Show');
        }}
      />
      <ToggleFlag
        title={messages.locked}
        description={messages.lockedHint}
        checked={!!node.locked}
        onCheckedChange={(checked) => {
          store.getState().updateNode(id, { locked: checked }, checked ? 'Lock' : 'Unlock');
        }}
      />
    </div>
  );
}
