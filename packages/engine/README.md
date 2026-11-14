# @builderset/engine

What every builder shares; the kits (`@builderset/article`, `@builderset/email`) are
built on it. Not published yet: see [the plan](../../docs/plan/README.md).

| Entry                       | What                                                                                                                    | Runs on            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `@builderset/engine`        | The node tree, the element registry, operations with undo, structural checks, reading and migrating stored documents    | Browser and server |
| `@builderset/engine/host`   | `BuilderHost`, the editor's contract with a backend, and two ready-made hosts: `createMemoryHost`, `createRestHost`     | Browser and server |
| `@builderset/engine/editor` | The workspace, generic over the document: canvas, panels, inspector, top bar, autosave ([README](src/editor/README.md)) | Browser            |
| `@builderset/engine/ui`     | The editor's own UI kit                                                                                                 | Browser            |

**The backend.** What a project's server must store, check and render, the
security checklist, and the REST shape `createRestHost` speaks:
[src/host/BACKEND.md](src/host/BACKEND.md).

**Styles.** The editor is drawn with Tailwind utility classes and the theme's
CSS variables (`bg-card`, `--radius-control`, …), plus a few global rules:
the focus glow (`.ui-focus`), the invalid field (`.ui-invalid`), the overlay
bands (`data-slot="overlay-*"`), the disabled surface and reduced motion. The
package ships no CSS yet, so the app that hosts the editor supplies all of
them; step 10 of the plan ships them compiled, with the package.
