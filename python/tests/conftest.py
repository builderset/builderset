"""The tests read the TypeScript packages' fixtures where those tests write them.

No mirror and no sync script: a change to ``html.ts`` regenerates the golden
files, and the parity test here fails in the same pull request.
"""

from __future__ import annotations

import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = PYTHON_ROOT.parent
EMAIL_FIXTURES = REPOSITORY / "packages" / "email" / "fixtures"
ARTICLE_FIXTURES = REPOSITORY / "packages" / "article" / "fixtures"
FORM_FIXTURES = REPOSITORY / "packages" / "form" / "fixtures"

# The package reads its schemas from inside itself; in the repository they are
# copied there from `packages/`, as a build does. Fresh for every run.
sys.path.insert(0, str(PYTHON_ROOT))
from hatch_build import copy_assets  # noqa: E402

copy_assets(PYTHON_ROOT)
