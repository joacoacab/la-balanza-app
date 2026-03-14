from rest_framework import serializers

from core.models import Corte


class CorteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Corte
        fields = ["id", "nombre", "porcentaje_rendimiento", "margen_porcentaje", "orden"]

    def validate_nombre(self, value):
        carniceria = self.context["request"].user.carniceria
        qs = Corte.objects.filter(carniceria=carniceria, nombre=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un corte con este nombre en tu carnicería.")
        return value

    def create(self, validated_data):
        carniceria = self.context["request"].user.carniceria
        return Corte.objects.create(carniceria=carniceria, **validated_data)
