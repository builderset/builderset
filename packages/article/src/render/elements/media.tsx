import { isRichTextEmpty, type PropsOf } from '@builderset/engine';
import type {
  audioElement,
  beforeAfterElement,
  embedElement,
  fileElement,
  galleryElement,
  imageElement,
  mediaTextElement,
  videoElement,
} from '../../core/elements/media';
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
  '16:9': 'bst:aspect-video bst:object-cover',
  '4:3': 'bst:aspect-[4/3] bst:object-cover',
  '1:1': 'bst:aspect-square bst:object-cover',
  '3:4': 'bst:aspect-[3/4] bst:object-cover',
} as const;

const SIZE = {
  prose: 'bst:max-w-measure',
  wide: 'bst:max-w-5xl',
  full: 'bst:max-w-none',
} as const;

/** What the editor shows where a picture would be. The site shows nothing. */
function MediaPlaceholder({ label }: { label: string }) {
  return (
    <div className="bst:flex bst:aspect-video bst:w-full bst:flex-col bst:items-center bst:justify-center bst:gap-2 bst:rounded-card bst:border bst:border-dashed bst:border-border bst:bg-muted bst:text-sm bst:text-muted-foreground">
      <ImageOff className="bst:size-6" aria-hidden="true" />
      <span className="bst:max-w-xs bst:truncate bst:px-4">{label}</span>
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
      <figure {...frameProps(frame, cn('bst:mx-auto bst:my-9 bst:w-full', SIZE[props.size]))}>
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
        'bst:h-auto bst:w-full bst:bg-muted',
        props.rounded && props.size !== 'full' && 'bst:rounded-card',
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
    <figure {...frameProps(frame, cn('bst:mx-auto bst:my-9 bst:w-full', SIZE[props.size]))}>
      {body}
      {hasCaption ? (
        <figcaption className="bst:mt-3 bst:flex bst:flex-wrap bst:justify-between bst:gap-x-4 bst:gap-y-1 bst:text-sm bst:leading-relaxed bst:text-muted-foreground">
          <span>
            <RichTextView value={props.caption} context={context} />
          </span>
          {props.credit ? <span className="bst:text-xs">{props.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

const GRID = {
  2: 'bst:grid-cols-2',
  3: 'bst:grid-cols-2 bst:sm:grid-cols-3',
  4: 'bst:grid-cols-2 bst:sm:grid-cols-4',
} as const;
const MASONRY = {
  2: 'bst:columns-2',
  3: 'bst:columns-2 bst:sm:columns-3',
  4: 'bst:columns-2 bst:sm:columns-4',
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
      <div {...frameProps(frame, 'bst:my-9')}>
        <MediaPlaceholder label="" />
      </div>
    ) : null;
  }
  const figures = images.map((image, index) => (
    <figure
      key={index}
      className={cn(props.layout === 'masonry' && 'bst:mb-3 bst:break-inside-avoid')}
    >
      <div className="bst:overflow-hidden bst:rounded-card">
        {galleryItem(
          image,
          context,
          props.lightbox,
          cn(
            'bst:w-full bst:bg-muted',
            props.layout === 'masonry' ? 'bst:h-auto' : 'bst:aspect-[4/3] bst:object-cover',
          ),
        )}
      </div>
      {image.caption ? (
        <figcaption className="bst:mt-2 bst:text-xs bst:text-muted-foreground">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  ));
  if (props.layout === 'carousel') {
    return (
      <div {...frameProps(frame, 'bst:my-9')}>
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
          'bst:my-9',
          props.layout === 'masonry'
            ? MASONRY[props.columns]
            : cn('bst:grid bst:gap-3', GRID[props.columns]),
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
      <div {...frameProps(frame, 'bst:my-9')}>
        <MediaPlaceholder label="" />
      </div>
    ) : null;
  }
  return (
    <figure {...frameProps(frame, 'bst:my-9')}>
      <BeforeAfter
        before={<Picture media={props.before.media} alt={props.before.alt} context={context} />}
        after={<Picture media={props.after.media} alt={props.after.alt} context={context} />}
        beforeLabel={props.before.label || context.messages.before}
        afterLabel={props.after.label || context.messages.after}
        handleLabel={context.messages.compareHandle}
        start={props.start}
      />
      {props.caption ? (
        <figcaption className="bst:mt-3 bst:text-sm bst:text-muted-foreground">
          {props.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const RATIO = {
  '1-1': 'bst:sm:grid-cols-2',
  '1-2': 'bst:sm:grid-cols-[1fr_2fr]',
  '2-1': 'bst:sm:grid-cols-[2fr_1fr]',
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
          'bst:my-10 bst:grid bst:grid-cols-1 bst:gap-6 bst:sm:gap-10',
          RATIO[props.ratio],
          props.verticalAlign === 'center' ? 'bst:items-center' : 'bst:items-start',
        ),
      )}
    >
      <div className={cn(props.side === 'end' && 'bst:sm:order-last')}>
        {props.media ? (
          <Picture
            media={props.media}
            alt={props.alt}
            context={context}
            className="bst:w-full bst:rounded-card bst:bg-muted bst:object-cover"
          />
        ) : context.options.editing ? (
          <MediaPlaceholder label="" />
        ) : null}
      </div>
      <div className="bst:min-w-0">
        {props.title ? (
          <h3 className="bst:mb-3 bst:text-lg bst:font-semibold bst:tracking-tight">
            {props.title}
          </h3>
        ) : null}
        <p className="bst:leading-[1.75] bst:text-muted-foreground">
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
      <div {...frameProps(frame, 'bst:my-9')}>
        <MediaPlaceholder label="" />
      </div>
    ) : null;
  return (
    <figure {...frameProps(frame, 'bst:my-9')}>
      <video
        controls
        preload="metadata"
        loop={props.loop}
        muted={props.muted}
        {...(props.poster ? { poster: context.options.resolveMedia(props.poster.key) } : {})}
        className="bst:aspect-video bst:w-full bst:rounded-card bst:bg-foreground"
        aria-label={props.title || context.messages.video}
      >
        <source
          src={context.options.resolveMedia(props.media.key)}
          {...(props.media.mime ? { type: props.media.mime } : {})}
        />
      </video>
      {props.caption ? (
        <figcaption className="bst:mt-3 bst:text-sm bst:text-muted-foreground">
          {props.caption}
        </figcaption>
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
        'bst:border-border bst:bg-card bst:my-8 bst:rounded-card bst:border bst:p-4',
      )}
    >
      {props.title ? (
        <p className="bst:mb-3 bst:text-sm bst:font-semibold bst:text-foreground">{props.title}</p>
      ) : null}
      <audio
        controls
        preload="metadata"
        className="bst:w-full"
        aria-label={props.title || context.messages.audio}
      >
        <source
          src={context.options.resolveMedia(props.media.key)}
          {...(props.media.mime ? { type: props.media.mime } : {})}
        />
      </audio>
      {props.caption ? (
        <figcaption className="bst:mt-2 bst:text-xs bst:text-muted-foreground">
          {props.caption}
        </figcaption>
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
      <p {...frameProps(frame, 'bst:my-6')}>
        <Link
          href={context.options.editing ? '#' : props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bst:font-medium bst:text-primary bst:underline bst:underline-offset-2"
        >
          {props.title || PROVIDER_NAMES[props.provider]}
        </Link>
      </p>
    );
  }
  const providerName = PROVIDER_NAMES[source.provider];
  return (
    <figure {...frameProps(frame, 'bst:my-9')}>
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
        <figcaption className="bst:mt-3 bst:text-sm bst:text-muted-foreground">
          {props.caption}
        </figcaption>
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
        'bst:group bst:border-border bst:bg-card bst:hover:border-border-strong bst:my-6 bst:flex bst:items-center bst:gap-4 bst:rounded-card bst:border bst:p-4 bst:transition-colors',
      )}
    >
      <span className="bst:grid bst:size-11 bst:shrink-0 bst:place-items-center bst:rounded-control bst:bg-primary/10 bst:text-primary">
        <Icon className="bst:size-5" aria-hidden="true" />
      </span>
      <span className="bst:min-w-0 bst:flex-1">
        <span className="bst:block bst:truncate bst:font-medium bst:text-foreground">
          {props.label || props.media.name}
        </span>
        <span className="bst:block bst:truncate bst:text-xs bst:text-muted-foreground">
          {[props.description, size].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="bst:inline-flex bst:items-center bst:gap-1.5 bst:text-sm bst:font-medium bst:text-foreground">
        <Download
          className="bst:size-4 bst:transition-transform bst:group-hover:translate-y-0.5"
          aria-hidden="true"
        />
        <span className="bst:hidden bst:sm:inline">{context.messages.download}</span>
      </span>
    </a>
  );
}
