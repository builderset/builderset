# 01 — Decisions and accounts

## Goal

Eight decisions are written down and the accounts that reserve the name exist. No code changes.

Two decisions are made (2026-11-10):

- **The name is Builderset.** What is left is confirming it in the places a quick check cannot reach.
- **The repository lives in the owner's personal GitHub account** — `github.com/xhiti/builderset` — and **the packages are published under an npm organisation**, `@builderset`, not under a personal name.

## Why

Every later step uses a name, a licence and a registry. Changing the name after publishing means deprecating packages and moving users; changing the licence after others depend on the code may not be possible at all. These are cheap to decide now and expensive later.

## Before you start

Nothing. This step can run while step 02 is being done, because steps 02–07 keep the `@motors/` scope.

## The work

### 1. Confirm the name

The name is used in six places. Three were checked when it was chosen; three are still open.

| Place                        | State on 2026-11-10                                                                                           | What to do                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm, unscoped (`builderset`) | **Free.** `npm view builderset` → `E404`                                                                      | Nothing until step 13 publishes to it                                                                                                    |
| npm scope (`@builderset`)    | **Looks free.** No public package uses the scope and no npm user with packages has the name                   | Create the organisation (part 3). That is the only real proof: `npm view @builderset/anything` is `E404` whether or not the scope exists |
| PyPI (`builderset`)          | **Free.** `https://pypi.org/pypi/builderset/json` → 404                                                       | Nothing until step 15. PyPI treats `-`, `_` and `.` as the same character and ignores case                                               |
| GitHub                       | **Free**, and not needed: no account is named `builderset`, and the repository goes into the personal account | Create the repository `xhiti/builderset` (part 3). Only the repository name has to be unused, and only inside that account               |
| Domain                       | Not checked                                                                                                   | Look for `builderset.dev`, then `builderset.io` or `getbuilderset.dev`, at a registrar                                                   |
| Trademark                    | Not checked                                                                                                   | Search "Builderset" with "software" and "editor" in a search engine, and in the EUIPO and USPTO trademark databases                      |

Two things to know about the name:

- **Builder.io** is a well-known page builder that publishes on npm as `@builder.io`. "Builder" is a generic word, so the risk is confusion in search results, not a legal one; the trademark search should still look at it.
- npm refuses a new name that differs from an existing one only by punctuation. `builder-set` and `builder.set` were both unused on 2026-11-10.

If the scope or the trademark search fails, the next names from the same check were `inbuilder` and `unibuilder`; both were free on npm, PyPI and GitHub on the same day. Part 5 says how to switch.

### 2. Decide the eight questions

| #   | Question                 | Recommended                                                                              | Why                                                                                                                                |
| --- | ------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The name                 | **Builderset — decided 2026-11-10**                                                      | Part 1 has what is still to confirm                                                                                                |
| D2  | The licence              | MIT                                                                                      | Easiest to adopt. The comparison is in [BLUEPRINT.md §16](../BLUEPRINT.md#16-licence-and-business-model)                           |
| D3  | The registry             | Public npm; PyPI for Python                                                              | [BLUEPRINT.md §14](../BLUEPRINT.md#14-where-it-is-published-npm-or-github-packages)                                                |
| D4  | Visibility before launch | Pre-releases on public npm under the `alpha` tag; the GitHub repository private until M4 | MotorsAL installs with no token. If the compiled code must not be public yet, use GitHub Packages as a private staging registry    |
| D5  | Targets                  | React 19, Node 20 or newer, ESM only, current browsers                                   | The code already uses React 19 (`ref` as a prop, no `forwardRef`) and CSS `light-dark()`. Supporting more is work with no user yet |
| D6  | Versioning               | One version for every package, npm and PyPI                                              | [BLUEPRINT.md §15](../BLUEPRINT.md#15-versions-and-promises)                                                                       |
| D7  | Who can publish          | Nobody from a laptop. Only the release workflow, by trusted publishing                   | No long-lived token to leak; every release is traceable to a commit                                                                |
| D8  | Where users ask for help | GitHub Issues for bugs, GitHub Discussions for questions                                 | One place, searchable, free                                                                                                        |

D2 and D4 are tied. If the licence is MIT, there is nothing to hide and pre-releases on public npm are the simple path. If the licence is undecided, publish nothing until it is decided: published code cannot be taken back, and MotorsAL keeps its own copies until step 14, so nothing is waiting for a release. GitHub Packages as a private staging registry fits badly here: it would name every package after the personal account, `@xhiti/email` ([step 13, part 7](13_PUBLISHING_AND_RELEASES.md#7-if-the-code-must-stay-private-github-packages)).

### 3. Create the accounts

Do these in order. Each one reserves the name in that place.

1. **npm organisation.** Sign in at npmjs.com with your own npm account → _Add Organization_ → `builderset` → the free plan (unlimited public packages). **Do this first, today if possible**: it is the one check that could still overturn the name, and it costs nothing. If it is refused, go to part 5.
   - The organisation is what gives the packages their names: `@builderset/email`, and the unscoped `builderset`. Your personal npm user name appears in no package name; it is listed only as a maintainer on each package's page.
   - Turn on two-factor authentication for the account.
   - In the organisation's settings, require two-factor authentication for every member.
2. **GitHub repository** in the personal account: an empty private repository named `builderset`, so `github.com/xhiti/builderset`. Step 08 fills it. No GitHub organisation is needed, and the npm organisation is not connected to GitHub in any way.
3. **PyPI account**, with two-factor authentication. PyPI allows a _pending trusted publisher_ to be registered for a project that does not exist yet: account → _Publishing_ → _Add a pending publisher_, with the repository owner `xhiti`, the repository `builderset`, the workflow file name `release.yml` and the environment name `pypi`. That reserves nothing, but it means the first upload in step 15 needs no token.
4. **Domain**, if one was chosen. Point nothing at it yet.
5. **An email address for the project** (`hello@…` or `security@…`), used as the contact in `package.json` and for security reports.

The unscoped npm name (`builderset`) is reserved only by publishing to it. That happens in step 13. Do not publish an empty placeholder to hold it: npm removes squatted names, and a real pre-release a few weeks later is the honest way.

**What a personal GitHub account means for the rest of the plan**

| Point                                       | Consequence                                                                                                                                                                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The repository address shows the user name  | Every package page on npm links to `github.com/xhiti/builderset`. The package names do not carry it; the link does                                                                                                                                              |
| Trusted publishing names the owner          | On npm and PyPI the publisher is registered as owner `xhiti`, repository `builderset`. It works the same for a personal account as for an organisation                                                                                                          |
| Some settings need a public repository      | On a free personal account, branch protection rules, required reviewers on an environment and secret scanning are available for public repositories. While the repository is private, steps 08 and 13 say what to do instead. Check GitHub's current plan table |
| Actions minutes are limited while private   | A private repository on a free account has a monthly allowance of Actions minutes. The examples job with three browsers is the expensive one; run it on pull requests that touch `packages/` only                                                               |
| Moving to an organisation later is possible | GitHub can transfer a repository and redirects the old address. After a transfer, update the trusted-publisher entry of every package on npm and PyPI and the `repository` field of every manifest                                                              |

### 4. Write the decisions down

Create `docs/builder_packages/DECISIONS.md` from this template and fill every line.

```markdown
# Decisions

| #   | Question                 | Decision | Decided on | Notes |
| --- | ------------------------ | -------- | ---------- | ----- |
| D1  | Name                     |          |            |       |
| D2  | Licence                  |          |            |       |
| D3  | Registry                 |          |            |       |
| D4  | Visibility before launch |          |            |       |
| D5  | Targets                  |          |            |       |
| D6  | Versioning               |          |            |       |
| D7  | Who can publish          |          |            |       |
| D8  | Support channel          |          |            |       |

## Accounts

| What              | Name | Owner | Two-factor on |
| ----------------- | ---- | ----- | ------------- |
| npm organisation  |      |       |               |
| GitHub repository |      |       |               |
| PyPI account      |      |       |               |
| Domain            |      |       |               |
| Project email     |      |       |               |
```

### 5. If the name has to change after all

Only if the npm organisation cannot be created or the trademark search finds a real conflict. Replace the name in this folder so the documents match the code that will be written:

```bash
git grep -l "builderset" -- docs/builder_packages
```

Four things carry the name:

| What                             | Now              | Replace with                           |
| -------------------------------- | ---------------- | -------------------------------------- |
| Packages, imports, the PyPI name | `builderset`     | The new name                           |
| Public CSS variables             | `--builderset-*` | `--<new name>-*`                       |
| The class prefix                 | `bst:`           | Two or three letters from the new name |
| Tailwind's internal variables    | `--bst-*`        | The same letters                       |

Run the six checks in part 1 for the new name before replacing anything.

## Check

- `npm org ls builderset` lists your account as owner.
- The empty repository `xhiti/builderset` exists.
- `DECISIONS.md` has no empty cell in the first table.

## Done when

- [x] The name is chosen: Builderset.
- [ ] The three open checks in part 1 are done: the npm organisation, the domain, the trademark search.
- [ ] D1–D8 are decided and written in `DECISIONS.md`.
- [ ] The npm organisation exists and requires two-factor authentication.
- [ ] The repository `xhiti/builderset` exists.
- [ ] The PyPI account exists, with a pending trusted publisher registered.
- [x] These documents use the chosen name.

## Traps

- **`npm view @scope/x` returning 404 does not mean the scope is free.** Only creating the organisation tells you.
- **A free npm name can be a taken PyPI name.** Check both before telling anyone the name.
- **One person owning everything.** If the npm account's password and second factor are lost, the packages cannot be published again under that name. Add a second owner to the npm organisation, or store the recovery codes for the npm, GitHub and PyPI accounts somewhere a second person can reach. A personal GitHub account has no second owner; that is the price of not using an organisation.
- **Choosing a source-available licence "to be safe".** It is the option that most reduces adoption. Choose it only for a reason you can name.
