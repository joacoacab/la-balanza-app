from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Carniceria, Compra, Corte

DATOS_COMPRA_BASE = dict(
    peso_media_res=Decimal("100.000"),
    precio_kg=Decimal("1000.00"),
    porcentaje_carne=Decimal("60.00"),
    porcentaje_hueso=Decimal("30.00"),
    porcentaje_grasa=Decimal("10.00"),
    precio_grasa=Decimal("200.00"),
)


@pytest.fixture
def carniceria(db):
    return baker.make(Carniceria)


@pytest.fixture
def compra_base(carniceria):
    return baker.make(Compra, carniceria=carniceria, **DATOS_COMPRA_BASE)


@pytest.fixture
def compra_con_lomo(db):
    carniceria = baker.make(Carniceria)
    baker.make(
        Corte,
        carniceria=carniceria,
        nombre="Lomo",
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("50.00"),
        activo=True,
    )
    return baker.make(Compra, carniceria=carniceria, **DATOS_COMPRA_BASE)
