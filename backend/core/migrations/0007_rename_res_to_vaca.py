from django.db import migrations, models


def res_a_vaca(apps, schema_editor):
    Corte = apps.get_model("core", "Corte")
    Compra = apps.get_model("core", "Compra")
    Corte.objects.filter(tipo_animal="res").update(tipo_animal="vaca")
    Compra.objects.filter(tipo_animal="res").update(tipo_animal="vaca")


def vaca_a_res(apps, schema_editor):
    Corte = apps.get_model("core", "Corte")
    Compra = apps.get_model("core", "Compra")
    Corte.objects.filter(tipo_animal="vaca").update(tipo_animal="res")
    Compra.objects.filter(tipo_animal="vaca").update(tipo_animal="res")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_backfill_plan_precios"),
    ]

    operations = [
        migrations.RunPython(res_a_vaca, vaca_a_res),
        migrations.AlterField(
            model_name="corte",
            name="tipo_animal",
            field=models.CharField(
                choices=[("vaca", "Vaca"), ("cerdo", "Cerdo"), ("pollo", "Pollo")],
                default="vaca",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="compra",
            name="tipo_animal",
            field=models.CharField(
                choices=[("vaca", "Vaca"), ("cerdo", "Cerdo"), ("pollo", "Pollo")],
                default="vaca",
                max_length=10,
            ),
        ),
    ]
