'use client';

import {
  MultilingualToggle,
  ColorField,
  FontField,
  NumberStepper,
  useEditor,
  useEditorContext,
} from '@builderset/engine/editor';
import { variablesOf, type EmailDocument, type EmailMeta, type EmailSettings } from '../core';
import { createContext as createRenderContext, fill } from '../render';
import {
  Input,
  Label,
  SegmentedControl,
  ToggleFlag,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@builderset/engine/ui';
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
    <div className="bst:space-y-1.5">
      <Label htmlFor={id} className="bst:text-xs bst:font-medium">
        {label}
      </Label>
      {children(id)}
      {hint ? <p className="bst:text-xs bst:text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * The email's own settings — shown when nothing is selected: what the inbox
 * shows (name, subject, preheader), the look (width, colours, font), dark
 * mode and link tracking.
 */
export function EmailSettingsPanel() {
  const { store, messages } = useEditorContext<EmailDocument>();
  const { words, type, locale, sample, brand } = useEmail();
  const w = words.email;
  // As it reads in the language being written: the subject and preheader
  // typed here are that language's.
  const doc = useEditor<EmailDocument, EmailDocument>((state) => state.view);
  const lang = useEditor((state) => state.lang);
  const [tab, setTab] = useState('general');
  const settings = doc.settings;

  const setMeta = (patch: Partial<EmailMeta>, label: string, key: string) => {
    store.getState().updateMeta(patch, label, `email:meta:${key}`);
  };
  const setSettings = (patch: Partial<EmailSettings>, label: string, key: string) => {
    store.getState().updateDocument(
      label,
      (draft) => {
        draft.settings = { ...draft.settings, ...patch };
      },
      `email:settings:${key}`,
    );
  };

  const variables = variablesOf(type).map((variable) => ({
    path: variable.path,
    label: variable.label[locale] ?? variable.label.en ?? variable.path,
  }));
  const context = createRenderContext(doc, {
    assetUrl: () => '',
    brand,
    data: sample,
    locale: lang ?? locale,
  });
  const subjectPreview = fill(doc.meta.subject, context);
  const preheaderPreview = fill(doc.meta.preheader, context);

  const variableButton = (onPick: (path: string) => void) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={w.insertVariable}
          title={w.insertVariable}
          className="bst:flex bst:size-9 bst:shrink-0 bst:items-center bst:justify-center bst:rounded-control bst:border bst:border-input bst:hover:bg-accent bst:[&_svg]:size-4"
        >
          <Braces aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bst:max-h-72 bst:w-64 bst:overflow-y-auto">
        {variables.map((variable) => (
          <DropdownMenuItem
            key={variable.path}
            onSelect={() => {
              onPick(variable.path);
            }}
          >
            <span className="bst:min-w-0 bst:flex-1 bst:truncate">{variable.label}</span>
            <code className="bst:text-[10px] bst:text-muted-foreground">{variable.path}</code>
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
    <div className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:flex bst:h-11 bst:shrink-0 bst:flex-col bst:justify-center bst:border-b bst:border-border bst:px-3">
        <p className="bst:text-sm bst:font-semibold">{w.settings}</p>
        {type ? (
          <p className="bst:truncate bst:text-xs bst:text-muted-foreground">
            {w.type}: {type.label[locale] ?? type.label.en}
          </p>
        ) : null}
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col"
      >
        <TabsList className="bst:mx-3 bst:grid bst:shrink-0 bst:grid-cols-4 bst:gap-0">
          <TabsTrigger value="general" className="bst:px-1 bst:py-1.5 bst:text-xs">
            {w.general}
          </TabsTrigger>
          <TabsTrigger value="style" className="bst:px-1 bst:py-1.5 bst:text-xs">
            {w.style}
          </TabsTrigger>
          <TabsTrigger value="dark" className="bst:px-1 bst:py-1.5 bst:text-xs">
            {w.darkMode}
          </TabsTrigger>
          <TabsTrigger value="tracking" className="bst:px-1 bst:py-1.5 bst:text-xs">
            {w.tracking}
          </TabsTrigger>
        </TabsList>
        <div className="bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <TabsContent value="general" className="bst:space-y-4 bst:p-4">
            <MultilingualToggle />
            {/* What the reader sees before opening it. */}
            <div className="bst:rounded-control bst:border bst:border-border bst:bg-card bst:p-3">
              <p className="bst:mb-2 bst:text-[11px] bst:font-semibold bst:tracking-wider bst:text-muted-foreground bst:uppercase">
                {w.inboxPreview}
              </p>
              <div className="bst:flex bst:gap-3">
                <span className="bst:flex bst:size-9 bst:shrink-0 bst:items-center bst:justify-center bst:rounded-full bst:bg-primary bst:text-sm bst:font-semibold bst:text-primary-foreground">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
                <div className="bst:min-w-0 bst:text-sm">
                  <p className="bst:truncate bst:font-semibold">{brand.name}</p>
                  <p className="bst:truncate">{subjectPreview || '—'}</p>
                  <p className="bst:truncate bst:text-xs bst:text-muted-foreground">
                    {preheaderPreview}
                  </p>
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
                <div className="bst:flex bst:gap-2">
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
                <div className="bst:flex bst:gap-2">
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
              <div className="bst:space-y-1.5">
                <p className="bst:text-xs bst:font-medium">{w.variables}</p>
                <div className="bst:flex bst:flex-wrap bst:gap-1">
                  {variables.map((variable) => (
                    <code
                      key={variable.path}
                      title={variable.label}
                      className="bst:rounded bst:bg-blue-500/10 bst:px-1.5 bst:py-0.5 bst:text-[11px] bst:text-[light-dark(var(--bst-color-blue-700),var(--bst-color-blue-300))]"
                    >
                      {variable.path}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="style" className="bst:space-y-4 bst:p-4">
            <Row label={w.width}>
              {(id) => (
                <NumberStepper
                  id={id}
                  min={480}
                  max={800}
                  step={10}
                  integer
                  suffix="px"
                  decreaseLabel={messages.decrease}
                  increaseLabel={messages.increase}
                  value={settings.width}
                  onChange={(value) => {
                    if (value !== null) setSettings({ width: value }, w.width, 'width');
                  }}
                />
              )}
            </Row>
            <FontField
              value={settings.font}
              nullable={false}
              onChange={(font) => {
                if (font) setSettings({ font: font as EmailSettings['font'] }, w.font, 'font');
              }}
            />
            <Row label={w.fontSize}>
              {(id) => (
                <NumberStepper
                  id={id}
                  min={12}
                  max={22}
                  integer
                  suffix="px"
                  decreaseLabel={messages.decrease}
                  increaseLabel={messages.increase}
                  value={settings.fontSize}
                  onChange={(value) => {
                    if (value !== null) setSettings({ fontSize: value }, w.fontSize, 'fontSize');
                  }}
                />
              )}
            </Row>
            <Row label={w.lineHeight}>
              {(id) => (
                <NumberStepper
                  id={id}
                  min={1.1}
                  max={2.2}
                  step={0.1}
                  decreaseLabel={messages.decrease}
                  increaseLabel={messages.increase}
                  value={settings.lineHeight}
                  onChange={(value) => {
                    if (value !== null) {
                      setSettings({ lineHeight: value }, w.lineHeight, 'lineHeight');
                    }
                  }}
                />
              )}
            </Row>
            {color('backdrop', w.backdrop)}
            {color('background', w.background)}
            {color('textColor', w.textColor)}
            {color('headingColor', w.headingColor)}
            {color('linkColor', w.linkColor)}
          </TabsContent>

          <TabsContent value="dark" className="bst:space-y-4 bst:p-4">
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
                  className="bst:w-full bst:[&>*]:flex-1"
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

          <TabsContent value="tracking" className="bst:space-y-4 bst:p-4">
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
