/**
 * The handful of words the renderer itself writes — button labels, the
 * privacy notice on an embed, the heading over footnotes. Everything else on
 * the page is the writer's. Three languages ship; a host passes `messages` to
 * override any of them or to add a language.
 */

export interface RenderMessages {
  contents: string;
  notes: string;
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

const en: RenderMessages = {
  contents: 'Contents',
  notes: 'Notes',
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

const sq: RenderMessages = {
  contents: 'Përmbajtja',
  notes: 'Shënime',
  copy: 'Kopjo',
  copied: 'U kopjua',
  loadEmbed: 'Ngarko përmbajtjen',
  embedNotice: 'Kjo shfaq përmbajtje nga {provider}, e cila mund të vendosë cookies.',
  previous: 'E mëparshmja',
  next: 'Tjetra',
  close: 'Mbyll',
  enlarge: 'Zmadho foton',
  before: 'Para',
  after: 'Pas',
  compareHandle: 'Tërhiqeni për të krahasuar',
  pros: 'Pro',
  cons: 'Kundër',
  step: 'Hapi',
  minutes: '{n} min',
  ratingOutOf: '{score} nga {scale}',
  download: 'Shkarko',
  readNext: 'Lexoni më tej',
  emailPlaceholder: 'ju@shembull.com',
  subscribe: 'Abonohu',
  subscribed: 'Faleminderit — kontrolloni email-in.',
  subscribeFailed: 'Nuk funksionoi. Provoni përsëri.',
  video: 'Video',
  audio: 'Audio',
};

const de: RenderMessages = {
  contents: 'Inhalt',
  notes: 'Anmerkungen',
  copy: 'Kopieren',
  copied: 'Kopiert',
  loadEmbed: 'Inhalt laden',
  embedNotice: 'Dies zeigt Inhalte von {provider}, die Cookies setzen können.',
  previous: 'Zurück',
  next: 'Weiter',
  close: 'Schließen',
  enlarge: 'Bild vergrößern',
  before: 'Vorher',
  after: 'Nachher',
  compareHandle: 'Zum Vergleichen ziehen',
  pros: 'Vorteile',
  cons: 'Nachteile',
  step: 'Schritt',
  minutes: '{n} Min.',
  ratingOutOf: '{score} von {scale}',
  download: 'Herunterladen',
  readNext: 'Weiterlesen',
  emailPlaceholder: 'sie@beispiel.de',
  subscribe: 'Abonnieren',
  subscribed: 'Danke — bitte prüfen Sie Ihr Postfach.',
  subscribeFailed: 'Das hat nicht geklappt. Bitte erneut versuchen.',
  video: 'Video',
  audio: 'Audio',
};

export const RENDER_MESSAGES: Record<string, RenderMessages> = { en, sq, de };

export function messagesFor(locale: string, overrides?: Partial<RenderMessages>): RenderMessages {
  const base = RENDER_MESSAGES[locale] ?? RENDER_MESSAGES[locale.split('-')[0] ?? ''] ?? en;
  return { ...base, ...overrides };
}

/** `{name}` placeholders, filled. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
