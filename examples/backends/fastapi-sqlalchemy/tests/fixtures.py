"""The email kit's own fixtures: a valid starter, and invalid documents with
the issue code each must be refused with (``invalid/manifest.json``)."""

import json
from pathlib import Path
from typing import Any

FIXTURES = Path(__file__).resolve().parents[4] / "packages" / "email" / "fixtures"


def fixture(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))
