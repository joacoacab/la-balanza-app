from decimal import Decimal

from rest_framework import serializers

from core.models import CompraCorte


def _redondear(valor):
    return str(valor.quantize(Decimal("0.01")))


class CompraCorteSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(read_only=True)
    orden = serializers.IntegerField(read_only=True)
    kg_corte = serializers.SerializerMethodField()
    precio_minimo_kg = serializers.SerializerMethodField()
    precio_sugerido_kg = serializers.SerializerMethodField()
    precio_minimo_total = serializers.SerializerMethodField()
    precio_sugerido_total = serializers.SerializerMethodField()

    class Meta:
        model = CompraCorte
        fields = [
            "id",
            "nombre",
            "porcentaje_rendimiento",
            "margen_porcentaje",
            "orden",
            "kg_corte",
            "precio_minimo_kg",
            "precio_sugerido_kg",
            "precio_minimo_total",
            "precio_sugerido_total",
        ]

    def get_kg_corte(self, obj):
        return _redondear(obj.kg_corte)

    def get_precio_minimo_kg(self, obj):
        return _redondear(obj.precio_minimo_kg)

    def get_precio_sugerido_kg(self, obj):
        return _redondear(obj.precio_sugerido_kg)

    def get_precio_minimo_total(self, obj):
        return _redondear(obj.precio_minimo_total)

    def get_precio_sugerido_total(self, obj):
        return _redondear(obj.precio_sugerido_total)
