/** Written by the build from package.json (tsdown and Vitest `define`). */
// eslint-disable-next-line @typescript-eslint/naming-convention -- a build-time constant
declare const __BUILDERSET_ENGINE_VERSION__: string;

/** This engine's version, e.g. `'0.1.0'`. */
export const ENGINE_VERSION: string = __BUILDERSET_ENGINE_VERSION__;
