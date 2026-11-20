"""What JavaScript does to a value, where Python would do something else.

``validateAnswers`` is TypeScript, and a form's answers are checked by the
browser before they are checked here: the two must agree on every answer. So
the few JavaScript rules the checks lean on are written out, rule for rule:
what is whitespace (``\\s``, ``trim``), how long a string is (UTF-16 code
units), how a string becomes a number (``Number("0x1A")`` is 26, ``Number("")``
is 0) and how a number becomes a string (``String(1e21)`` is ``"1e+21"``).
"""

from __future__ import annotations

import math
import re
from decimal import Decimal
from typing import Any, TypeGuard

#: ``\\s`` in a JavaScript regular expression, and what ``String.prototype.trim``
#: removes: WhiteSpace and LineTerminator. Python's ``str.isspace`` differs
#: (it counts ``\\x1c`` to ``\\x1f`` and ``\\x85``; it does not count ``\\ufeff``).
WHITESPACE = "".join(
    map(
        chr,
        [
            *(0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680),
            *range(0x2000, 0x200B),
            *(0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF),
        ],
    )
)
#: ``\\s``, for a character class: ``f"[{WS}]"``.
WS = re.escape(WHITESPACE)
_ANY_WHITESPACE = re.compile(f"[{WS}]")


def trim(text: str) -> str:
    """``String.prototype.trim``."""
    return text.strip(WHITESPACE)


def without_whitespace(text: str) -> str:
    """``text.replace(/\\s/g, '')``."""
    return _ANY_WHITESPACE.sub("", text)


def utf16(text: str) -> str:
    """The string as JavaScript holds it: one character per UTF-16 code unit.

    A character outside the Basic Multilingual Plane (an emoji) becomes its two
    surrogates, so ``len`` is JavaScript's ``length`` and a regular expression
    without the ``u`` flag sees what JavaScript's sees.
    """
    if text.isascii() or all(ord(char) < 0x10000 for char in text):
        return text
    units: list[str] = []
    for char in text:
        code = ord(char)
        if code < 0x10000:
            units.append(char)
        else:
            code -= 0x10000
            units.append(chr(0xD800 + (code >> 10)))
            units.append(chr(0xDC00 + (code & 0x3FF)))
    return "".join(units)


def length(text: str) -> int:
    """``text.length``: UTF-16 code units, not code points."""
    return len(utf16(text))


def is_number(value: Any) -> TypeGuard[int | float]:
    """``typeof value === 'number'`` — a JSON number; ``True`` is not one."""
    return isinstance(value, int | float) and not isinstance(value, bool)


_DECIMAL = re.compile(r"[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)")
_RADIX = {"x": 16, "o": 8, "b": 2}
_INTEGER = re.compile(r"0([xXoObB])([0-9a-fA-F]+)")


def to_number(text: str) -> float:
    """``Number(text)``: JavaScript's StringToNumber.

    Whitespace around it is ignored and an empty string is 0. ``0x``, ``0o``
    and ``0b`` integers are read; ``1_000``, ``nan`` and ``infinity`` (which
    Python's ``float`` takes) are not numbers.
    """
    value = trim(text)
    if value == "":
        return 0.0
    if _DECIMAL.fullmatch(value):
        return float(value)
    radix = _INTEGER.fullmatch(value)
    if radix:
        base = _RADIX[radix.group(1).lower()]
        try:
            whole = int(radix.group(2), base)
        except ValueError:
            return math.nan
        try:
            return float(whole)
        except OverflowError:
            return math.inf
    return math.nan


def as_float(value: int | float) -> float:
    """A JSON number as JavaScript holds it: a double, an integer too big for one is Infinity."""
    try:
        return float(value)
    except OverflowError:
        return math.inf if value > 0 else -math.inf


def loose_number(value: Any) -> float:
    """``ToNumber`` on any JSON value, as ``>`` applies it: ``null`` is 0, a list its text."""
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if is_number(value):
        return as_float(value)
    if isinstance(value, str):
        return to_number(value)
    if isinstance(value, list):
        return to_number(array_text(value))
    return math.nan


def array_text(value: list[Any]) -> str:
    """``String([...])``: the items joined with commas, ``null`` as nothing."""
    return ",".join(
        "" if item is None else array_text(item) if isinstance(item, list) else to_string(item)
        for item in value
    )


def number_to_string(value: float) -> str:
    """``String(number)``: Number::toString, the shortest digits that read back."""
    number = as_float(value)
    if math.isnan(number):
        return "NaN"
    if number == 0:
        return "0"
    if math.isinf(number):
        return "Infinity" if number > 0 else "-Infinity"
    sign = "-" if number < 0 else ""
    parts = Decimal(repr(abs(number))).as_tuple()
    every = "".join(map(str, parts.digits))
    exponent = int(parts.exponent)
    # value = 0.<digits> * 10**point
    point = len(every) + exponent
    digits = every.rstrip("0").lstrip("0")
    point -= len(every) - len(every.lstrip("0"))
    count = len(digits)
    if count <= point <= 21:
        text = digits + "0" * (point - count)
    elif 0 < point <= 21:
        text = f"{digits[:point]}.{digits[point:]}"
    elif -6 < point <= 0:
        text = "0." + "0" * -point + digits
    else:
        power = point - 1
        mantissa = digits if count == 1 else f"{digits[0]}.{digits[1:]}"
        text = f"{mantissa}e{'+' if power >= 0 else '-'}{abs(power)}"
    return sign + text


def to_string(value: Any) -> str:
    """``String(value)`` for a JSON primitive."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if is_number(value):
        return number_to_string(value)
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return array_text(value)
    return "[object Object]"


_INDEX = re.compile(r"0|[1-9][0-9]*")


def object_values(value: dict[str, Any]) -> list[Any]:
    """``Object.values``: integer-like keys first, ascending, then the rest in order."""
    indexes = sorted(
        (key for key in value if _INDEX.fullmatch(key) and int(key) < 2**32 - 1), key=int
    )
    if not indexes:
        return list(value.values())
    rest = [key for key in value if key not in set(indexes)]
    return [value[key] for key in [*indexes, *rest]]


def to_number_or_int(value: float) -> int | float:
    """A number as JSON would carry it from JavaScript: ``2015``, not ``2015.0``."""
    if math.isfinite(value) and value.is_integer() and abs(value) < 2**53:
        return int(value)
    return value


__all__ = [
    "WHITESPACE",
    "WS",
    "array_text",
    "as_float",
    "is_number",
    "length",
    "loose_number",
    "number_to_string",
    "object_values",
    "to_number",
    "to_number_or_int",
    "to_string",
    "trim",
    "utf16",
    "without_whitespace",
]
