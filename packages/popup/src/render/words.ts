import type { SubmissionError, SubmissionErrorCode } from '../core';

/**
 * The words a visitor reads that the popup does not set itself: the name of
 * its close button, the countdown's units, what is wrong with an answer.
 * Everything else — the heading, the buttons, the thank-you — is the popup's
 * own. English, Albanian and German are built in; a host passes its own for
 * another language.
 */
// #region words
export interface PopupWords {
  code: string;
  /** The × button's name for a screen reader. */
  close: string;
  /** The popup's name when it has no heading to be named by. */
  dialog: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  /** Read out with the countdown: "2 days, 4 hours and 12 minutes left". */
  timeLeft: (days: number, hours: number, minutes: number) => string;
  sending: string;
  /** Shown when the host's `onSubmit` fails. */
  failed: string;
  errors: Record<SubmissionErrorCode, (limit?: number) => string>;
}
// #endregion words

export const en: PopupWords = {
  code: 'en',
  close: 'Close',
  dialog: 'Message',
  days: 'days',
  hours: 'hrs',
  minutes: 'min',
  seconds: 'sec',
  timeLeft: (days, hours, minutes) =>
    `${String(days)} ${days === 1 ? 'day' : 'days'}, ${String(hours)} ${hours === 1 ? 'hour' : 'hours'} and ${String(minutes)} ${minutes === 1 ? 'minute' : 'minutes'} left`,
  sending: 'Sending…',
  failed: 'That did not go through. Please try again.',
  errors: {
    required: () => 'Please fill this in.',
    text: () => 'Please type your answer.',
    tooLong: (limit) => `At most ${String(limit ?? 0)} characters.`,
    email: () => 'Enter an email address, like name@example.com.',
    phone: () => 'Enter a phone number.',
    plate: () => 'Enter the plate as it is written, like AA 123 BC.',
  },
};

export const sq: PopupWords = {
  code: 'sq',
  close: 'Mbyll',
  dialog: 'Mesazh',
  days: 'ditë',
  hours: 'orë',
  minutes: 'min',
  seconds: 'sek',
  timeLeft: (days, hours, minutes) =>
    // "ditë" and "orë" are the same in the singular and the plural.
    `Kanë mbetur ${String(days)} ditë, ${String(hours)} orë dhe ${String(minutes)} ${minutes === 1 ? 'minutë' : 'minuta'}`,
  sending: 'Po dërgohet…',
  failed: 'Nuk u dërgua. Ju lutemi provoni përsëri.',
  errors: {
    required: () => 'Plotësoni këtë fushë.',
    text: () => 'Shkruani përgjigjen tuaj.',
    tooLong: (limit) => `Jo më shumë se ${String(limit ?? 0)} shkronja.`,
    email: () => 'Shkruani një adresë emaili, p.sh. emri@shembull.com.',
    phone: () => 'Shkruani një numër telefoni.',
    plate: () => 'Shkruani targën siç është, p.sh. AA 123 BC.',
  },
};

export const de: PopupWords = {
  code: 'de',
  close: 'Schließen',
  dialog: 'Hinweis',
  days: 'Tage',
  hours: 'Std.',
  minutes: 'Min.',
  seconds: 'Sek.',
  timeLeft: (days, hours, minutes) =>
    `Noch ${String(days)} ${days === 1 ? 'Tag' : 'Tage'}, ${String(hours)} ${hours === 1 ? 'Stunde' : 'Stunden'} und ${String(minutes)} ${minutes === 1 ? 'Minute' : 'Minuten'}`,
  sending: 'Wird gesendet …',
  failed: 'Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.',
  errors: {
    required: () => 'Bitte ausfüllen.',
    text: () => 'Bitte geben Sie Ihre Antwort ein.',
    tooLong: (limit) => `Höchstens ${String(limit ?? 0)} Zeichen.`,
    email: () => 'Geben Sie eine E-Mail-Adresse ein, z. B. name@beispiel.de.',
    phone: () => 'Geben Sie eine Telefonnummer ein.',
    plate: () => 'Geben Sie das Kennzeichen so ein, wie es geschrieben ist, z. B. B AB 1234.',
  },
};

const BUILT_IN: Record<string, PopupWords> = { en, sq, de };

/** The visitor's words for a language: built in for `en`, `sq`, `de` (and their regions), else English. */
export function popupWords(locale = 'en'): PopupWords {
  return BUILT_IN[locale.toLowerCase().split('-')[0] ?? 'en'] ?? en;
}

/** What is wrong with an answer, in the visitor's words. */
export function errorText(words: PopupWords, error: SubmissionError): string {
  return words.errors[error.code](error.limit);
}
