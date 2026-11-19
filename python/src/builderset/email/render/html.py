"""``html.ts``: an email document → HTML every mail client can show, and its text part.

A line-for-line port. Layout is nested ``role="presentation"`` tables, every
style inline, columns "fluid-hybrid" with ``<!--[if mso]>`` ghost tables, buttons
padded links with a VML fallback. Any change here is a change to
Builderset's ``packages/email/src/render/html.ts`` first: the golden fixtures under
``tests/fixtures/email/golden/`` come from the TS renderer and this file must
reproduce them byte for byte — the editor's preview IS what is sent.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

from app.core.content_i18n import localize
from app.domains.email_builder.render.context import (
    TEMPLATE_TOKEN,
    RenderContext,
    color,
    create_context,
    fill,
    font_stack,
    fonts_in_use,
    google_fonts_url,
    holds,
    list_of,
    render_data,
    typography,
    variable_text,
)
from app.domains.email_builder.render.js import (
    JS_SPACE,
    UNDEFINED,
    capitalize_first,
    encode_uri_component,
    is_nullish,
    length,
    primitive_text,
    round_half_up,
    to_string,
    trim,
)

# ── escaping and urls ────────────────────────────────────────────────────────


def escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


_SCHEMES = ("http:", "https:", "mailto:", "tel:")
_CONTROL = re.compile(f"[{re.escape(JS_SPACE)}\\x00-\\x1f\\x7f]")
_ANCHOR = re.compile(r"^#[A-Za-z][A-Za-z0-9_-]*$")
_SCHEME = re.compile(r"^([A-Za-z][A-Za-z0-9+.\-]*):")
_FORBIDDEN_HOST = re.compile(r"[<>^|%\"`{}\[\]]")


def is_safe_url(value: str) -> bool:
    """``isSafeUrl`` in @builderset/engine: an allow-list of schemes, paths and anchors."""
    url = trim(value)
    if url == "" or length(url) > 2000:
        return False
    if _CONTROL.search(url):
        return False
    if url.startswith("#"):
        return bool(_ANCHOR.match(url))
    if url.startswith("/"):
        return not url.startswith("//")
    match = _SCHEME.match(url)
    if not match:
        return False
    protocol = match.group(1).lower() + ":"
    if protocol not in _SCHEMES:
        return False
    if protocol in ("http:", "https:"):
        # `new URL` refuses a web address with no host.
        rest = url[len(match.group(0)) :].lstrip("/\\")
        host = re.split(r"[/?#\\]", rest, maxsplit=1)[0]
        host = host.rsplit("@", 1)[-1]
        if not host or host.startswith(":") or _FORBIDDEN_HOST.search(host):
            return False
    return True


def is_safe_template_url(value: str) -> bool:
    if not TEMPLATE_TOKEN.search(value):
        return is_safe_url(value)
    trimmed = trim(value)
    if trimmed.startswith("{{"):
        return True
    prefix = TEMPLATE_TOKEN.split(trimmed)[0]
    return is_safe_url(prefix or trimmed)


def href(template: str, context: RenderContext, scope: dict[str, Any]) -> str:
    """A link after substitution — refused (as ``''``) when not a safe URL."""
    if not trim(template) or not is_safe_template_url(template):
        return ""
    url = trim(fill(template, context, scope))
    if not is_safe_url(url):
        return ""
    utm = context.settings["utm"]
    if not utm.get("enabled") or not re.match(r"^https?:", url, re.IGNORECASE):
        return url
    separator = "&" if "?" in url else "?"
    params = "&".join(
        f"{key}={encode_uri_component(str(value))}"
        for key, value in (
            ("utm_source", utm.get("source")),
            ("utm_medium", utm.get("medium")),
            ("utm_campaign", utm.get("campaign")),
        )
        if value
    )
    return f"{url}{separator}{params}" if params else url


def _kebab(key: str) -> str:
    return re.sub(r"[A-Z]", lambda match: "-" + match.group(0).lower(), key)


def style(rules: dict[str, Any]) -> str:
    return ";".join(
        f"{_kebab(key)}:{to_string(value)}"
        for key, value in rules.items()
        if not is_nullish(value) and value is not False and value != ""
    )


def padding(value: Any) -> str | None:
    if not value:
        return None
    return " ".join(f"{to_string(value[side])}px" for side in ("top", "right", "bottom", "left"))


def n(value: Any) -> str:
    """``String(value)`` — for the numbers spliced into markup."""
    return to_string(value)


def _get(props: dict[str, Any], key: str) -> Any:
    """``props[key]``, where a missing key is ``undefined``."""
    return props.get(key, UNDEFINED)


def _or(value: Any, fallback: Any) -> Any:
    """``value ?? fallback``."""
    return fallback if is_nullish(value) else value


# ── rich text ────────────────────────────────────────────────────────────────


def _variable_of(run: dict[str, Any]) -> dict[str, Any] | None:
    for mark in run.get("marks") or []:
        if mark.get("type") == "variable":
            found: dict[str, Any] = mark
            return found
    return None


def _run_text(run: dict[str, Any], context: RenderContext, scope: dict[str, Any]) -> str:
    variable = _variable_of(run)
    if variable:
        return variable_text(
            variable["path"], variable.get("format"), variable.get("fallback"), context, scope
        )
    return str(run.get("text", ""))


def rich_html(
    value: Any, context: RenderContext, scope: dict[str, Any], link_color: str | None
) -> str:
    out: list[str] = []
    for run in value or []:
        html = escape_html(_run_text(run, context, scope)).replace("\n", "<br>")
        for mark in reversed(run.get("marks") or []):
            kind = mark.get("type")
            if kind == "bold":
                html = f"<strong>{html}</strong>"
            elif kind == "italic":
                html = f"<em>{html}</em>"
            elif kind == "underline":
                html = f"<u>{html}</u>"
            elif kind == "strike":
                html = f"<s>{html}</s>"
            elif kind == "code":
                html = (
                    "<code style=\"font-family:'Courier New',monospace;font-size:0.92em\">"
                    f"{html}</code>"
                )
            elif kind == "highlight":
                html = f'<mark style="background:#fef08a;color:inherit">{html}</mark>'
            elif kind == "sub":
                html = f"<sub>{html}</sub>"
            elif kind == "sup":
                html = f"<sup>{html}</sup>"
            elif kind == "font":
                stack = escape_html(font_stack(mark.get("family"), context))
                html = f'<span style="font-family:{stack}">{html}</span>'
            elif kind == "link":
                url = href(str(mark.get("href", "")), context, scope)
                if url:
                    link_style = style({"color": link_color, "textDecoration": "underline"})
                    html = (
                        f'<a href="{escape_html(url)}" target="_blank" '
                        f'style="{link_style}">{html}</a>'
                    )
        out.append(html)
    return "".join(out)


def rich_text(value: Any, context: RenderContext, scope: dict[str, Any]) -> str:
    return "".join(_run_text(run, context, scope) for run in value or [])


# ── the tree ─────────────────────────────────────────────────────────────────


@dataclass
class Frame:
    #: The width the block has to fill, in px — for images and ghost tables.
    width: float
    scope: dict[str, Any] = field(default_factory=dict)


def display_class(display: Any) -> str:
    if not display:
        return ""
    if display.get("hideOn") == "mobile":
        return "hide-mobile"
    if display.get("hideOn") == "desktop":
        return "hide-desktop"
    return ""


def visible(node: dict[str, Any], context: RenderContext, scope: dict[str, Any]) -> bool:
    if node.get("hidden"):
        return False
    display = (node.get("props") or {}).get("display")
    return not display or holds(display.get("when") or [], context, scope)


def children_of(node: dict[str, Any], context: RenderContext) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for child_id in node.get("children") or []:
        child = context.node(child_id)
        if child:
            out.append(child)
    return out


def cell(inner: str, props: dict[str, Any], extra: str = "") -> str:
    cls = display_class(props.get("display"))
    hide_desktop = "display:none;mso-hide:all;" if cls == "hide-desktop" else ""
    class_attr = f' class="{cls}"' if cls else ""
    pad = style({"padding": padding(props.get("padding"))})
    return f'<tr{class_attr}><td style="{hide_desktop}{pad}{extra}">{inner}</td></tr>'


def block_table(rows: str) -> str:
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f"{rows}</table>"
    )


def render_blocks(nodes: list[dict[str, Any]], context: RenderContext, frame: Frame) -> str:
    return "".join(
        render_block(node, context, frame) for node in nodes if visible(node, context, frame.scope)
    )


_TABLE = '<table role="presentation" cellspacing="0" cellpadding="0" border="0"'
_FULL_TABLE = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"'


def render_block(node: dict[str, Any], context: RenderContext, frame: Frame) -> str:
    p: dict[str, Any] = node.get("props") or {}
    settings = context.settings
    text = color(settings["textColor"], context)
    link = color(settings["linkColor"], context)
    font = font_stack(p.get("font"), context)
    kind = typography(p)
    align = _or(p.get("align"), "left")
    scope = frame.scope
    muted = color("brand.muted", context)

    match node.get("type"):
        case "heading":
            level = n(p["level"])
            heading_style = style(
                {
                    "margin": 0,
                    "fontFamily": font_stack(p.get("font"), context),
                    "fontSize": f"{n(p['size'])}px",
                    "lineHeight": 1.25,
                    "fontWeight": _or(kind["fontWeight"], 700),
                    "letterSpacing": kind["letterSpacing"],
                    "textTransform": kind["textTransform"],
                    "color": _or(
                        color(p.get("color"), context), color(settings["headingColor"], context)
                    ),
                    "textAlign": align,
                }
            )
            inner = (
                f'<h{level} style="{heading_style}">'
                f"{rich_html(p.get('text'), context, scope, link)}</h{level}>"
            )
            return cell(inner, p)

        case "text":
            text_style = style(
                {
                    "fontFamily": font,
                    "fontSize": f"{n(p['size'])}px",
                    "lineHeight": _or(p.get("lineHeight"), settings["lineHeight"]),
                    "color": _or(color(p.get("color"), context), text),
                    "textAlign": align,
                    "fontWeight": kind["fontWeight"],
                    "letterSpacing": kind["letterSpacing"],
                    "textTransform": kind["textTransform"],
                }
            )
            inner = (
                f'<div style="{text_style}">{rich_html(p.get("text"), context, scope, link)}</div>'
            )
            return cell(inner, p)

        case "list":
            marker = color(p.get("markerColor"), context)
            rows: list[str] = []
            for index, item in enumerate(p.get("items") or []):
                if p.get("style") == "number":
                    bullet = f"{index + 1}."
                elif p.get("style") == "check":
                    bullet = "&#10003;"
                else:
                    bullet = "&#8226;"
                marker_style = style(
                    {
                        "width": "24px",
                        "color": marker,
                        "fontWeight": 700,
                        "fontFamily": font,
                        "fontSize": f"{n(p['size'])}px",
                        "lineHeight": settings["lineHeight"],
                        "paddingBottom": "6px",
                    }
                )
                item_style = style(
                    {
                        "fontFamily": font,
                        "fontSize": f"{n(p['size'])}px",
                        "lineHeight": settings["lineHeight"],
                        "color": _or(color(p.get("color"), context), text),
                        "paddingBottom": "6px",
                    }
                )
                rows.append(
                    f'<tr><td valign="top" style="{marker_style}">{bullet}</td>'
                    f'<td style="{item_style}">'
                    f"{rich_html(item.get('text'), context, scope, link)}</td></tr>"
                )
            return cell(f'{_TABLE} align="{n(align)}">{"".join(rows)}</table>', p)

        case "button":
            url = href(str(p.get("href", "")), context, scope)
            label = escape_html(fill(str(p.get("label", "")), context, scope))
            background = _or(color(p.get("background"), context), "#111827")
            fg = _or(color(p.get("textColor"), context), "#ffffff")
            border = (
                f"{n(p['borderWidth'])}px solid "
                f"{_or(color(p.get('borderColor'), context), background)}"
                if p.get("borderWidth", 0) > 0
                else None
            )
            link_style = style(
                {
                    "display": "inline-block",
                    "padding": f"{n(p['paddingY'])}px {n(p['paddingX'])}px",
                    "fontFamily": font,
                    "fontSize": f"{n(p['size'])}px",
                    "fontWeight": _or(kind["fontWeight"], 600),
                    "letterSpacing": kind["letterSpacing"],
                    "textTransform": kind["textTransform"],
                    "lineHeight": 1.2,
                    "color": fg,
                    "textDecoration": "none",
                    "borderRadius": f"{n(p['radius'])}px",
                    "border": border,
                    "msoPaddingAlt": "0",
                }
            )
            height = p["size"] + p["paddingY"] * 2 + 4
            vml_width = max(120, length(label) * (p["size"] * 0.6) + p["paddingX"] * 2)
            arcsize = min(50, round_half_up((p["radius"] / height) * 100))
            vml = (
                '<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" '
                f'href="{escape_html(url)}" style="height:{n(height)}px;v-text-anchor:middle;'
                f'width:{n(vml_width)}px" arcsize="{n(arcsize)}%" stroke="f" '
                f'fillcolor="{background}"><w:anchorlock/><center style="color:{fg};'
                f'font-family:Arial,sans-serif;font-size:{n(p["size"])}px;font-weight:bold">'
                f"{label}</center></v:roundrect><![endif]-->"
            )
            table_align = "center" if align == "center" else "right" if align == "right" else "left"
            cell_style = style({"borderRadius": f"{n(p['radius'])}px", "background": background})
            inner = (
                f'{_TABLE} align="{table_align}" '
                f'class="{"btn-full" if p.get("fullWidthMobile") else ""}"><tr>'
                f'<td align="center" bgcolor="{background}" style="{cell_style}">{vml}'
                f'<!--[if !mso]><!--><a href="{escape_html(url or "#")}" target="_blank" '
                f'style="{link_style}">{label}</a><!--<![endif]--></td></tr></table>'
            )
            return cell(inner, p)

        case "image" | "logo":
            is_logo = node.get("type") == "logo"
            media = p.get("media")
            if is_nullish(media):
                media = _or(context.brand.get("logo"), None) if is_logo else None
            if not media:
                if is_logo:
                    logo_style = style(
                        {
                            "fontFamily": font,
                            "fontSize": "20px",
                            "fontWeight": 700,
                            "color": text,
                            "textAlign": align,
                        }
                    )
                    name = escape_html(str(context.brand.get("name", "")))
                    return cell(f'<div style="{logo_style}">{name}</div>', p)
                return ""
            width = min(frame.width, _or(p.get("width"), frame.width))
            rounded = n(round_half_up(width))
            alt_source = (
                str(context.brand.get("name", "")) if is_logo else str(_or(p.get("alt"), ""))
            )
            alt = escape_html(fill(alt_source, context, scope))
            radius = p.get("radius")
            img_style = style(
                {
                    "display": "block",
                    "width": "100%",
                    "maxWidth": f"{rounded}px",
                    "height": "auto",
                    "border": 0,
                    "outline": "none",
                    "borderRadius": f"{primitive_text(radius)}px" if radius else None,
                }
            )
            img = (
                f'<img src="{escape_html(context.asset_url(media["key"]))}" '
                f'width="{rounded}" alt="{alt}" style="{img_style}">'
            )
            url = href(str(_or(p.get("href"), "")), context, scope)
            linked = f'<a href="{escape_html(url)}" target="_blank">{img}</a>' if url else img
            table_style = style({"width": f"{rounded}px", "maxWidth": "100%"})
            inner = (
                f'{_TABLE} align="{n(align)}" style="{table_style}" class="img-fluid">'
                f"<tr><td>{linked}</td></tr></table>"
            )
            return cell(inner, p)

        case "divider":
            table_align = "left" if align == "left" else "right" if align == "right" else "center"
            rule = style(
                {
                    "borderTop": (
                        f"{n(p['thickness'])}px {n(p['style'])} "
                        f"{_or(color(p.get('color'), context), '#e5e7eb')}"
                    ),
                    "fontSize": "0",
                    "lineHeight": "0",
                }
            )
            inner = (
                f'<table role="presentation" width="{n(p["width"])}%" align="{table_align}" '
                'cellspacing="0" cellpadding="0" border="0">'
                f'<tr><td style="{rule}">&nbsp;</td></tr></table>'
            )
            return cell(inner, p)

        case "spacer":
            mobile = _get(p, "mobileHeight")
            classes = [
                display_class(p.get("display")),
                f"sp-{n(mobile)}" if mobile is not None else "",
            ]
            cls = " ".join(item for item in classes if item)
            class_attr = f' class="{cls}"' if cls else ""
            height = n(p["height"])
            return (
                f'<tr{class_attr}><td style="height:{height}px;line-height:{height}px;'
                'font-size:1px">&nbsp;</td></tr>'
            )

        case "quote":
            bar = style(
                {
                    "borderLeft": f"4px solid {_or(color(p.get('accent'), context), '#111827')}",
                    "padding": "12px 18px",
                    "background": color(p.get("background"), context),
                }
            )
            body = style(
                {
                    "fontFamily": font,
                    "fontSize": f"{n(p['size'])}px",
                    "lineHeight": 1.5,
                    "color": text,
                    "fontStyle": "italic",
                    "textAlign": align,
                }
            )
            cite = ""
            if p.get("cite"):
                cite_style = style(
                    {"fontFamily": font, "fontSize": "13px", "color": muted, "marginTop": "8px"}
                )
                cite = (
                    f'<div style="{cite_style}">— '
                    f"{escape_html(fill(str(p['cite']), context, scope))}</div>"
                )
            inner = (
                f'{_FULL_TABLE}><tr><td style="{bar}"><div style="{body}">'
                f"{rich_html(p.get('text'), context, scope, link)}</div>{cite}</td></tr></table>"
            )
            return cell(inner, p)

        case "video":
            thumbnail = p.get("thumbnail")
            if not thumbnail:
                return ""
            url = href(str(p.get("href", "")), context, scope)
            alt = escape_html(fill(str(p.get("alt", "")), context, scope))
            img_style = style(
                {
                    "display": "block",
                    "width": "100%",
                    "height": "auto",
                    "border": 0,
                    "borderRadius": f"{n(p['radius'])}px",
                }
            )
            img = (
                f'<img src="{escape_html(context.asset_url(thumbnail["key"]))}" '
                f'width="{n(round_half_up(frame.width))}" alt="{alt}" style="{img_style}">'
            )
            play_style = style(
                {
                    "fontFamily": font,
                    "fontSize": "14px",
                    "fontWeight": 600,
                    "color": link,
                    "paddingTop": "8px",
                    "textAlign": "center",
                }
            )
            play = f'<div style="{play_style}">&#9654; {alt}</div>'
            inner = (
                f'<a href="{escape_html(url)}" target="_blank" '
                f'style="text-decoration:none">{img}{play}</a>'
                if url
                else f"{img}{play}"
            )
            return cell(inner, p)

        case "social":
            links: list[str] = []
            for item in p.get("items") or []:
                url = href(str(item.get("href", "")), context, scope)
                if not url:
                    continue
                pill = style(
                    {
                        "display": "inline-block",
                        "fontFamily": font,
                        "fontSize": "13px",
                        "fontWeight": 600,
                        "color": link,
                        "padding": "4px 8px",
                        "border": f"1px solid {_or(color('brand.border', context), '#e5e7eb')}",
                        "borderRadius": "999px",
                    }
                )
                network = str(item.get("network", ""))
                icon = (
                    context.social_icon(network, str(p.get("style")))
                    if p.get("appearance") == "icons" and context.social_icon
                    else None
                )
                if icon:
                    content = (
                        f'<img src="{escape_html(icon)}" width="{n(p["size"])}" '
                        f'height="{n(p["size"])}" alt="{escape_html(network)}" '
                        'style="display:block;border:0">'
                    )
                else:
                    label = escape_html(capitalize_first(network))
                    content = f'<span style="{pill}">{label}</span>'
                links.append(
                    f'<td style="padding:0 {n(p["gap"] / 2)}px">'
                    f'<a href="{escape_html(url)}" target="_blank" style="text-decoration:none">'
                    f"{content}</a></td>"
                )
            return cell(f'{_TABLE} align="{n(align)}"><tr>{"".join(links)}</tr></table>', p)

        case "menu":
            separator = {"dot": " &middot; ", "bar": " | "}.get(
                str(p.get("separator")), "&nbsp;&nbsp;"
            )
            menu_color = _or(color(p.get("color"), context), text)
            parts: list[str] = []
            for item in p.get("items") or []:
                url = href(str(item.get("href", "")), context, scope)
                label = escape_html(fill(str(item.get("label", "")), context, scope))
                if url:
                    anchor = style({"color": menu_color, "textDecoration": "none"})
                    parts.append(
                        f'<a href="{escape_html(url)}" target="_blank" style="{anchor}">{label}</a>'
                    )
                else:
                    parts.append(label)
            menu_style = style(
                {
                    "fontFamily": font,
                    "fontSize": f"{n(p['size'])}px",
                    "textAlign": align,
                    "color": menu_color,
                }
            )
            return cell(f'<div style="{menu_style}">{separator.join(parts)}</div>', p)

        case "product":
            image = p.get("image")
            accent = color(p.get("accent"), context)
            url = href(str(p.get("href", "")), context, scope)
            img = ""
            if image:
                img_width = frame.width * 0.4 if p.get("layout") == "side" else frame.width
                img = (
                    f'<img src="{escape_html(context.asset_url(image["key"]))}" '
                    f'width="{n(round_half_up(img_width))}" '
                    f'alt="{escape_html(fill(str(p.get("alt", "")), context, scope))}" '
                    'style="display:block;width:100%;height:auto;border:0;border-radius:8px">'
                )
            title_style = style(
                {
                    "fontFamily": font,
                    "fontSize": "17px",
                    "fontWeight": 700,
                    "color": color(settings["headingColor"], context),
                    "paddingTop": "10px",
                }
            )
            description_style = style(
                {
                    "fontFamily": font,
                    "fontSize": "14px",
                    "lineHeight": 1.5,
                    "color": text,
                    "paddingTop": "4px",
                }
            )
            price_style = style(
                {
                    "fontFamily": font,
                    "fontSize": "18px",
                    "fontWeight": 700,
                    "color": accent,
                    "paddingTop": "8px",
                }
            )
            old_price = ""
            if p.get("oldPrice"):
                old_price = (
                    f' <s style="font-size:14px;color:{_or(muted, "#6b7280")};font-weight:400">'
                    f"{escape_html(fill(str(p['oldPrice']), context, scope))}</s>"
                )
            buy = ""
            if url and p.get("buttonLabel"):
                buy_style = style(
                    {
                        "display": "inline-block",
                        "padding": "10px 18px",
                        "background": accent,
                        "color": "#ffffff",
                        "fontFamily": font,
                        "fontSize": "14px",
                        "fontWeight": 600,
                        "textDecoration": "none",
                        "borderRadius": "8px",
                    }
                )
                buy = (
                    f'<div style="padding-top:12px"><a href="{escape_html(url)}" target="_blank" '
                    f'style="{buy_style}">'
                    f"{escape_html(fill(str(p['buttonLabel']), context, scope))}</a></div>"
                )
            body = (
                f'<div style="{title_style}">'
                f"{escape_html(fill(str(p.get('title', '')), context, scope))}</div>"
                f'<div style="{description_style}">'
                f"{rich_html(p.get('description'), context, scope, link)}</div>"
                f'<div style="{price_style}">'
                f"{escape_html(fill(str(p.get('price', '')), context, scope))}{old_price}</div>"
                f"{buy}"
            )
            if p.get("layout") == "side" and img:
                inner = (
                    f'{_FULL_TABLE}><tr><td width="40%" valign="top">{img}</td>'
                    f'<td valign="top" style="padding-left:16px">{body}</td></tr></table>'
                )
            else:
                inner = f"{img}{body}"
            return cell(inner, p)

        case "coupon":
            box = style(
                {
                    "border": f"2px dashed {_or(color(p.get('borderColor'), context), '#111827')}",
                    "borderRadius": "10px",
                    "padding": "14px 24px",
                    "background": color(p.get("background"), context),
                    "textAlign": "center",
                }
            )
            code_style = style(
                {
                    "fontFamily": "'Courier New',monospace",
                    "fontSize": "24px",
                    "fontWeight": 700,
                    "letterSpacing": "3px",
                    "color": _or(color(p.get("textColor"), context), text),
                }
            )
            caption_style = style(
                {"fontFamily": font, "fontSize": "13px", "color": muted, "paddingTop": "6px"}
            )
            inner = (
                f'{_TABLE} align="{n(align)}"><tr><td style="{box}">'
                f'<div style="{code_style}">'
                f"{escape_html(fill(str(p.get('code', '')), context, scope))}</div>"
                f'<div style="{caption_style}">'
                f"{escape_html(fill(str(p.get('caption', '')), context, scope))}</div>"
                "</td></tr></table>"
            )
            return cell(inner, p)

        case "key-value":
            border_color = _or(color(p.get("borderColor"), context), "#e5e7eb")
            rows = []
            for row_value in p.get("rows") or []:
                label_style = style(
                    {
                        "padding": "10px 12px",
                        "borderBottom": f"1px solid {border_color}",
                        "fontFamily": font,
                        "fontSize": f"{n(p['size'])}px",
                        "color": _or(color(p.get("labelColor"), context), muted),
                    }
                )
                value_style = style(
                    {
                        "padding": "10px 12px",
                        "borderBottom": f"1px solid {border_color}",
                        "fontFamily": font,
                        "fontSize": f"{n(p['size'])}px",
                        "fontWeight": 600,
                        "color": _or(color(p.get("valueColor"), context), text),
                    }
                )
                rows.append(
                    f'<tr><td style="{label_style}">'
                    f"{escape_html(fill(str(row_value.get('label', '')), context, scope))}</td>"
                    f'<td align="right" style="{value_style}">'
                    f"{escape_html(fill(str(row_value.get('value', '')), context, scope))}</td></tr>"
                )
            table_style = style(
                {"background": color(p.get("background"), context), "borderRadius": "8px"}
            )
            return cell(f'{_FULL_TABLE} style="{table_style}">{"".join(rows)}</table>', p)

        case "line-items":
            columns = p.get("columns") or []
            border_color = _or(color(p.get("borderColor"), context), "#e5e7eb")
            items = list_of(str(p.get("list", "")), context, scope)[: int(p.get("max", 0))]
            head_cells = []
            for column in columns:
                head_style = style(
                    {
                        "padding": "8px 10px",
                        "fontFamily": font,
                        "fontSize": "12px",
                        "textTransform": "uppercase",
                        "letterSpacing": "0.5px",
                        "color": muted,
                        "background": color(p.get("headerBackground"), context),
                        "borderBottom": f"1px solid {border_color}",
                    }
                )
                head_cells.append(
                    f'<th align="{n(column.get("align"))}" style="{head_style}">'
                    f"{escape_html(fill(str(column.get('header', '')), context, scope))}</th>"
                )
            body_rows = []
            for item in items:
                cells = []
                for column in columns:
                    value_style = style(
                        {
                            "padding": "10px",
                            "fontFamily": font,
                            "fontSize": f"{n(p['size'])}px",
                            "color": text,
                            "borderBottom": f"1px solid {border_color}",
                        }
                    )
                    raw = (
                        item.get(column.get("field"), UNDEFINED)
                        if isinstance(item, dict)
                        else UNDEFINED
                    )
                    cells.append(
                        f'<td align="{n(column.get("align"))}" style="{value_style}">'
                        f"{escape_html(to_string(_or(raw, '')))}</td>"
                    )
                body_rows.append(f"<tr>{''.join(cells)}</tr>")
            total = ""
            if p.get("totalLabel"):
                total_style = style(
                    {
                        "padding": "12px 10px",
                        "fontFamily": font,
                        "fontSize": f"{n(p['size'])}px",
                        "fontWeight": 700,
                        "color": text,
                    }
                )
                total = (
                    f'<tr><td colspan="{len(columns) - 1}" align="right" style="{total_style}">'
                    f"{escape_html(fill(str(p['totalLabel']), context, scope))}</td>"
                    f'<td align="right" style="{total_style}">'
                    f"{escape_html(fill(str(p.get('totalValue', '')), context, scope))}</td></tr>"
                )
            return cell(
                f"{_FULL_TABLE}><tr>{''.join(head_cells)}</tr>{''.join(body_rows)}{total}</table>",
                p,
            )

        case "survey":
            scale = p.get("scale")
            start = 0 if scale == 10 else 1
            accent = _or(color(p.get("color"), context), "#111827")
            cells = []
            for index in range(11 if scale == 10 else 5):
                score = start + index
                url = href(
                    to_string(p.get("href")).replace("{score}", str(score), 1), context, scope
                )
                score_style = style(
                    {
                        "display": "inline-block",
                        "width": "32px",
                        "lineHeight": "32px",
                        "fontFamily": font,
                        "fontSize": "14px",
                        "fontWeight": 600,
                        "color": accent,
                        "border": f"1px solid {accent}",
                        "borderRadius": "6px",
                        "textDecoration": "none",
                    }
                )
                cells.append(
                    f'<td align="center" style="padding:2px"><a href="{escape_html(url or "#")}" '
                    f'target="_blank" style="{score_style}">{score}</a></td>'
                )
            question_style = style(
                {
                    "fontFamily": font,
                    "fontSize": "16px",
                    "fontWeight": 600,
                    "color": text,
                    "textAlign": "center",
                    "paddingBottom": "10px",
                }
            )
            scale_style = style(
                {"fontFamily": font, "fontSize": "12px", "color": muted, "paddingTop": "6px"}
            )
            inner = (
                f'<div style="{question_style}">'
                f"{escape_html(fill(str(p.get('question', '')), context, scope))}</div>"
                f'{_TABLE} align="center"><tr>{"".join(cells)}</tr></table>'
                f'{_FULL_TABLE}><tr><td style="{scale_style}">'
                f"{escape_html(fill(str(p.get('lowLabel', '')), context, scope))}</td>"
                f'<td align="right" style="{scale_style}">'
                f"{escape_html(fill(str(p.get('highLabel', '')), context, scope))}</td></tr></table>"
            )
            return cell(inner, p)

        case "footer":
            footer_muted = _or(color(p.get("color"), context), muted)
            link_style = style({"color": footer_muted, "textDecoration": "underline"})
            entries: list[tuple[str, str]] = []
            locale = context.locale
            if p.get("showViewInBrowser"):
                label = (
                    "Shiko në shfletues"
                    if locale == "sq"
                    else "Im Browser ansehen"
                    if locale == "de"
                    else "View in browser"
                )
                entries.append(("links.view_in_browser", label))
            if p.get("showPreferences"):
                label = (
                    "Preferencat"
                    if locale == "sq"
                    else "Einstellungen"
                    if locale == "de"
                    else "Preferences"
                )
                entries.append(("links.preferences", label))
            if p.get("showUnsubscribe"):
                label = (
                    "Çregjistrohu"
                    if locale == "sq"
                    else "Abmelden"
                    if locale == "de"
                    else "Unsubscribe"
                )
                entries.append(("links.unsubscribe", label))
            rendered: list[str] = []
            for path, label in entries:
                url = href(f"{{{{ {path} }}}}", context, scope)
                rendered.append(
                    f'<a href="{escape_html(url)}" target="_blank" style="{link_style}">'
                    f"{escape_html(label)}</a>"
                    if url
                    else escape_html(label)
                )
            links_html = " &middot; ".join(rendered)
            footer_style = style(
                {
                    "fontFamily": font,
                    "fontSize": f"{n(p['size'])}px",
                    "lineHeight": 1.6,
                    "color": footer_muted,
                    "textAlign": align,
                }
            )
            address = (
                f"<br>{escape_html(str(context.brand.get('address', '')))}"
                if p.get("showAddress")
                else ""
            )
            inner = (
                f'<div style="{footer_style}">'
                f"{rich_html(p.get('text'), context, scope, footer_muted)}{address}"
                f"{'<br>' + links_html if links_html else ''}</div>"
            )
            return cell(inner, p)

        case "conditional":
            return render_blocks(children_of(node, context), context, frame)

        case "repeat":
            items = list_of(str(p.get("list", "")), context, scope)[: int(p.get("max", 0))]
            return "".join(
                render_blocks(
                    children_of(node, context),
                    context,
                    Frame(width=frame.width, scope={**scope, "item": item}),
                )
                for item in items
            )

    return ""


_RTL_FROM = (
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
    '<tr><td style="'
)
_RTL_TO = (
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" dir="ltr">'
    '<tr><td style="'
)


def render_row(
    row: dict[str, Any], context: RenderContext, inner_width: float, scope: dict[str, Any]
) -> str:
    p = row["props"]
    widths: list[float] = render_data()["rowLayouts"][p["layout"]]
    columns = children_of(row, context)
    row_padding = p["padding"]
    available = inner_width - row_padding["left"] - row_padding["right"]
    gap = p["gap"] if len(columns) > 1 else 0
    valign = n(p["verticalAlign"])
    stack = p.get("stackOnMobile") is True

    cells: list[str] = []
    for index, column in enumerate(columns):
        pct = widths[index] if index < len(widths) else 100 / len(columns)
        col_width = math.floor(((available - gap * (len(columns) - 1)) * pct) / 100)
        cp = column["props"]
        col_pad = cp["padding"]
        inner = block_table(
            render_blocks(
                children_of(column, context),
                context,
                Frame(width=col_width - col_pad["left"] - col_pad["right"], scope=scope),
            )
        )
        radius = cp.get("radius")
        col_style = style(
            {
                "background": color(cp.get("background"), context),
                "padding": padding(col_pad),
                "borderRadius": f"{primitive_text(radius)}px" if radius else None,
                "border": (
                    f"{n(cp['borderWidth'])}px solid "
                    f"{_or(color(cp.get('borderColor'), context), '#e5e7eb')}"
                    if cp.get("borderWidth", 0) > 0
                    else None
                ),
                # The row centres its inline-block columns; blocks must not inherit it.
                "textAlign": "left",
            }
        )
        if index == 0:
            ghost_open = (
                '<!--[if mso]><table role="presentation" width="100%" cellspacing="0" '
                f'cellpadding="0" border="0"><tr><td width="{col_width}" valign="{valign}">'
                "<![endif]-->"
            )
        else:
            ghost_open = (
                f'<!--[if mso]></td><td width="{n(gap)}"></td><td width="{col_width}" '
                f'valign="{valign}"><![endif]-->'
            )
        ghost_close = (
            "<!--[if mso]></td></tr></table><![endif]-->" if index == len(columns) - 1 else ""
        )
        spacing = f"margin-right:{n(gap)}px;" if index < len(columns) - 1 else ""
        cells.append(
            f'{ghost_open}<div class="{"col" if stack else ""}" style="display:inline-block;'
            f'vertical-align:{valign};width:100%;max-width:{col_width}px;{spacing}">'
            f'{_FULL_TABLE}><tr><td style="{col_style}">{inner}</td></tr></table></div>'
            f"{ghost_close}"
        )

    joined = "".join(cells)
    reverse = ' dir="rtl"' if stack and p.get("reverseOnMobile") is True else ""
    inner_html = joined.replace(_RTL_FROM, _RTL_TO) if reverse else joined
    row_style = style(
        {
            "padding": padding(row_padding),
            "background": color(p.get("background"), context),
            "fontSize": 0,
            "textAlign": "center",
        }
    )
    return f'<tr><td{reverse} style="{row_style}">{inner_html}</td></tr>'


def render_section(section: dict[str, Any], context: RenderContext) -> str:
    p = section["props"]
    settings = context.settings
    width = settings["width"]
    pad = p["padding"]
    inner = width - pad["left"] - pad["right"]
    background = _or(color(p.get("background"), context), color(settings["background"], context))
    image = p.get("backgroundImage")
    background_image = context.asset_url(image["key"]) if image else None
    rows = "".join(
        render_row(row, context, inner, {})
        for row in children_of(section, context)
        if visible(row, context, {})
    )
    radius = p.get("radius")
    table_style = style(
        {
            "background": background,
            "backgroundImage": f"url('{background_image}')" if background_image else None,
            "backgroundSize": "cover" if background_image else None,
            "backgroundPosition": "center" if background_image else None,
            "borderRadius": f"{primitive_text(radius)}px" if radius else None,
        }
    )
    background_attr = f' background="{escape_html(background_image)}"' if background_image else ""
    content = (
        f'{_FULL_TABLE} style="{table_style}"{background_attr}>'
        f'<tr><td style="{style({"padding": padding(pad)})}">{block_table(rows)}</td></tr></table>'
    )
    backdrop = color(p.get("backdrop"), context)
    backdrop_attr = f' bgcolor="{backdrop}"' if backdrop else ""
    outer_style = style({"background": backdrop, "padding": "0"})
    max_width = 2000 if p.get("fullWidth") else width
    return (
        f'<tr><td align="center"{backdrop_attr} style="{outer_style}">'
        f'<!--[if mso]><table role="presentation" width="{n(width)}" align="center" '
        'cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->'
        f'<div class="container" style="max-width:{n(max_width)}px;margin:0 auto">{content}</div>'
        "<!--[if mso]></td></tr></table><![endif]--></td></tr>"
    )


def css(doc: dict[str, Any]) -> str:
    s = doc["settings"]
    breakpoint = s["width"] + 20
    spacers: dict[str, None] = {}
    for node in doc["nodes"].values():
        if node.get("type") == "spacer":
            mobile = (node.get("props") or {}).get("mobileHeight", UNDEFINED)
            if mobile is not None:
                spacers[n(mobile)] = None
    dark = ""
    if s.get("darkMode") == "custom":
        d = s["dark"]
        dark = (
            "@media (prefers-color-scheme: dark){"
            f".body-bg{{background:{d['backdrop']}!important}}"
            f".container table{{background-color:{d['background']}!important}}"
            f".container div,.container td{{color:{d['text']}!important}}"
            f".container h1,.container h2,.container h3{{color:{d['heading']}!important}}"
            f".container a{{color:{d['link']}!important}}}}"
            f"[data-ogsc] .container div,[data-ogsc] .container td{{color:{d['text']}!important}}"
            f"[data-ogsb] .container table{{background-color:{d['background']}!important}}"
        )
    spacer_rules = "".join(
        f".sp-{height} td{{height:{height}px!important;line-height:{height}px!important}}"
        for height in spacers
    )
    return "".join(
        [
            "body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;"
            "-ms-text-size-adjust:100%}",
            "table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}",
            "img{-ms-interpolation-mode:bicubic}",
            "a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}",
            f"@media only screen and (max-width:{n(breakpoint)}px){{"
            ".col{max-width:100%!important;display:block!important;margin-right:0!important}"
            ".hide-mobile{display:none!important}"
            ".hide-desktop{display:table-row!important;max-height:none!important}"
            ".btn-full{width:100%!important}.btn-full a{display:block!important}"
            f".img-fluid{{width:100%!important}}{spacer_rules}}}",
            dark,
        ]
    )


# ── the whole email ──────────────────────────────────────────────────────────


@dataclass(frozen=True)
class RenderedEmail:
    html: str
    text: str
    subject: str
    preheader: str
    #: Variables used with no value and no fallback.
    missing: tuple[str, ...]


def render_email(
    doc: dict[str, Any],
    *,
    asset_url: Any,
    brand: dict[str, Any] | None = None,
    data: dict[str, Any] | None = None,
    locale: str | None = None,
    currency: str | None = None,
    now: Any = None,
    social_icon: Any = None,
) -> RenderedEmail:
    """``renderEmail`` in ``html.ts``: subject, preheader, HTML and the text part.

    In ``locale`` when the template is written in several languages; whatever
    is not translated reads in its base language.
    """
    doc = localize(doc, locale)
    context = create_context(
        doc,
        asset_url=asset_url,
        brand=brand,
        data=data,
        locale=locale,
        currency=currency,
        now=now,
        social_icon=social_icon,
    )
    settings = doc["settings"]
    subject = fill(doc["meta"]["subject"], context)
    preheader = fill(doc["meta"]["preheader"], context)
    root = context.node(doc["root"])
    sections = "".join(
        render_section(node, context)
        for node in (children_of(root, context) if root else [])
        if visible(node, context, {})
    )
    backdrop = _or(color(settings["backdrop"], context), "#f4f4f5")
    lang = escape_html(context.locale)
    fonts_url = google_fonts_url(fonts_in_use(doc))
    fonts_link = (
        f'<!--[if !mso]><!--><link href="{escape_html(fonts_url)}" rel="stylesheet" '
        'type="text/css"><!--<![endif]-->'
        if fonts_url
        else ""
    )
    html = "".join(
        [
            "<!DOCTYPE html>",
            f'<html lang="{lang}" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" '
            'xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">',
            "<head>",
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<meta name="x-apple-disable-message-reformatting">',
            '<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">',
            '<meta name="color-scheme" content="light dark">',
            '<meta name="supported-color-schemes" content="light dark">',
            f"<title>{escape_html(subject)}</title>",
            "<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/>"
            "<o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>"
            "<![endif]-->",
            fonts_link,
            f"<style>{css(doc)}</style>",
            "</head>",
            f'<body class="body-bg" style="margin:0;padding:0;background:{backdrop}">',
            f'<div style="display:none;font-size:1px;color:{backdrop};line-height:1px;'
            'max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">'
            f"{escape_html(preheader)}{'&#8199;&#65279;&#847; ' * 40}</div>",
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
            f'class="body-bg" bgcolor="{backdrop}" style="background:{backdrop}">'
            '<tr><td align="center" style="padding:24px 0">',
            f"{_FULL_TABLE}>{sections}</table>",
            "</td></tr></table>",
            "</body>",
            "</html>",
        ]
    )
    text = render_text(doc, context)
    return RenderedEmail(
        html=html,
        text=text,
        subject=subject,
        preheader=preheader,
        missing=tuple(sorted(context.missing)),
    )


# ── plain text ───────────────────────────────────────────────────────────────


def _text_of(node: dict[str, Any], context: RenderContext, scope: dict[str, Any]) -> list[str]:
    if not visible(node, context, scope):
        return []
    p: dict[str, Any] = node.get("props") or {}
    match node.get("type"):
        case "heading":
            return [rich_text(p.get("text"), context, scope).upper(), ""]
        case "text":
            return [rich_text(p.get("text"), context, scope), ""]
        case "list":
            lines = [
                f"{f'{index + 1}.' if p.get('style') == 'number' else '-'} "
                f"{rich_text(item.get('text'), context, scope)}"
                for index, item in enumerate(p.get("items") or [])
            ]
            return [*lines, ""]
        case "button":
            url = href(str(p.get("href", "")), context, scope)
            return [f"{fill(str(p.get('label', '')), context, scope)}: {url}", ""]
        case "image":
            if not p.get("href"):
                return []
            alt = fill(to_string(_get(p, "alt")), context, scope)
            return [f"{alt}: {href(str(p['href']), context, scope)}", ""]
        case "divider":
            return ["----------", ""]
        case "quote":
            quoted = rich_text(p.get("text"), context, scope)
            return [f'"{quoted}" — {fill(to_string(_get(p, "cite")), context, scope)}', ""]
        case "video":
            alt = fill(to_string(_get(p, "alt")), context, scope)
            return [f"{alt}: {href(to_string(_get(p, 'href')), context, scope)}", ""]
        case "menu":
            return [
                " | ".join(
                    f"{fill(str(item.get('label', '')), context, scope)} "
                    f"({href(str(item.get('href', '')), context, scope)})"
                    for item in p.get("items") or []
                ),
                "",
            ]
        case "social":
            return [
                "\n".join(
                    f"{item.get('network', '')}: {href(str(item.get('href', '')), context, scope)}"
                    for item in p.get("items") or []
                ),
                "",
            ]
        case "product":
            lines = [
                fill(to_string(_get(p, "title")), context, scope),
                rich_text(p.get("description"), context, scope),
                fill(to_string(_get(p, "price")), context, scope),
            ]
            if p.get("href"):
                label = fill(to_string(_get(p, "buttonLabel")), context, scope)
                lines.append(f"{label}: {href(str(p['href']), context, scope)}")
            return [*lines, ""]
        case "coupon":
            caption = fill(to_string(_get(p, "caption")), context, scope)
            return [f"{caption}: {fill(to_string(_get(p, 'code')), context, scope)}", ""]
        case "key-value":
            return [
                *(
                    f"{fill(str(row.get('label', '')), context, scope)}: "
                    f"{fill(str(row.get('value', '')), context, scope)}"
                    for row in p.get("rows") or []
                ),
                "",
            ]
        case "line-items":
            columns = p.get("columns") or []
            items = list_of(str(p.get("list", "")), context, scope)[: int(p.get("max", 0))]
            rows = [
                " | ".join(
                    to_string(
                        _or(
                            item.get(column.get("field"), UNDEFINED)
                            if isinstance(item, dict)
                            else UNDEFINED,
                            "",
                        )
                    )
                    for column in columns
                )
                for item in items
            ]
            total_label = fill(to_string(_get(p, "totalLabel")), context, scope)
            total_value = fill(to_string(_get(p, "totalValue")), context, scope)
            return [
                " | ".join(
                    fill(str(column.get("header", "")), context, scope) for column in columns
                ),
                *rows,
                f"{total_label}: {total_value}",
                "",
            ]
        case "survey":
            survey_url = href(
                to_string(_get(p, "href")).replace("{score}", "10", 1), context, scope
            )
            return [fill(to_string(_get(p, "question")), context, scope), survey_url, ""]
        case "footer":
            lines = [rich_text(p.get("text"), context, scope)]
            if p.get("showAddress"):
                lines.append(str(context.brand.get("address", "")))
            if p.get("showUnsubscribe"):
                lines.append(f"Unsubscribe: {href('{{ links.unsubscribe }}', context, scope)}")
            return [*lines, ""]
        case "conditional" | "section" | "row" | "column":
            return [
                line
                for child in children_of(node, context)
                for line in _text_of(child, context, scope)
            ]
        case "repeat":
            items = list_of(str(p.get("list", "")), context, scope)[: int(p.get("max", 0))]
            return [
                line
                for item in items
                for child in children_of(node, context)
                for line in _text_of(child, context, {**scope, "item": item})
            ]
    return []


def render_text(doc: dict[str, Any], context: RenderContext) -> str:
    root = context.node(doc["root"])
    lines = [
        line
        for node in (children_of(root, context) if root else [])
        for line in _text_of(node, context, {})
    ]
    return trim(re.sub(r"\n{3,}", "\n\n", "\n".join(lines)))


__all__ = ["RenderedEmail", "escape_html", "is_safe_url", "render_email", "render_text"]
