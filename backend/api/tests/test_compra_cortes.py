"""
Tests de cortes dentro de una compra.
CA-11 al CA-13
"""
from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Compra


# ── CA-11 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_patch_compra_corte_actualiza_precios(client_usuario, compra_con_lomo):
    compra_corte = compra_con_lomo.cortes.get(nombre="Lomo")

    resp = client_usuario.patch(
        f"/api/v1/compras/{compra_con_lomo.id}/cortes/{compra_corte.id}/",
        {"porcentaje_rendimiento": "8.00", "margen_porcentaje": "40.00"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["porcentaje_rendimiento"] == "8.00"
    assert resp.data["margen_porcentaje"] == "40.00"
    assert resp.data["kg_corte"] == "8.00"
    assert resp.data["precio_minimo_kg"] == "1633.33"
    assert resp.data["precio_sugerido_kg"] == "2286.67"
    assert resp.data["precio_minimo_total"] == "13066.67"
    assert resp.data["precio_sugerido_total"] == "18293.33"

    compra_corte.refresh_from_db()
    assert compra_corte.porcentaje_rendimiento == Decimal("8.00")
    assert compra_corte.margen_porcentaje == Decimal("40.00")


# ── CA-12 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_patch_compra_corte_otra_carniceria_devuelve_404(client_otro_usuario, compra_con_lomo):
    compra_corte = compra_con_lomo.cortes.get(nombre="Lomo")

    resp = client_otro_usuario.patch(
        f"/api/v1/compras/{compra_con_lomo.id}/cortes/{compra_corte.id}/",
        {"margen_porcentaje": "60.00"},
        format="json",
    )

    assert resp.status_code == 404
    compra_corte.refresh_from_db()
    assert compra_corte.margen_porcentaje == Decimal("50.00")


# ── extra ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_patch_compra_corte_corte_id_equivocado_devuelve_404(client_usuario, compra_con_lomo):
    resp = client_usuario.patch(
        f"/api/v1/compras/{compra_con_lomo.id}/cortes/99999/",
        {"margen_porcentaje": "60.00"},
        format="json",
    )

    assert resp.status_code == 404


# ── CA-13 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_patch_compra_corte_ignora_nombre_y_orden(client_usuario, compra_con_lomo):
    compra_corte = compra_con_lomo.cortes.get(nombre="Lomo")
    orden_original = compra_corte.orden

    resp = client_usuario.patch(
        f"/api/v1/compras/{compra_con_lomo.id}/cortes/{compra_corte.id}/",
        {"nombre": "Nuevo Nombre", "orden": 99, "margen_porcentaje": "30.00"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["nombre"] == "Lomo"
    assert resp.data["orden"] == orden_original
    assert resp.data["margen_porcentaje"] == "30.00"

    compra_corte.refresh_from_db()
    assert compra_corte.nombre == "Lomo"
    assert compra_corte.orden == orden_original
    assert compra_corte.margen_porcentaje == Decimal("30.00")
