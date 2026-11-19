"""``{{ value | date }}``, ``| money``, ``| number`` — as ``Intl`` writes them.

The TS renderer formats with the browser's ``Intl`` (ICU) in three locales; the
port must write the same characters, down to which kind of space separates the
thousands. ICU's data for exactly these cases is spelled out below rather than
taken from a library, because a library's CLDR version would drift from Node's
and the parity test would fail for reasons nobody could see in the code.

What ICU does, per locale:

=========  ===================  =========================  ===========  ==============
locale     date (medium)        date (full)                time         12 500 (money)
=========  ===================  =========================  ===========  ==============
sq-AL      2 tet 2026           e premte, 2 tetor 2026     9:35 m.d.    12 500 €
de-DE      02.10.2026           Freitag, 2. Oktober 2026   21:35        12.500 €
en-GB      2 Oct 2026           Friday, 2 October 2026     21:35        €12,500
=========  ===================  =========================  ===========  ==============

Albanian groups thousands only from five digits (``1234`` but ``12 345``) — its
CLDR minimum grouping is 2 — and both it and German put a no-break space before
the euro sign. Rounding is half away from zero on the DECIMAL value, so 1.0005
rounds to 1.001 (a float's binary error does not decide it).
"""

from __future__ import annotations

import math
from datetime import UTC, date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from zoneinfo import ZoneInfo

from app.domains.email_builder.render.js import UNDEFINED, primitive_text, to_number

TIRANE = ZoneInfo("Europe/Tirane")
NBSP = chr(0xA0)

_MONTHS_SHORT = {
    "sq": ["jan", "shk", "mar", "pri", "maj", "qer", "korr", "gush", "sht", "tet", "nën", "dhj"],
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"],
}
_MONTHS_LONG = {
    "sq": [
        "janar",
        "shkurt",
        "mars",
        "prill",
        "maj",
        "qershor",
        "korrik",
        "gusht",
        "shtator",
        "tetor",
        "nëntor",
        "dhjetor",
    ],
    "de": [
        "Januar",
        "Februar",
        "März",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember",
    ],
    "en": [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ],
}
#: Monday first, as ``datetime.weekday()`` counts.
_WEEKDAYS = {
    "sq": ["e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë", "e diel"],
    "de": ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
    "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
}


def language(locale: str) -> str:
    """The renderer's own mapping: ``sq`` → sq-AL, ``de`` → de-DE, anything else en-GB."""
    return locale if locale in ("sq", "de") else "en"


# ── dates ────────────────────────────────────────────────────────────────────


def parse_date(text: str) -> datetime | None:
    """``new Date(text)`` for the ISO forms data carries.

    A bare date is midnight UTC, as JavaScript reads it. A date-time with no
    offset is read as UTC too — the API's own timestamps always carry one.
    """
    value = text.strip()
    if not value:
        return None
    try:
        if len(value) == 10:
            day = date.fromisoformat(value)
            return datetime(day.year, day.month, day.day, tzinfo=UTC)
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _date_medium(moment: datetime, lang: str) -> str:
    if lang == "de":
        return f"{moment.day:02d}.{moment.month:02d}.{moment.year}"
    return f"{moment.day} {_MONTHS_SHORT[lang][moment.month - 1]} {moment.year}"


def _date_full(moment: datetime, lang: str) -> str:
    weekday = _WEEKDAYS[lang][moment.weekday()]
    month = _MONTHS_LONG[lang][moment.month - 1]
    if lang == "de":
        return f"{weekday}, {moment.day}. {month} {moment.year}"
    return f"{weekday}, {moment.day} {month} {moment.year}"


def _time_short(moment: datetime, lang: str) -> str:
    if lang == "sq":
        hour = moment.hour % 12 or 12
        return f"{hour}:{moment.minute:02d} {'p.d.' if moment.hour < 12 else 'm.d.'}"
    return f"{moment.hour:02d}:{moment.minute:02d}"


def format_date(value: Any, format_: str, locale: str) -> str:
    moment = parse_date(primitive_text(value))
    if moment is None:
        return primitive_text(value)
    local = moment.astimezone(TIRANE)
    lang = language(locale)
    if format_ == "date":
        return _date_medium(local, lang)
    if format_ == "date_long":
        return _date_full(local, lang)
    if format_ == "time":
        return _time_short(local, lang)
    return f"{_date_medium(local, lang)}, {_time_short(local, lang)}"


# ── numbers ──────────────────────────────────────────────────────────────────


def _group(integer: str, lang: str) -> str:
    separator = {"en": ",", "de": ".", "sq": NBSP}[lang]
    minimum = 2 if lang == "sq" else 1
    # CLDR "minimum grouping digits": the first separator only appears once the
    # number has that many digits beyond the first group of three.
    if len(integer) < 3 + minimum:
        return integer
    groups: list[str] = []
    while len(integer) > 3:
        groups.insert(0, integer[-3:])
        integer = integer[:-3]
    groups.insert(0, integer)
    return separator.join(groups)


def _decimal_parts(value: float, fraction_digits: int) -> tuple[bool, str, str]:
    """Sign, integer digits and fraction digits, rounded half away from zero."""
    negative = math.copysign(1.0, value) < 0
    exact = Decimal(repr(abs(value)))
    quantum = Decimal(1).scaleb(-fraction_digits)
    rounded = exact.quantize(quantum, rounding=ROUND_HALF_UP)
    text = f"{rounded:f}"
    integer, _, fraction = text.partition(".")
    return negative, integer, fraction.rstrip("0")


def format_number(value: Any, locale: str, *, fraction_digits: int = 3) -> str:
    number = to_number(value)
    if math.isnan(number):
        return "NaN"
    lang = language(locale)
    if math.isinf(number):
        return ("-" if number < 0 else "") + "∞"
    negative, integer, fraction = _decimal_parts(number, fraction_digits)
    decimal = "." if lang == "en" else ","
    body = _group(integer, lang) + (decimal + fraction if fraction else "")
    return ("-" if negative else "") + body


def format_money(value: Any, locale: str, currency: str) -> str:
    """Currency, no decimals — what ``maximumFractionDigits: 0`` asks ICU for."""
    lang = language(locale)
    symbol = "€" if currency == "EUR" else currency
    number = to_number(value)
    if math.isnan(number):
        amount, negative = "NaN", False
    else:
        negative, integer, _ = _decimal_parts(number, 0)
        amount = _group(integer, lang)
    sign = "-" if negative else ""
    if lang == "en":
        joiner = "" if symbol == "€" else NBSP
        return f"{sign}{symbol}{joiner}{amount}"
    return f"{sign}{amount}{NBSP}{symbol}"


def format_value(value: Any, format_: str | None, locale: str, currency: str) -> str:
    """``formatValue`` in ``context.ts``."""
    if value is None or value is UNDEFINED:
        return ""
    if format_ in ("date", "date_long", "time", "datetime"):
        return format_date(value, format_, locale)
    if format_ == "money":
        return format_money(value, locale, currency)
    if format_ == "number":
        return format_number(value, locale)
    text = primitive_text(value)
    if format_ == "upper":
        return text.upper()
    if format_ == "lower":
        return text.lower()
    if format_ == "capitalize":
        return text[:1].upper() + text[1:]
    return text


__all__ = ["format_date", "format_money", "format_number", "format_value", "language"]
