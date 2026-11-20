import createAccount from './create-account';
import newsletter from './newsletter';
import waitlist from './waitlist';

/** Signing up: a newsletter, an account, a place on the waitlist. */
export const SIGNUP = [newsletter, createAccount, waitlist];
