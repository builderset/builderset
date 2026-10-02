'use client';

import { plainText, type SeoMeta } from '@motors/builder-core';
import {
  DatePicker,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TimePicker,
  ToggleFlag,
} from '@motors/ui';
import { Check, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { MediaField } from './media-field';
import { NumberStepper } from './number-stepper';

/** Recommended lengths — Google truncates around these. */
const SEO_TITLE = { min: 30, max: 60 };
const SEO_DESCRIPTION = { min: 70, max: 160 };

function Meter({ length, min, max }: { length: number; min: number; max: number }) {
  const ok = length >= min && length <= max;
  const width = Math.min(100, (length / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full transition-[width,background-color] duration-200',
            ok ? 'bg-ok' : length > max ? 'bg-destructive' : 'bg-warn',
          )}
          style={{ width: `${String(width)}%` }}
        />
      </div>
      <span className="text-muted-foreground w-14 text-right text-[11px] tabular-nums">
        {length}/{max}
      </span>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children(id)}
      {hint ? <div className="text-muted-foreground text-xs">{hint}</div> : null}
    </div>
  );
}

export function DocumentSettings() {
  const { messages } = useEditorContext();
  const [tab, setTab] = useState('general');
  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-11 shrink-0 flex-col justify-center border-b px-3">
        <p className="text-sm font-semibold">{messages.document}</p>
        <p className="text-muted-foreground text-xs">{messages.nothingSelected}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 grid shrink-0 grid-cols-3 gap-0">
          <TabsTrigger value="general" className="px-2 py-1.5 text-xs">
            {messages.general}
          </TabsTrigger>
          <TabsTrigger value="seo" className="px-2 py-1.5 text-xs">
            {messages.seo}
          </TabsTrigger>
          <TabsTrigger value="publishing" className="px-2 py-1.5 text-xs">
            {messages.publishing}
          </TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="general" className="space-y-4 p-4">
            <General />
          </TabsContent>
          <TabsContent value="seo" className="space-y-4 p-4">
            <Seo />
          </TabsContent>
          <TabsContent value="publishing" className="space-y-4 p-4">
            <Publishing />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function General() {
  const { store, messages, article, setArticle } = useEditorContext();
  const meta = useEditor((state) => state.doc.meta);
  const excerpt = meta.excerpt ?? '';
  const listId = useId();

  return (
    <>
      <FieldRow label={messages.title}>
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
      </FieldRow>
      <FieldRow label={messages.slug} hint={messages.slugFrozen}>
        {(id) => (
          <div
            id={id}
            className="border-border bg-muted/40 text-muted-foreground truncate rounded-[var(--radius-control)] border px-3 py-2 font-mono text-xs"
          >
            /blog/{article.slug}
          </div>
        )}
      </FieldRow>
      <FieldRow
        label={messages.excerpt}
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
      </FieldRow>
      <FieldRow label={messages.category}>
        {(id) => (
          <>
            <Input
              id={id}
              list={listId}
              value={article.category}
              maxLength={80}
              onChange={(event) => {
                setArticle({ category: event.target.value });
              }}
            />
            <datalist id={listId}>
              {article.categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </>
        )}
      </FieldRow>
      <FieldRow label={messages.cover}>
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
      </FieldRow>
      {meta.cover ? (
        <FieldRow label={messages.coverAlt}>
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
        </FieldRow>
      ) : null}
    </>
  );
}

function Check2({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="text-ok size-3.5" aria-hidden="true" />
      ) : (
        <X className="text-muted-foreground size-3.5" aria-hidden="true" />
      )}
      <span className={ok ? '' : 'text-muted-foreground'}>{children}</span>
    </li>
  );
}

function Seo() {
  const { store, messages, article, registry } = useEditorContext();
  const doc = useEditor((state) => state.doc);
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
      {/* The result as a search engine would list it. */}
      <div className="border-border bg-card space-y-0.5 rounded-[var(--radius-control)] border p-3">
        <p className="text-muted-foreground truncate text-xs">
          blejmauto.com › blog › {article.slug}
        </p>
        <p className="line-clamp-1 text-[15px] font-medium text-[#1a0dab] dark:text-[#8ab4f8]">
          {title || messages.untitled}
        </p>
        <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>
      </div>
      <FieldRow
        label={messages.seoTitle}
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
      </FieldRow>
      <FieldRow
        label={messages.seoDescription}
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
      </FieldRow>
      <FieldRow label={messages.focusKeyword}>
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
      </FieldRow>
      {keyword ? (
        <ul className="space-y-1">
          <Check2 ok={title.toLowerCase().includes(keyword)}>{messages.seoTitle}</Check2>
          <Check2 ok={description.toLowerCase().includes(keyword)}>
            {messages.seoDescription}
          </Check2>
          <Check2 ok={firstParagraph.includes(keyword)}>
            {messages.elements.paragraph?.name ?? 'Paragraph'}
          </Check2>
          <Check2 ok={headings.some((heading) => heading.includes(keyword))}>
            {messages.elements.heading?.name ?? 'Heading'}
          </Check2>
        </ul>
      ) : null}
      <FieldRow label={messages.canonical}>
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
      </FieldRow>
      <FieldRow label={messages.cover}>
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
      </FieldRow>
      <ToggleFlag
        title={messages.noindex}
        description={messages.noindexHint}
        checked={seo.noindex === true}
        onCheckedChange={(checked) => {
          setSeo({ noindex: checked }, 'Noindex', 'noindex');
        }}
      />
    </>
  );
}

function Publishing() {
  const { store, messages, article, setArticle } = useEditorContext();
  const readingMinutes = useEditor((state) => state.doc.meta.readingMinutes);
  const date = article.scheduledAt ? article.scheduledAt.slice(0, 10) : '';
  const time = article.scheduledAt ? new Date(article.scheduledAt).toTimeString().slice(0, 5) : '';

  const schedule = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      setArticle({ scheduledAt: null });
      return;
    }
    const when = new Date(`${nextDate}T${nextTime || '09:00'}`);
    setArticle({ scheduledAt: Number.isNaN(when.getTime()) ? null : when.toISOString() });
  };

  return (
    <>
      <ToggleFlag
        title={messages.featured}
        description={messages.featuredHint}
        checked={article.featured}
        onCheckedChange={(checked) => {
          setArticle({ featured: checked });
        }}
      />
      <FieldRow label={messages.readingMinutes} hint={messages.readingMinutesHint}>
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
      </FieldRow>
      {article.status !== 'published' ? (
        <FieldRow label={messages.publishAt} hint={messages.scheduleHint}>
          {(id) => (
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <DatePicker
                id={id}
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(value) => {
                  schedule(value, time);
                }}
              />
              <TimePicker
                value={time}
                onChange={(value) => {
                  schedule(date, value);
                }}
              />
            </div>
          )}
        </FieldRow>
      ) : null}
    </>
  );
}
