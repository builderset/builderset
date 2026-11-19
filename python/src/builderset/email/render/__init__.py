"""The email renderer, in Python — a port of Builderset's ``packages/email/src/render``.

A backend renders at send time and should not need Node, so the TS renderer
the editor previews with is ported here and held equal to it by golden
fixtures: ``python/tests/test_email_render_parity.py`` renders every fixture
the TS test wrote and compares bytes. The preview the editor shows is what is
sent.

    from builderset.email.render import render_email

    rendered = render_email(document, asset_url=public_url, brand=kit, data=data, locale="sq")
"""

from __future__ import annotations

from builderset.email.render.context import DEFAULT_BRAND, social_icon_url
from builderset.email.render.html import RenderedEmail, render_email

__all__ = ["DEFAULT_BRAND", "RenderedEmail", "render_email", "social_icon_url"]
