# 19 — Recipe: adding a new builder

## Goal

A checklist that every new kit follows, so that the fifth builder is laid out like the first and nothing is forgotten. It is written after the popup kit, from what building it showed, and it is first used for the form kit.

## First question: is it a new kit at all?

Most "new builders" people ask for are an existing kit with a different configuration. A new kit costs weeks; a configuration costs hours.

| The request                                      | What it really is                                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A news editor, a blog editor                     | The article kit as it is                                                                                                                                   |
| A **job post** editor                            | The article kit with a content type: extra fields (location, salary, contract, closing date) and a restricted element set. Structured data as `JobPosting` |
| An event, a recipe, a case study, a product page | The same: a content type                                                                                                                                   |
| A newsletter editor                              | The email kit with an email type whose variables are the newsletter's                                                                                      |
| An SMS or push-notification editor               | Not a block builder: a text field with variables. The email kit's variable model, without the engine                                                       |
| A landing page                                   | The page kit                                                                                                                                               |
| A banner, a cookie notice, an announcement bar   | The popup kit: a layout and a trigger                                                                                                                      |
| A **form** builder                               | **A new kit.** Its document is a list of fields with validation and logic; its output is a form and a schema for the answers                               |
| A PDF or certificate builder, a slide builder    | A new kit: a new kind of canvas (fixed pages) and a new output                                                                                             |

It is a new kit only when at least one of these is new: the **shape of the document** beyond `meta` and `settings`, the **output format**, or **where the output runs**.

### A content type, for comparison

```tsx
const jobPost = defineContentType({
  key: 'job-post',
  // The extra fields. The settings panel is generated from this schema.
  meta: z.object({
    location: z.string().max(120),
    contract: z.enum(['full-time', 'part-time', 'contract', 'internship']),
    salary: z.object({ min: z.number(), max: z.number(), currency: z.string().length(3) }).nullable(),
    closesAt: z.string().nullable(),
    applyUrl: z.string(),
  }),
  // Only these elements are offered.
  elements: ['heading', 'paragraph', 'list', 'image', 'callout', 'buttons', 'faq'],
  // A starting document.
  template: () => jobPostTemplate(),
  structuredData: (document) => jobPosting(document),
});

<ArticleEditor contentType={jobPost} … />
```

This is the "content types" feature in [FEATURES.md](../FEATURES.md). Until it exists, the same result is reached with `elements`, `settingsSections` (step 06) and the project's own columns.

## The recipe

For a kit named `form`. Replace the name throughout.

### 1. Design, before any code — one page

Write `docs/plan/kits/FORM.md` answering:

| Question                                       | For a form                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| What does the document hold beyond the tree?   | `settings` (submit action, success message, spam protection), per-field validation, conditions                  |
| What are the elements?                         | Text, email, phone, number, textarea, select, radio, checkbox, date, file, consent, section, page break, submit |
| What are the outputs?                          | A rendered form (React and static HTML); a **schema for the answers**; a server-side validator                  |
| Where does the output run?                     | On the project's page; validation both in the browser and on the project's server                               |
| What does the host need that it has not got?   | Nothing for editing. For the output: a submission endpoint the project owns                                     |
| What does the engine need that it has not got? | Probably conditions between nodes ("show if"), which the email kit has in its own form                          |
| What is out of the first version?              | Payments, calculated fields, integrations                                                                       |
| Who is the first real user?                    | The popup kit's signup form; a job application on marrimauto.com                                                |

If the engine needs something new, change the engine first, in its own pull request, with the other kits' tests as the guard.

### 2. The package

```
packages/form/
├── src/
│   ├── core/
│   │   ├── index.ts          the named exports
│   │   ├── document.ts       FormDocument extends EngineDocument<FormMeta>; createFormDocument
│   │   ├── elements/         defineElement(…) for each field; createFormRegistry
│   │   ├── check.ts          checkForm → Issue[]
│   │   ├── parse.ts          parseForm: shape check and migrations
│   │   ├── schema.ts         the JSON Schema generator
│   │   ├── answers.ts        the kit's own logic: answersSchema(document), validateAnswers
│   │   └── *.test.ts
│   ├── render/
│   │   ├── index.ts
│   │   ├── form-view.tsx     <FormView>
│   │   ├── client/           the files that need 'use client'
│   │   └── static.ts         renderForm → { html, css }
│   ├── editor/
│   │   ├── index.ts
│   │   ├── editor.tsx        <FormEditor>: builds the profile, renders <BuilderEditor>
│   │   ├── profile.tsx       formProfile(options): EditorProfile<FormDocument>
│   │   ├── settings-panel.tsx
│   │   └── messages.ts       the kit's words: the interface
│   ├── locales/              en.ts, and the other shipped languages
│   ├── host.ts               export * from '@builderset/engine/host'
│   └── styles.css            the engine's theme + @source for this kit
├── schema/                   form.schema.json — generated, committed
├── fixtures/                 valid/, invalid/, manifest.json, and render goldens — generated, committed
├── tsdown.config.ts
├── package.json
├── README.md
└── CHANGELOG.md
```

Copy `packages/popup` and rename; it is the newest and the closest to the current conventions.

### 3. Core — in this order

1. **The document type** and `createFormDocument()`. A `schema` string (`'form/document'`) and `version: 1`. Once a version is released the string never changes.
2. **The elements**, each with: `type`, `version`, `category`, `icon`, a zod `schema`, `defaults`, placement (`container`, `parents`), `toPlainText`, `links`, `media`, `check`, and `migrate` from the first day even though it has nothing to do yet.
3. **`createFormRegistry(plugins)`**.
4. **`checkForm`**: the engine's `structuralIssues` and `translationIssues`, then the kit's own rules. Every issue has a code; every code has a message in every locale.
5. **`parseForm`**: refuse a wrong `schema`, refuse a newer `version` with a clear message, run migrations for an older one.
6. **The JSON Schema** and the **fixtures**, generated by a test that fails when the committed files are stale. At least: one valid fixture using every element, one invalid fixture per issue code, named in `manifest.json` with the code it must produce.
7. **The kit's own logic.** For a form, the answers schema and validator.

Tests for all of it before any React.

### 4. Render

- Decide what is static and what needs the browser. Put each interactive piece in `render/client/` with `'use client'`; everything else stays server-safe.
- The renderer takes the project's components where the article renderer does (`linkComponent`, `imageComponent`) and never fetches.
- A node whose props fail its schema renders nothing; an unknown node type renders nothing.
- No raw HTML. Every URL through `isSafeUrl`.
- Golden fixtures for the static output.
- If the output runs on a foreign page, follow the popup kit: generated CSS with literal values, no dependency on the editor's stylesheet.

### 5. Editor

- `formProfile(options)` returns every required member of `EditorProfile` (step 03): `renderCanvas`, `check`, `parse`, `titleOf`, `paragraphType`, `categories`.
- `<FormEditor>` takes the shared props ([BLUEPRINT.md §8](../BLUEPRINT.md#the-editor)) and passes them through: `document`, `host`, `locale`, `locales`, `messages`, `contentLocales`, `theme`, `tokens`, `elements`, `record`, `onRecordChange`, `onBack`, `storageKey`, `savedAt`.
- Use only `@builderset/engine/ui` for controls. If a control is missing, add it to the engine's kit.
- Every class has the `bst:` prefix; the unprefixed-class test covers the new folder.
- One editor test: mount with `createMemoryHost`, insert each element, edit a prop, undo, save.

### 6. Words

- `src/locales/en.ts` typed against the kit's message interface, containing the engine's words, the kit's words, the element names and descriptions, and every issue message.
- The same for each language the product ships. The type checker fails on a missing key.

### 7. Wire it in — the part people forget

| Where                                                                        | What                                                                                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/form/package.json`                                                 | The manifest in the standard shape (step 09), every door in `exports`                                            |
| `packages/builderset`                                                        | A folder under `src/`, a block in `exports`, a `@source` line in `styles.css`, the dependency; run the generator |
| `.changeset/config.json`                                                     | Nothing: `@builderset/*` is already in the fixed group                                                           |
| `tooling/check-dist.mjs`                                                     | The kit's doors and which of them are server-safe                                                                |
| `tooling/unprefixed.test.ts`                                                 | The kit's `editor` and `render` folders                                                                          |
| The ESLint import rules                                                      | The kit may import the engine and nothing else of the product                                                    |
| `examples/vite-react`, `examples/next-shadcn`                                | A route for the editor and one for the output; a browser smoke test                                              |
| `python/`                                                                    | A validator, if a Python backend must check this document; tested against the same fixtures                      |
| `apps/docs`                                                                  | A quick start, a guide, the generated element reference; a tab in the playground                                 |
| npm                                                                          | The first publish with a bootstrap token, then the trusted publisher (step 13, part 4)                           |
| `FEATURES.md`, `ROADMAP.md`, `BLUEPRINT.md`                                  | The kit moves from "later" to "available"; the package tables gain a row                                         |
| [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md) or its page on the docs site | What a project stores for this kit                                                                               |

### 8. Release

A changeset: `minor`, "Add the form builder". Under the fixed group, every package gets the new minor version. The kit's README says it is new and what is not in it yet.

## Check — the same for every kit

| Check                          | Passes when                                                             |
| ------------------------------ | ----------------------------------------------------------------------- |
| The folder layout              | `core`, `render`, `editor`, `locales`; nothing else at the top of `src` |
| Imports                        | The lint rules pass; `core` has no React                                |
| The server doors in plain Node | `node -e "await import('@builderset/form')"` and `…/render` load        |
| The contract                   | Schema and fixtures are generated, committed and current                |
| Every issue code               | Has an invalid fixture and a message in every locale                    |
| The package checks             | `pnpm check:packages`                                                   |
| The examples                   | `pnpm test:examples`, with the new routes                               |
| The other kits                 | Their tests pass with no edit, or with the edits a changeset describes  |
| The theme                      | Light, dark, auto and a custom token, in the Vite example               |
| The language                   | English by default; one other language complete                         |
| The docs                       | The quick start works for someone who has not seen the kit              |

## Done when

- [ ] The one-page design is written and its "out of the first version" list was respected.
- [ ] Every row of the wiring table is done.
- [ ] Every row of the check table passes.
- [ ] The kit has a real first user, and that user is in production.

## Traps

- **Skipping the first question.** A job-post kit, an event kit and a news kit would be three copies of the article kit to maintain.
- **Copying an older kit.** The email kit carries decisions from before the engine was split. Copy the newest kit.
- **A kit importing another kit.** If two kits need the same elements, the elements move down into a shared package or into the engine, by a conscious decision written into the blueprint.
- **Fixtures written by hand.** They are generated by the TypeScript tests, so that they are always what the code produces. A hand-written fixture is a claim nobody checks.
- **No first user.** A kit built for an imagined user gets the wrong first version. Name the real one in the design page.
