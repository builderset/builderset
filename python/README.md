# builderset (Python)

Validate Builderset documents and form answers, and render emails, in Python —
the server side of the [Builderset](../README.md) builders. It checks an article,
an email or a form the way the TypeScript packages do, with the same error codes;
checks a form's answers exactly as the browser did; and renders an email to the
same HTML and text, byte for byte: the email a backend sends is the one the
editor previewed.

Same version as the npm packages, released together. Until Builderset is
public, the wheel is attached to each GitHub release rather than published to
PyPI ([DECISIONS.md](../docs/plan/DECISIONS.md), D9):

```bash
pip install ./builderset-0.4.0-py3-none-any.whl
```

Python 3.11 or newer. Depends on `jsonschema` and `tzdata`.

## Emails

```python
from builderset.email import check_email, render_email

issues = check_email(document)
if issues:
    raise ValueError([issue.as_dict() for issue in issues])

email = render_email(
    document,
    asset_url=lambda key: f"https://cdn.example.com/{key}",
    brand=brand,  # a brand kit; DEFAULT_BRAND when omitted
    data={"recipient": {"name": "Ana"}},
    locale="en",  # a multi-language template's language
    currency="EUR",
)
send(to=recipient, subject=email.subject, html=email.html, text=email.text)
```

`check_email(document, spec, *, locales, check_media_key)`:

- `spec` — the template's email type (`EmailTypeSpec`): the variables the sending
  code provides, the ones the template must use, and whether it is marketing
  (which needs an unsubscribe link). Your application declares its types.
- `locales` — the languages you write in; a template holding another is
  `i18n.locale.unknown`.
- `check_media_key` — your rule for media keys (below).

A template being edited may still carry the codes in `DRAFT_TOLERATES`;
activating it should refuse every issue.

## Articles

```python
from builderset.article import check_article, media_keys, reading_minutes_of

issues = check_article(document, locales=["en", "de"], check_media_key=media_rule)
```

There is no article renderer in Python: the article renderer is React
(`@builderset/article/render`). A Python site serves the document to a
JavaScript front end, or renders it with its own templates.

## Forms

```python
from builderset.form import check_form, is_publish_blocking, validate_answers

issues = check_form(form, locales=["en", "de"], check_media_key=media_rule)
if any(is_publish_blocking(issue) for issue in issues):
    raise ValueError([issue.as_dict() for issue in issues])

result = validate_answers(form, answers)  # step=0 checks one step only
if not result.ok:
    return 422, result.as_dict()["errors"]  # {key: {code, limit?, message?}}
store(result.values)  # shown fields only, numbers as numbers
```

`check_form(document, *, locales, check_media_key)` reports `checkForm`'s codes.
Some are warnings (`is_warning`, `WARNINGS`): worth showing, never a reason to
refuse. A draft may still carry the codes in `DRAFT_TOLERATES`
(`is_draft_blocking`); going live refuses every error (`is_publish_blocking`).

`validate_answers(document, answers, *, step)` is `validateAnswers`, rule for rule:
logic decides which fields show (a hidden field's stale answer is dropped), then
each answer is held to its field — required, formats, lengths, ranges, options,
files. Where JavaScript reads a value its own way, so does this: `"0x10"` is the
number 16, an emoji is two characters long. `check_answer`, `is_shown`,
`steps_of` and `form_fields` are there too.

A form's own pattern (`checks.regex`) is compiled by Python's `re`, not by a
JavaScript `RegExp`. The two agree on what people write for a plate or a code;
on exotic syntax (`\p{…}`, variable-length lookbehind) one of them may refuse what
the other takes.

There is no form renderer in Python: the form renderer is React
(`@builderset/form/render`).

## Media keys are your rule

Which storage keys exist, and which a document may use, is your application's
business. Pass a function that returns `None` for an allowed key and an issue
code otherwise:

```python
def media_rule(key: str) -> str | None:
    if not storage.minted(key):
        return "media.invalidKey"
    if not key.startswith("article-"):
        return "media.wrongFolder"
    return None
```

Without one, keys are checked for their shape only: a relative path of plain
segments — no leading slash, no `..`, no backslash, no whitespace.

## Dates and numbers

`{{ value | date }}`, `| money` and `| number` are written as JavaScript's `Intl`
writes them, in three languages: `sq`, `en` and `de`. Any other language is
formatted as English, and dates are shown in the `Europe/Tirane` time zone —
in both renderers, so they still agree byte for byte.

## What it does not do

No editor, no sending, no article or form HTML. It does not store anything and calls
nothing over the network.

## Development

From the repository root — the tests read the TypeScript packages' fixtures
(`packages/*/fixtures`), where those tests write them:

```bash
pnpm test:python                     # uv run --project python pytest python/tests
cd python && uv run ruff check . && uv run mypy
uv build python                      # the wheel, with the schemas copied in
```
