/**
 * ESLint 9 searches for `eslint.config.js` from the working directory upwards,
 * so this one file serves every package. The rules live in `tooling/`.
 */
export { default } from './tooling/eslint.config.js';
