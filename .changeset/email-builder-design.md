---
'@builderset/engine': minor
'@builderset/email': minor
---

The email builder's new design, and email templates organised by category.

- The canvas is a mail window: the inbox's header — sender, recipient, subject and preheader, variables as chips — over the email.
- Dock: "Example data" (Ctrl Shift E) fills the variables with the email type's sample, and "Preview dark mode" shows the email as a dark inbox draws it — custom dark colours when set, light backgrounds darkened and dark text lightened otherwise.
- Left rail: Add, Layers, Modules, Variables. Variables lists what the email can say, grouped as the type declares it, with example values: click to insert where you were typing, or drag onto any text. Modules: Import HTML, templates by category (scaled-down previews; Add to end or Replace, which also sets the subject, preheader and look), copies of this email's sections and saved modules — all draggable.
- Email settings in four tabs (General, Style, Dark, Tracking): what to fix before activating, the inbox preview with variables or example data, characters in the subject with example data, "All N variables"; the dark preview switch; every link in the email with its UTM parameters.
- "Send test" in the top bar when the host passes `onSendTest(document, address)` to `EmailEditor`.
- The inspector's crumb shows the whole way up — Email › Section › Row › Column › Text — each step selectable. Layers: "3 sections · 12 blocks" and Collapse all / Expand all.
- Engine, for any kit: profiles can add left-rail tabs (`sideTabs`), name the third tab (`templatesTab`), hide Media (`mediaTab`), add dock buttons (`dockItems`, with `DockToggle`) and top-bar buttons (`topBarActions`); `canvasHeader` now draws on bare canvases too. Template blocks nest (`children`), and a template's `apply` sets what else Replace changes. `TemplateGallery` (list or grid), `templateFragment`, `templateDocument`, `insertVariableAtCaret`, `setVariableDragData`, `setActiveDrag`, `setDragChip` and `DRAG_TYPE_MIME` are exported.
- The email's templates live in `src/templates/`, one folder per category (newsletters, codes & verification, welcome, account & security, orders & receipts, promotions, events & reminders) and one file per template, built from small block helpers; `EMAIL_TEMPLATES`, `EMAIL_TEMPLATE_CATEGORIES`, `defineTemplate`, `toTemplateSpec` and `buildTemplateEmail` (a new design from a template) are exported from `@builderset/email/editor`. A test builds and checks every template.
