'use client';

import {
  ColorField,
  FontField,
  MultilingualToggle,
  NumberStepper,
  ReadyCard,
  useEditor,
  useEditorContext,
  useIssues,
} from '@builderset/engine/editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  SegmentedControl,
  SegmentedTabs,
  Tabs,
  TabsContent,
  ToggleFlag,
} from '@builderset/engine/ui';
import { Braces, Database, FileText, Link2, Moon, Palette } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';

import {
  plainOf,
  variablesOf,
  type EmailDocument,
  type EmailMeta,
  type EmailRichText,
  type EmailSettings,
} from '../core';
import { createContext as createRenderContext, fill } from '../render';
import { useEmail } from './context';

/**
 * The email's own settings — shown when nothing is selected, in four tabs:
 *
 * - General: what to fix before it goes out, its languages, how it reads in
 *   the inbox (as written, or with the example data), the name, subject and
 *   preheader.
 * - Style: width, fonts and colours.
 * - Dark: the dark-mode palette, and the canvas's dark preview.
 * - Tracking: UTM parameters, and every link the email holds.
 */

type Tab = 'general' | 'style' | 'dark' | 'tracking';

function Row({
  label,
  hint,
  aside,
  children,
}: {
  label: string;
  hint?: ReactNode;
  aside?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="bst:space-y-1.5">
      <div className="bst:flex bst:items-center bst:justify-between bst:gap-2">
        <Label htmlFor={id} className="bst:min-w-0 bst:text-xs bst:font-medium">
          {label}
        </Label>
        {aside}
      </div>
      {children(id)}
      {hint ? <p className="bst:text-xs bst:text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** The panel's changes go through these, each one a named, coalescing undo step. */
function useEmailSettings() {
  const { store } = useEditorContext<EmailDocument>();
  return {
    setMeta: (patch: Partial<EmailMeta>, label: string, key: string) => {
      store.getState().updateMeta(patch, label, `email:meta:${key}`);
    },
    setSettings: (patch: Partial<EmailSettings>, label: string, key: string) => {
      store.getState().updateDocument(
        label,
        (draft) => {
          draft.settings = { ...draft.settings, ...patch };
        },
        `email:settings:${key}`,
      );
    },
  };
}

export function EmailSettingsPanel() {
  const { messages } = useEditorContext<EmailDocument>();
  const { words } = useEmail();
  const w = words.email;
  const [tab, setTab] = useState<Tab>('general');
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
          aria-label={messages.document}
          stacked
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'general', label: w.general, icon: <FileText aria-hidden="true" /> },
            { value: 'style', label: w.style, icon: <Palette aria-hidden="true" /> },
            { value: 'dark', label: w.darkMode, icon: <Moon aria-hidden="true" /> },
            { value: 'tracking', label: w.tracking, icon: <Link2 aria-hidden="true" /> },
          ]}
          className="bst:mx-4 bst:mt-1 bst:mb-1 bst:shrink-0"
        />
        <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <TabsContent value="general" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <General />
          </TabsContent>
          <TabsContent value="style" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <Style />
          </TabsContent>
          <TabsContent value="dark" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <Dark />
          </TabsContent>
          <TabsContent value="tracking" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <Tracking />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function General() {
  const { messages, record, store } = useEditorContext<EmailDocument>();
  const { words, type, locale, sample, brand, view, setView } = useEmail();
  const { setMeta } = useEmailSettings();
  const w = words.email;
  const issues = useIssues();
  // As it reads in the language being written: the subject and preheader
  // typed here are that language's.
  const doc = useEditor<EmailDocument, EmailDocument>((state) => state.view);
  const lang = useEditor((state) => state.lang);

  const variables = useMemo(
    () =>
      variablesOf(type).map((variable) => ({
        path: variable.path,
        label: variable.label[locale] ?? variable.label.en ?? variable.path,
      })),
    [type, locale],
  );
  const context = createRenderContext(doc, {
    assetUrl: () => '',
    brand,
    data: sample,
    locale: lang ?? locale,
  });
  const filled = {
    subject: fill(doc.meta.subject, context),
    preheader: fill(doc.meta.preheader, context),
  };
  const shown = (key: 'subject' | 'preheader') => (view.exampleData ? filled[key] : doc.meta[key]);

  /** A field's own "insert a variable" menu: the variable goes at the end. */
  const variableMenu = (key: 'subject' | 'preheader', label: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={w.insertVariable}
          title={w.insertVariable}
          className="bld-focus bst:flex bst:size-[34px] bst:shrink-0 bst:cursor-pointer bst:items-center bst:justify-center bst:rounded-control bst:border bst:border-input bst:bg-card bst:transition-colors bst:hover:bg-accent bst:[&_svg]:size-4"
        >
          <Braces aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bst:max-h-72 bst:w-64 bst:overflow-y-auto">
        {variables.map((variable) => (
          <DropdownMenuItem
            key={variable.path}
            onSelect={() => {
              setMeta({ [key]: `${doc.meta[key]} {{ ${variable.path} }}`.trimStart() }, label, key);
            }}
          >
            <span className="bst:min-w-0 bst:flex-1 bst:truncate">{variable.label}</span>
            <code className="bst:text-[10px] bst:text-muted-foreground">{variable.path}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <ReadyCard
        issues={issues}
        action={record.status === 'published' ? messages.update : messages.publish}
      />
      <MultilingualToggle />

      {/* What the reader sees before opening it. */}
      <Row
        label={w.inboxPreview}
        aside={
          // Fixed width: the panel's styles stretch a segmented control to the row.
          <div className="bst:w-[76px] bst:shrink-0">
            <SegmentedControl
              aria-label={w.inboxPreview}
              value={view.exampleData ? 'data' : 'variables'}
              onValueChange={(value) => {
                setView({ exampleData: value === 'data' });
              }}
              options={[
                {
                  value: 'variables',
                  label: <Braces className="bst:size-3.5" aria-hidden="true" />,
                  ariaLabel: w.showVariables,
                },
                {
                  value: 'data',
                  label: <Database className="bst:size-3.5" aria-hidden="true" />,
                  ariaLabel: w.exampleData,
                },
              ]}
              className="bst:h-7 bst:w-full bst:[&_button]:h-6 bst:[&_button]:px-0"
            />
          </div>
        }
      >
        {() => (
          <div className="bst:flex bst:gap-3 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-3">
            <span
              aria-hidden="true"
              className="bst:flex bst:size-9 bst:shrink-0 bst:items-center bst:justify-center bst:rounded-full bst:text-sm bst:font-semibold bst:text-white"
              style={{ background: brand.colors.primary ?? '#2a5bd7' }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </span>
            <div className="bst:min-w-0 bst:flex-1 bst:text-[13px]">
              <p className="bst:flex bst:items-baseline bst:justify-between bst:gap-2">
                <b className="bst:truncate bst:font-semibold">{brand.name}</b>
                <small className="bst:shrink-0 bst:text-[11px] bst:text-muted-foreground">
                  14:12
                </small>
              </p>
              <p className="bst:truncate bst:font-medium">{shown('subject') || '—'}</p>
              <p className="bst:truncate bst:text-xs bst:text-muted-foreground">
                {shown('preheader')}
              </p>
            </div>
          </div>
        )}
      </Row>

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
      {type ? (
        <p className="bst:-mt-2 bst:text-xs bst:text-muted-foreground">
          {w.type}: <b className="bst:font-medium">{type.label[locale] ?? type.label.en}</b>
        </p>
      ) : null}
      <Row
        label={w.subject}
        hint={
          <>
            {w.subjectHint} {w.characters(filled.subject.length)}
          </>
        }
      >
        {(id) => (
          <div className="bst:flex bst:gap-1.5">
            <Input
              id={id}
              maxLength={200}
              value={doc.meta.subject}
              onChange={(event) => {
                setMeta({ subject: event.target.value }, w.subject, 'subject');
              }}
            />
            {variableMenu('subject', w.subject)}
          </div>
        )}
      </Row>
      <Row label={w.preheader} hint={w.preheaderHint}>
        {(id) => (
          <div className="bst:flex bst:gap-1.5">
            <Input
              id={id}
              maxLength={250}
              value={doc.meta.preheader}
              onChange={(event) => {
                setMeta({ preheader: event.target.value }, w.preheader, 'preheader');
              }}
            />
            {variableMenu('preheader', w.preheader)}
          </div>
        )}
      </Row>
      <button
        type="button"
        onClick={() => {
          const state = store.getState();
          state.setLeftTab('variables');
          state.toggleLeft(true);
        }}
        className="bld-focus bst:inline-flex bst:h-8 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-control bst:border bst:border-border bst:bg-card bst:px-2.5 bst:text-xs bst:font-medium bst:transition-colors bst:hover:bg-accent"
      >
        <Braces className="bst:size-3.5" aria-hidden="true" />
        {w.allVariables(variables.length)}
      </button>
    </>
  );
}

function Style() {
  const { messages } = useEditorContext<EmailDocument>();
  const { words } = useEmail();
  const { setSettings } = useEmailSettings();
  const w = words.email;
  const settings = useEditor<EmailSettings, EmailDocument>((state) => state.doc.settings);

  const color = (
    key: 'backdrop' | 'background' | 'textColor' | 'headingColor' | 'linkColor',
    label: string,
  ) => (
    <ColorField
      key={key}
      name={label}
      value={settings[key]}
      nullable={false}
      onChange={(value) => {
        if (value) setSettings({ [key]: value }, label, key);
      }}
    />
  );

  return (
    <>
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
      <div className="bst:grid bst:grid-cols-2 bst:gap-3">
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
      </div>
      {color('backdrop', w.backdrop)}
      {color('background', w.background)}
      {color('textColor', w.textColor)}
      {color('headingColor', w.headingColor)}
      {color('linkColor', w.linkColor)}
    </>
  );
}

function Dark() {
  const { words, view, setView } = useEmail();
  const { setSettings } = useEmailSettings();
  const w = words.email;
  const settings = useEditor<EmailSettings, EmailDocument>((state) => state.doc.settings);
  return (
    <>
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
      <ToggleFlag
        title={w.darkPreview}
        description={w.darkPreviewHint}
        checked={view.dark}
        onCheckedChange={(dark) => {
          setView({ dark });
        }}
      />
      {settings.darkMode === 'custom'
        ? (
            [
              ['backdrop', w.backdrop],
              ['background', w.background],
              ['text', w.textColor],
              ['heading', w.headingColor],
              ['link', w.linkColor],
            ] as const
          ).map(([key, label]) => (
            <ColorField
              key={key}
              name={label}
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
    </>
  );
}

/** Every link in the email: which block, its words, where it goes. */
function useLinks(): { id: string; label: string; href: string }[] {
  const { registry, messages } = useEditorContext<EmailDocument>();
  const doc = useEditor<EmailDocument, EmailDocument>((state) => state.doc);
  return useMemo(() => {
    const out: { id: string; label: string; href: string }[] = [];
    const walk = (id: string) => {
      const node = doc.nodes[id];
      if (!node) return;
      const definition = registry.get(node.type);
      const hrefs = (definition?.links?.(node.props as never) ?? []).filter(Boolean);
      const words =
        typeof node.props.label === 'string'
          ? node.props.label
          : plainOf(node.props.text as EmailRichText | undefined);
      for (const href of hrefs) {
        out.push({
          id: `${id}:${href}`,
          label: words.trim() || (messages.elements[node.type]?.name ?? node.type),
          href,
        });
      }
      node.children?.forEach(walk);
    };
    walk(doc.root);
    return out;
  }, [doc, registry, messages]);
}

function Tracking() {
  const { words } = useEmail();
  const { setSettings } = useEmailSettings();
  const w = words.email;
  const settings = useEditor<EmailSettings, EmailDocument>((state) => state.doc.settings);
  const links = useLinks();
  const utm = settings.utm;
  const suffix = utm.enabled
    ? `?utm_source=${utm.source}&utm_medium=${utm.medium}${utm.campaign ? `&utm_campaign=${utm.campaign}` : ''}`
    : '';
  return (
    <>
      <ToggleFlag
        title={w.utmEnabled}
        description={w.utmHint}
        checked={utm.enabled}
        onCheckedChange={(enabled) => {
          setSettings({ utm: { ...utm, enabled } }, w.tracking, 'utm:enabled');
        }}
      />
      {utm.enabled
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
                  value={utm[key]}
                  maxLength={80}
                  className="bst:font-mono bst:text-xs"
                  onChange={(event) => {
                    setSettings(
                      { utm: { ...utm, [key]: event.target.value } },
                      label,
                      `utm:${key}`,
                    );
                  }}
                />
              )}
            </Row>
          ))
        : null}
      <div className="bst:space-y-1.5">
        <p className="bst:flex bst:items-center bst:gap-1.5 bst:text-xs bst:font-medium">
          {w.linksInEmail}
          <em className="bst:font-normal bst:text-muted-foreground bst:not-italic">
            {links.length}
          </em>
        </p>
        {links.length ? (
          <ul className="bst:grid bst:gap-1">
            {links.map((link) => (
              <li
                key={link.id}
                className="bst:grid bst:gap-0.5 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-2"
              >
                <b className="bst:truncate bst:text-[12.5px] bst:font-semibold">{link.label}</b>
                <code className="bst:font-mono bst:text-[11px] bst:break-all bst:text-muted-foreground">
                  {link.href}
                  {/* Only external links get the parameters; variables may be anything. */}
                  {suffix && /^https?:/.test(link.href) ? (
                    <em className="bst:text-primary bst:not-italic">{suffix}</em>
                  ) : null}
                </code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bst:text-xs bst:text-muted-foreground">{w.noLinks}</p>
        )}
      </div>
    </>
  );
}
