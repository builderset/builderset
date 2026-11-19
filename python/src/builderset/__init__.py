"""Validate builder documents and render emails — the Python side of Builderset.

``builderset.article`` and ``builderset.email`` check a document the way the
TypeScript packages do, with the same error codes; ``builderset.email`` also
renders an email to the same HTML and text, byte for byte.
"""

#: Written by ``tooling/sync-python-version.mjs`` from the npm packages' version:
#: one version for the whole product.
__version__ = "0.3.0"
