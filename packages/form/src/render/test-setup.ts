import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Without the cleanup, a component from one test is still in the document during
 * the next, and a `getByRole` that should be unambiguous starts finding two.
 *
 * `jest-dom` is what makes the accessibility assertions readable —
 * `toHaveAccessibleName` computes the name the way a screen reader does, rather
 * than the way an `aria-labelledby` lookup by hand would.
 */
afterEach(() => {
  cleanup();
});

/**
 * jsdom implements no layout, so it ships no `scrollIntoView` — calling it
 * throws, which in a component that scrolls an error into view takes down the
 * effect that was rendering the error.
 *
 * Stubbed rather than guarded in the components: `scrollIntoView` is on every
 * `Element` in every browser this product supports, and a `typeof` check in
 * production code to satisfy a test environment is the test leaking upwards.
 */
// Typed through a structural view of the prototype: `'scrollIntoView' in
// Element.prototype` narrows the DOM type to `never` in the false branch, which
// is TypeScript being right about a browser and wrong about jsdom.
const elements = Element.prototype as { scrollIntoView?: () => void };
elements.scrollIntoView ??= function scrollIntoView() {
  /* no layout in jsdom, so there is nothing to scroll */
};

/**
 * jsdom implements no layout, so it has no `matchMedia` either — reading one
 * throws, which takes down any component that asks whether it is on a desktop.
 *
 * Stubbed rather than guarded in the components, for the same reason as above:
 * `matchMedia` is on `window` in every browser this product supports, and a
 * `typeof` check in production code to satisfy a test environment is the test
 * leaking upwards. It answers `true` — a desktop viewport — which is the
 * environment the back office is built for and the one the components render on
 * the server.
 */
const view = window as { matchMedia?: (query: string) => MediaQueryList };
view.matchMedia ??= (query: string) => ({
  matches: true,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
});

/**
 * jsdom implements no Pointer Events API, and Radix's select reads
 * `hasPointerCapture` on pointer-down before it opens. The call throws, the
 * handler dies, and the listbox never appears — so a perfectly good select
 * looks broken in a test and nowhere else.
 *
 * Stubbed here for the same reason as the two above: these are on every
 * `Element` in every browser this product supports.
 */
const pointer = Element.prototype as {
  hasPointerCapture?: (id: number) => boolean;
  setPointerCapture?: (id: number) => void;
  releasePointerCapture?: (id: number) => void;
};
pointer.hasPointerCapture ??= () => false;
pointer.setPointerCapture ??= () => undefined;
pointer.releasePointerCapture ??= () => undefined;

/**
 * jsdom has no blob URL store, so `URL.createObjectURL` is simply absent and
 * calling it throws — which in a drop zone takes down the handler that accepts
 * the file, and the component looks broken in a test and nowhere else.
 *
 * Stubbed here for the same reason as the rest of this file: it is on `URL` in
 * every browser this product supports, and a `typeof` check in production code
 * to satisfy a test environment is the test leaking upwards. The value is a
 * `blob:` URL because that is what the real one returns and what a component
 * may reasonably assert on.
 */
const urls = URL as unknown as {
  createObjectURL?: (object: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};
let blobs = 0;
urls.createObjectURL ??= () => {
  blobs += 1;
  return `blob:test/${String(blobs)}`;
};
urls.revokeObjectURL ??= () => {
  /* nothing was ever registered */
};
