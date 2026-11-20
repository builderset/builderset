import { encodeCode128, encodeQr, type QrLevel } from '../core';

/**
 * QR codes and barcodes as SVG: sharp at any size, printed as vectors, and
 * real — a phone or a scanner reads what they say. A value that cannot be
 * encoded (too long for a QR code, an accent in a barcode) draws a hatched
 * box that says so rather than a code that scans as something else.
 */

/** Modules of background kept around a QR code inside its frame. */
const QR_MARGIN = 2;
/** Modules of background on each side of a barcode: scanners need a quiet zone. */
const BAR_MARGIN = 10;

function Unreadable({ color, label }: { color: string; label: string }) {
  return (
    <svg
      className="bsc-code"
      viewBox="0 0 40 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        fill="none"
        stroke={color}
        strokeDasharray="2 2"
      />
      <path d="M0 40L40 0M-10 30L30-10M10 50L50 10" stroke={color} strokeOpacity="0.4" />
    </svg>
  );
}

export function QrCode({
  data,
  color,
  background,
  level,
  label,
  unreadable,
}: {
  data: string;
  color: string;
  background: string;
  level: QrLevel;
  label: string;
  unreadable: string;
}) {
  const code = data ? encodeQr(data, level) : null;
  if (!code) return <Unreadable color={color} label={unreadable} />;
  let path = '';
  code.modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (row[x]) x++;
      path += `M${String(start)} ${String(y)}h${String(x - start)}v1h${String(start - x)}z`;
    }
  });
  const box = code.size + QR_MARGIN * 2;
  return (
    <svg
      className="bsc-code"
      viewBox={`${String(-QR_MARGIN)} ${String(-QR_MARGIN)} ${String(box)} ${String(box)}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      style={{ background }}
    >
      <path d={path} fill={color} />
    </svg>
  );
}

export function Barcode({
  data,
  color,
  label,
  unreadable,
}: {
  data: string;
  color: string;
  label: string;
  unreadable: string;
}) {
  const code = encodeCode128(data);
  if (!code) return <Unreadable color={color} label={unreadable} />;
  const bars: { x: number; width: number }[] = [];
  let x = BAR_MARGIN;
  code.widths.forEach((width, index) => {
    if (index % 2 === 0) bars.push({ x, width });
    x += width;
  });
  return (
    <svg
      className="bsc-code"
      viewBox={`0 0 ${String(code.modules + BAR_MARGIN * 2)} 40`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <path
        d={bars
          .map((bar) => `M${String(bar.x)} 0h${String(bar.width)}v40h${String(-bar.width)}z`)
          .join('')}
        fill={color}
      />
    </svg>
  );
}
