import type { CSSProperties } from 'react';
import type { SimpleIcon } from 'simple-icons';

/** Relative luminance of a `RRGGBB` colour, 0 (black) to 1 (white). */
function luminance(hex: string) {
  const linear = (at: number) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(0) + 0.7152 * linear(2) + 0.0722 * linear(4);
}

/**
 * A technology's own logo (from Simple Icons) in its brand colour. A logo whose
 * colour is near black — Express, Next.js, Django — takes the text colour on a
 * dark page instead, where its own would disappear.
 */
export function StackIcon({
  icon,
  size = 22,
  className,
  decorative = false,
}: {
  icon: SimpleIcon;
  size?: number;
  className?: string;
  /** Beside its own name: hidden from screen readers, which would read it twice. */
  decorative?: boolean;
}) {
  const style = {
    '--brand': `#${icon.hex}`,
    '--brand-dark': luminance(icon.hex) < 0.06 ? 'var(--ink)' : `#${icon.hex}`,
  } as CSSProperties;
  return (
    <svg
      className={['lp-techlogo', className].filter(Boolean).join(' ')}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': icon.title })}
    >
      <path d={icon.path} />
    </svg>
  );
}
