"""
Tests para el modelo Compra.
CA-01, CA-04, CA-05, CA-06, CA-07
"""
from decimal import Decimal
from datetime import date

import pytest
from model_bakery import baker

from core.models import Carniceria, Compra, CompraCorte, Corte
from django.core.exceptions import ValidationError


# ── CA-01 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_calculo_costo_basico(compra_base):
    assert compra_base.costo_total == Decimal("100.000") * Decimal("1000.00")
    assert compra_base.ingreso_grasa == Decimal("100.000") * (Decimal("10.00") / Decimal("100")) * Decimal("200.00")
    assert compra_base.costo_neto == compra_base.costo_total - compra_base.ingreso_grasa
    assert compra_base.kg_carne_vendible == Decimal("100.000") * (Decimal("60.00") / Decimal("100"))
    assert compra_base.costo_por_kg_vendible == compra_base.costo_neto / compra_base.kg_carne_vendible


@pytest.mark.django_db
def test_compra_calculo_costo_valores_concretos(compra_base):
    # costo_total = 100 * 1000 = 100_000
    assert compra_base.costo_total == Decimal("100000.000")
    # ingreso_grasa = 100 * 0.10 * 200 = 2_000
    assert compra_base.ingreso_grasa == Decimal("2000.0000")
    # costo_neto = 100_000 - 2_000 = 98_000
    assert compra_base.costo_neto == Decimal("98000")
    # kg_carne_vendible = 100 * 0.60 = 60
    assert compra_base.kg_carne_vendible == Decimal("60.0000")
    # costo_por_kg_vendible = 98_000 / 60
    expected_costo_kg = Decimal("98000.0000") / Decimal("60.0000")
    assert compra_base.costo_por_kg_vendible == expected_costo_kg


# ── CA-04 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_grasa_precio_cero(carniceria):
    compra = baker.make(
        Compra,
        carniceria=carniceria,
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),
        precio_grasa=Decimal("0.00"),
    )
    assert compra.ingreso_grasa == Decimal("0")
    assert compra.costo_neto == compra.costo_total
    expected_costo_kg = Decimal("100000.000") * Decimal("1.00") / Decimal("60.0000")
    assert compra.costo_por_kg_vendible == Decimal("100000.00000") / Decimal("60.0000")


# ── CA-05 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_porcentajes_invalidos(carniceria):
    compra = Compra(
        carniceria=carniceria,
        fecha=date.today(),
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("5.00"),   # suma = 95, inválido
        precio_grasa=Decimal("200.00"),
    )
    with pytest.raises(ValidationError):
        compra.full_clean()


# ── CA-06 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_porcentajes_validos(carniceria):
    compra = Compra(
        carniceria=carniceria,
        fecha=date.today(),
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),  # suma = 100, válido
        precio_grasa=Decimal("200.00"),
    )
    # no debe lanzar excepción
    compra.full_clean()


# ── CA-07 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_copia_cortes_activos():
    carniceria = baker.make(Carniceria)
    baker.make(Corte, carniceria=carniceria, nombre="Lomo", activo=True,
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("50.00"))
    baker.make(Corte, carniceria=carniceria, nombre="Asado", activo=True,
               porcentaje_rendimiento=Decimal("10.00"), margen_porcentaje=Decimal("30.00"))
    baker.make(Corte, carniceria=carniceria, nombre="Costilla", activo=False,
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("20.00"))

    compra = baker.make(
        Compra,
        carniceria=carniceria,
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),
        precio_grasa=Decimal("200.00"),
    )

    compra_cortes = CompraCorte.objects.filter(compra=compra)
    assert compra_cortes.count() == 2

    nombres = set(compra_cortes.values_list("nombre", flat=True))
    assert "Lomo" in nombres
    assert "Asado" in nombres
    assert "Costilla" not in nombres


@pytest.mark.django_db
def test_compra_copia_campos_de_plantilla():
    carniceria = baker.make(Carniceria)
    corte = baker.make(
        Corte,
        carniceria=carniceria,
        nombre="Lomo",
        activo=True,
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("50.00"),
        orden=3,
    )

    compra = baker.make(
        Compra,
        carniceria=carniceria,
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),
        precio_grasa=Decimal("200.00"),
    )

    compra_corte = compra.cortes.get(nombre="Lomo")
    assert compra_corte.porcentaje_rendimiento == corte.porcentaje_rendimiento
    assert compra_corte.margen_porcentaje == corte.margen_porcentaje
    assert compra_corte.orden == corte.orden


@pytest.mark.django_db
def test_compra_no_copia_cortes_en_actualizacion():
    carniceria = baker.make(Carniceria)
    baker.make(Corte, carniceria=carniceria, nombre="Lomo", activo=True,
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("50.00"))

    compra = baker.make(
        Compra,
        carniceria=carniceria,
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),
        precio_grasa=Decimal("200.00"),
    )
    assert compra.cortes.count() == 1

    # agregar un corte nuevo a la plantilla y re-guardar la compra
    baker.make(Corte, carniceria=carniceria, nombre="Asado", activo=True,
               porcentaje_rendimiento=Decimal("10.00"), margen_porcentaje=Decimal("30.00"))
    compra.notas = "actualizado"
    compra.save()

    # no se deben haber copiado cortes nuevos
    assert compra.cortes.count() == 1
