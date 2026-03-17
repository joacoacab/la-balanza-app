from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import PuedeCrearCompra
from api.serializers.compra import (
    CompraCreateSerializer,
    CompraDetailSerializer,
    CompraListSerializer,
)
from core.models import Compra


class CompraListCreateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, PuedeCrearCompra]

    def get_queryset(self):
        qs = Compra.objects.filter(carniceria=self.request.user.carniceria)
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


class CompraRetrieveView(generics.RetrieveAPIView):
    serializer_class = CompraDetailSerializer

    def get_queryset(self):
        return Compra.objects.filter(carniceria=self.request.user.carniceria)
