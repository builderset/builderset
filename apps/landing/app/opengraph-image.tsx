import { ImageResponse } from 'next/og';

export const alt =
  'Builderset — visual editors for articles, emails, forms, cards and popups, inside your own app';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const KITS = ['Article', 'Email', 'Form', 'Card', 'Popup'];

/** The link preview: the mark, the five kits and the one sentence, ink on cool paper. */
export default function OpenGraphImage() {
  const block = (x: number, y: number, w: number, color: string) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: 70,
        borderRadius: 16,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: 152, height: 152, display: 'flex' }}>
          {block(0, 0, 70, '#10131a')}
          {block(82, 0, 70, '#2a5bd7')}
          {block(0, 82, 152, '#10131a')}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {KITS.map((kit) => (
            <div
              key={kit}
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: 999,
                border: '2px solid rgba(42,91,215,0.28)',
                background: 'rgba(42,91,215,0.07)',
                color: '#2149b0',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {kit}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: '#2a5bd7' }}>Builderset</div>
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2 }}>
          Let your users design articles, emails, forms, cards and popups, inside your own app.
        </div>
      </div>
    </div>,
    size,
  );
}
