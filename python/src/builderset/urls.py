"""Which addresses a document may send a reader to, and which media keys it may hold."""

from __future__ import annotations

import re
from collections.abc import Callable
from urllib.parse import urlparse

_SAFE_SCHEMES = frozenset({"http", "https", "mailto", "tel"})
_CONTROL = re.compile(r"[\s\x00-\x1f\x7f]")


def is_safe_url(value: str) -> bool:
    """`isSafeUrl` in ``engine/src/core/url.ts``, rule for rule."""
    url = value.strip()
    if not url or len(url) > 2000 or _CONTROL.search(url):
        return False
    if url.startswith("#"):
        return bool(re.fullmatch(r"#[A-Za-z][\w-]*", url))
    if url.startswith("/"):
        return not url.startswith("//")
    try:
        scheme = urlparse(url).scheme.lower()
    except ValueError:
        return False
    return scheme in _SAFE_SCHEMES and url.lower().startswith(f"{scheme}:")


#: A project's rule for the media keys a document may reference: ``None`` when
#: the key is allowed, otherwise the issue code to report — ``media.invalidKey``
#: for a key the project never minted, ``media.wrongFolder`` for one of its
#: keys that this kind of document must not use, or a code of its own.
#:
#: Which keys exist and where they may be used is the application's business
#: (its storage, its folders), so the checks take the rule as an argument.
MediaKeyRule = Callable[[str], str | None]

_KEY_SHAPE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*(?:/[A-Za-z0-9][A-Za-z0-9._-]*)*$")


def media_key_shape(key: str) -> str | None:
    """The rule used when a project passes none: the key's shape only.

    A relative path of plain segments, at most 512 characters: no leading
    slash, no ``..``, no backslash, no whitespace — nothing that could name an
    object outside the folder the key claims.
    """
    if len(key) > 512 or not _KEY_SHAPE.match(key):
        return "media.invalidKey"
    if any(part in {".", ".."} for part in key.split("/")):
        return "media.invalidKey"
    return None


__all__ = ["MediaKeyRule", "is_safe_url", "media_key_shape"]
