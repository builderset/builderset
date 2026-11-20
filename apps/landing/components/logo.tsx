/**
 * Builderset's mark, as on the docs site: three blocks, two in ink and one in
 * the accent — the one being placed.
 */
export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className ? `lp-mark ${className}` : 'lp-mark'}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Builderset"
    >
      <rect className="b1" x="4" y="4" width="11" height="11" rx="2.5" />
      <rect className="b2" x="17" y="4" width="11" height="11" rx="2.5" />
      <rect className="b3" x="4" y="17" width="24" height="11" rx="2.5" />
    </svg>
  );
}
