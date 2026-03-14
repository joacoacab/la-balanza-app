from rest_framework import generics, status
from rest_framework.response import Response

from api.serializers.compra import (
    CompraCreateSerializer,
    CompraDetailSerializer,
    CompraListSerializer,
)
from core.models import Compra


class CompraListCreateView(generics.GenericAPIView):
    def get_queryset(self):
        return Compra.objects.filter(carniceria=self.request.user.carniceria)

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
