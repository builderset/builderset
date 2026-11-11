# @motors/engine

What every builder shares: the node tree, the element registry, every editing
operation with undo/redo, the structural and translation checks, reading stored
documents with element migrations, rich text, styles, media references,
languages, and copying a selection to the clipboard.

Pure TypeScript — no React, and no elements of its own. A kit brings its
document type (`EngineDocument<Meta>` with its own `meta`), its elements and
its checks: `@motors/article` and `@motors/email`. The kit's README describes
the document and the element library; the article's is in
[packages/article/src/core](../../../article/src/core/README.md).

The editor's workspace, generic over the document type, is
`@motors/engine/editor`.
