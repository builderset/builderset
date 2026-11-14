# Changesets

A pull request that changes a package adds a file here with `pnpm changeset`: which packages, patch, minor or major, and one sentence for the changelog, written for a user. CI fails a pull request that changes a package without one. Every package moves together, at one version.

How a changeset becomes a release is in [CONTRIBUTING.md](../CONTRIBUTING.md#releases).
