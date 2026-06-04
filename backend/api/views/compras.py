from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsTenantObjectOwner, PuedeCrearCompra
from api.serializers.compra import (
    CompraCreateSerializer,
    CompraDetailSerializer,
    CompraListSerializer,
)
from core.models import Compra
from core.tenancy import TenantScopedMixin


class CompraListCreateView(TenantScopedMixin, generics.GenericAPIView):
    serializer_class = CompraListSerializer
    permission_classes = [IsAuthenticated, PuedeCrearCompra, IsTenantObjectOwner]

    def get_queryset(self):
        qs = super().get_queryset()
        try:
            limite = self.request.user.carniceria.suscripcion.compras_visibles_limit
        except Exception:
            limite = None
        if limite is not None:
            qs = qs[:limite]
        return qs

    def get(self, request):
        serializer = CompraListSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CompraCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        compra = serializer.save()
        return Response(CompraListSerializer(compra).data, status=status.HTTP_201_CREATED)


class CompraRetrieveView(TenantScopedMixin, generics.RetrieveAPIView):
    serializer_class = CompraDetailSerializer
    permission_classes = [IsAuthenticated, IsTenantObjectOwner]
