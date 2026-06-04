from rest_framework import generics, mixins
from rest_framework.permissions import IsAuthenticated

from api.permissions import IsTenantObjectOwner
from api.serializers.compra_corte import CompraCorteSerializer
from core.tenancy import TenantScopedMixin


class CompraCorteUpdateView(TenantScopedMixin, mixins.UpdateModelMixin, generics.GenericAPIView):
    serializer_class = CompraCorteSerializer
    permission_classes = [IsAuthenticated, IsTenantObjectOwner]
    lookup_url_kwarg = "corte_pk"

    def get_queryset(self):
        return super().get_queryset().filter(compra_id=self.kwargs["compra_pk"])

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
