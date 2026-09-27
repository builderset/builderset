'use client';

import { ColorField, useEditor, useEditorContext } from '@motors/builder-react';
import {
  FONT_STACKS,
  variablesOf,
  type EmailDocument,
  type EmailMeta,
  type EmailSettings,
} from '@motors/email-core';
import { createContext as createRenderContext, fill } from '@motors/email-render';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Braces } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { useEmail } from './context';

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children(id)}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/**
 * The email's own settings — shown when nothing is selected: what the inbox
 * shows (name, subject, preheader), the look (width, colours, font), dark
 * mode and link tracking.
 */
export function EmailSettingsPanel() {
  const { store } = useEditorContext();
  const { words, type, locale, sample, brand } = useEmail();
  const w = words.email;
  const doc = useEditor((state) => state.doc) as unknown as EmailDocument;
  const [tab, setTab] = useState('general');
  const settings = doc.settings;

  const setMeta = (patch: Partial<EmailMeta>, label: string, key: string) => {
    store.getState().updateDocument(
      label,
      (draft) => {
        Object.assign((draft as unknown as EmailDocument).meta, patch);
      },
      `email:meta:${key}`,
    );
  };
  const setSettings = (patch: Partial<EmailSettings>, label: string, key: string) => {
    store.getState().updateDocument(
      label,
      (draft) => {
        const email = draft as unknown as EmailDocument;
        email.settings = { ...email.settings, ...patch };
      },
      `email:settings:${key}`,
    );
  };

  const variables = variablesOf(type).map((variable) => ({
    path: variable.path,
    label: variable.label[locale] ?? variable.label.en ?? variable.path,
  }));
  const context = createRenderContext(doc, { assetUrl: () => '', brand, data: sample, locale });
  const subjectPreview = fill(doc.meta.subject, context);
  const preheaderPreview = fill(doc.meta.preheader, context);

  const variableButton = (onPick: (path: string) => void) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={w.insertVariable}
          title={w.insertVariable}
          className="border-input hover:bg-accent flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border [&_svg]:size-4"
        >
          <Braces aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto">
        {variables.map((variable) => (
          <DropdownMenuItem
            key={variable.path}
            onSelect={() => {
              onPick(variable.path);
            }}
          >
            <span className="min-w-0 flex-1 truncate">{variable.label}</span>
            <code className="text-muted-foreground text-[10px]">{variable.path}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const color = (
    key: 'backdrop' | 'background' | 'textColor' | 'headingColor' | 'linkColor',
    label: string,
  ) => (
    <ColorField
      name={label}
      value={settings[key]}
      nullable={false}
      onChange={(value) => {
        if (value) setSettings({ [key]: value }, label, key);
      }}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-11 shrink-0 flex-col justify-center border-b px-3">
        <p className="text-sm font-semibold">{w.settings}</p>
        {type ? (
          <p className="text-muted-foreground truncate text-xs">
            {w.type}: {type.label[locale] ?? type.label.en}
          </p>
        ) : null}
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 grid shrink-0 grid-cols-4 gap-0">
          <TabsTrigger value="general" className="px-1 py-1.5 text-xs">
            {w.general}
          </TabsTrigger>
          <TabsTrigger value="style" className="px-1 py-1.5 text-xs">
            {w.style}
          </TabsTrigger>
          <TabsTrigger value="dark" className="px-1 py-1.5 text-xs">
            {w.darkMode}
          </TabsTrigger>
          <TabsTrigger value="tracking" className="px-1 py-1.5 text-xs">
            {w.tracking}
          </TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="general" className="space-y-4 p-4">
            {/* What the reader sees before opening it. */}
            <div className="border-border bg-card rounded-[var(--radius-control)] border p-3">
              <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
                {w.inboxPreview}
              </p>
              <div className="flex gap-3">
                <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold">{brand.name}</p>
                  <p className="truncate">{subjectPreview || '—'}</p>
                  <p className="text-muted-foreground truncate text-xs">{preheaderPreview}</p>
                </div>
              </div>
            </div>
            <Row label={w.name}>
              {(id) => (
                <Input
                  id={id}
                  maxLength={120}
                  value={doc.meta.name}
                  onChange={(event) => {
                    setMeta({ name: event.target.value }, w.name, 'name');
                  }}
                />
              )}
            </Row>
            <Row label={w.subject} hint={w.subjectHint}>
              {(id) => (
                <div className="flex gap-2">
                  <Input
                    id={id}
                    maxLength={200}
                    value={doc.meta.subject}
                    onChange={(event) => {
                      setMeta({ subject: event.target.value }, w.subject, 'subject');
                    }}
                  />
                  {variableButton((path) => {
                    setMeta(
                      { subject: `${doc.meta.subject} {{ ${path} }}`.trimStart() },
                      w.subject,
                      'subject',
                    );
                  })}
                </div>
              )}
            </Row>
            <Row label={w.preheader} hint={w.preheaderHint}>
              {(id) => (
                <div className="flex gap-2">
                  <Input
                    id={id}
                    maxLength={250}
                    value={doc.meta.preheader}
                    onChange={(event) => {
                      setMeta({ preheader: event.target.value }, w.preheader, 'preheader');
                    }}
                  />
                  {variableButton((path) => {
                    setMeta(
                      { preheader: `${doc.meta.preheader} {{ ${path} }}`.trimStart() },
                      w.preheader,
                      'preheader',
                    );
                  })}
                </div>
              )}
            </Row>
            {variables.length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">{w.variables}</p>
                <div className="flex flex-wrap gap-1">
                  {variables.map((variable) => (
                    <code
                      key={variable.path}
                      title={variable.label}
                      className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] text-blue-700 dark:text-blue-300"
                    >
                      {variable.path}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="style" className="space-y-4 p-4">
            <Row label={`${w.width} · ${String(settings.width)}px`}>
              {(id) => (
                <input
                  id={id}
                  type="range"
                  min={480}
                  max={800}
                  step={10}
                  value={settings.width}
                  onChange={(event) => {
                    setSettings({ width: Number(event.target.value) }, w.width, 'width');
                  }}
                  className="accent-primary w-full"
                />
              )}
            </Row>
            <Row label={w.font}>
              {(id) => (
                <Select
                  id={id}
                  value={settings.font}
                  onValueChange={(font) => {
                    setSettings({ font: font as EmailSettings['font'] }, w.font, 'font');
                  }}
                  options={Object.keys(FONT_STACKS).map((font) => ({
                    value: font,
                    label: font.charAt(0).toUpperCase() + font.slice(1),
                  }))}
                />
              )}
            </Row>
            <Row label={`${w.fontSize} · ${String(settings.fontSize)}px`}>
              {(id) => (
                <input
                  id={id}
                  type="range"
                  min={12}
                  max={22}
                  value={settings.fontSize}
                  onChange={(event) => {
                    setSettings({ fontSize: Number(event.target.value) }, w.fontSize, 'fontSize');
                  }}
                  className="accent-primary w-full"
                />
              )}
            </Row>
            <Row label={`${w.lineHeight} · ${settings.lineHeight.toFixed(1)}`}>
              {(id) => (
                <input
                  id={id}
                  type="range"
                  min={1.1}
                  max={2.2}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={(event) => {
                    setSettings(
                      { lineHeight: Number(event.target.value) },
                      w.lineHeight,
                      'lineHeight',
                    );
                  }}
                  className="accent-primary w-full"
                />
              )}
            </Row>
            {color('backdrop', w.backdrop)}
            {color('background', w.background)}
            {color('textColor', w.textColor)}
            {color('headingColor', w.headingColor)}
            {color('linkColor', w.linkColor)}
          </TabsContent>

          <TabsContent value="dark" className="space-y-4 p-4">
            <Row label={w.darkModeMode} hint={w.darkHint}>
              {() => (
                <SegmentedControl
                  aria-label={w.darkModeMode}
                  value={settings.darkMode}
                  onValueChange={(darkMode) => {
                    setSettings({ darkMode }, w.darkModeMode, 'darkMode');
                  }}
                  options={[
                    { value: 'auto', label: w.darkAuto },
                    { value: 'custom', label: w.darkCustom },
                  ]}
                  className="w-full [&>*]:flex-1"
                />
              )}
            </Row>
            {settings.darkMode === 'custom'
              ? (['backdrop', 'background', 'text', 'heading', 'link'] as const).map((key) => (
                  <ColorField
                    key={key}
                    name={`dark ${key}`}
                    value={settings.dark[key]}
                    nullable={false}
                    onChange={(value) => {
                      if (value) {
                        setSettings(
                          { dark: { ...settings.dark, [key]: value } },
                          w.darkMode,
                          `dark:${key}`,
                        );
                      }
                    }}
                  />
                ))
              : null}
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4 p-4">
            <ToggleFlag
              title={w.utmEnabled}
              description={w.utmHint}
              checked={settings.utm.enabled}
              onCheckedChange={(enabled) => {
                setSettings({ utm: { ...settings.utm, enabled } }, w.tracking, 'utm:enabled');
              }}
            />
            {settings.utm.enabled
              ? (
                  [
                    ['source', w.utmSource],
                    ['medium', w.utmMedium],
                    ['campaign', w.utmCampaign],
                  ] as const
                ).map(([key, label]) => (
                  <Row key={key} label={label}>
                    {(id) => (
                      <Input
                        id={id}
                        value={settings.utm[key]}
                        maxLength={80}
                        onChange={(event) => {
                          setSettings(
                            { utm: { ...settings.utm, [key]: event.target.value } },
                            label,
                            `utm:${key}`,
                          );
                        }}
                      />
                    )}
                  </Row>
                ))
              : null}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
