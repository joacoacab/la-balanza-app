"""
Tests de compras.
CA-08 al CA-10 + extras
"""
from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Compra, CompraCorte, Corte

PAYLOAD_COMPRA = {
    "peso_media_res": "100.000",
    "precio_kg": "1000.00",
    "porcentaje_carne": "60.00",
    "porcentaje_hueso": "30.00",
    "porcentaje_grasa": "10.00",
    "precio_grasa": "200.00",
    "fecha": "2026-03-14",
}

CAMPOS_LISTA = {"id", "fecha", "peso_media_res", "precio_kg", "costo_total", "costo_neto", "created_at"}


# ── extra ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_listar_compras(client_usuario, compra_base):
    resp = client_usuario.get("/api/v1/compras/")

    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert set(resp.data[0].keys()) == CAMPOS_LISTA


@pytest.mark.django_db
def test_listar_compras_aislamiento(client_usuario, compra_base, otro_usuario):
    baker.make(
        Compra,
        carniceria=otro_usuario.carniceria,
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),
        precio_grasa=Decimal("200.00"),
    )

    resp = client_usuario.get("/api/v1/compras/")

    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["id"] == compra_base.id


# ── CA-09 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_compra_porcentajes_validos(client_usuario, usuario):
    resp = client_usuario.post("/api/v1/compras/", PAYLOAD_COMPRA, format="json")

    assert resp.status_code == 201
    assert resp.data["costo_total"] == "100000.00"
    assert resp.data["costo_neto"] == "98000.00"
    assert set(resp.data.keys()) == CAMPOS_LISTA

    compra = Compra.objects.get(pk=resp.data["id"])
    assert compra.carniceria == usuario.carniceria


# ── CA-08 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_compra_porcentajes_invalidos(client_usuario):
    payload = {**PAYLOAD_COMPRA, "porcentaje_grasa": "5.00"}  # suma = 95

    resp = client_usuario.post("/api/v1/compras/", payload, format="json")

    assert resp.status_code == 400
    assert "non_field_errors" in resp.data


# ── extra ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_compra_genera_compra_cortes(client_usuario, usuario):
    baker.make(
        Corte, carniceria=usuario.carniceria, nombre="Lomo", activo=True,
        porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("50.00"),
    )
    baker.make(
        Corte, carniceria=usuario.carniceria, nombre="Asado", activo=True,
        porcentaje_rendimiento=Decimal("10.00"), margen_porcentaje=Decimal("30.00"),
    )
    baker.make(
        Corte, carniceria=usuario.carniceria, nombre="Costilla", activo=False,
        porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("20.00"),
    )

    resp = client_usuario.post("/api/v1/compras/", PAYLOAD_COMPRA, format="json")

    assert resp.status_code == 201
    compra_cortes = CompraCorte.objects.filter(compra_id=resp.data["id"])
    assert compra_cortes.count() == 2
    nombres = set(compra_cortes.values_list("nombre", flat=True))
    assert "Lomo" in nombres
    assert "Asado" in nombres


# ── CA-10 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_detalle_compra_incluye_cortes_y_precios(client_usuario, compra_con_lomo):
    resp = client_usuario.get(f"/api/v1/compras/{compra_con_lomo.id}/")

    assert resp.status_code == 200
    assert "cortes" in resp.data
    assert len(resp.data["cortes"]) == 1

    corte = resp.data["cortes"][0]
    assert corte["precio_minimo_kg"] == "1633.33"
    assert corte["precio_sugerido_kg"] == "2450.00"
    assert corte["precio_minimo_total"] == "8166.67"
    assert corte["precio_sugerido_total"] == "12250.00"


# ── CA-06 (detalle) ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_detalle_compra_otra_carniceria_devuelve_404(client_usuario, otro_usuario):
    compra_de_otro = baker.make(
        Compra,
        carniceria=otro_usuario.carniceria,
        peso_media_res=Decimal("100.000"),
        precio_kg=Decimal("1000.00"),
        porcentaje_carne=Decimal("60.00"),
        porcentaje_hueso=Decimal("30.00"),
        porcentaje_grasa=Decimal("10.00"),
        precio_grasa=Decimal("200.00"),
    )

    resp = client_usuario.get(f"/api/v1/compras/{compra_de_otro.id}/")

    assert resp.status_code == 404
