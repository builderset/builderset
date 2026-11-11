/**
 * The fonts an email may use.
 *
 * Two kinds. WEB-SAFE fonts are on every reader's machine and render
 * everywhere. WEB fonts (Google Fonts) are loaded by the clients that support
 * them — Apple Mail, iOS Mail, Samsung, Thunderbird, some Android apps — and
 * every other client (Gmail, Outlook) shows the fallback in the stack. So each
 * web font's stack ends in a web-safe font of the same shape: a geometric sans
 * falls back to Helvetica/Arial, a serif to Georgia, never to "whatever".
 */

export interface EmailFont {
  label: string;
  /** The CSS `font-family` value, fallbacks included. */
  stack: string;
  /** The Google Fonts `family=` value, for web fonts only. */
  google?: string | undefined;
  category: 'sans' | 'serif' | 'display' | 'mono' | 'handwriting';
}

const SANS = 'Helvetica, Arial, sans-serif';
const SERIF = "Georgia, 'Times New Roman', Times, serif";

const web = (
  label: string,
  category: EmailFont['category'],
  weights = '400;500;600;700',
  fallback = category === 'serif' ? SERIF : category === 'mono' ? "'Courier New', monospace" : SANS,
): EmailFont => ({
  label,
  stack: `'${label}', ${fallback}`,
  google: `${label.replace(/ /g, '+')}:wght@${weights}`,
  category,
});

export const EMAIL_FONTS = {
  // ── web-safe ────────────────────────────────────────────────────────────
  system: {
    label: 'System',
    stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    category: 'sans',
  },
  helvetica: { label: 'Helvetica / Arial', stack: SANS, category: 'sans' },
  verdana: { label: 'Verdana', stack: 'Verdana, Geneva, sans-serif', category: 'sans' },
  tahoma: { label: 'Tahoma', stack: 'Tahoma, Verdana, Segoe, sans-serif', category: 'sans' },
  trebuchet: {
    label: 'Trebuchet MS',
    stack: "'Trebuchet MS', Helvetica, sans-serif",
    category: 'sans',
  },
  georgia: { label: 'Georgia', stack: SERIF, category: 'serif' },
  times: { label: 'Times New Roman', stack: "'Times New Roman', Times, serif", category: 'serif' },
  courier: { label: 'Courier New', stack: "'Courier New', Courier, monospace", category: 'mono' },
  // ── modern sans (web) ───────────────────────────────────────────────────
  inter: web('Inter', 'sans'),
  poppins: web('Poppins', 'sans'),
  montserrat: web('Montserrat', 'sans'),
  roboto: web('Roboto', 'sans', '400;500;700'),
  'open-sans': web('Open Sans', 'sans'),
  lato: web('Lato', 'sans', '400;700'),
  raleway: web('Raleway', 'sans'),
  nunito: web('Nunito', 'sans'),
  'dm-sans': web('DM Sans', 'sans'),
  manrope: web('Manrope', 'sans'),
  'plus-jakarta-sans': web('Plus Jakarta Sans', 'sans'),
  'space-grotesk': web('Space Grotesk', 'sans'),
  'work-sans': web('Work Sans', 'sans'),
  rubik: web('Rubik', 'sans'),
  outfit: web('Outfit', 'sans'),
  sora: web('Sora', 'sans'),
  urbanist: web('Urbanist', 'sans'),
  'ibm-plex-sans': web('IBM Plex Sans', 'sans'),
  'source-sans-3': web('Source Sans 3', 'sans'),
  figtree: web('Figtree', 'sans'),
  lexend: web('Lexend', 'sans'),
  'red-hat-display': web('Red Hat Display', 'sans'),
  'albert-sans': web('Albert Sans', 'sans'),
  onest: web('Onest', 'sans'),
  // ── serif (web) ─────────────────────────────────────────────────────────
  'playfair-display': web('Playfair Display', 'serif'),
  merriweather: web('Merriweather', 'serif', '400;700'),
  lora: web('Lora', 'serif'),
  'libre-baskerville': web('Libre Baskerville', 'serif', '400;700'),
  'cormorant-garamond': web('Cormorant Garamond', 'serif'),
  'dm-serif-display': web('DM Serif Display', 'serif', '400'),
  fraunces: web('Fraunces', 'serif'),
  'eb-garamond': web('EB Garamond', 'serif'),
  // ── display (web) ───────────────────────────────────────────────────────
  oswald: web('Oswald', 'display', '400;500;600;700'),
  'bebas-neue': web('Bebas Neue', 'display', '400'),
  anton: web('Anton', 'display', '400'),
  'archivo-black': web('Archivo Black', 'display', '400'),
  syne: web('Syne', 'display'),
  unbounded: web('Unbounded', 'display'),
  // ── handwriting (web) ───────────────────────────────────────────────────
  caveat: web('Caveat', 'handwriting', '400;700'),
  'dancing-script': web('Dancing Script', 'handwriting', '400;700'),
  pacifico: web('Pacifico', 'handwriting', '400'),
  // ── mono (web) ──────────────────────────────────────────────────────────
  'jetbrains-mono': web('JetBrains Mono', 'mono', '400;700'),
  'space-mono': web('Space Mono', 'mono', '400;700'),
} satisfies Record<string, EmailFont>;

export type FontKey = keyof typeof EMAIL_FONTS;

export const FONT_KEYS = Object.keys(EMAIL_FONTS) as [FontKey, ...FontKey[]];

export function fontOf(key: string | null | undefined): EmailFont | undefined {
  return key ? (EMAIL_FONTS as Record<string, EmailFont>)[key] : undefined;
}

/**
 * One Google Fonts stylesheet URL for the web fonts among `keys`, or null when
 * none of them is a web font. `display=swap`, so a slow font never hides text.
 */
export function googleFontsUrl(keys: Iterable<string>): string | null {
  const families = [...new Set(keys)]
    .map((key) => fontOf(key)?.google)
    .filter((family): family is string => !!family)
    .sort();
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family}`).join('&')}&display=swap`;
}
