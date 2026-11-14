import { type MediaRef, isExternalUrl } from '@builderset/engine';
import type { ButtonSpec } from '../core/elements/fields';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Car,
  Check,
  Download,
  ExternalLink,
  Mail,
  Phone,
  Play,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from './cn';
import type { NodeFrame, RenderContext } from './context';

/**
 * Pieces several elements share: the frame merge, the button, a picture.
 */

/** The node's frame on an element's root, its style winning over `defaults`. */
export function frameProps(frame: NodeFrame, defaults: string) {
  return { ...frame, className: cn(defaults, frame.className) };
}

export const BUTTON_ICON: Record<NonNullable<ButtonSpec['icon']>, LucideIcon> = {
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  download: Download,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  car: Car,
  'external-link': ExternalLink,
  play: Play,
  check: Check,
};

/** The same shapes as the editor's `Button` (`@builderset/engine/ui`), drawn from the same tokens. */
const VARIANT: Record<ButtonSpec['variant'], string> = {
  primary: 'bst:bg-primary bst:text-primary-foreground bst:hover:bg-primary/85',
  secondary: 'bst:bg-secondary bst:text-secondary-foreground bst:hover:bg-secondary/80',
  outline:
    'bst:border bst:border-border bst:bg-transparent bst:text-foreground bst:hover:border-border-strong bst:hover:bg-muted',
  ghost: 'bst:text-foreground bst:hover:bg-muted',
};

const SIZE = {
  sm: 'bst:h-8 bst:px-3 bst:text-[13px]',
  md: 'bst:h-10 bst:px-4 bst:text-sm',
  lg: 'bst:h-12 bst:px-6 bst:text-base',
} as const;

export function ButtonLink({
  button,
  context,
  size = 'md',
  className,
}: {
  /** The button as stored: its label, link, look and icon. An external link opens in a new tab. */
  button: ButtonSpec;
  /** The render context, for the host's link component; in the editor the link goes nowhere. */
  context: RenderContext;
  /** Its height and text size. Default: `'md'`. */
  size?: keyof typeof SIZE;
  /** Added to the link's own classes. */
  className?: string;
}) {
  const Icon = button.icon ? BUTTON_ICON[button.icon] : null;
  const external = isExternalUrl(button.href);
  const { Link } = context;
  return (
    <Link
      href={context.options.editing ? '#' : button.href}
      className={cn(
        'bst:group bst:inline-flex bst:items-center bst:justify-center bst:gap-2 bst:rounded-control bst:font-medium bst:whitespace-nowrap bst:transition-colors',
        VARIANT[button.variant],
        SIZE[size],
        className,
      )}
      {...(button.newTab || external ? { target: '_blank' } : {})}
      {...(external ? { rel: 'noopener noreferrer' } : {})}
    >
      {button.label}
      {Icon ? (
        <Icon
          className="bst:size-4 bst:transition-transform bst:duration-200 bst:group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}

/** A picture through the host's image component, or nothing without media. */
export function Picture({
  media,
  alt,
  context,
  className,
  style,
  sizes,
  eager,
}: {
  /** The stored media; without it nothing is drawn. */
  media: MediaRef | null | undefined;
  /** The image's alternative text; `''` for a decorative one. */
  alt: string;
  /** The render context, for the host's image component and the media's URL. */
  context: RenderContext;
  /** Passed to the image. */
  className?: string;
  /** Inline style, passed to the image. */
  style?: React.CSSProperties;
  /** The image's `sizes` attribute, for picking a responsive source. */
  sizes?: string;
  /** Loads the image straight away rather than lazily — for a picture at the top of the page. */
  eager?: boolean;
}): ReactNode {
  if (!media) return null;
  const { Image } = context;
  return (
    <Image
      src={context.options.resolveMedia(media.key)}
      alt={alt}
      width={media.width}
      height={media.height}
      className={className}
      style={style}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
    />
  );
}

/** "1,3-5" → a set of line numbers. */
export function parseLineSpec(spec: string): Set<number> {
  const lines = new Set<number>();
  for (const part of spec.split(',')) {
    const [from, to] = part.trim().split('-').map(Number);
    if (from === undefined || !Number.isFinite(from)) continue;
    const end = to !== undefined && Number.isFinite(to) ? to : from;
    for (let line = from; line <= end && line - from < 500; line += 1) lines.add(line);
  }
  return lines;
}

export function formatBytes(bytes: number | undefined, locale: string): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${units[unit] ?? 'B'}`;
}
