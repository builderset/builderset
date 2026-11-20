"""Who may do what is Django's own permission system: view_article,
add_form, change_emailtemplate, delete_formresponse, and the builders'
publish_*, because writing a draft and putting it in front of readers are
different trust. Give them to groups in the admin."""

from typing import Any, ClassVar

from django.db.models import Model
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.views import APIView

#: The permission each method needs, unless the view says otherwise.
METHOD_ACTIONS = {
    "GET": "view",
    "POST": "add",
    "PUT": "change",
    "PATCH": "change",
    "DELETE": "delete",
}


class ModelPermission(BasePermission):
    def has_permission(self, request: Request, view: Any) -> bool:
        model: type[Model] = view.permission_model()
        action = view.actions.get(request.method, METHOD_ACTIONS.get(request.method or ""))
        return bool(action) and request.user.has_perm(
            f"{model._meta.app_label}.{action}_{model._meta.model_name}"
        )


class StaffView(APIView):
    """A view for your team: signed in, and allowed this action on this model."""

    permission_classes = [IsAuthenticated, ModelPermission]
    #: The view's own method → action, where it differs from METHOD_ACTIONS.
    actions: ClassVar[dict[str, str]] = {}
    #: The model it works on; None means the kind in the path's.
    model: ClassVar[type[Model] | None] = None

    def permission_model(self) -> type[Model]:
        return self.model or self.kwargs["kind"].model
