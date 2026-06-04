from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from core.tenancy import get_user_tenant, resolve_tenant


class IsTenantObjectOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        tenant = get_user_tenant(request.user)
        if tenant is None:
            return False
        try:
            object_tenant = resolve_tenant(obj)
        except Exception:
            return False
        return object_tenant.pk == tenant.pk


class PuedeCrearCompra(BasePermission):
    """Verifica que el plan del usuario permita crear la compra solicitada.

    Solo se aplica a requests POST; el resto pasa sin restricción.
    """

    def has_permission(self, request, view):
        if request.method != "POST":
            return True

        try:
            if not request.user or not request.user.is_authenticated:
                return False
            carniceria = request.user.carniceria
            suscripcion = carniceria.suscripcion
        except Exception:
            return False

        tipo_animal = request.data.get("tipo_animal", "vaca")
        try:
            puede, mensaje = suscripcion.puede_crear_compra(tipo_animal)
        except Exception:
            return False

        if not puede:
            raise PermissionDenied(
                {
                    "error": "plan_insuficiente",
                    "mensaje": mensaje,
                    "accion": "ver_planes",
                }
            )

        return True
