from decimal import Decimal

from rest_framework import serializers

from core.models import Compra

from .compra_corte import CompraCorteSerializer


def _redondear(valor):
    return str(valor.quantize(Decimal("0.01")))


class CompraListSerializer(serializers.ModelSerializer):
    costo_total = serializers.SerializerMethodField()
    costo_neto = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = [
            "id",
            "tipo_animal",
            "fecha",
            "peso_media_res",
            "precio_kg",
            "costo_total",
            "costo_neto",
            "created_at",
        ]

    def get_costo_total(self, obj):
        return _redondear(obj.costo_total)

    def get_costo_neto(self, obj):
        return _redondear(obj.costo_neto)


class CompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compra
        fields = [
            "tipo_animal",
            "fecha",
            "peso_media_res",
            "precio_kg",
            "porcentaje_carne",
            "porcentaje_hueso",
            "porcentaje_grasa",
            "precio_grasa",
            "notas",
        ]

    def validate(self, data):
        carne = data.get("porcentaje_carne", Decimal("0"))
        hueso = data.get("porcentaje_hueso", Decimal("0"))
        grasa = data.get("porcentaje_grasa", Decimal("0"))
        if carne + hueso + grasa != Decimal("100"):
            raise serializers.ValidationError(
                "La suma de porcentaje_carne, porcentaje_hueso y porcentaje_grasa debe ser 100."
            )
        return data

    def create(self, validated_data):
        carniceria = self.context["request"].user.carniceria
        return Compra.objects.create(carniceria=carniceria, **validated_data)


class CompraDetailSerializer(serializers.ModelSerializer):
    costo_total = serializers.SerializerMethodField()
    ingreso_grasa = serializers.SerializerMethodField()
    costo_neto = serializers.SerializerMethodField()
    kg_carne_vendible = serializers.SerializerMethodField()
    costo_por_kg_vendible = serializers.SerializerMethodField()
    cortes = CompraCorteSerializer(many=True, read_only=True)

    class Meta:
        model = Compra
        fields = [
            "id",
            "tipo_animal",
            "fecha",
            "peso_media_res",
            "precio_kg",
            "porcentaje_carne",
            "porcentaje_hueso",
            "porcentaje_grasa",
            "precio_grasa",
            "costo_total",
            "ingreso_grasa",
            "costo_neto",
            "kg_carne_vendible",
            "costo_por_kg_vendible",
            "notas",
            "created_at",
            "cortes",
        ]

    def get_costo_total(self, obj):
        return _redondear(obj.costo_total)

    def get_ingreso_grasa(self, obj):
        return _redondear(obj.ingreso_grasa)

    def get_costo_neto(self, obj):
        return _redondear(obj.costo_neto)

    def get_kg_carne_vendible(self, obj):
        return _redondear(obj.kg_carne_vendible)

    def get_costo_por_kg_vendible(self, obj):
        return _redondear(obj.costo_por_kg_vendible)
