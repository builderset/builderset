# @builderset/email

## 0.5.0

### Patch Changes

- Updated dependencies [36bbbf3]
  - @builderset/engine@0.5.0

## 0.4.0

### Minor Changes

- 3555dc8: The email builder's new design, and email templates organised by category.

  - The canvas is a mail window: the inbox's header — sender, recipient, subject and preheader, variables as chips — over the email.
  - Dock: "Example data" (Ctrl Shift E) fills the variables with the email type's sample, and "Preview dark mode" shows the email as a dark inbox draws it — custom dark colours when set, light backgrounds darkened and dark text lightened otherwise.
  - Left rail: Add, Layers, Modules, Variables. Variables lists what the email can say, grouped as the type declares it, with example values: click to insert where you were typing, or drag onto any text. Modules: Import HTML, templates by category (scaled-down previews; Add to end or Replace, which also sets the subject, preheader and look), copies of this email's sections and saved modules — all draggable.
  - Email settings in four tabs (General, Style, Dark, Tracking): what to fix before activating, the inbox preview with variables or example data, characters in the subject with example data, "All N variables"; the dark preview switch; every link in the email with its UTM parameters.
  - "Send test" in the top bar when the host passes `onSendTest(document, address)` to `EmailEditor`.
  - The inspector's crumb shows the whole way up — Email › Section › Row › Column › Text — each step selectable. Layers: "3 sections · 12 blocks" and Collapse all / Expand all.
  - Engine, for any kit: profiles can add left-rail tabs (`sideTabs`), name the third tab (`templatesTab`), hide Media (`mediaTab`), add dock buttons (`dockItems`, with `DockToggle`) and top-bar buttons (`topBarActions`); `canvasHeader` now draws on bare canvases too. Template blocks nest (`children`), and a template's `apply` sets what else Replace changes. `TemplateGallery` (list or grid), `templateFragment`, `templateDocument`, `insertVariableAtCaret`, `setVariableDragData`, `setActiveDrag`, `setDragChip` and `DRAG_TYPE_MIME` are exported.
  - The email's templates live in `src/templates/`, one folder per category (newsletters, codes & verification, welcome, account & security, orders & receipts, promotions, events & reminders) and one file per template, built from small block helpers; `EMAIL_TEMPLATES`, `EMAIL_TEMPLATE_CATEGORIES`, `defineTemplate`, `toTemplateSpec` and `buildTemplateEmail` (a new design from a template) are exported from `@builderset/email/editor`. A test builds and checks every template.

### Patch Changes

- Updated dependencies [ed11020]
- Updated dependencies [4ed0022]
- Updated dependencies [3555dc8]
- Updated dependencies [da2252f]
- Updated dependencies [481559e]
  - @builderset/engine@0.4.0

## 0.3.0

### Minor Changes

- 7554288: The Python package, `builderset`, at the same version: `check_article`, `check_email` and `render_email` — the email rendered byte for byte as `renderEmail` writes it. Its wheel is attached to the GitHub release.

### Patch Changes

- Updated dependencies [7554288]
  - @builderset/engine@0.3.0

## 0.2.0

### Minor Changes

- d5ba0c6: Five new theme variables: `--builderset-sidebar`, the rail beside the canvas and the top bar; `--builderset-input`, a field's edge and fill; and `--builderset-state-draft`, `--builderset-state-scheduled` and `--builderset-state-published`, the status chip's colours. `theme/shadcn.css` maps shadcn's `--sidebar` and `--input`. Left unset, the editor looks as it did.

### Patch Changes

- Updated dependencies [d5ba0c6]
  - @builderset/engine@0.2.0

## 0.1.0

### Minor Changes

- ae906f6: The first release: the engine, the email and article kits — editors, renderers, hosts, the theme and the stylesheets — and the all-in-one package.

### Patch Changes

- Updated dependencies [ae906f6]
  - @builderset/engine@0.1.0
