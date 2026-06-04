from decimal import Decimal

import pytest
from model_bakery import baker

from core.models import Carniceria, Compra, CompraCorte, Corte
from api.permissions import IsTenantObjectOwner
from users.models import User


DATOS_COMPRA = dict(
    peso_media_res=Decimal("100.000"),
    precio_kg=Decimal("1000.00"),
    porcentaje_carne=Decimal("60.00"),
    porcentaje_hueso=Decimal("30.00"),
    porcentaje_grasa=Decimal("10.00"),
    precio_grasa=Decimal("200.00"),
)


def crear_usuario_con_carniceria(username):
    user = baker.make(User, username=username)
    baker.make(Carniceria, user=user)
    return user


@pytest.mark.django_db
def test_tenant_manager_for_user_filtra_modelos_directos():
    usuario = crear_usuario_con_carniceria("tenant-a")
    otro_usuario = crear_usuario_con_carniceria("tenant-b")
    corte = baker.make(
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
    compra = baker.make(Compra, carniceria=usuario.carniceria, **DATOS_COMPRA)
    baker.make(Compra, carniceria=otro_usuario.carniceria, **DATOS_COMPRA)

    assert list(Corte.objects.for_user(usuario)) == [corte]
    assert list(Compra.objects.for_user(usuario)) == [compra]


@pytest.mark.django_db
def test_tenant_manager_for_user_filtra_modelos_indirectos():
    usuario = crear_usuario_con_carniceria("tenant-a")
    otro_usuario = crear_usuario_con_carniceria("tenant-b")
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
    compra = baker.make(Compra, carniceria=usuario.carniceria, **DATOS_COMPRA)
    baker.make(Compra, carniceria=otro_usuario.carniceria, **DATOS_COMPRA)
    compra_corte = compra.cortes.get(nombre="Lomo")

    assert list(CompraCorte.objects.for_user(usuario)) == [compra_corte]


@pytest.mark.django_db
def test_is_tenant_object_owner_falla_cerrado_con_objeto_inconsistente():
    usuario = crear_usuario_con_carniceria("tenant-a")
    request = type("Request", (), {"user": usuario})()
    obj = type("ObjetoInconsistente", (), {"tenant_lookup": "carniceria"})()

    assert IsTenantObjectOwner().has_object_permission(request, None, obj) is False
