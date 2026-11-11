import { isRichTextEmpty } from '@motors/builder-core';
import type {
  audioElement,
  beforeAfterElement,
  embedElement,
  fileElement,
  galleryElement,
  imageElement,
  mediaTextElement,
  PropsOf,
  videoElement,
} from '@motors/builder-core';
import {
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  ImageOff,
  type LucideIcon,
} from 'lucide-react';

import { BeforeAfter } from '../client/before-after';
import { Carousel } from '../client/carousel';
import { EmbedFrame } from '../client/embed-frame';
import { Zoomable } from '../client/zoomable';
import { cn } from '../cn';
import type { ElementRenderProps, RenderContext } from '../context';
import { embedSource, PROVIDER_NAMES } from '../embed-source';
import { fill } from '../messages';
import { formatBytes, frameProps, Picture } from '../parts';
import { RichTextView } from '../rich-text';

const ASPECT = {
  original: '',
  '16:9': 'aspect-video object-cover',
  '4:3': 'aspect-[4/3] object-cover',
  '1:1': 'aspect-square object-cover',
  '3:4': 'aspect-[3/4] object-cover',
} as const;

const SIZE = {
  prose: 'max-w-[var(--maxw-prose,68ch)]',
  wide: 'max-w-5xl',
  full: 'max-w-none',
} as const;

/** What the editor shows where a picture would be. The site shows nothing. */
function MediaPlaceholder({ label }: { label: string }) {
  return (
    <div className="bg-muted text-muted-foreground border-border flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card,0.625rem)] border border-dashed text-sm">
      <ImageOff className="size-6" aria-hidden="true" />
      <span className="max-w-xs truncate px-4">{label}</span>
    </div>
  );
}

export function ImageView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof imageElement>>) {
  if (!props.media) {
    // A pasted picture not yet uploaded is never loaded from its origin on the
    // site — only the editor shows that one is waiting.
    return context.options.editing ? (
      <figure {...frameProps(frame, cn('mx-auto my-9 w-full', SIZE[props.size]))}>
        <MediaPlaceholder label={props.pendingUrl ?? ''} />
      </figure>
    ) : null;
  }
  const picture = (
    <Picture
      media={props.media}
      alt={props.alt}
      context={context}
      sizes="(min-width: 1024px) 68ch, 100vw"
      className={cn(
        'bg-muted h-auto w-full',
        props.rounded && props.size !== 'full' && 'rounded-[var(--radius-card,0.625rem)]',
        ASPECT[props.aspect],
      )}
      style={{ objectPosition: `${String(props.focalX)}% ${String(props.focalY)}%` }}
    />
  );
  const { Link } = context;
  let body = picture;
  if (props.link && !context.options.editing) {
    body = (
      <Link
        href={props.link.href}
        {...(props.link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {picture}
      </Link>
    );
  } else if (props.lightbox && !context.options.editing) {
    body = (
      <Zoomable
        full={<Picture media={props.media} alt={props.alt} context={context} eager />}
        enlargeLabel={context.messages.enlarge}
        closeLabel={context.messages.close}
      >
        {picture}
      </Zoomable>
    );
  }
  const hasCaption = !isRichTextEmpty(props.caption) || props.credit;
  return (
    <figure {...frameProps(frame, cn('mx-auto my-9 w-full', SIZE[props.size]))}>
      {body}
      {hasCaption ? (
        <figcaption className="text-muted-foreground mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm leading-relaxed">
          <span>
            <RichTextView value={props.caption} context={context} />
          </span>
          {props.credit ? <span className="text-xs">{props.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

const GRID = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;
const MASONRY = {
  2: 'columns-2',
  3: 'columns-2 sm:columns-3',
  4: 'columns-2 sm:columns-4',
} as const;

function galleryItem(
  image: PropsOf<typeof galleryElement>['images'][number],
  context: RenderContext,
  lightbox: boolean,
  className: string,
) {
  const picture = (
    <Picture media={image.media} alt={image.alt} context={context} className={className} />
  );
  return lightbox && !context.options.editing ? (
    <Zoomable
      full={<Picture media={image.media} alt={image.alt} context={context} eager />}
      enlargeLabel={context.messages.enlarge}
      closeLabel={context.messages.close}
    >
      {picture}
    </Zoomable>
  ) : (
    picture
  );
}

export function GalleryView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof galleryElement>>) {
  const images = props.images.filter((image) => image.media);
  if (images.length === 0) {
    return context.options.editing ? (
      <div {...frameProps(frame, 'my-9')}>
        <MediaPlaceholder label="" />
      </div>
    ) : null;
  }
  const figures = images.map((image, index) => (
    <figure key={index} className={cn(props.layout === 'masonry' && 'mb-3 break-inside-avoid')}>
      <div className="overflow-hidden rounded-[var(--radius-card,0.625rem)]">
        {galleryItem(
          image,
          context,
          props.lightbox,
          cn(
            'bg-muted w-full',
            props.layout === 'masonry' ? 'h-auto' : 'aspect-[4/3] object-cover',
          ),
        )}
      </div>
      {image.caption ? (
        <figcaption className="text-muted-foreground mt-2 text-xs">{image.caption}</figcaption>
      ) : null}
    </figure>
  ));
  if (props.layout === 'carousel') {
    return (
      <div {...frameProps(frame, 'my-9')}>
        <Carousel
          slides={figures}
          previous={context.messages.previous}
          next={context.messages.next}
        />
      </div>
    );
  }
  return (
    <div
      {...frameProps(
        frame,
        cn(
          'my-9',
          props.layout === 'masonry'
            ? MASONRY[props.columns]
            : cn('grid gap-3', GRID[props.columns]),
        ),
      )}
      style={props.layout === 'masonry' ? { columnGap: '0.75rem', ...frame.style } : frame.style}
    >
      {figures}
    </div>
  );
}

export function BeforeAfterView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof beforeAfterElement>>) {
  if (!props.before.media || !props.after.media) {
    return context.options.editing ? (
      <div {...frameProps(frame, 'my-9')}>
        <MediaPlaceholder label="" />
      </div>
    ) : null;
  }
  return (
    <figure {...frameProps(frame, 'my-9')}>
      <BeforeAfter
        before={<Picture media={props.before.media} alt={props.before.alt} context={context} />}
        after={<Picture media={props.after.media} alt={props.after.alt} context={context} />}
        beforeLabel={props.before.label || context.messages.before}
        afterLabel={props.after.label || context.messages.after}
        handleLabel={context.messages.compareHandle}
        start={props.start}
      />
      {props.caption ? (
        <figcaption className="text-muted-foreground mt-3 text-sm">{props.caption}</figcaption>
      ) : null}
    </figure>
  );
}

const RATIO = {
  '1-1': 'sm:grid-cols-2',
  '1-2': 'sm:grid-cols-[1fr_2fr]',
  '2-1': 'sm:grid-cols-[2fr_1fr]',
} as const;

export function MediaTextView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof mediaTextElement>>) {
  return (
    <div
      {...frameProps(
        frame,
        cn(
          'my-10 grid grid-cols-1 gap-6 sm:gap-10',
          RATIO[props.ratio],
          props.verticalAlign === 'center' ? 'items-center' : 'items-start',
        ),
      )}
    >
      <div className={cn(props.side === 'end' && 'sm:order-last')}>
        {props.media ? (
          <Picture
            media={props.media}
            alt={props.alt}
            context={context}
            className="bg-muted w-full rounded-[var(--radius-card,0.625rem)] object-cover"
          />
        ) : context.options.editing ? (
          <MediaPlaceholder label="" />
        ) : null}
      </div>
      <div className="min-w-0">
        {props.title ? (
          <h3 className="mb-3 text-lg font-semibold tracking-tight">{props.title}</h3>
        ) : null}
        <p className="text-muted-foreground leading-[1.75]">
          <RichTextView value={props.text} context={context} />
        </p>
      </div>
    </div>
  );
}

export function VideoView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof videoElement>>) {
  if (!props.media)
    return context.options.editing ? (
      <div {...frameProps(frame, 'my-9')}>
        <MediaPlaceholder label="" />
      </div>
    ) : null;
  return (
    <figure {...frameProps(frame, 'my-9')}>
      <video
        controls
        preload="metadata"
        loop={props.loop}
        muted={props.muted}
        {...(props.poster ? { poster: context.options.resolveMedia(props.poster.key) } : {})}
        className="bg-foreground aspect-video w-full rounded-[var(--radius-card,0.625rem)]"
        aria-label={props.title || context.messages.video}
      >
        <source
          src={context.options.resolveMedia(props.media.key)}
          {...(props.media.mime ? { type: props.media.mime } : {})}
        />
      </video>
      {props.caption ? (
        <figcaption className="text-muted-foreground mt-3 text-sm">{props.caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function AudioView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof audioElement>>) {
  if (!props.media) return null;
  return (
    <figure
      {...frameProps(
        frame,
        'border-border bg-card my-8 rounded-[var(--radius-card,0.625rem)] border p-4',
      )}
    >
      {props.title ? (
        <p className="text-foreground mb-3 text-sm font-semibold">{props.title}</p>
      ) : null}
      <audio
        controls
        preload="metadata"
        className="w-full"
        aria-label={props.title || context.messages.audio}
      >
        <source
          src={context.options.resolveMedia(props.media.key)}
          {...(props.media.mime ? { type: props.media.mime } : {})}
        />
      </audio>
      {props.caption ? (
        <figcaption className="text-muted-foreground mt-2 text-xs">{props.caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function EmbedView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof embedElement>>) {
  const source = embedSource(props.url);
  const { Link } = context;
  if (!source) {
    // Allowed but not embeddable from this URL alone (a map short link): a
    // plain link to it is the honest fallback.
    if (!props.provider || !props.url) return null;
    return (
      <p {...frameProps(frame, 'my-6')}>
        <Link
          href={context.options.editing ? '#' : props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2"
        >
          {props.title || PROVIDER_NAMES[props.provider]}
        </Link>
      </p>
    );
  }
  const providerName = PROVIDER_NAMES[source.provider];
  return (
    <figure {...frameProps(frame, 'my-9')}>
      <EmbedFrame
        src={source.src}
        title={props.title}
        aspect={source.aspect}
        providerName={providerName}
        notice={fill(context.messages.embedNotice, { provider: providerName })}
        loadLabel={context.messages.loadEmbed}
        inert={context.options.editing}
      />
      {props.caption ? (
        <figcaption className="text-muted-foreground mt-3 text-sm">{props.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function fileIcon(mime: string | undefined): LucideIcon {
  if (!mime) return FileText;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (/zip|compressed|tar/.test(mime)) return FileArchive;
  if (/sheet|excel|csv/.test(mime)) return FileSpreadsheet;
  return FileText;
}

export function FileView({
  props,
  frame,
  context,
}: ElementRenderProps<PropsOf<typeof fileElement>>) {
  if (!props.media) return null;
  const Icon = fileIcon(props.media.mime);
  const size = formatBytes(props.media.size, context.options.locale ?? 'en');
  const href = context.options.editing ? '#' : context.options.resolveMedia(props.media.key);
  return (
    <a
      href={href}
      download={props.media.name ?? true}
      {...frameProps(
        frame,
        'group border-border bg-card hover:border-border-strong my-6 flex items-center gap-4 rounded-[var(--radius-card,0.625rem)] border p-4 transition-colors',
      )}
    >
      <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-[var(--radius-control,0.4rem)]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate font-medium">
          {props.label || props.media.name}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {[props.description, size].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
        <Download
          className="size-4 transition-transform group-hover:translate-y-0.5"
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{context.messages.download}</span>
      </span>
    </a>
  );
}
