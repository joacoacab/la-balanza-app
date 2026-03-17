from django.db import migrations


def backfill_suscripciones(apps, schema_editor):
    Carniceria = apps.get_model("core", "Carniceria")
    Suscripcion = apps.get_model("core", "Suscripcion")
    for carniceria in Carniceria.objects.all():
        Suscripcion.objects.get_or_create(
            carniceria=carniceria,
            defaults={"plan": "free", "estado": "activa"},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_add_suscripcion"),
    ]

    operations = [
        migrations.RunPython(backfill_suscripciones, migrations.RunPython.noop),
    ]
