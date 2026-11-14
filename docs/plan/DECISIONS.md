# Decisions

Step 01 of the plan ([steps/01_DECISIONS_AND_ACCOUNTS.md](steps/01_DECISIONS_AND_ACCOUNTS.md)). Filled in as each is decided; an empty cell is still open.

| #   | Question                 | Decision                                                 | Decided on | Notes                                                                                                                   |
| --- | ------------------------ | -------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1  | Name                     | Builderset: `@builderset/*`, `builderset`, prefix `bst:` | 2026-11-10 | npm organisation, domain and trademark search still to do                                                               |
| D2  | Licence                  | MIT                                                      | 2026-11-14 | `LICENSE` at the root and in every package                                                                              |
| D3  | Registry                 |                                                          |            | Recommended: public npm; PyPI for Python                                                                                |
| D4  | Visibility before launch |                                                          |            | The repository is private for now                                                                                       |
| D5  | Targets                  |                                                          |            | Built for React 19, Node 20+ (`core`, `render`, `host`), ESM, current browsers. Node 20's end of life: step 08's record |
| D6  | Versioning               |                                                          |            | Recommended: one version for every package                                                                              |
| D7  | Who can publish          |                                                          |            | Recommended: only the release workflow, by trusted publishing — registered after the transfer below                     |
| D8  | Support channel          |                                                          |            | Recommended: Issues for bugs, Discussions for questions                                                                 |

## Accounts

| What              | Name                                                                                | Owner   | Two-factor on |
| ----------------- | ----------------------------------------------------------------------------------- | ------- | ------------- |
| npm organisation  |                                                                                     |         |               |
| GitHub repository | `github.com/mkurtii/builderset`, private; moves to `xhiti/builderset` by a transfer | mkurtii |               |
| PyPI account      |                                                                                     |         |               |
| Domain            |                                                                                     |         |               |
| Project email     |                                                                                     |         |               |

At the transfer: rewrite the commits' author email to the personal address (`git filter-repo --mailmap`, while the repository is private), update the repository links in the manifests and READMEs, then register the trusted publishers.
