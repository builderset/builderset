"""What the views read from a request, the same way everywhere."""

from datetime import date, datetime
from typing import Any

from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.request import Request


def body_of(request: Request) -> dict[str, Any]:
    """The JSON body, or nothing when it is not an object."""
    return request.data if isinstance(request.data, dict) else {}


def instant(value: Any) -> datetime | None:
    """An ISO 8601 instant from the body, or None when it is missing or not one."""
    try:
        return parse_datetime(value) if isinstance(value, str) else None
    except ValueError:  # well formed, but no such date: 2026-02-30
        return None


def day(value: Any) -> date | None:
    """A YYYY-MM-DD date from the body, or None when it is missing or not one."""
    try:
        return parse_date(value) if isinstance(value, str) else None
    except ValueError:
        return None


def limit_of(request: Request, *, default: int = 50, most: int = 200) -> int:
    """``?limit=``, within reason."""
    try:
        return max(1, min(int(request.query_params.get("limit", default)), most))
    except ValueError:
        return default
