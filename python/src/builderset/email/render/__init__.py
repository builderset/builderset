"""The email renderer, in Python — a port of Builderset's ``packages/email/src/render``.

The API renders at send time and must not depend on Node, so the TS renderer
the editor previews with is ported here and held equal to it by golden
fixtures: ``tests/unit/test_email_render_parity.py`` renders every fixture the
TS test wrote and compares bytes. The preview the editor shows is what is sent.

    from app.domains.email_builder.render import render_email

    rendered = render_email(document, asset_url=public_url, brand=kit, data=data, locale="sq")
"""

from __future__ import annotations

from app.domains.email_builder.render.context import DEFAULT_BRAND, social_icon_url
from app.domains.email_builder.render.html import RenderedEmail, render_email

__all__ = ["DEFAULT_BRAND", "RenderedEmail", "render_email", "social_icon_url"]
