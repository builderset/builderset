/**
 * Builderset's mark: three blocks, one per tint of the motif. On hover they
 * shift apart a little — a set being built (see global.css, .bs-mark).
 */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="bs-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Builderset"
    >
      <rect className="b1" x="4" y="4" width="11" height="11" rx="3" />
      <rect className="b2" x="17" y="4" width="11" height="11" rx="3" />
      <rect className="b3" x="4" y="17" width="24" height="11" rx="3" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="bs-brand inline-flex items-center gap-2.5">
      <Logo />
      <span className="text-[15px] font-semibold tracking-tight">Builderset</span>
      <span className="rounded-full border px-1.5 py-px text-[10.5px] font-medium text-fd-muted-foreground">
        docs
      </span>
    </span>
  );
}
