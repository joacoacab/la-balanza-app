"""
Tests para el modelo Corte (plantilla).
CA-09
"""
from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Carniceria, Corte
from django.db import IntegrityError


# ── CA-09 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_corte_nombre_unico_por_carniceria():
    carniceria = baker.make(Carniceria)
    baker.make(
        Corte,
        carniceria=carniceria,
        nombre="Lomo",
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("50.00"),
    )
    with pytest.raises(IntegrityError):
        baker.make(
            Corte,
            carniceria=carniceria,
            nombre="Lomo",
            porcentaje_rendimiento=Decimal("4.00"),
            margen_porcentaje=Decimal("40.00"),
        )


@pytest.mark.django_db
def test_corte_mismo_nombre_distinta_carniceria_es_valido():
    """El mismo nombre de corte puede existir en carnicerías distintas."""
    carniceria_a = baker.make(Carniceria)
    carniceria_b = baker.make(Carniceria)
    baker.make(Corte, carniceria=carniceria_a, nombre="Lomo",
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("50.00"))
    # no debe lanzar excepción
    baker.make(Corte, carniceria=carniceria_b, nombre="Lomo",
               porcentaje_rendimiento=Decimal("5.00"), margen_porcentaje=Decimal("50.00"))
