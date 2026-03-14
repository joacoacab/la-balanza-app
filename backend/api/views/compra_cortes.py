from rest_framework import generics, mixins
from rest_framework.exceptions import NotFound

from api.serializers.compra_corte import CompraCorteSerializer
from core.models import Compra, CompraCorte


class CompraCorteUpdateView(mixins.UpdateModelMixin, generics.GenericAPIView):
    serializer_class = CompraCorteSerializer

    def get_object(self):
        try:
            compra = Compra.objects.get(
                pk=self.kwargs["compra_pk"],
                carniceria=self.request.user.carniceria,
            )
        except Compra.DoesNotExist:
            raise NotFound()

        try:
            compra_corte = CompraCorte.objects.get(
                pk=self.kwargs["corte_pk"],
                compra=compra,
            )
        except CompraCorte.DoesNotExist:
            raise NotFound()

        self.check_object_permissions(self.request, compra_corte)
        return compra_corte

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
