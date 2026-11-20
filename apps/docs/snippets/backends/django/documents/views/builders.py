"""What one builder has and the others do not: an email rendered for your
mailer or sent as a test, and the published article for your site."""

from typing import Any
from uuid import UUID

from builderset.email import RenderedEmail, render_email
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.core.validators import validate_email
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..checks import check_document
from ..errors import Conflict, Refused, find
from ..models import Article, EmailTemplate, Kit, Status
from ..permissions import StaffView
from ..serializers import PublicArticleSerializer
from .common import body_of


def render(document: dict[str, Any], data: Any, locale: Any) -> RenderedEmail:
    """Always the stored or checked document, never HTML from the browser."""
    return render_email(
        document,
        asset_url=default_storage.url,
        data=data if isinstance(data, dict) else {},
        locale=locale if isinstance(locale, str) else None,
    )


class SendEmail(StaffView):
    """POST /api/emails/:id/send: ``{ data, locale }``. The live design rendered
    for your mailer, as ``{ subject, html, text }``."""

    model = EmailTemplate
    actions = {"POST": "view"}

    def post(self, request: Request, id: UUID) -> Response:
        template = find(EmailTemplate.objects.live(), "email template", uuid=id)
        if template.status != Status.PUBLISHED:
            raise Conflict(message="This design is a draft: publish it to send it.")
        body = body_of(request)
        email = render(template.document, body.get("data"), body.get("locale"))
        return Response({"subject": email.subject, "html": email.html, "text": email.text})


class SendTest(StaffView):
    """POST /api/emails/:id/test: ``{ document, to }``, the editor's
    ``onSendTest``. The draft as it is now, to one address."""

    model = EmailTemplate
    actions = {"POST": "change"}

    def post(self, request: Request, id: UUID) -> Response:
        template = find(EmailTemplate.objects.live(), "email template", uuid=id)
        body = body_of(request)
        document, to = body.get("document"), body.get("to")
        check_document(Kit.EMAIL, document, "draft", type_key=template.type_key)
        try:
            validate_email(to)
        except ValidationError:
            raise Refused(issues=[{"code": "email.address", "path": "to"}]) from None
        email = render(document, body.get("data"), body.get("locale"))
        send_mail(email.subject, email.text, None, [to], html_message=email.html)
        return Response(status=202)


class PublicArticle(APIView):
    """GET /api/public/articles/:locale/:slug: the published article, for your site."""

    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]

    def get(self, request: Request, locale: str, slug: str) -> Response:
        published = Article.objects.live().filter(status=Status.PUBLISHED)
        article = find(published, "article", locale=locale, slug=slug)
        return Response(PublicArticleSerializer(article).data)
