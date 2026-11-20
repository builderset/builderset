'use client';

import {
  ColorField,
  MultilingualToggle,
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
  Textarea,
  ToggleFlag,
} from '@builderset/engine/ui';
import { Bell, Check, Copy, FileText, Palette, Send, ShieldCheck, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  FORM_FONTS,
  takesAnswer,
  type FormDocument,
  type FormMeta,
  type FormSettings,
} from '../core';
import { useForm } from './context';
import { Group, Row } from './ui';

/**
 * The form's own settings — shown when nothing is selected, in four tabs:
 *
 * - General: what to fix before publishing, the name, the address, the
 *   languages, the steps' progress, the buttons and how fields are marked.
 * - Submit: what happens after it is sent, the auto-reply, who on the team
 *   hears about it, where the responses also go.
 * - Rules: spam protection, limits, how long responses are kept.
 * - Style: the look, the width, the labels, the sizes, the colour, the font.
 */

type Tab = 'general' | 'submit' | 'rules' | 'style';

/** The panel's changes, each a named undo step that coalesces while typing. */
function useFormSettings() {
  const { store } = useEditorContext<FormDocument>();
  const settings = useEditor<FormSettings, FormDocument>((state) => state.doc.settings);
  const set = <K extends keyof FormSettings>(
    group: K,
    patch: FormSettings[K] extends object ? Partial<FormSettings[K]> : FormSettings[K],
    label: string,
  ) => {
    store.getState().updateDocument(
      label,
      (draft) => {
        const current = draft.settings[group];
        draft.settings[group] = (
          current && typeof current === 'object' && !Array.isArray(current)
            ? { ...current, ...(patch as object) }
            : patch
        ) as FormSettings[K];
      },
      `form:settings:${group}:${label}`,
    );
  };
  const setMeta = (patch: Partial<FormMeta>, label: string) => {
    store.getState().updateMeta(patch, label, `form:meta:${label}`);
  };
  return { settings, set, setMeta };
}

export function FormSettingsPanel() {
  const { messages } = useEditorContext<FormDocument>();
  const { words } = useForm();
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
            { value: 'general', label: words.general, icon: <FileText aria-hidden="true" /> },
            { value: 'submit', label: words.submit, icon: <Send aria-hidden="true" /> },
            { value: 'rules', label: words.rules, icon: <ShieldCheck aria-hidden="true" /> },
            { value: 'style', label: words.style, icon: <Palette aria-hidden="true" /> },
          ]}
          className="bst:mx-4 bst:mt-1 bst:mb-1 bst:shrink-0"
        />
        <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <TabsContent value="general" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <General />
          </TabsContent>
          <TabsContent value="submit" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <Submit />
          </TabsContent>
          <TabsContent value="rules" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <Rules />
          </TabsContent>
          <TabsContent value="style" className="bst:space-y-4 bst:px-4 bst:pt-3.5 bst:pb-6">
            <Style />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function General() {
  const { messages, record, host } = useEditorContext<FormDocument>();
  const { words, publicUrl } = useForm();
  const { settings, set, setMeta } = useFormSettings();
  const issues = useIssues();
  const meta = useEditor<FormMeta, FormDocument>((state) => state.view.meta);
  const steps = useEditor<number, FormDocument>(
    (state) => state.doc.nodes[state.doc.root]?.children?.length ?? 0,
  );
  const prefix = publicUrl ? publicUrl('').replace(/\/$/, '') + '/' : '/';

  return (
    <>
      <ReadyCard
        issues={issues}
        action={record.status === 'published' ? messages.update : messages.publish}
      />
      <Row label={words.name} hint={words.nameHint}>
        {(id) => (
          <Input
            id={id}
            maxLength={120}
            value={meta.name}
            onChange={(event) => {
              setMeta({ name: event.target.value }, words.name);
            }}
          />
        )}
      </Row>
      <Row label={words.address}>
        {(id) => (
          <div className="bst:flex bst:items-center bst:overflow-hidden bst:rounded-control bst:border bst:border-input bst:bg-card bst:focus-within:border-primary/50">
            <span className="bst:max-w-[55%] bst:truncate bst:pl-2.5 bst:font-mono bst:text-[11.5px] bst:text-muted-foreground">
              {prefix}
            </span>
            <input
              id={id}
              value={meta.slug}
              maxLength={80}
              className="bst:h-[34px] bst:min-w-0 bst:flex-1 bst:bg-transparent bst:px-0.5 bst:font-mono bst:text-xs bst:outline-none"
              onChange={(event) => {
                setMeta(
                  { slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') },
                  words.address,
                );
              }}
            />
            {publicUrl ? (
              <button
                type="button"
                aria-label={words.copyLink}
                title={words.copyLink}
                className="bst:grid bst:size-8 bst:shrink-0 bst:cursor-pointer bst:place-items-center bst:text-muted-foreground bst:hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(publicUrl(meta.slug))
                    .then(() => {
                      host.toast('success', words.copied);
                    })
                    .catch(() => undefined);
                }}
              >
                <Copy className="bst:size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )}
      </Row>
      <MultilingualToggle />
      <Row label={`${words.steps} · ${String(steps)}`} hint={words.stepsHint(steps)}>
        {() => (
          <SegmentedControl
            aria-label={words.steps}
            value={settings.progress}
            onValueChange={(progress) => {
              set('progress', progress, words.steps);
            }}
            options={[
              { value: 'bar', label: words.progressBar },
              { value: 'numbers', label: words.progressNumbers },
              { value: 'none', label: words.progressNone },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      <div className="bst:grid bst:grid-cols-2 bst:gap-3">
        {(
          [
            ['submit', words.buttonSubmit],
            ['next', words.buttonNext],
          ] as const
        ).map(([key, label]) => (
          <Row key={key} label={label}>
            {(id) => (
              <Input
                id={id}
                maxLength={60}
                value={settings.buttons[key]}
                onChange={(event) => {
                  set('buttons', { [key]: event.target.value }, label);
                }}
              />
            )}
          </Row>
        ))}
      </div>
      <Row label={words.markFields}>
        {() => (
          <SegmentedControl
            aria-label={words.markFields}
            value={settings.marker}
            onValueChange={(marker) => {
              set('marker', marker, words.markFields);
            }}
            options={[
              { value: 'asterisk', label: words.markRequired },
              { value: 'optional', label: words.markOptional },
              { value: 'both', label: words.markBoth },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      <ToggleFlag
        title={words.saveProgress}
        description={words.saveProgressHint}
        checked={settings.saveProgress}
        onCheckedChange={(on) => {
          set('saveProgress', on, words.saveProgress);
        }}
      />
      <ToggleFlag
        title={words.prefill}
        description={words.prefillHint}
        checked={settings.prefill}
        onCheckedChange={(on) => {
          set('prefill', on, words.prefill);
        }}
      />
    </>
  );
}

/** A row with an icon, words and a switch, opening what it turns on underneath. */
function EmailRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        checked
          ? 'bst:grid bst:gap-3 bst:rounded-card bst:border bst:border-primary/40 bst:bg-card bst:p-3'
          : 'bst:grid bst:gap-3 bst:rounded-card bst:border bst:border-border bst:bg-card bst:p-3'
      }
    >
      <div className="bst:grid bst:grid-cols-[34px_minmax(0,1fr)] bst:items-start bst:gap-3">
        <span
          className={
            checked
              ? 'bst:grid bst:size-[34px] bst:place-items-center bst:rounded-[10px] bst:bg-primary/12 bst:text-primary bst:[&_svg]:size-4'
              : 'bst:grid bst:size-[34px] bst:place-items-center bst:rounded-[10px] bst:bg-accent bst:text-muted-foreground bst:[&_svg]:size-4'
          }
        >
          {icon}
        </span>
        <ToggleFlag
          title={title}
          description={description}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {checked && children ? <div className="bst:grid bst:gap-3">{children}</div> : null}
    </div>
  );
}

function Submit() {
  const { words } = useForm();
  const { settings, set } = useFormSettings();
  const [recipient, setRecipient] = useState('');
  const fields = useEditor<string, FormDocument>((state) =>
    JSON.stringify(
      Object.values(state.doc.nodes)
        .filter((node) => takesAnswer(node))
        .map((node) => ({
          key: node.props.key as string,
          label: node.props.label as string,
          type: node.type,
        })),
    ),
  );
  const answers = JSON.parse(fields) as { key: string; label: string; type: string }[];
  const emailFields = answers.filter((field) => field.type === 'email');
  const after = settings.after;
  const reply = settings.autoReply;

  return (
    <>
      <Row label={words.afterSubmit}>
        {() => (
          <SegmentedControl
            aria-label={words.afterSubmit}
            value={after.mode}
            onValueChange={(mode) => {
              set('after', { mode }, words.afterSubmit);
            }}
            options={[
              { value: 'message', label: words.afterMessage },
              { value: 'redirect', label: words.afterRedirect },
              { value: 'both', label: words.afterBoth },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      {after.mode !== 'redirect' ? (
        <>
          <Row label={words.messageTitle}>
            {(id) => (
              <Input
                id={id}
                maxLength={160}
                value={after.title}
                onChange={(event) => {
                  set('after', { title: event.target.value }, words.messageTitle);
                }}
              />
            )}
          </Row>
          <Row label={words.message} hint={words.messageHint}>
            {(id) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={1000}
                value={after.message}
                onChange={(event) => {
                  set('after', { message: event.target.value }, words.message);
                }}
              />
            )}
          </Row>
          {/* What the visitor sees, as they will see it. */}
          <div className="bst:grid bst:justify-items-center bst:gap-1.5 bst:rounded-card bst:border bst:border-dashed bst:border-border-strong bst:px-3.5 bst:py-4 bst:text-center">
            <span className="bst:grid bst:size-10 bst:place-items-center bst:rounded-full bst:bg-ok/12 bst:text-ok">
              <Check className="bst:size-5" aria-hidden="true" />
            </span>
            <b className="bst:text-sm">{after.title}</b>
            <small className="bst:text-xs bst:whitespace-pre-line bst:text-muted-foreground">
              {after.message}
            </small>
          </div>
        </>
      ) : null}
      {after.mode !== 'message' ? (
        <Row
          label={words.pageAddress}
          hint={after.mode === 'both' ? words.redirectHint : undefined}
        >
          {(id) => (
            <Input
              id={id}
              value={after.redirectUrl}
              placeholder="/thank-you"
              className="bst:font-mono bst:text-xs"
              onChange={(event) => {
                set('after', { redirectUrl: event.target.value }, words.pageAddress);
              }}
            />
          )}
        </Row>
      ) : null}

      <Group title={words.emails}>
        <p className="bst:-mt-2 bst:text-xs bst:text-muted-foreground">{words.emailsHint}</p>
        <EmailRow
          icon={<Send aria-hidden="true" />}
          title={words.autoReply}
          description={words.autoReplyHint}
          checked={reply.enabled}
          onCheckedChange={(enabled) => {
            set('autoReply', { enabled }, words.autoReply);
          }}
        >
          {emailFields.length === 0 ? (
            <p className="bst:rounded-control bst:bg-warn/12 bst:px-3 bst:py-2 bst:text-xs bst:text-warn">
              {words.noEmailField}
            </p>
          ) : (
            <Row label={words.sendTo}>
              {(id) => (
                <Select
                  id={id}
                  value={reply.to}
                  onValueChange={(to) => {
                    set('autoReply', { to }, words.sendTo);
                  }}
                  options={emailFields.map((field) => ({
                    value: field.key,
                    label: field.label || field.key,
                  }))}
                />
              )}
            </Row>
          )}
          <div className="bst:grid bst:grid-cols-2 bst:gap-2">
            {(
              [
                ['fromName', words.fromName],
                ['replyTo', words.replyTo],
              ] as const
            ).map(([key, label]) => (
              <Row key={key} label={label}>
                {(id) => (
                  <Input
                    id={id}
                    value={reply[key]}
                    onChange={(event) => {
                      set('autoReply', { [key]: event.target.value }, label);
                    }}
                  />
                )}
              </Row>
            ))}
          </div>
          <AutoReplyText answers={answers} />
        </EmailRow>
        <EmailRow
          icon={<Bell aria-hidden="true" />}
          title={words.team}
          description={
            settings.notify.enabled
              ? words.teamHint(settings.notify.recipients.length)
              : words.teamOff
          }
          checked={settings.notify.enabled}
          onCheckedChange={(enabled) => {
            set('notify', { enabled }, words.team);
          }}
        >
          <div className="bst:flex bst:min-h-[34px] bst:flex-wrap bst:items-center bst:gap-1.5 bst:rounded-control bst:border bst:border-input bst:bg-card bst:p-1">
            {settings.notify.recipients.map((address, index) => (
              <span
                key={`${address}-${String(index)}`}
                className="bst:inline-flex bst:h-6 bst:items-center bst:gap-1 bst:rounded-md bst:border bst:border-border bst:bg-background bst:pr-1 bst:pl-2 bst:text-xs"
              >
                {address}
                <button
                  type="button"
                  aria-label={`${address} ×`}
                  className="bst:grid bst:size-[18px] bst:cursor-pointer bst:place-items-center bst:rounded bst:text-muted-foreground bst:hover:bg-accent"
                  onClick={() => {
                    set(
                      'notify',
                      { recipients: settings.notify.recipients.filter((_, at) => at !== index) },
                      words.team,
                    );
                  }}
                >
                  <X className="bst:size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              value={recipient}
              placeholder={words.addRecipient}
              aria-label={words.addRecipient}
              className="bst:h-6 bst:min-w-[60px] bst:flex-1 bst:bg-transparent bst:px-1 bst:text-xs bst:outline-none"
              onChange={(event) => {
                setRecipient(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && recipient.trim()) {
                  event.preventDefault();
                  set(
                    'notify',
                    { recipients: [...settings.notify.recipients, recipient.trim()] },
                    words.team,
                  );
                  setRecipient('');
                }
              }}
            />
          </div>
        </EmailRow>
      </Group>

      <Row label={words.webhook} hint={words.webhookHint}>
        {(id) => (
          <Input
            id={id}
            value={settings.webhook}
            placeholder="https://"
            className="bst:font-mono bst:text-xs"
            onChange={(event) => {
              set('webhook', event.target.value, words.webhook);
            }}
          />
        )}
      </Row>
    </>
  );
}

/** The auto-reply's subject and body, with the form's answers to insert as `{{key}}`. */
function AutoReplyText({ answers }: { answers: { key: string; label: string }[] }) {
  const { words } = useForm();
  const { settings, set } = useFormSettings();
  const [focus, setFocus] = useState<'subject' | 'body'>('body');
  const reply = settings.autoReply;
  const insert = (key: string) => {
    const element = document.getElementById(`form-autoreply-${focus}`) as HTMLInputElement | null;
    const current = reply[focus];
    const at = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? at;
    const token = `{{${key}}}`;
    set(
      'autoReply',
      { [focus]: current.slice(0, at) + token + current.slice(end) },
      words.autoReply,
    );
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  return (
    <>
      <Row label={words.subject}>
        {() => (
          <Input
            id="form-autoreply-subject"
            value={reply.subject}
            maxLength={200}
            onFocus={() => {
              setFocus('subject');
            }}
            onChange={(event) => {
              set('autoReply', { subject: event.target.value }, words.subject);
            }}
          />
        )}
      </Row>
      <Row label={words.body}>
        {() => (
          <Textarea
            id="form-autoreply-body"
            rows={6}
            value={reply.body}
            maxLength={5000}
            onFocus={() => {
              setFocus('body');
            }}
            onChange={(event) => {
              set('autoReply', { body: event.target.value }, words.body);
            }}
          />
        )}
      </Row>
      <div className="bst:grid bst:gap-1.5">
        <div className="bst:flex bst:flex-wrap bst:gap-1">
          {answers.map((answer) => (
            <Button
              key={answer.key}
              type="button"
              variant="outline"
              size="xs"
              title={answer.label}
              className="bst:font-mono bst:text-[11px] bst:text-primary"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                insert(answer.key);
              }}
            >
              {`{{${answer.key}}}`}
            </Button>
          ))}
        </div>
        <p className="bst:text-xs bst:text-muted-foreground">{words.insertAnswer}</p>
      </div>
    </>
  );
}

function Rules() {
  const { words } = useForm();
  const { settings, set } = useFormSettings();
  const spam = settings.spam;
  const limits = settings.limits;
  return (
    <>
      <Row label={words.captcha} hint={words.captchaHint[spam.captcha]}>
        {() => (
          <SegmentedControl
            aria-label={words.captcha}
            value={spam.captcha}
            onValueChange={(captcha) => {
              set('spam', { captcha }, words.captcha);
            }}
            options={[
              { value: 'off', label: words.captchaOff },
              { value: 'invisible', label: words.captchaInvisible },
              { value: 'checkbox', label: words.captchaCheckbox },
            ]}
            className="bst:w-full bst:[&>*]:flex-1"
          />
        )}
      </Row>
      {(
        [
          ['honeypot', words.honeypot, words.honeypotHint],
          ['blockDisposable', words.blockDisposable, words.blockDisposableHint],
          ['rateLimit', words.rateLimit, words.rateLimitHint],
        ] as const
      ).map(([key, title, description]) => (
        <ToggleFlag
          key={key}
          title={title}
          description={description}
          checked={spam[key]}
          onCheckedChange={(on) => {
            set('spam', { [key]: on }, title);
          }}
        />
      ))}
      <Group title={words.limits}>
        <Row label={words.oncePer}>
          {(id) => (
            <Select
              id={id}
              value={limits.oncePer}
              onValueChange={(oncePer) => {
                set(
                  'limits',
                  { oncePer: oncePer as FormSettings['limits']['oncePer'] },
                  words.oncePer,
                );
              }}
              options={[
                { value: 'none', label: words.oncePerNone },
                { value: 'email', label: words.oncePerEmail },
                { value: 'phone', label: words.oncePerPhone },
                { value: 'device', label: words.oncePerDevice },
              ]}
            />
          )}
        </Row>
        <Row label={words.maxResponses} hint={words.maxResponsesHint}>
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              placeholder={words.noLimit}
              value={limits.maxResponses === null ? '' : String(limits.maxResponses)}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                set(
                  'limits',
                  { maxResponses: Number.isFinite(value) && value > 0 ? value : null },
                  words.maxResponses,
                );
              }}
            />
          )}
        </Row>
        <div className="bst:grid bst:grid-cols-2 bst:gap-2">
          {(
            [
              ['opensAt', words.opens],
              ['closesAt', words.closes],
            ] as const
          ).map(([key, label]) => (
            <Row key={key} label={label}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={limits[key] ?? ''}
                  onChange={(event) => {
                    set('limits', { [key]: event.target.value || null }, label);
                  }}
                />
              )}
            </Row>
          ))}
        </div>
        <Row label={words.closedMessage}>
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={limits.closedMessage}
              onChange={(event) => {
                set('limits', { closedMessage: event.target.value }, words.closedMessage);
              }}
            />
          )}
        </Row>
      </Group>
      <Group title={words.privacy}>
        <Row label={words.keepFor}>
          {(id) => (
            <Select
              id={id}
              value={String(settings.privacy.keepMonths)}
              onValueChange={(value) => {
                set(
                  'privacy',
                  { keepMonths: Number(value) as FormSettings['privacy']['keepMonths'] },
                  words.keepFor,
                );
              }}
              options={[
                ...[3, 6, 12, 24].map((months) => ({
                  value: String(months),
                  label: words.months(months),
                })),
                { value: '0', label: words.forever },
              ]}
            />
          )}
        </Row>
        <ToggleFlag
          title={words.storeIp}
          description={words.storeIpHint}
          checked={settings.privacy.storeIp}
          onCheckedChange={(storeIp) => {
            set('privacy', { storeIp }, words.storeIp);
          }}
        />
      </Group>
    </>
  );
}

const ACCENTS = ['#2f5cf0', '#e06a1b', '#111827', '#16a34a', '#7c3aed', '#db2777'];

function Style() {
  const { words } = useForm();
  const { settings, set } = useFormSettings();
  const style = settings.style;
  const segmented = <V extends string>(
    label: string,
    value: V,
    options: { value: V; label: ReactNode; ariaLabel?: string }[],
    onChange: (value: V) => void,
  ) => (
    <Row label={label}>
      {() => (
        <SegmentedControl
          aria-label={label}
          value={value}
          onValueChange={onChange}
          options={options}
          className="bst:w-full bst:[&>*]:flex-1"
        />
      )}
    </Row>
  );
  return (
    <>
      {segmented(
        words.look,
        style.look,
        [
          { value: 'light', label: words.lookLight },
          { value: 'dark', label: words.lookDark },
          { value: 'warm', label: words.lookWarm },
        ],
        (look) => {
          set('style', { look }, words.look);
        },
      )}
      {segmented(
        words.width,
        String(style.width),
        [
          { value: '480', label: words.narrow },
          { value: '640', label: words.medium },
          { value: '800', label: words.wide },
        ],
        (width) => {
          set('style', { width: Number(width) }, words.width);
        },
      )}
      {segmented(
        words.labels,
        style.labels,
        [
          { value: 'top', label: words.labelsTop },
          { value: 'left', label: words.labelsLeft },
          { value: 'inside', label: words.labelsInside },
        ],
        (labels) => {
          set('style', { labels }, words.labels);
        },
      )}
      <div className="bst:grid bst:grid-cols-2 bst:gap-3">
        {segmented(
          words.fieldSize,
          style.size,
          [
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
            { value: 'l', label: 'L' },
          ],
          (size) => {
            set('style', { size }, words.fieldSize);
          },
        )}
        {segmented(
          words.corners,
          style.radius,
          (['none', 's', 'm', 'l'] as const).map((radius) => ({
            value: radius,
            ariaLabel: radius,
            label: (
              <span
                aria-hidden="true"
                className="bst:block bst:size-3.5 bst:border-t-2 bst:border-l-2 bst:border-current"
                style={{ borderTopLeftRadius: { none: 0, s: 3, m: 6, l: 10 }[radius] }}
              />
            ),
          })),
          (radius) => {
            set('style', { radius }, words.corners);
          },
        )}
      </div>
      <Row label={words.accent}>
        {() => (
          <div className="bst:grid bst:gap-2">
            <div className="bst:flex bst:flex-wrap bst:gap-1.5">
              {ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  aria-label={accent}
                  aria-pressed={style.accent.toLowerCase() === accent}
                  className="bst:size-[26px] bst:cursor-pointer bst:rounded-[7px] bst:border bst:border-border-strong bst:transition-transform bst:hover:scale-110 bst:aria-pressed:shadow-[0_0_0_2px_var(--builderset-background,#fff),0_0_0_4px_var(--builderset-primary,#2f5cf0)]"
                  style={{ background: accent }}
                  onClick={() => {
                    set('style', { accent }, words.accent);
                  }}
                />
              ))}
            </div>
            <ColorField
              name={words.accent}
              value={style.accent}
              nullable={false}
              onChange={(accent) => {
                if (accent && /^#[0-9a-f]{6}$/i.test(accent))
                  set('style', { accent }, words.accent);
              }}
            />
          </div>
        )}
      </Row>
      <Row label={words.font}>
        {(id) => (
          <Select
            id={id}
            value={style.font}
            onValueChange={(font) => {
              set('style', { font: font as FormSettings['style']['font'] }, words.font);
            }}
            options={Object.entries(FORM_FONTS).map(([value, font]) => ({
              value,
              label: font.label,
            }))}
          />
        )}
      </Row>
      <ToggleFlag
        title={words.fullWidthButtons}
        description={words.fullWidthButtonsHint}
        checked={style.fullWidthButtons}
        onCheckedChange={(fullWidthButtons) => {
          set('style', { fullWidthButtons }, words.fullWidthButtons);
        }}
      />
    </>
  );
}
