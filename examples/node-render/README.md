# Example: rendering an email in plain Node

No bundler, no React: `@builderset/email` on a server, as a mailer uses it.

- `render.mjs` reads a stored design (`welcome.json`), checks it, and prints the email's HTML.
- `test.mjs` renders every golden case the package ships and compares the HTML and text byte for byte.

```bash
npm install
npm start          # the HTML on stdout
npm test           # node --test
```

Inside the repository it uses the workspace's packages; `pnpm test:examples` runs it against the packages installed from a registry, on Node 20, 22 and 24 in CI.
