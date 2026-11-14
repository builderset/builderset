/**
 * The handful of words the renderer itself writes — button labels, the
 * privacy notice on an embed, the heading over footnotes. Everything else on
 * the page is the writer's. English is built in; a host passes `messages` —
 * a language's `render` words from `@builderset/article/locales/sq`, or single
 * words — to change them.
 */

export interface RenderMessages {
  contents: string;
  notes: string;
  /** Editor only: what an empty heading / paragraph shows. */
  headingPlaceholder: string;
  paragraphPlaceholder: string;
  copy: string;
  copied: string;
  loadEmbed: string;
  /** `{provider}` is replaced with the provider's name. */
  embedNotice: string;
  previous: string;
  next: string;
  close: string;
  enlarge: string;
  before: string;
  after: string;
  compareHandle: string;
  pros: string;
  cons: string;
  step: string;
  minutes: string;
  /** `{score}` and `{scale}`. */
  ratingOutOf: string;
  download: string;
  readNext: string;
  emailPlaceholder: string;
  subscribe: string;
  subscribed: string;
  subscribeFailed: string;
  video: string;
  audio: string;
}

export const RENDER_EN: RenderMessages = {
  contents: 'Contents',
  notes: 'Notes',
  headingPlaceholder: 'Heading',
  paragraphPlaceholder: 'Type something, or press / for blocks',
  copy: 'Copy',
  copied: 'Copied',
  loadEmbed: 'Load content',
  embedNotice: 'This shows content from {provider}, which may set cookies.',
  previous: 'Previous',
  next: 'Next',
  close: 'Close',
  enlarge: 'Enlarge image',
  before: 'Before',
  after: 'After',
  compareHandle: 'Drag to compare',
  pros: 'Pros',
  cons: 'Cons',
  step: 'Step',
  minutes: '{n} min',
  ratingOutOf: '{score} out of {scale}',
  download: 'Download',
  readNext: 'Read next',
  emailPlaceholder: 'you@example.com',
  subscribe: 'Subscribe',
  subscribed: 'Thanks — check your inbox.',
  subscribeFailed: 'That did not work. Try again.',
  video: 'Video',
  audio: 'Audio',
};

/** English, with `overrides` laid over it: a language from `@builderset/article/locales/…` (its `render`), or single words. */
export function messagesFor(overrides?: Partial<RenderMessages>): RenderMessages {
  return { ...RENDER_EN, ...overrides };
}

/** `{name}` placeholders, filled. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
