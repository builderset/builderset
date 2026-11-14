# Example: Vite, React, no Tailwind

The editors in a project with nothing of its own but a plain CSS file: the packages need nothing from the page.

| Route           | Shows                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| `/email`        | `EmailEditor` with `createMemoryHost`, the default brand and a sample variable |
| `/article`      | `ArticleEditor` with `createMemoryHost`                                        |
| `/article/view` | The article through `ArticleRenderer` and `content.css`                        |
| `/hostile`      | The email editor on a page whose stylesheet styles every element it can reach  |

A bar on every page switches the theme, the page's own `dark` class, the language and a brand colour, and counts the saves that reached the host. The settings are in the address (`/email?theme=dark&lang=sq`).

```bash
npm install
npm run build && npm run preview   # http://localhost:5199
npm run test:browser                # Playwright
```
