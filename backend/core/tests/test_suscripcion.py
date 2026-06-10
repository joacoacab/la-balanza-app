from datetime import date, timedelta

import pytest
from django.core.management import call_command
from model_bakery import baker

from core.models import Carniceria, Suscripcion


@pytest.fixture
def suscripcion_pro_activa(db):
    carniceria = baker.make(Carniceria)
    sus = carniceria.suscripcion
    sus.activar_pro(ciclo="mensual", fecha_inicio=date.today() - timedelta(days=40))
    sus.refresh_from_db()
    return sus


@pytest.fixture
def suscripcion_pro_vigente(db):
    carniceria = baker.make(Carniceria)
    sus = carniceria.suscripcion
    sus.activar_pro(ciclo="mensual", fecha_inicio=date.today())
    sus.refresh_from_db()
    return sus


@pytest.fixture
def suscripcion_free(db):
    carniceria = baker.make(Carniceria)
    return carniceria.suscripcion


# ── puede_crear_compra ──────────────────────────────────────────────────────

class TestPuedeCrearCompra:
    def test_free_permite_vaca(self, suscripcion_free):
        puede, _ = suscripcion_free.puede_crear_compra("vaca")
        assert puede is True

    def test_free_bloquea_cerdo(self, suscripcion_free):
        puede, msg = suscripcion_free.puede_crear_compra("cerdo")
        assert puede is False
        assert "plan Free" in msg

    def test_free_bloquea_pollo(self, suscripcion_free):
        puede, _ = suscripcion_free.puede_crear_compra("pollo")
        assert puede is False

    def test_pro_activa_permite_cualquier_animal(self, suscripcion_pro_vigente):
        for animal in ("vaca", "cerdo", "pollo"):
            puede, _ = suscripcion_pro_vigente.puede_crear_compra(animal)
            assert puede is True, f"Pro activa debería permitir {animal}"

    def test_pro_vencida_bloquea(self, suscripcion_pro_activa):
        suscripcion_pro_activa.estado = "vencida"
        suscripcion_pro_activa.save(update_fields=["estado"])
        puede, msg = suscripcion_pro_activa.puede_crear_compra("vaca")
        assert puede is False
        assert "vencida" in msg


# ── vencer_suscripciones management command ─────────────────────────────────

class TestVencerSuscripcionesCommand:
    def test_vence_suscripcion_expirada(self, suscripcion_pro_activa):
        assert suscripcion_pro_activa.estado == "activa"
        call_command("vencer_suscripciones", verbosity=0)
        suscripcion_pro_activa.refresh_from_db()
        assert suscripcion_pro_activa.estado == "vencida"

    def test_no_toca_suscripcion_vigente(self, suscripcion_pro_vigente):
        call_command("vencer_suscripciones", verbosity=0)
        suscripcion_pro_vigente.refresh_from_db()
        assert suscripcion_pro_vigente.estado == "activa"

    def test_no_toca_plan_free(self, suscripcion_free):
        call_command("vencer_suscripciones", verbosity=0)
        suscripcion_free.refresh_from_db()
        assert suscripcion_free.estado == "activa"
        assert suscripcion_free.plan == "free"

    def test_no_reprocesa_ya_vencidas(self, suscripcion_pro_activa, db):
        suscripcion_pro_activa.estado = "vencida"
        suscripcion_pro_activa.save(update_fields=["estado"])
        call_command("vencer_suscripciones", verbosity=0)
        suscripcion_pro_activa.refresh_from_db()
        assert suscripcion_pro_activa.estado == "vencida"

    def test_cuenta_correctamente(self, capsys, suscripcion_pro_activa, suscripcion_pro_vigente):
        call_command("vencer_suscripciones")
        captured = capsys.readouterr()
        assert "1" in captured.out
