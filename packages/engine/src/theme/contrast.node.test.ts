import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every default text and background pair clears 4.5:1 (WCAG AA), and the strong
 * border 3:1, in both themes. Read from defaults.css itself, so a colour changed
 * there is measured here. The mixes are the ones theme.css derives.
 */

type Lab = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

function oklabToLinear([L, a, b]: Lab): Lab {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToOklab([r, g, b]: Lab): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363288533 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** `#rrggbb` or `oklch(L C H)` → OKLab. */
function parse(colour: string): Lab {
  if (colour.startsWith('#')) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16) / 255);
    return linearToOklab([toLinear(r ?? 0), toLinear(g ?? 0), toLinear(b ?? 0)]);
  }
  const [L = 0, C = 0, H = 0] = (colour.match(/[\d.]+/g) ?? []).map(Number);
  const h = (H * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

const mix = (a: Lab, b: Lab, share: number): Lab => [
  a[0] * (1 - share) + b[0] * share,
  a[1] * (1 - share) + b[1] * share,
  a[2] * (1 - share) + b[2] * share,
];

function luminance(colour: Lab): number {
  const [r, g, b] = oklabToLinear(colour).map((v) => toLinear(fromLinear(clamp(v))));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: Lab, b: Lab): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

/** `--bst-d-name: light-dark(A, B);` → { name: [A, B] } */
function readDefaults(): Record<string, [Lab, Lab]> {
  const css = readFileSync(new URL('./defaults.css', import.meta.url), 'utf8');
  const out: Record<string, [Lab, Lab]> = {};
  for (const m of css.matchAll(
    /--bst-d-([\w-]+):\s*light-dark\(((?:[^()]|\([^()]*\))+?),\s*((?:[^()]|\([^()]*\))+?)\);/g,
  )) {
    const [, name, light, dark] = m;
    if (name && light && dark) out[name] = [parse(light.trim()), parse(dark.trim())];
  }
  return out;
}

const defaults = readDefaults();

describe.each([
  ['light', 0],
  ['dark', 1],
] as const)('the %s defaults', (_scheme, side) => {
  const colour = (name: string): Lab => {
    const pair = defaults[name];
    if (!pair) throw new Error(`defaults.css has no --bst-d-${name}`);
    return pair[side];
  };
  const fg = colour('foreground');
  const surface = colour('surface');
  // The same mixes theme.css writes.
  const input = mix(surface, fg, side === 0 ? 0.05 : 0.04);
  const hover = mix(surface, fg, side === 0 ? 0.06 : 0.1);
  const tint = (name: string) => mix(surface, colour(name), 0.1);

  it.each([
    ['foreground', 'background'],
    ['foreground', 'surface'],
    ['foreground', 'muted'],
    ['muted-foreground', 'background'],
    ['muted-foreground', 'surface'],
    ['muted-foreground', 'muted'],
    ['primary-foreground', 'primary'],
    ['primary', 'surface'],
    ['primary', 'background'],
    ['danger-foreground', 'danger'],
    ['danger', 'surface'],
    ['success', 'surface'],
    ['warning', 'surface'],
    ['chart-1', 'surface'],
  ])('%s on %s: at least 4.5:1', (text, ground) => {
    expect(contrast(colour(text), colour(ground))).toBeGreaterThanOrEqual(4.5);
  });

  it('text on a field and on a hovered row: at least 4.5:1', () => {
    expect(contrast(fg, input)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fg, hover)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colour('muted-foreground'), hover)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['state-draft', 'state-scheduled', 'state-published'])(
    'the %s chip, on its own 10%% tint: at least 4.5:1',
    (name) => {
      expect(contrast(colour(name), tint(name))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('a strong border on a surface: at least 3:1', () => {
    expect(contrast(mix(colour('border'), fg, 0.45), surface)).toBeGreaterThanOrEqual(3);
  });
});

it('reads every default', () => {
  expect(Object.keys(defaults).length).toBe(16);
});
