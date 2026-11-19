"""Copy the contract's data files into the package before every build.

The JSON Schemas and the renderer's data are written by the TypeScript packages
(``packages/*/schema``, ``packages/email/fixtures``). They must be inside the
installed package, but are not committed under ``python/``: a copy that could
drift from its source is how the two sides would come to disagree. So every
build copies them, from the repository around this folder.

Building from an sdist, the repository is not there and the copies already are
(``artifacts`` in ``pyproject.toml`` put them in): nothing to do.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

#: (source under the repository root, destination under ``src/builderset``).
ASSETS = (
    ("packages/article/schema/article.schema.json", "article/schema.json"),
    ("packages/email/schema/email.schema.json", "email/schema.json"),
    ("packages/email/fixtures/render_data.json", "email/render_data.json"),
)


def copy_assets(python_root: Path) -> list[Path]:
    """Copy every asset; returns the destinations. Used by the tests too."""
    repository = python_root.parent
    package = python_root / "src" / "builderset"
    written: list[Path] = []
    for source, destination in ASSETS:
        origin = repository / source
        target = package / destination
        if not origin.is_file():
            if target.is_file():
                continue  # an sdist build: the copy came with it
            raise FileNotFoundError(f"{origin} is missing: build from the Builderset repository")
        shutil.copyfile(origin, target)
        written.append(target)
    return written


try:  # hatchling exists while building; the tests import copy_assets without it.
    from hatchling.builders.hooks.plugin.interface import BuildHookInterface
except ImportError:  # pragma: no cover
    pass
else:

    class CustomBuildHook(BuildHookInterface):  # type: ignore[type-arg]
        def initialize(self, version: str, build_data: dict[str, Any]) -> None:
            copy_assets(Path(self.root))
