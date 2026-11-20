import type { AnswerError, AnswerErrorCode } from '../core';

/**
 * The words a visitor reads that the form does not set itself: the parts of
 * a name and an address, yes and no, the progress line, and what is wrong
 * with an answer. The buttons and the thank-you message are the form's own
 * (its settings). English, Albanian and German are built in; a host passes
 * its own for another language.
 */
// #region words
export interface FormWords {
  code: string;
  choose: string;
  yes: string;
  no: string;
  optional: string;
  stepOf: (step: number, total: number) => string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  zip: string;
  dropFiles: string;
  chooseFiles: string;
  fileLimits: (accept: string, maxFiles: number, maxMb: number) => string;
  filesChosen: (count: number) => string;
  signHere: string;
  clear: string;
  notRobot: string;
  sending: string;
  again: string;
  closed: string;
  /** Under a field the visitor never sees, in the editor only. */
  hiddenField: string;
  errors: Record<AnswerErrorCode, (limit?: number) => string>;
}
// #endregion words

export const en: FormWords = {
  code: 'en',
  choose: 'Choose…',
  yes: 'Yes',
  no: 'No',
  optional: '(optional)',
  stepOf: (step, total) => `Step ${String(step)} of ${String(total)}`,
  firstName: 'First name',
  lastName: 'Last name',
  street: 'Street and number',
  city: 'City',
  zip: 'Postcode',
  dropFiles: 'Drag files here or',
  chooseFiles: 'choose',
  fileLimits: (accept, maxFiles, maxMb) =>
    `${accept} · up to ${String(maxFiles)} files, ${String(maxMb)} MB each`,
  filesChosen: (count) => `${String(count)} ${count === 1 ? 'file' : 'files'} chosen`,
  signHere: 'Sign here',
  clear: 'Clear',
  notRobot: 'I am not a robot',
  sending: 'Sending…',
  again: 'Fill it in again',
  closed: 'This form no longer takes responses.',
  hiddenField: 'Not shown to visitors',
  errors: {
    required: () => 'Please fill this in.',
    email: () => 'Enter a valid email address.',
    phone: () => 'Enter a valid phone number.',
    number: () => 'Enter a number.',
    date: () => 'Enter a date.',
    time: () => 'Enter a time.',
    tooShort: (n) => `At least ${String(n)} characters.`,
    tooLong: (n) => `No more than ${String(n)} characters.`,
    tooLow: (n) => `At least ${String(n)}.`,
    tooHigh: (n) => `No more than ${String(n)}.`,
    letters: () => 'Letters only.',
    digits: () => 'Digits only.',
    pattern: () => 'This does not look right.',
    choice: () => 'Choose one of the options.',
    tooFewChoices: (n) => `Choose at least ${String(n)}.`,
    tooManyChoices: (n) => `Choose no more than ${String(n)}.`,
    tooManyFiles: (n) => `No more than ${String(n)} files.`,
    fileType: () => 'This kind of file is not accepted.',
    fileTooBig: (n) => `Files up to ${String(n)} MB.`,
  },
};

export const sq: FormWords = {
  code: 'sq',
  choose: 'Zgjidhni…',
  yes: 'Po',
  no: 'Jo',
  optional: '(opsionale)',
  stepOf: (step, total) => `Hapi ${String(step)} nga ${String(total)}`,
  firstName: 'Emri',
  lastName: 'Mbiemri',
  street: 'Rruga dhe numri',
  city: 'Qyteti',
  zip: 'Kodi postar',
  dropFiles: 'Tërhiqni skedarët këtu ose',
  chooseFiles: 'zgjidhni',
  fileLimits: (accept, maxFiles, maxMb) =>
    `${accept} · deri në ${String(maxFiles)} skedarë, ${String(maxMb)} MB secili`,
  filesChosen: (count) => `${String(count)} skedar${count === 1 ? '' : 'ë'} i zgjedhur`,
  signHere: 'Nënshkruani këtu',
  clear: 'Pastro',
  notRobot: 'Nuk jam robot',
  sending: 'Duke dërguar…',
  again: 'Plotësoje përsëri',
  closed: 'Ky formular nuk pranon më përgjigje.',
  hiddenField: 'Nuk shfaqet për vizitorët',
  errors: {
    required: () => 'Plotësoni këtë fushë.',
    email: () => 'Shkruani një email të vlefshëm.',
    phone: () => 'Shkruani një numër telefoni të vlefshëm.',
    number: () => 'Shkruani një numër.',
    date: () => 'Shkruani një datë.',
    time: () => 'Shkruani një orë.',
    tooShort: (n) => `Të paktën ${String(n)} shkronja.`,
    tooLong: (n) => `Jo më shumë se ${String(n)} shkronja.`,
    tooLow: (n) => `Të paktën ${String(n)}.`,
    tooHigh: (n) => `Jo më shumë se ${String(n)}.`,
    letters: () => 'Vetëm shkronja.',
    digits: () => 'Vetëm shifra.',
    pattern: () => 'Formati nuk është i saktë.',
    choice: () => 'Zgjidhni një nga opsionet.',
    tooFewChoices: (n) => `Zgjidhni të paktën ${String(n)}.`,
    tooManyChoices: (n) => `Zgjidhni jo më shumë se ${String(n)}.`,
    tooManyFiles: (n) => `Jo më shumë se ${String(n)} skedarë.`,
    fileType: () => 'Ky lloj skedari nuk pranohet.',
    fileTooBig: (n) => `Skedarë deri në ${String(n)} MB.`,
  },
};

export const de: FormWords = {
  code: 'de',
  choose: 'Bitte wählen…',
  yes: 'Ja',
  no: 'Nein',
  optional: '(optional)',
  stepOf: (step, total) => `Schritt ${String(step)} von ${String(total)}`,
  firstName: 'Vorname',
  lastName: 'Nachname',
  street: 'Straße und Hausnummer',
  city: 'Ort',
  zip: 'PLZ',
  dropFiles: 'Dateien hierher ziehen oder',
  chooseFiles: 'auswählen',
  fileLimits: (accept, maxFiles, maxMb) =>
    `${accept} · bis zu ${String(maxFiles)} Dateien, je ${String(maxMb)} MB`,
  filesChosen: (count) => `${String(count)} ${count === 1 ? 'Datei' : 'Dateien'} gewählt`,
  signHere: 'Hier unterschreiben',
  clear: 'Löschen',
  notRobot: 'Ich bin kein Roboter',
  sending: 'Wird gesendet…',
  again: 'Noch einmal ausfüllen',
  closed: 'Dieses Formular nimmt keine Antworten mehr an.',
  hiddenField: 'Für Besucher nicht sichtbar',
  errors: {
    required: () => 'Bitte ausfüllen.',
    email: () => 'Bitte eine gültige E-Mail-Adresse eingeben.',
    phone: () => 'Bitte eine gültige Telefonnummer eingeben.',
    number: () => 'Bitte eine Zahl eingeben.',
    date: () => 'Bitte ein Datum eingeben.',
    time: () => 'Bitte eine Uhrzeit eingeben.',
    tooShort: (n) => `Mindestens ${String(n)} Zeichen.`,
    tooLong: (n) => `Höchstens ${String(n)} Zeichen.`,
    tooLow: (n) => `Mindestens ${String(n)}.`,
    tooHigh: (n) => `Höchstens ${String(n)}.`,
    letters: () => 'Nur Buchstaben.',
    digits: () => 'Nur Ziffern.',
    pattern: () => 'Das Format stimmt nicht.',
    choice: () => 'Bitte eine der Optionen wählen.',
    tooFewChoices: (n) => `Mindestens ${String(n)} wählen.`,
    tooManyChoices: (n) => `Höchstens ${String(n)} wählen.`,
    tooManyFiles: (n) => `Höchstens ${String(n)} Dateien.`,
    fileType: () => 'Diese Dateiart wird nicht angenommen.',
    fileTooBig: (n) => `Dateien bis ${String(n)} MB.`,
  },
};

const BUILT_IN: Record<string, FormWords> = { en, sq, de };

/** The words for a language: built in, or English. `pt-BR` falls back to `pt`. */
export function formWords(
  locale = 'en',
  extra: Readonly<Record<string, FormWords>> = {},
): FormWords {
  const all = { ...BUILT_IN, ...extra };
  return all[locale] ?? all[locale.split('-')[0] ?? ''] ?? en;
}

/** What is wrong with an answer, in words: the form's own message, or the built-in one. */
export function errorText(error: AnswerError, words: FormWords): string {
  return error.message ?? words.errors[error.code](error.limit);
}
