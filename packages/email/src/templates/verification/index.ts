import confirmEmail from './confirm-email';
import magicLink from './magic-link';
import oneTimeCode from './one-time-code';
import twoStepCode from './two-step-code';

/** Codes and links that prove who the reader is: a one-time code, a confirmation, a sign-in link, a two-step code. */
export const VERIFICATION = [oneTimeCode, confirmEmail, magicLink, twoStepCode];
