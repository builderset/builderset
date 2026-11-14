# Decisions

Step 01 of the plan ([steps/01_DECISIONS_AND_ACCOUNTS.md](steps/01_DECISIONS_AND_ACCOUNTS.md)). Filled in as each is decided; an empty cell is still open.

| #   | Question                 | Decision                                                   | Decided on | Notes                                                                                                                                                                   |
| --- | ------------------------ | ---------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Name                     | Builderset: `@builderset/*`, `builderset`, prefix `bst:`   | 2026-11-10 | Domain and trademark search still to do                                                                                                                                 |
| D2  | Licence                  | MIT                                                        | 2026-11-14 | `LICENSE` at the root and in every package                                                                                                                              |
| D3  | Registry                 | GitHub Packages until launch; public npm from milestone M4 | 2026-11-14 | GitHub Packages holds scoped names only: the all-in-one `builderset` is published with the move to npm. Installing needs a token with `read:packages` (CONTRIBUTING.md) |
| D4  | Visibility before launch | Private: the repository and the packages, until M4         | 2026-11-14 | —                                                                                                                                                                       |
| D5  | Targets                  |                                                            |            | Built for React 19, Node 20+ (`core`, `render`, `host`), ESM, current browsers. Node 20's end of life: step 08's record                                                 |
| D6  | Versioning               | One version for every package                              | 2026-11-14 | Changesets, one fixed group                                                                                                                                             |
| D7  | Who can publish          | Only the release workflow                                  | 2026-11-14 | With the workflow's own GitHub token; `staging` publishes pre-releases (`alpha`), `production` releases                                                                 |
| D8  | Support channel          |                                                            |            | Recommended: Issues for bugs, Discussions for questions                                                                                                                 |

## Accounts

| What                | Name                                                                                    | Owner | Two-factor on |
| ------------------- | --------------------------------------------------------------------------------------- | ----- | ------------- |
| GitHub organisation | `builderset`, free plan — holds the repository, so the packages' scope is `@builderset` |       |               |
| GitHub repository   | `github.com/builderset/builderset`, private; moved from `mkurtii/builderset`            |       |               |
| npm organisation    | Needed at the move to npm (M4)                                                          |       |               |
| PyPI account        |                                                                                         |       |               |
| Domain              |                                                                                         |       |               |
| Project email       |                                                                                         |       |               |

The account changed on 2026-11-14: GitHub Packages names every package after the repository's owner, so a personal account would have meant `@xhiti/email` until launch and a rename after it. A `builderset` organisation keeps the names.

At the transfer: rewrite the commits' author email to the personal address (`git filter-repo --mailmap`, while the repository is private).
