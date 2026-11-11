/**
 * @motors/engine/host — the line between the editor and a project's backend.
 *
 * `BuilderHost` is everything the editor asks of the application it runs in.
 * Two ready-made hosts: `createMemoryHost` (tests, demos, a playground) and
 * `createRestHost` (an API of the shape `BACKEND.md` describes). No React and
 * no DOM at import: a server, a script or a test can use it.
 */

export type {
  BuilderHost,
  OEmbedInfo,
  RevisionSummary,
  SavedSection,
  SaveReason,
  SaveResult,
  UploadResult,
} from './types';
export {
  createMemoryHost,
  type MemoryHost,
  type MemoryHostOptions,
  type MemoryHostState,
} from './memory';
export {
  createRestHost,
  DEFAULT_REST_PATHS,
  joinPath,
  type RestHostOptions,
  type RestPaths,
  type RestRecord,
} from './rest';
