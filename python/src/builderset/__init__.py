"""Validate builder documents and form answers, and render emails — the Python side of Builderset.

``builderset.article``, ``builderset.email`` and ``builderset.form`` check a
document the way the TypeScript packages do, with the same error codes;
``builderset.email`` also renders an email to the same HTML and text, byte for
byte, and ``builderset.form`` checks a visitor's answers exactly as the form in
the browser did.
"""

#: Written by ``tooling/sync-python-version.mjs`` from the npm packages' version:
#: one version for the whole product.
__version__ = "0.3.0"
