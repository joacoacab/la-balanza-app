from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


class PuedeCrearCompra(BasePermission):
    """Verifica que el plan del usuario permita crear la compra solicitada.

    Solo se aplica a requests POST; el resto pasa sin restricción.
    """

    def has_permission(self, request, view):
        if request.method != "POST":
            return True

        try:
            suscripcion = request.user.carniceria.suscripcion
        except Exception:
            return True

        tipo_animal = request.data.get("tipo_animal", "res")
        puede, mensaje = suscripcion.puede_crear_compra(tipo_animal)

        if not puede:
            raise PermissionDenied(
                {
                    "error": "plan_insuficiente",
                    "mensaje": mensaje,
                    "accion": "ver_planes",
                }
            )

        return True
