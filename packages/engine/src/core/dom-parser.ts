/**
 * The HTML importers parse with the platform's `DOMParser`. A browser has one;
 * Node does not, so a server passes its own (jsdom's or linkedom's). It is
 * looked up when an import runs, never when a module loads, so the `core` and
 * `render` entries load on a server whether or not one is passed.
 */
export function domParser(given: DOMParser | undefined, caller: string): DOMParser {
  if (given) return given;
  if (typeof DOMParser === 'undefined') {
    throw new Error(
      `${caller} needs a DOMParser and there is none here (a server?). ` +
        'Pass one in its options, `{ parser }`: jsdom or linkedom has one.',
    );
  }
  return new DOMParser();
}
