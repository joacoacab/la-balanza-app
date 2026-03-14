from decimal import Decimal

import pytest
from model_bakery import baker
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from core.models import Carniceria, Compra, Corte
from users.models import User

DATOS_COMPRA = dict(
    peso_media_res=Decimal("100.000"),
    precio_kg=Decimal("1000.00"),
    porcentaje_carne=Decimal("60.00"),
    porcentaje_hueso=Decimal("30.00"),
    porcentaje_grasa=Decimal("10.00"),
    precio_grasa=Decimal("200.00"),
)

DATOS_CORTE_LOMO = dict(
    nombre="Lomo",
    porcentaje_rendimiento=Decimal("5.00"),
    margen_porcentaje=Decimal("50.00"),
    activo=True,
)


@pytest.fixture
def usuario(db):
    user = baker.make(User, username="carnicero1")
    user.set_password("testpass123")
    user.save()
    baker.make(Carniceria, user=user)
    return user


@pytest.fixture
def otro_usuario(db):
    user = baker.make(User, username="carnicero2")
    user.set_password("testpass123")
    user.save()
    baker.make(Carniceria, user=user)
    return user


@pytest.fixture
def token_usuario(usuario):
    token, _ = Token.objects.get_or_create(user=usuario)
    return token


@pytest.fixture
def token_otro_usuario(otro_usuario):
    token, _ = Token.objects.get_or_create(user=otro_usuario)
    return token


@pytest.fixture
def client_usuario(token_usuario):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token_usuario.key}")
    return client


@pytest.fixture
def client_otro_usuario(token_otro_usuario):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token_otro_usuario.key}")
    return client


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def corte_activo(usuario):
    return baker.make(Corte, carniceria=usuario.carniceria, **DATOS_CORTE_LOMO)


@pytest.fixture
def corte_inactivo(usuario):
    return baker.make(
        Corte,
        carniceria=usuario.carniceria,
        nombre="Costilla",
        porcentaje_rendimiento=Decimal("5.00"),
        margen_porcentaje=Decimal("20.00"),
        activo=False,
    )


@pytest.fixture
def compra_base(usuario):
    return baker.make(Compra, carniceria=usuario.carniceria, **DATOS_COMPRA)


@pytest.fixture
def compra_con_lomo(usuario):
    baker.make(Corte, carniceria=usuario.carniceria, **DATOS_CORTE_LOMO)
    return baker.make(Compra, carniceria=usuario.carniceria, **DATOS_COMPRA)
