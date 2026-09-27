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
} from '@motors/builder-core';
import {
  Button,
  Input,
  Label,
  SegmentedControl,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleFlag,
} from '@motors/ui';
import { Copy, Monitor, RotateCcw, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { humanize } from '../messages';
import { DocumentSettings } from './document-settings';
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
        className="h-full"
      >
        {selection.length === 0 ? (
          <DocumentSettings />
        ) : selection.length === 1 && selection[0] ? (
          <NodeInspector id={selection[0]} />
        ) : (
          <MultiInspector ids={selection} label={messages.multipleSelected(selection.length)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function MultiInspector({ ids, label }: { ids: NodeId[]; label: string }) {
  const { store, messages } = useEditorContext();
  return (
    <div className="space-y-3 p-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
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
  const { registry, messages, store } = useEditorContext();
  const node = useEditor((state) => state.doc.nodes[id]);
  const tab = useEditor((state) => state.rightTab);
  if (!node) return null;
  const definition = registry.get(node.type);
  const schema = propsSchema(registry, node.type);

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
          <ElementIcon name={definition?.icon ?? 'box'} className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {node.name ?? messages.elements[node.type]?.name ?? node.type}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {messages.elements[node.type]?.description}
          </p>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          store.getState().setRightTab(value as RightTab);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="content">{messages.content}</TabsTrigger>
          <TabsTrigger value="style">{messages.style}</TabsTrigger>
          <TabsTrigger value="advanced">{messages.advanced}</TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="content" className="p-4">
            {schema && Object.keys(schema.properties ?? {}).length ? (
              <fieldset disabled={!!node.locked} className="disabled:opacity-60">
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
              <p className="text-muted-foreground text-sm">—</p>
            )}
          </TabsContent>
          <TabsContent value="style" className="p-4">
            <StylePanel id={id} />
          </TabsContent>
          <TabsContent value="advanced" className="p-4">
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

const DEVICE_ICON: Record<Breakpoint, ReactNode> = {
  desktop: <Monitor className="size-4" aria-hidden="true" />,
  tablet: <Tablet className="size-4" aria-hidden="true" />,
  mobile: <Smartphone className="size-4" aria-hidden="true" />,
};

function StylePanel({ id }: { id: NodeId }) {
  const { store, messages } = useEditorContext();
  const node = useEditor((state) => state.doc.nodes[id]);
  const viewport = useEditor((state) => state.viewport);
  const resolved = useMemo(() => resolveStyle(node?.style, viewport), [node?.style, viewport]);
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
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{messages.breakpoint}</Label>
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
          className="w-full [&>*]:flex-1"
        />
      </div>

      {STYLE_GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            {messages[group.title]}
          </h4>
          {group.keys.map((key) => {
            const options = (STYLE_SCHEMA.properties?.[key]?.enum ?? []).map(String);
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
                {(controlId) => (
                  <Select
                    id={controlId}
                    value={(resolved[key] as string | undefined) ?? ''}
                    placeholder="—"
                    onValueChange={(value) => {
                      set(key, value as never);
                    }}
                    options={options.map((option) => ({ value: option, label: humanize(option) }))}
                  />
                )}
              </StyleRow>
            );
          })}
        </section>
      ))}

      <section className="space-y-3">
        <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          {messages.styleKeys.background ?? 'Background'} · {messages.chooseImage}
        </h4>
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
            className="accent-primary w-full"
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          {messages.visibility}
        </h4>
        <ToggleFlag
          title={messages.hideAt}
          description={messages[viewport]}
          checked={resolved.hidden === true}
          onCheckedChange={(checked) => {
            set('hidden', checked ? true : undefined);
          }}
        />
      </section>
    </div>
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
          {inherited ? (
            <span className="text-muted-foreground ml-1.5 font-normal">· {inheritedLabel}</span>
          ) : null}
        </Label>
        {set ? (
          <button
            type="button"
            onClick={onReset}
            title={resetLabel}
            aria-label={resetLabel}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className={cn(inherited && 'opacity-70')}>{children(id)}</div>
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
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-xs font-medium">
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
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-anchor`} className="text-xs font-medium">
          {messages.anchor}
        </Label>
        <Input
          id={`${id}-anchor`}
          value={anchor}
          aria-invalid={anchorError ? true : undefined}
          className="font-mono text-xs"
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
        <p className={cn('text-xs', anchorError ? 'text-destructive' : 'text-muted-foreground')}>
          {messages.anchorHint}
        </p>
      </div>
      {turnInto.length ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{messages.turnInto}</Label>
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
