"""Validate builder documents, form answers and popup submissions, and render emails — the Python side of Builderset.

``builderset.article``, ``builderset.email``, ``builderset.form``,
``builderset.card`` and ``builderset.popup`` check a document the way the
TypeScript packages do, with the same error codes; ``builderset.email`` also
renders an email to the same HTML and text, byte for byte; ``builderset.form``
checks a visitor's answers and ``builderset.popup`` a popup's submission exactly
as the browser did; ``builderset.card`` fills a card with a member's data and
``builderset.popup`` decides whether a popup shows, with the browser's rules.
"""

#: Written by ``tooling/sync-python-version.mjs`` from the npm packages' version:
#: one version for the whole product.
__version__ = "0.4.0"
