"""JavaScript's semantics, where the TS renderer leans on them.

The port must produce the same bytes as Builderset's ``packages/email/src/render``, and a handful
of JavaScript behaviours differ from Python's in ways that show up in HTML:
``String(5.0)`` is ``"5"`` (Python says ``"5.0"``), ``Math.round(2.5)`` is ``3``
(Python's ``round`` says ``2``), ``"x".length`` counts UTF-16 units, and
``trim()`` has its own idea of whitespace. Each lives here once, named after the
JavaScript it stands in for, so the renderer reads like the TS it mirrors.
"""

from __future__ import annotations

import math
import re
from decimal import Decimal
from typing import Any, Final
from urllib.parse import quote


class _Undefined:
    """JavaScript's ``undefined``: a missing key, as distinct from ``null``.

    The two differ where it matters — ``Number(null)`` is 0 and
    ``Number(undefined)`` is NaN — so a lookup that finds nothing returns this
    rather than ``None``.
    """

    _instance: _Undefined | None = None

    def __new__(cls) -> _Undefined:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __bool__(self) -> bool:
        return False

    def __repr__(self) -> str:
        return "undefined"


UNDEFINED: Final = _Undefined()

#: ECMAScript's WhiteSpace and LineTerminator code points — what ``trim()`` and
#: ``\s`` mean. Python's ``str.isspace`` disagrees on several (U+001C to U+001F
#: are space to Python, U+FEFF is not).
JS_SPACE: Final = "".join(
    chr(code)
    for code in (
        *(0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680),
        *range(0x2000, 0x200B),
        *(0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF),
    )
)


def is_nullish(value: Any) -> bool:
    """``value === null || value === undefined``."""
    return value is None or value is UNDEFINED


def trim(value: str) -> str:
    return value.strip(JS_SPACE)


def length(value: str) -> int:
    """``value.length`` — UTF-16 code units, so an emoji counts as two."""
    return len(value.encode("utf-16-le")) // 2


def round_half_up(value: float) -> int:
    """``Math.round``: halves go towards +∞, not to the even neighbour."""
    return math.floor(value + 0.5)


def number_to_string(value: float) -> str:
    """``Number.prototype.toString()`` — the ECMAScript algorithm, digit for digit.

    Python's ``repr`` already gives the shortest round-tripping digits (as
    JavaScript does); what differs is where each switches to exponent form and
    that ``5.0`` keeps its ``.0``.
    """
    if math.isnan(value):
        return "NaN"
    if math.isinf(value):
        return "Infinity" if value > 0 else "-Infinity"
    if value == 0:
        return "0"
    sign = "-" if value < 0 else ""
    _sign, digits_tuple, exponent = Decimal(repr(abs(value))).as_tuple()
    digits = "".join(str(d) for d in digits_tuple).lstrip("0") or "0"
    # Decimal may carry trailing zeros (1e2 → digits "1", exp 2; 100.0 → "1000", -1).
    stripped = digits.rstrip("0")
    exponent = int(exponent) + (len(digits) - len(stripped))
    digits = stripped
    k = len(digits)
    n = k + exponent  # value = 0.digits * 10^n
    if k <= n <= 21:
        return sign + digits + "0" * (n - k)
    if 0 < n <= 21:
        return sign + digits[:n] + "." + digits[n:]
    if -6 < n <= 0:
        return sign + "0." + "0" * (-n) + digits
    e = n - 1
    mantissa = digits if k == 1 else f"{digits[0]}.{digits[1:]}"
    return f"{sign}{mantissa}e{'+' if e >= 0 else '-'}{abs(e)}"


def to_string(value: Any) -> str:
    """``String(value)`` for the values JSON can hold."""
    if value is UNDEFINED:
        return "undefined"
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return number_to_string(value)
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return ",".join("" if is_nullish(item) else to_string(item) for item in value)
    return "[object Object]"


def primitive_text(value: Any) -> str:
    """``str()`` in ``context.ts``: a primitive as text; objects and lists are
    not values a reader can read, so they are the empty string."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str | int | float):
        return to_string(value)
    return ""


_DECIMAL_LITERAL = re.compile(r"^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$")
_RADIX_LITERAL = re.compile(r"^0([xXoObB])([0-9a-fA-F]+)$")


def to_number(value: Any) -> float:
    """``Number(value)``."""
    if value is UNDEFINED:
        return math.nan
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        text = trim(value)
        if text == "":
            return 0.0
        radix = _RADIX_LITERAL.match(text)
        if radix:
            base = {"x": 16, "o": 8, "b": 2}[radix.group(1).lower()]
            try:
                return float(int(radix.group(2), base))
            except ValueError:
                return math.nan
        if not _DECIMAL_LITERAL.match(text):
            return math.nan
        return float(text.replace("Infinity", "inf"))
    if isinstance(value, list):
        return to_number(to_string(value))
    return math.nan


def encode_uri_component(value: str) -> str:
    """``encodeURIComponent`` — leaves letters, digits and ``- _ . ! ~ * ' ( )``."""
    return quote(value, safe="-_.!~*'()")


def capitalize_first(value: str) -> str:
    """``value.charAt(0).toUpperCase() + value.slice(1)``."""
    return value[:1].upper() + value[1:] if value else ""


__all__ = [
    "JS_SPACE",
    "UNDEFINED",
    "capitalize_first",
    "encode_uri_component",
    "is_nullish",
    "length",
    "number_to_string",
    "primitive_text",
    "round_half_up",
    "to_number",
    "to_string",
    "trim",
]
