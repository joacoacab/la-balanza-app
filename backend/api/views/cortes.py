from rest_framework import generics, mixins, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.corte import CorteSerializer
from core.models import Corte
from core.services.onboarding import cargar_cortes_base, cargar_cortes_cerdo, cargar_cortes_pollo

_CARGADORES = {
    "res": cargar_cortes_base,
    "cerdo": cargar_cortes_cerdo,
    "pollo": cargar_cortes_pollo,
}


class CorteListCreateView(generics.ListCreateAPIView):
    serializer_class = CorteSerializer

    def get_queryset(self):
        qs = Corte.objects.filter(
            carniceria=self.request.user.carniceria,
            activo=True,
        )
        tipo_animal = self.request.query_params.get("tipo_animal")
        if tipo_animal:
            qs = qs.filter(tipo_animal=tipo_animal)
        return qs


class CorteDetailView(mixins.UpdateModelMixin, mixins.DestroyModelMixin, generics.GenericAPIView):
    serializer_class = CorteSerializer

    def get_queryset(self):
        return Corte.objects.filter(
            carniceria=self.request.user.carniceria,
            activo=True,
        )

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        corte = self.get_object()
        corte.activo = False
        corte.save(update_fields=["activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CargarPlantillaView(APIView):
    def post(self, request):
        tipo_animal = request.data.get("tipo_animal")
        if tipo_animal not in _CARGADORES:
            raise serializers.ValidationError(
                {"tipo_animal": "Valor inválido. Opciones: res, cerdo, pollo."}
            )
        carniceria = request.user.carniceria
        _CARGADORES[tipo_animal](carniceria)
        return Response({"tipo_animal": tipo_animal, "cargados": True})
