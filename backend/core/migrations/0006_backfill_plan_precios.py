from decimal import Decimal
from django.db import migrations


def backfill_plan_precios(apps, schema_editor):
    PlanPrecio = apps.get_model("core", "PlanPrecio")
    precios_iniciales = [
        ("mensual",    Decimal("80000.00")),
        ("trimestral", Decimal("210000.00")),
        ("anual",      Decimal("720000.00")),
    ]
    for ciclo, precio in precios_iniciales:
        PlanPrecio.objects.get_or_create(ciclo=ciclo, defaults={"precio": precio})


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_add_plan_precio"),
    ]

    operations = [
        migrations.RunPython(backfill_plan_precios, migrations.RunPython.noop),
    ]
