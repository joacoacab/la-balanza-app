"""
Tests para el modelo CompraCorte.
CA-02, CA-03, CA-08, CA-10
"""
from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Compra, CompraCorte
from django.db import IntegrityError


# ── CA-02 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_corte_precio_minimo_y_sugerido(compra_con_lomo):
    lomo = compra_con_lomo.cortes.get(nombre="Lomo")

    # kg_corte = 100.000 * (5.00 / 100) = 5.0000
    expected_kg = Decimal("100.000") * (Decimal("5.00") / Decimal("100"))
    assert lomo.kg_corte == expected_kg

    # precio_minimo_kg = costo_neto / kg_carne_vendible = 98_000 / 60
    expected_precio_min = compra_con_lomo.costo_por_kg_vendible
    assert lomo.precio_minimo_kg == expected_precio_min

    # precio_sugerido_kg = precio_minimo_kg * (1 + 50/100) = precio_minimo_kg * 1.5
    expected_precio_sug = expected_precio_min * (Decimal("1") + Decimal("50.00") / Decimal("100"))
    assert lomo.precio_sugerido_kg == expected_precio_sug

    # precio_minimo_total = precio_minimo_kg * kg_corte
    assert lomo.precio_minimo_total == expected_precio_min * expected_kg

    # precio_sugerido_total = precio_sugerido_kg * kg_corte
    assert lomo.precio_sugerido_total == expected_precio_sug * expected_kg


# ── CA-03 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_corte_sin_margen(compra_base):
    corte = baker.make(
        CompraCorte,
        compra=compra_base,
        nombre="Paleta",
        porcentaje_rendimiento=Decimal("8.00"),
        margen_porcentaje=Decimal("0.00"),
    )
    assert corte.precio_sugerido_kg == corte.precio_minimo_kg


# ── CA-08 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_propiedades_retornan_decimal(compra_base):
    assert isinstance(compra_base.costo_total, Decimal)
    assert isinstance(compra_base.ingreso_grasa, Decimal)
    assert isinstance(compra_base.costo_neto, Decimal)
    assert isinstance(compra_base.kg_carne_vendible, Decimal)
    assert isinstance(compra_base.costo_por_kg_vendible, Decimal)

    corte = baker.make(
        CompraCorte,
        compra=compra_base,
        nombre="Lomo",
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("50.00"),
    )
    assert isinstance(corte.kg_corte, Decimal)
    assert isinstance(corte.precio_minimo_kg, Decimal)
    assert isinstance(corte.precio_sugerido_kg, Decimal)
    assert isinstance(corte.precio_minimo_total, Decimal)
    assert isinstance(corte.precio_sugerido_total, Decimal)


# ── CA-10 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_compra_corte_nombre_unico_por_compra(compra_base):
    baker.make(
        CompraCorte,
        compra=compra_base,
        nombre="Lomo",
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("30.00"),
    )
    with pytest.raises(IntegrityError):
        baker.make(
            CompraCorte,
            compra=compra_base,
            nombre="Lomo",
            porcentaje_rendimiento=Decimal("3.00"),
            margen_porcentaje=Decimal("20.00"),
        )


@pytest.mark.django_db
def test_compra_corte_mismo_nombre_distinta_compra_es_valido(db):
    """El mismo nombre de corte puede existir en compras distintas."""
    from core.models import Carniceria, Compra
    carniceria = baker.make(Carniceria)

    def nueva_compra():
        return baker.make(
            Compra,
            carniceria=carniceria,
            peso_media_res=Decimal("100.000"),
            precio_kg=Decimal("1000.00"),
            porcentaje_carne=Decimal("60.00"),
            porcentaje_hueso=Decimal("30.00"),
            porcentaje_grasa=Decimal("10.00"),
            precio_grasa=Decimal("200.00"),
        )

    compra_a = nueva_compra()
    compra_b = nueva_compra()

    baker.make(CompraCorte, compra=compra_a, nombre="Lomo",
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("30.00"))
    # no debe lanzar excepción
    baker.make(CompraCorte, compra=compra_b, nombre="Lomo",
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("30.00"))
