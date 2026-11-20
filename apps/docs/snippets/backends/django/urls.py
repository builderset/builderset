"""The routes, in the shape createRestHost speaks. Include them from the
project's urls.py: ``path("", include("documents.urls"))``."""

from django.urls import path, register_converter

from .views import (
    KINDS,
    Document,
    Documents,
    Draft,
    Kind,
    PublicForm,
    Publish,
    ResponseList,
    Responses,
    Unpublish,
)


class KindConverter:
    """``emails``, ``articles`` or ``forms`` in the path; the view gets its Kind."""

    regex = "|".join(KINDS)

    def to_python(self, value: str) -> Kind:
        return KINDS[value]

    def to_url(self, value: Kind) -> str:
        return value.path


register_converter(KindConverter, "kind")

urlpatterns = [
    path("api/public/forms/<slug:slug>", PublicForm.as_view()),
    path("api/public/forms/<slug:slug>/responses", Responses.as_view()),
    path("api/forms/<int:pk>/responses", ResponseList.as_view()),
    # One set of routes, three kinds: /api/emails, /api/articles, /api/forms.
    path("api/<kind:kind>", Documents.as_view()),
    path("api/<kind:kind>/<int:pk>", Document.as_view()),
    path("api/<kind:kind>/<int:pk>/draft", Draft.as_view()),
    path("api/<kind:kind>/<int:pk>/publish", Publish.as_view()),
    path("api/<kind:kind>/<int:pk>/unpublish", Unpublish.as_view()),
]
