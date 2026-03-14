"""
Tests de la plantilla de cortes.
CA-05, CA-06, CA-07 + extras
"""
from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Corte


# ── CA-05 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_listar_cortes_solo_activos(client_usuario, usuario, corte_activo, corte_inactivo):
    baker.make(
        Corte,
        carniceria=usuario.carniceria,
        nombre="Asado",
        porcentaje_rendimiento=Decimal("10.00"),
        margen_porcentaje=Decimal("30.00"),
        activo=True,
    )

    resp = client_usuario.get("/api/v1/cortes/")

    assert resp.status_code == 200
    assert len(resp.data) == 2
    nombres = [c["nombre"] for c in resp.data]
    assert corte_inactivo.nombre not in nombres
    for corte in resp.data:
        assert "activo" not in corte


# ── CA-06 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_listar_cortes_aislamiento(client_usuario, usuario, otro_usuario):
    baker.make(
        Corte,
        carniceria=usuario.carniceria,
        nombre="Lomo",
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("50.00"),
        activo=True,
    )
    baker.make(
        Corte,
        carniceria=otro_usuario.carniceria,
        nombre="Paleta",
        porcentaje_rendimiento=Decimal("8.00"),
        margen_porcentaje=Decimal("30.00"),
        activo=True,
    )

    resp = client_usuario.get("/api/v1/cortes/")

    assert resp.status_code == 200
    nombres = [c["nombre"] for c in resp.data]
    assert "Lomo" in nombres
    assert "Paleta" not in nombres


# ── extra ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_corte(client_usuario, usuario):
    resp = client_usuario.post(
        "/api/v1/cortes/",
        {"nombre": "Paleta", "porcentaje_rendimiento": "8.00", "margen_porcentaje": "35.00", "orden": 2},
        format="json",
    )

    assert resp.status_code == 201
    assert resp.data["nombre"] == "Paleta"
    assert resp.data["porcentaje_rendimiento"] == "8.00"
    assert resp.data["margen_porcentaje"] == "35.00"
    assert resp.data["orden"] == 2
    assert "id" in resp.data

    corte = Corte.objects.get(pk=resp.data["id"])
    assert corte.carniceria == usuario.carniceria
    assert corte.activo is True


@pytest.mark.django_db
def test_crear_corte_nombre_duplicado(client_usuario, corte_activo):
    resp = client_usuario.post(
        "/api/v1/cortes/",
        {"nombre": corte_activo.nombre, "porcentaje_rendimiento": "5.00", "margen_porcentaje": "30.00"},
        format="json",
    )

    assert resp.status_code == 400
    assert "nombre" in resp.data


@pytest.mark.django_db
def test_editar_corte_parcial(client_usuario, corte_activo):
    resp = client_usuario.patch(
        f"/api/v1/cortes/{corte_activo.id}/",
        {"margen_porcentaje": "45.00"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["margen_porcentaje"] == "45.00"
    assert resp.data["nombre"] == corte_activo.nombre

    corte_activo.refresh_from_db()
    assert corte_activo.margen_porcentaje == Decimal("45.00")


@pytest.mark.django_db
def test_editar_corte_otra_carniceria_devuelve_404(client_usuario, otro_usuario):
    corte_de_otro = baker.make(
        Corte,
        carniceria=otro_usuario.carniceria,
        nombre="Asado",
        porcentaje_rendimiento=Decimal("10.00"),
        margen_porcentaje=Decimal("30.00"),
        activo=True,
    )

    resp = client_usuario.patch(
        f"/api/v1/cortes/{corte_de_otro.id}/",
        {"margen_porcentaje": "45.00"},
        format="json",
    )

    assert resp.status_code == 404


# ── CA-07 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_soft_delete_corte(client_usuario, corte_activo):
    resp = client_usuario.delete(f"/api/v1/cortes/{corte_activo.id}/")

    assert resp.status_code == 204

    corte_activo.refresh_from_db()
    assert corte_activo.activo is False

    resp2 = client_usuario.get("/api/v1/cortes/")
    assert resp2.status_code == 200
    ids = [c["id"] for c in resp2.data]
    assert corte_activo.id not in ids


# ── extra ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_delete_corte_otra_carniceria_devuelve_404(client_usuario, otro_usuario):
    corte_de_otro = baker.make(
        Corte,
        carniceria=otro_usuario.carniceria,
        nombre="Asado",
        porcentaje_rendimiento=Decimal("10.00"),
        margen_porcentaje=Decimal("30.00"),
        activo=True,
    )

    resp = client_usuario.delete(f"/api/v1/cortes/{corte_de_otro.id}/")

    assert resp.status_code == 404
    corte_de_otro.refresh_from_db()
    assert corte_de_otro.activo is True
