# Example: Next.js, Tailwind 4, shadcn

The editors in a project that already has its own look: Tailwind 4, shadcn's tokens in its own colours, and `next-themes` for dark mode.

| Route                 | Shows                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/emails/[id]/edit`   | `EmailEditor` (`next/dynamic`, `ssr: false`), `theme="auto"`, `shadcn.css`; saved through the REST API below |
| `/articles/[id]/edit` | `ArticleEditor` from `@builderset/article`, in memory (`createMemoryHost`)                                   |
| `/blog/[slug]`        | `ArticleRenderer` in a Server Component, with `next/link` and `next/image`                                   |
| `/api/emails/[id]/…`  | The REST shape `createRestHost` speaks, over JSON files in `.data/` — `send` renders the email on the server |
| `/`, `/settings`      | The project's own pages: the editors must not change them                                                    |

```bash
npm install
npm run build && npm start   # http://localhost:5299
npm run test:browser         # Playwright
```
