from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Carniceria, Corte
from core.services.onboarding import cargar_cortes_base, cargar_cortes_cerdo


# ── Carniceria.animales_activos property ─────────────────────────────────────

class TestAnimalesActivosProperty:
    def test_sin_cortes_devuelve_vacio(self, db):
        carniceria = baker.make(Carniceria)
        assert carniceria.animales_activos == []

    def test_con_cortes_vaca(self, db):
        carniceria = baker.make(Carniceria)
        cargar_cortes_base(carniceria)
        assert carniceria.animales_activos == ["vaca"]

    def test_con_cortes_vaca_y_cerdo(self, db):
        carniceria = baker.make(Carniceria)
        cargar_cortes_base(carniceria)
        cargar_cortes_cerdo(carniceria)
        assert carniceria.animales_activos == ["cerdo", "vaca"]

    def test_corte_inactivo_no_cuenta(self, db):
        carniceria = baker.make(Carniceria)
        baker.make(
            Corte,
            carniceria=carniceria,
            tipo_animal="cerdo",
            activo=False,
            porcentaje_rendimiento=Decimal("5.00"),
            margen_porcentaje=Decimal("30.00"),
        )
        assert carniceria.animales_activos == []


# ── GET /api/v1/cortes/animales/ ─────────────────────────────────────────────

class TestAnimalesActivosEndpoint:
    def test_devuelve_animales_activos(self, client_usuario, usuario):
        cargar_cortes_base(usuario.carniceria)
        cargar_cortes_cerdo(usuario.carniceria)
        resp = client_usuario.get("/api/v1/cortes/animales/")
        assert resp.status_code == 200
        assert set(resp.data["animales"]) == {"vaca", "cerdo"}

    def test_sin_cortes_devuelve_lista_vacia(self, client_usuario):
        resp = client_usuario.get("/api/v1/cortes/animales/")
        assert resp.status_code == 200
        assert resp.data["animales"] == []

    def test_aislado_por_tenant(self, client_usuario, client_otro_usuario, usuario):
        cargar_cortes_base(usuario.carniceria)
        resp_otro = client_otro_usuario.get("/api/v1/cortes/animales/")
        assert resp_otro.data["animales"] == []

    def test_requiere_autenticacion(self, api_client):
        resp = api_client.get("/api/v1/cortes/animales/")
        assert resp.status_code == 401


# ── PuedeCrearCompra — bloqueo por módulo inactivo ───────────────────────────

DATOS_COMPRA = dict(
    peso_media_res="100.000",
    precio_kg="1000.00",
    porcentaje_carne="60.00",
    porcentaje_hueso="30.00",
    porcentaje_grasa="10.00",
    precio_grasa="200.00",
    fecha="2026-01-01",
)


class TestPuedeCrearCompraMóduloInactivo:
    def test_bloquea_compra_sin_cortes_para_animal(self, client_usuario):
        resp = client_usuario.post(
            "/api/v1/compras/",
            {**DATOS_COMPRA, "tipo_animal": "vaca"},
            format="json",
        )
        assert resp.status_code == 403
        assert resp.data["error"] == "modulo_inactivo"

    def test_permite_compra_con_cortes_activos(self, client_usuario, usuario):
        cargar_cortes_base(usuario.carniceria)
        resp = client_usuario.post(
            "/api/v1/compras/",
            {**DATOS_COMPRA, "tipo_animal": "vaca"},
            format="json",
        )
        assert resp.status_code == 201

    def test_bloquea_cerdo_sin_cortes_aunque_plan_pro(self, client_usuario, usuario):
        cargar_cortes_base(usuario.carniceria)
        usuario.carniceria.suscripcion.activar_pro(ciclo="mensual", fecha_inicio=__import__("datetime").date.today())
        resp = client_usuario.post(
            "/api/v1/compras/",
            {**DATOS_COMPRA, "tipo_animal": "cerdo"},
            format="json",
        )
        assert resp.status_code == 403
        assert resp.data["error"] == "modulo_inactivo"

    def test_permite_cerdo_con_cortes_y_plan_pro(self, client_usuario, usuario):
        from datetime import date
        cargar_cortes_base(usuario.carniceria)
        cargar_cortes_cerdo(usuario.carniceria)
        usuario.carniceria.suscripcion.activar_pro(ciclo="mensual", fecha_inicio=date.today())
        resp = client_usuario.post(
            "/api/v1/compras/",
            {**DATOS_COMPRA, "tipo_animal": "cerdo"},
            format="json",
        )
        assert resp.status_code == 201
