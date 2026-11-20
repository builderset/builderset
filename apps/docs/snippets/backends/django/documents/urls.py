"""The routes, in the shape createRestHost speaks. Include them from the
project's urls.py: ``path("", include("documents.urls"))``."""

from django.urls import path, register_converter

from .kinds import KINDS, Kind
from .views import builders, documents, forms, history, library


class KindConverter:
    """``emails``, ``articles`` or ``forms`` in the path; the view gets its Kind."""

    regex = "|".join(KINDS)

    def to_python(self, value: str) -> Kind:
        return KINDS[value]

    def to_url(self, value: Kind) -> str:
        return value.path


register_converter(KindConverter, "kind")

urlpatterns = [
    # The form's and the article's public routes: no sign-in.
    path("api/public/forms/<slug:slug>", forms.PublicForm.as_view()),
    path("api/public/forms/<slug:slug>/responses", forms.PublicResponses.as_view()),
    path("api/public/articles/<str:locale>/<str:slug>", builders.PublicArticle.as_view()),
    # Uploads, shared by every builder.
    path("api/uploads", library.Uploads.as_view()),
    path("api/uploads/<path:key>", library.MediaFile.as_view()),
    # Each builder's own.
    path("api/emails/<uuid:id>/send", builders.SendEmail.as_view()),
    path("api/emails/<uuid:id>/test", builders.SendTest.as_view()),
    path("api/forms/<uuid:id>/responses", forms.ResponseSummary.as_view()),
    path("api/forms/<uuid:id>/responses/<uuid:response_id>", forms.ResponseDetail.as_view()),
    # One set of routes, three kinds: /api/emails, /api/articles, /api/forms.
    path("api/<kind:kind>/sections", library.Sections.as_view()),
    path("api/<kind:kind>/sections/<uuid:section_id>", library.SectionDetail.as_view()),
    path("api/<kind:kind>", documents.DocumentList.as_view()),
    path("api/<kind:kind>/<uuid:id>", documents.DocumentDetail.as_view()),
    path("api/<kind:kind>/<uuid:id>/draft", documents.Draft.as_view()),
    path("api/<kind:kind>/<uuid:id>/publish", documents.Publish.as_view()),
    path("api/<kind:kind>/<uuid:id>/unpublish", documents.Unpublish.as_view()),
    path("api/<kind:kind>/<uuid:id>/restore", documents.Restore.as_view()),
    path("api/<kind:kind>/<uuid:id>/revisions", history.Revisions.as_view()),
    path(
        "api/<kind:kind>/<uuid:id>/revisions/<uuid:revision_id>", history.RevisionDetail.as_view()
    ),
    path("api/<kind:kind>/<uuid:id>/activity", history.Timeline.as_view()),
]
