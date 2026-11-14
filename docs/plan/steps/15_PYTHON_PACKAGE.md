# 15 — The Python package

## Goal

Validating a document and rendering an email in Python is `pip install builderset`. The code lives in the product's repository, is tested against the same fixtures as the TypeScript, and is released with the same version number. MotorsAL's API deletes its copy.

## Why

The API already contains a complete Python side of the product:

| What                                     | Where                                                                                                                                   | Size        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| The email renderer, a line-for-line port | [api/app/domains/email_builder/render/](../../../api/app/domains/email_builder/render/): `html.py`, `context.py`, `formats.py`, `js.py` | 2,159 lines |
| Email validation                         | [api/app/domains/email_builder/document.py](../../../api/app/domains/email_builder/document.py)                                         | 357 lines   |
| Article validation                       | [api/app/domains/content/document.py](../../../api/app/domains/content/document.py)                                                     | 505 lines   |
| Content languages                        | [api/app/core/content_i18n.py](../../../api/app/core/content_i18n.py)                                                                   |             |

It reproduces the TypeScript output byte for byte ([test_email_render_parity.py](../../../api/tests/unit/test_email_render_parity.py)). Two things are wrong with where it is:

- **It follows the TypeScript by hand, from another repository.** After step 14, a renderer change arrives in MotorsAL as a failing parity test, and someone ports the change into `api/`. In one repository the port is part of the same pull request.
- **Nobody else can use it.** A product that says "any backend" and has a finished Python implementation locked inside one application is leaving its best argument unused.

## Before you start

- Step 14 is done.
- The PyPI account and the pending trusted publisher from step 01 exist.

## The work

### Part A — in the product's repository

#### 1. The layout

```
python/
├── src/builderset/
│   ├── __init__.py            __version__
│   ├── py.typed
│   ├── issues.py              DocumentIssue
│   ├── i18n.py                localize, document_locales       ← api/app/core/content_i18n.py
│   ├── urls.py                is_safe_url
│   ├── article/
│   │   ├── __init__.py        check_article, media_keys, limits
│   │   ├── document.py                                          ← api/app/domains/content/document.py
│   │   └── schema.json        copied from packages/article/schema at build time
│   └── email/
│       ├── __init__.py        check_email, render_email, RenderedEmail, EmailTypeSpec, DEFAULT_BRAND
│       ├── document.py                                          ← api/app/domains/email_builder/document.py
│       ├── types.py           EmailTypeSpec, variable_paths     ← the generic part of email_builder/types.py
│       ├── schema.json        copied from packages/email/schema at build time
│       ├── render_data.json   copied from packages/email/fixtures at build time
│       └── render/            html.py, context.py, formats.py, js.py
├── tests/
│   ├── test_article_document.py
│   ├── test_email_document.py
│   └── test_email_render_parity.py
├── pyproject.toml
└── README.md
```

Copy the files with their history where that is practical (`git filter-repo` again, on the `api/` paths, merged into the product's repository), or as one commit that names the MotorsAL commit they came from.

#### 2. Cut the ties to the application

The modules import four things from MotorsAL's application:

| Import today                                                                | In the package                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `from app.core.content_i18n import localize, document_locales`              | `from builderset.i18n import …`                                                                                                             |
| `from app.domains.content.document import DocumentIssue, is_safe_url`       | `from builderset.issues import DocumentIssue`, `from builderset.urls import is_safe_url`                                                    |
| `from app.domains.email_builder.types import EmailTypeSpec, variable_paths` | `from builderset.email.types import …`. Only the dataclass and the helper move; MotorsAL's list of email types stays in the API             |
| `from app.integrations import storage`                                      | **An argument.** The validators ask storage which media keys a document may use. That is the application's rule (BLUEPRINT §11): pass it in |

The last one is the only real design change:

```python
def check_article(
    document: Any,
    *,
    publishing: bool = False,
    locales: Sequence[str] | None = None,
    is_allowed_media_key: Callable[[str], bool] | None = None,
) -> list[DocumentIssue]: ...
```

With no `is_allowed_media_key`, media keys are checked for shape only. MotorsAL passes a function that calls its storage module.

`CONTENT_LOCALES` became configuration in step 05; here it becomes the `locales` argument.

#### 3. Formats for any language

`formats.py` holds month and day names for `sq`, `en` and `de`, written out so the output matches JavaScript's `Intl` byte for byte. A fourth language has no table.

- Keep the three tables exactly as they are; the golden fixtures depend on them.
- For any other locale, fall back to [Babel](https://babel.pocoo.org) if it is installed (an optional dependency: `pip install builderset[locales]`), and to English if it is not, with a render warning `format.locale.fallback`.
- Add golden cases in a fourth and fifth language to the TypeScript golden test, see how far Babel's output is from `Intl`'s, and document the difference honestly: "dates in languages other than `sq`, `en` and `de` may differ in punctuation between the TypeScript and Python renderers".

Do not promise byte equality for every language. It holds for three because someone checked three.

#### 4. The fixtures are shared, not copied

The Python tests read the fixtures where the TypeScript tests write them:

```python
ROOT = Path(__file__).resolve().parents[2]            # the repository root
EMAIL_FIXTURES = ROOT / "packages" / "email" / "fixtures"
ARTICLE_FIXTURES = ROOT / "packages" / "article" / "fixtures"
```

No mirror, no sync script. A pull request that changes `html.ts` regenerates the golden files, the Python parity test fails in the same pull request, and the same pull request fixes `html.py`.

`schema.json` and `render_data.json` must be inside the installed package, though. A small build hook copies them from `packages/…` into `python/src/builderset/…` before the wheel is built; the copies are ignored by git, and a test fails if they differ from the source.

#### 5. `pyproject.toml`

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "builderset"
dynamic = ["version"]
description = "Validate builder documents and render emails. The Python side of the builderset builders."
readme = "README.md"
license = "MIT"
requires-python = ">=3.11"
dependencies = ["jsonschema>=4.23"]

[project.optional-dependencies]
locales = ["babel>=2.16"]
dev = ["pytest", "ruff", "mypy"]

[tool.hatch.version]
path = "src/builderset/__init__.py"
```

**`requires-python`.** MotorsAL's API runs Python 3.14 only, and the code may use syntax from recent versions. Set the lowest version the code really runs on: try 3.11, fix what is cheap to fix, and raise the floor for the rest. A library that needs the newest Python is a library few can install.

#### 6. One version number

The npm packages get their version from Changesets. The Python package must get the same one.

- Add a script, `tooling/sync-python-version.mjs`, that reads the version from `packages/engine/package.json` and writes it into `python/src/builderset/__init__.py`, converting the pre-release form: npm's `0.1.0-alpha.3` is PyPI's `0.1.0a3`.
- Run it as part of the version command in `release.yml`: `version: pnpm changeset version && node tooling/sync-python-version.mjs`.

#### 7. CI and release

In `ci.yml`, a `python` job: Ruff, mypy, pytest on every supported Python version. It needs the repository checked out whole, because the tests read `packages/*/fixtures`.

In `release.yml`, a second job after the npm publish, in an environment named `pypi`:

```yaml
pypi:
  needs: release
  if: needs.release.outputs.published == 'true'
  runs-on: ubuntu-latest
  environment: pypi
  permissions:
    id-token: write
  steps:
    - uses: actions/checkout@v5
    - uses: astral-sh/setup-uv@v6
    - run: node tooling/copy-python-assets.mjs
    - run: uv build python
    - uses: pypa/gh-action-pypi-publish@release/v1
      with:
        packages-dir: python/dist
```

PyPI's trusted publishing needs no token at all, including for the first upload: the pending publisher from step 01 is what authorises it.

#### 8. The README

```python
from builderset.email import check_email, render_email

issues = check_email(document)
if issues:
    raise ValueError([issue.as_dict() for issue in issues])

email = render_email(
    document,
    brand=brand,
    data={"recipient": {"name": "Ana"}},
    locale="en",
    asset_url=lambda key: f"https://cdn.example.com/{key}",
)
send(to=recipient, subject=email.subject, html=email.html, text=email.text)
```

Take the real argument names from the code. State plainly what the package does not do: it has no editor, it does not send, it does not render articles to HTML (the article renderer is React; a Python site receives the document and renders it with its own templates, or serves it to a JavaScript front end).

### Part B — in MotorsAL

#### 1. Install and switch

Add `builderset==<version>` to [api/pyproject.toml](../../../api/pyproject.toml), pinned like the other dependencies.

| MotorsAL module                                                | Becomes                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `app/domains/email_builder/render/`                            | Deleted. Callers import `render_email` from `builderset.email`                                 |
| `app/domains/email_builder/document.py`                        | A thin module: calls `builderset.email.check_email` with MotorsAL's media rule and email types |
| `app/domains/content/document.py`                              | The same for `builderset.article.check_article`                                                |
| `app/core/content_i18n.py`                                     | Deleted, or reduced to MotorsAL's list of languages                                            |
| `app/domains/email_builder/types.py`                           | Keeps MotorsAL's email types; imports `EmailTypeSpec` from the package                         |
| `email_schema.json`, `builder_schema.json`, `render_data.json` | Deleted: they are inside the package                                                           |

#### 2. The tests and the sync script

- `tests/unit/test_email_render_parity.py` keeps only the `golden/motors/` cases — MotorsAL's own designs, produced by `packages/builder-presets`. The `golden/kit/` cases are tested in the product's repository now; delete them here.
- `tests/unit/test_article_document.py` and `test_email_document.py`: keep the cases that test MotorsAL's rules (its media folders, its email types); delete the ones that only repeat the package's own tests, with their fixtures.
- `scripts/sync-builder-contract.mjs` and its CI check are deleted. There is nothing left to copy.

#### 3. One rule to add

The admin's `@builderset/*` npm version and the API's `builderset` PyPI version must be the same. Add a check to CI that reads both and fails when they differ. With one version number for everything, "the same" is a string comparison (after the pre-release form is converted).

## Check

In the product's repository:

```bash
uv run --project python pytest python/tests
uv build python && uv run --with python/dist/*.whl python -c "from builderset.email import render_email; print(render_email)"
```

The second line proves the wheel contains `schema.json` and `render_data.json`: importing reads them.

In MotorsAL: lint, type check and the API's unit tests pass; a real email sent from staging is byte-identical to one sent before the change (compare the stored HTML of the same template with the same data).

## Done when

- [ ] `python/` in the product's repository holds the validators and the renderer, importing nothing from an application.
- [ ] Its tests read the fixtures from `packages/*/fixtures` and pass on every supported Python version.
- [ ] The media-key rule and the allowed languages are arguments.
- [ ] `builderset` is on PyPI at the same version as the npm packages, published by trusted publishing.
- [ ] MotorsAL's API imports from `builderset`; its own renderer, schemas and the sync script are gone.
- [ ] CI in MotorsAL fails when the npm and PyPI versions differ.
- [ ] A staging email is byte-identical to before.

**With step 14, this is milestone M3.**

## Traps

- **Improving the Python on the way.** `js.py` exists because the renderer must behave like JavaScript where the two languages differ (`Math.round(2.5)`, `String(5.0)`). It looks strange and it is correct. Move first; any clean-up is a later pull request with the parity test as its judge.
- **A wheel without its data files.** The tests pass in the repository, where the JSON files exist, and the installed package fails at import. Always test the built wheel, in a clean environment.
- **Pre-release version forms.** `0.1.0-alpha.3` is not a valid PyPI version; `0.1.0a3` is. The sync script must convert, and the equality check in MotorsAL must compare after converting.
- **The Python floor set to 3.14 "because it works".** It works there because that is the only place it has run.
- **Dropping MotorsAL's own tests too eagerly.** The tests of its media rule and its email types are about MotorsAL's behaviour and stay.
