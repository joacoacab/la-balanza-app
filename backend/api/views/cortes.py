from rest_framework import generics, mixins, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsTenantObjectOwner
from api.serializers.corte import CorteSerializer
from core.models import Corte
from core.services.onboarding import cargar_cortes_cerdo, cargar_cortes_pollo, cargar_cortes_vaca
from core.tenancy import TenantScopedMixin

_CARGADORES = {
    "vaca": cargar_cortes_vaca,
    "cerdo": cargar_cortes_cerdo,
    "pollo": cargar_cortes_pollo,
}


class CorteListCreateView(TenantScopedMixin, generics.ListCreateAPIView):
    serializer_class = CorteSerializer
    permission_classes = [IsAuthenticated, IsTenantObjectOwner]

    def get_queryset(self):
        qs = super().get_queryset().filter(activo=True)
        tipo_animal = self.request.query_params.get("tipo_animal")
        if tipo_animal:
            qs = qs.filter(tipo_animal=tipo_animal)
        return qs


class CorteDetailView(
    TenantScopedMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    generics.GenericAPIView,
):
    serializer_class = CorteSerializer
    permission_classes = [IsAuthenticated, IsTenantObjectOwner]

    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        corte = self.get_object()
        corte.activo = False
        corte.save(update_fields=["activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CargarPlantillaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tipo_animal = request.data.get("tipo_animal")
        if tipo_animal not in _CARGADORES:
            raise serializers.ValidationError(
                {"tipo_animal": "Valor inválido. Opciones: vaca, cerdo, pollo."}
            )
        carniceria = request.user.carniceria
        _CARGADORES[tipo_animal](carniceria)
        return Response({"tipo_animal": tipo_animal, "cargados": True})


class AnimalesActivosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        carniceria = request.user.carniceria
        return Response({"animales": carniceria.animales_activos})
