"""Use the BUILT wheel the way a project would, outside the repository.

The tests run in the repository, where the JSON files exist next to the code; a
wheel without them would still pass there and fail at import everywhere else.
CI installs the wheel into a clean environment and runs this:

    uv run --isolated --no-project --with python/dist/<wheel> python tooling/python-wheel-smoke.py <fixtures>
"""

import json
import sys
from pathlib import Path

import builderset
from builderset.article import check_article
from builderset.email import check_email, render_email

fixtures = Path(sys.argv[1])
assert "site-packages" in builderset.__file__, f"not the installed wheel: {builderset.__file__}"

article = json.loads((fixtures / "article" / "fixtures" / "valid" / "kitchen-sink.json").read_text("utf-8"))
assert check_article(article) == [], "the article kitchen sink must pass"

email = json.loads((fixtures / "email" / "fixtures" / "valid" / "starter.json").read_text("utf-8"))
assert check_email(email) == [], "the email starter must pass"
rendered = render_email(email, asset_url=lambda key: f"https://cdn.test/{key}", data={"recipient": {"name": "Ana"}}, locale="en")
assert rendered.html.startswith("<!DOCTYPE html"), rendered.html[:80]
assert rendered.text and rendered.subject

print(f"builderset {builderset.__version__} from {Path(builderset.__file__).parent}: checks and renders")
