'use client';

import { plainText } from '@builderset/engine';
import {
  DateTimeField,
  Input,
  Label,
  Textarea,
  ToggleFlag,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@builderset/engine/ui';
import { Check, X } from 'lucide-react';
import { Fragment, useId, useState, type ReactNode } from 'react';

import {
  MediaField,
  MultilingualToggle,
  NumberStepper,
  useEditorContext,
} from '@builderset/engine/editor';

import type { SeoMeta } from '../core';
import { cn } from '../render/cn';
import { useArticle, useArticleFacts } from './hooks';
import {
  breadcrumbOf,
  pathOf,
  useArticleSettings,
  type SettingsField,
  type SettingsTab,
} from './settings';
import { useArticleWords } from './words';

/** Recommended lengths — Google truncates around these. */
const SEO_TITLE = { min: 30, max: 60 };
const SEO_DESCRIPTION = { min: 70, max: 160 };

function Meter({ length, min, max }: { length: number; min: number; max: number }) {
  const ok = length >= min && length <= max;
  const width = Math.min(100, (length / max) * 100);
  return (
    <div className="bst:flex bst:items-center bst:gap-2">
      <div className="bst:h-1 bst:flex-1 bst:overflow-hidden bst:rounded-full bst:bg-muted">
        <div
          className={cn(
            'bst:h-full bst:rounded-full bst:transition-[width,background-color] bst:duration-200',
            ok ? 'bst:bg-ok' : length > max ? 'bst:bg-destructive' : 'bst:bg-warn',
          )}
          style={{ width: `${String(width)}%` }}
        />
      </div>
      <span className="bst:w-14 bst:text-right bst:text-[11px] bst:text-muted-foreground bst:tabular-nums">
        {length}/{max}
      </span>
    </div>
  );
}

/** A labelled field as Document settings draws them — for a host's own sections too. */
export function SettingsFieldRow({
  label,
  hint,
  children,
}: {
  /** The field's label, above it. */
  label: string;
  /** A note under the field. */
  hint?: ReactNode;
  /** Draws the field, given the id the label points at — put it on the input. */
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="bst:space-y-1.5">
      <Label htmlFor={id} className="bst:text-xs bst:font-medium">
        {label}
      </Label>
      {children(id)}
      {hint ? <div className="bst:text-xs bst:text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/**
 * The host's sections for one tab: `at('cover')` those shown above the cover
 * field, `at()` those at the end.
 */
function useSections(tab: SettingsTab) {
  const { settingsSections } = useArticleSettings();
  return (before?: SettingsField): ReactNode =>
    settingsSections
      ?.filter((section) => section.tab === tab && section.before === before)
      .map((section) => <Fragment key={section.id}>{section.render()}</Fragment>);
}

export function DocumentSettings() {
  const { messages } = useEditorContext();
  const words = useArticleWords();
  const [tab, setTab] = useState('general');
  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:flex bst:h-11 bst:shrink-0 bst:flex-col bst:justify-center bst:border-b bst:border-border bst:px-3">
        <p className="bst:text-sm bst:font-semibold">{messages.document}</p>
        <p className="bst:text-xs bst:text-muted-foreground">{words.nothingSelected}</p>
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="bst:flex bst:min-h-0 bst:flex-1 bst:flex-col"
      >
        <TabsList className="bst:mx-3 bst:grid bst:shrink-0 bst:grid-cols-3 bst:gap-0">
          <TabsTrigger value="general" className="bst:px-2 bst:py-1.5 bst:text-xs">
            {messages.general}
          </TabsTrigger>
          <TabsTrigger value="seo" className="bst:px-2 bst:py-1.5 bst:text-xs">
            {messages.seo}
          </TabsTrigger>
          <TabsTrigger value="publishing" className="bst:px-2 bst:py-1.5 bst:text-xs">
            {words.publishing}
          </TabsTrigger>
        </TabsList>
        <div className="bst:min-h-0 bst:flex-1 bst:overflow-y-auto">
          <TabsContent value="general" className="bst:space-y-4 bst:p-4">
            <General />
          </TabsContent>
          <TabsContent value="seo" className="bst:space-y-4 bst:p-4">
            <Seo />
          </TabsContent>
          <TabsContent value="publishing" className="bst:space-y-4 bst:p-4">
            <Publishing />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function General() {
  const { store, messages } = useEditorContext();
  const words = useArticleWords();
  const [article] = useArticleFacts();
  const { siteUrl } = useArticleSettings();
  const at = useSections('general');
  const meta = useArticle((state) => state.view.meta);
  const excerpt = meta.excerpt ?? '';

  return (
    <>
      {at('languages')}
      <MultilingualToggle />
      {at('title')}
      <SettingsFieldRow label={messages.title}>
        {(id) => (
          <Input
            id={id}
            value={meta.title}
            maxLength={200}
            onChange={(event) => {
              store
                .getState()
                .updateMeta({ title: event.target.value }, 'Edit title', 'meta:title');
            }}
          />
        )}
      </SettingsFieldRow>
      {at('slug')}
      <SettingsFieldRow label={words.slug} hint={words.slugFrozen}>
        {(id) => (
          <div
            id={id}
            className="bst:truncate bst:rounded-control bst:border bst:border-border bst:bg-muted/40 bst:px-3 bst:py-2 bst:font-mono bst:text-xs bst:text-muted-foreground"
          >
            {pathOf(siteUrl)}/{article.slug}
          </div>
        )}
      </SettingsFieldRow>
      {at('excerpt')}
      <SettingsFieldRow
        label={words.excerpt}
        hint={<Meter length={excerpt.length} min={60} max={300} />}
      >
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            maxLength={600}
            value={excerpt}
            onChange={(event) => {
              store
                .getState()
                .updateMeta({ excerpt: event.target.value }, 'Edit excerpt', 'meta:excerpt');
            }}
          />
        )}
      </SettingsFieldRow>
      {at('cover')}
      <SettingsFieldRow label={messages.cover}>
        {(id) => (
          <MediaField
            id={id}
            kind="image"
            value={meta.cover?.media ?? null}
            onChange={(media) => {
              store
                .getState()
                .updateMeta(
                  { cover: media ? { media, alt: meta.cover?.alt ?? '' } : null },
                  'Cover image',
                );
            }}
          />
        )}
      </SettingsFieldRow>
      {meta.cover ? at('coverAlt') : null}
      {meta.cover ? (
        <SettingsFieldRow label={words.coverAlt}>
          {(id) => (
            <Input
              id={id}
              maxLength={300}
              value={meta.cover?.alt ?? ''}
              onChange={(event) => {
                const cover = meta.cover;
                if (!cover) return;
                store
                  .getState()
                  .updateMeta(
                    { cover: { ...cover, alt: event.target.value } },
                    'Cover description',
                    'meta:coverAlt',
                  );
              }}
            />
          )}
        </SettingsFieldRow>
      ) : null}
      {at()}
    </>
  );
}

function Check2({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="bst:flex bst:items-center bst:gap-2 bst:text-xs">
      {ok ? (
        <Check className="bst:size-3.5 bst:text-ok" aria-hidden="true" />
      ) : (
        <X className="bst:size-3.5 bst:text-muted-foreground" aria-hidden="true" />
      )}
      <span className={ok ? '' : 'bst:text-muted-foreground'}>{children}</span>
    </li>
  );
}

function Seo() {
  const { store, messages, registry } = useEditorContext();
  const words = useArticleWords();
  const [article] = useArticleFacts();
  const { siteUrl } = useArticleSettings();
  const at = useSections('seo');
  const doc = useArticle((state) => state.view);
  const seo: SeoMeta = doc.meta.seo ?? {};
  const setSeo = (patch: Partial<SeoMeta>, label: string, key: string) => {
    store.getState().updateMeta({ seo: { ...seo, ...patch } }, label, `meta:seo:${key}`);
  };
  const title = seo.title?.trim() ? seo.title : doc.meta.title;
  const description = seo.description?.trim() ? seo.description : (doc.meta.excerpt ?? '');
  const keyword = (seo.focusKeyword ?? '').trim().toLowerCase();
  const text = keyword ? plainText(doc, registry).toLowerCase() : '';
  const firstParagraph = text.slice(0, 600);
  const headings = Object.values(doc.nodes)
    .filter((node) => node.type === 'heading')
    .map((node) =>
      Array.isArray(node.props.text)
        ? (node.props.text as { text: string }[])
            .map((run) => run.text)
            .join('')
            .toLowerCase()
        : '',
    );

  return (
    <>
      {at('preview')}
      {/* The result as a search engine would list it. */}
      <div className="bst:space-y-0.5 bst:rounded-control bst:border bst:border-border bst:bg-card bst:p-3">
        <p className="bst:truncate bst:text-xs bst:text-muted-foreground">
          {[...breadcrumbOf(siteUrl), article.slug].join(' › ')}
        </p>
        <p className="bst:line-clamp-1 bst:text-[15px] bst:font-medium bst:text-[light-dark(#1a0dab,#8ab4f8)]">
          {title || messages.untitled}
        </p>
        <p className="bst:line-clamp-2 bst:text-xs bst:text-muted-foreground">{description}</p>
      </div>
      {at('seoTitle')}
      <SettingsFieldRow
        label={words.seoTitle}
        hint={<Meter length={title.length} min={SEO_TITLE.min} max={SEO_TITLE.max} />}
      >
        {(id) => (
          <Input
            id={id}
            maxLength={70}
            value={seo.title ?? ''}
            placeholder={doc.meta.title}
            onChange={(event) => {
              setSeo({ title: event.target.value }, 'Search title', 'title');
            }}
          />
        )}
      </SettingsFieldRow>
      {at('seoDescription')}
      <SettingsFieldRow
        label={words.seoDescription}
        hint={
          <Meter length={description.length} min={SEO_DESCRIPTION.min} max={SEO_DESCRIPTION.max} />
        }
      >
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            maxLength={170}
            value={seo.description ?? ''}
            placeholder={doc.meta.excerpt}
            onChange={(event) => {
              setSeo({ description: event.target.value }, 'Search description', 'description');
            }}
          />
        )}
      </SettingsFieldRow>
      {at('focusKeyword')}
      <SettingsFieldRow label={words.focusKeyword}>
        {(id) => (
          <Input
            id={id}
            maxLength={60}
            value={seo.focusKeyword ?? ''}
            onChange={(event) => {
              setSeo({ focusKeyword: event.target.value }, 'Focus keyword', 'keyword');
            }}
          />
        )}
      </SettingsFieldRow>
      {keyword ? (
        <ul className="bst:space-y-1">
          <Check2 ok={title.toLowerCase().includes(keyword)}>{words.seoTitle}</Check2>
          <Check2 ok={description.toLowerCase().includes(keyword)}>{words.seoDescription}</Check2>
          <Check2 ok={firstParagraph.includes(keyword)}>
            {messages.elements.paragraph?.name ?? 'Paragraph'}
          </Check2>
          <Check2 ok={headings.some((heading) => heading.includes(keyword))}>
            {messages.elements.heading?.name ?? 'Heading'}
          </Check2>
        </ul>
      ) : null}
      {at('canonical')}
      <SettingsFieldRow label={words.canonical}>
        {(id) => (
          <Input
            id={id}
            inputMode="url"
            placeholder="https://"
            value={seo.canonical ?? ''}
            onChange={(event) => {
              setSeo({ canonical: event.target.value || null }, 'Canonical URL', 'canonical');
            }}
          />
        )}
      </SettingsFieldRow>
      {at('socialImage')}
      <SettingsFieldRow label={messages.cover}>
        {(id) => (
          <MediaField
            id={id}
            kind="image"
            value={seo.image ?? null}
            onChange={(media) => {
              setSeo({ image: media }, 'Social image', 'image');
            }}
          />
        )}
      </SettingsFieldRow>
      {at('noindex')}
      <ToggleFlag
        title={words.noindex}
        description={words.noindexHint}
        checked={seo.noindex === true}
        onCheckedChange={(checked) => {
          setSeo({ noindex: checked }, 'Noindex', 'noindex');
        }}
      />
      {at()}
    </>
  );
}

function Publishing() {
  const { store, messages } = useEditorContext();
  const words = useArticleWords();
  const [article, setArticle] = useArticleFacts();
  const at = useSections('publishing');
  const readingMinutes = useArticle((state) => state.doc.meta.readingMinutes);

  return (
    <>
      {at('readingMinutes')}
      <SettingsFieldRow label={words.readingMinutes} hint={words.readingMinutesHint}>
        {(id) => (
          <NumberStepper
            id={id}
            min={1}
            max={240}
            integer
            nullable
            suffix=" min"
            decreaseLabel={messages.decrease}
            increaseLabel={messages.increase}
            value={readingMinutes ?? null}
            onChange={(value) => {
              store
                .getState()
                .updateMeta({ readingMinutes: value }, 'Reading time', 'meta:reading');
            }}
          />
        )}
      </SettingsFieldRow>
      {article.status !== 'published' ? at('publishAt') : null}
      {article.status !== 'published' ? (
        <SettingsFieldRow label={messages.publishAt} hint={messages.scheduleHint}>
          {(id) => (
            <DateTimeField
              id={id}
              value={article.scheduledAt}
              min={new Date().toISOString()}
              onChange={(scheduledAt) => {
                setArticle({ scheduledAt });
              }}
            />
          )}
        </SettingsFieldRow>
      ) : null}
      {at()}
    </>
  );
}
