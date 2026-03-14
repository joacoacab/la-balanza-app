from rest_framework import generics, mixins, status
from rest_framework.response import Response

from api.serializers.corte import CorteSerializer
from core.models import Corte


class CorteListCreateView(generics.ListCreateAPIView):
    serializer_class = CorteSerializer

    def get_queryset(self):
        return Corte.objects.filter(
            carniceria=self.request.user.carniceria,
            activo=True,
        )


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
