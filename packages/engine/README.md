# @motors/engine

What every builder shares; the kits (`@motors/article`, `@motors/email`) are
built on it. To be published as `@builderset/engine` (docs/builder_packages).

| Entry                   | What                                                                                                                    | Runs on            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `@motors/engine`        | The node tree, the element registry, operations with undo, structural checks, reading and migrating stored documents    | Browser and server |
| `@motors/engine/host`   | `BuilderHost`, the editor's contract with a backend, and two ready-made hosts: `createMemoryHost`, `createRestHost`     | Browser and server |
| `@motors/engine/editor` | The workspace, generic over the document: canvas, panels, inspector, top bar, autosave ([README](src/editor/README.md)) | Browser            |
| `@motors/engine/ui`     | The editor's own UI kit                                                                                                 | Browser            |

**The backend.** What a project's server must store, check and render, the
security checklist, and the REST shape `createRestHost` speaks:
[src/host/BACKEND.md](src/host/BACKEND.md).
