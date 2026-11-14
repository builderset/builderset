/**
 * @builderset/article/host — the editor's host: the `BuilderHost` type and the two
 * ready-made hosts, `createMemoryHost` and `createRestHost`. The engine's, under
 * this kit's name.
 */

export {
  createMemoryHost,
  createRestHost,
  DEFAULT_REST_PATHS,
  joinPath,
  type BuilderHost,
  type MemoryHost,
  type MemoryHostOptions,
  type MemoryHostState,
  type OEmbedInfo,
  type RestHostOptions,
  type RestPaths,
  type RestRecord,
  type RevisionSummary,
  type SavedSection,
  type SaveReason,
  type SaveResult,
  type UploadResult,
} from '@builderset/engine/host';
