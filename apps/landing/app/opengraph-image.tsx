import { ImageResponse } from 'next/og';

export const alt = 'Builderset — visual editors for emails and articles, inside your own app';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The link preview: the mark and the one sentence, ink on cool paper. */
export default function OpenGraphImage() {
  const block = (x: number, y: number, w: number, color: string) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: 88,
        borderRadius: 20,
        background: color,
      }}
    />
  );
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: '#ffffff',
        backgroundImage:
          'linear-gradient(rgba(16,19,26,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(16,19,26,0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        color: '#10131a',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative', width: 192, height: 192, display: 'flex' }}>
          {block(0, 0, 88, '#10131a')}
          {block(104, 0, 88, '#2a5bd7')}
          {block(0, 104, 192, '#10131a')}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: '#2a5bd7' }}>Builderset</div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          Let your users design emails and articles, inside your own app.
        </div>
      </div>
    </div>,
    size,
  );
}
