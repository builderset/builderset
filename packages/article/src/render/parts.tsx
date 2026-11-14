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
  primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline:
    'border border-border bg-transparent text-foreground hover:border-border-strong hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
};

const SIZE = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

export function ButtonLink({
  button,
  context,
  size = 'md',
  className,
}: {
  button: ButtonSpec;
  context: RenderContext;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const Icon = button.icon ? BUTTON_ICON[button.icon] : null;
  const external = isExternalUrl(button.href);
  const { Link } = context;
  return (
    <Link
      href={context.options.editing ? '#' : button.href}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-[var(--radius-control,0.4rem)] font-medium whitespace-nowrap transition-colors',
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
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
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
  media: MediaRef | null | undefined;
  alt: string;
  context: RenderContext;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
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
