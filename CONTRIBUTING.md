# Contributing

## Set up

Node 24 (`.nvmrc`) and pnpm 11:

```bash
corepack enable
pnpm install
```

## Before a pull request

Every one of these passes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

CI runs the same, and the tests on Node 20, 22 and 24 once merged.

## Branches

| Branch        | What it is                                                          |
| ------------- | ------------------------------------------------------------------- |
| `development` | Where work lands. The default branch; every pull request targets it |
| `staging`     | Promoted from `development` by a merge; pre-releases come from here |
| `production`  | Promoted from `staging` by a merge; releases come from here         |

A change starts on a short branch from `development` (`feat/…`, `fix/…`,
`chore/…`) and comes back through a pull request. Nothing is committed to
`staging` or `production` directly.

## Rules

1. **One change, one pull request.** A refactor and a feature in one pull
   request hide each other's regressions.
2. **Moves and changes are separate commits.** A commit that moves a file
   changes nothing in it; the next commit edits it. `git log --follow` keeps
   working and the diff can be read.
3. **The boundaries hold.** The engine imports no kit, a kit imports no other
   kit, a `core` folder imports no React and no `render` or `editor`, and a
   `render` folder imports no `editor`. ESLint enforces it
   (`tooling/eslint.config.js`).
4. **Contract files change on purpose.** Each kit's `schema/` and `fixtures/`
   are what backends in other languages test against. The tests that write
   them fail when they are stale; regenerate with `UPDATE_FIXTURES=1 pnpm test`
   and say in the pull request why they changed.
5. **Docs in the same change.** If a change alters what a README or
   `BACKEND.md` says, that file changes in the same pull request.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `feat(email): …`,
`fix(engine): …`, `refactor: …`, `docs: …`, `chore: …`. The scope is the
package's folder name.
