from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="corte",
            name="tipo_animal",
            field=models.CharField(
                choices=[("res", "Res"), ("cerdo", "Cerdo"), ("pollo", "Pollo")],
                default="res",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="compra",
            name="tipo_animal",
            field=models.CharField(
                choices=[("res", "Res"), ("cerdo", "Cerdo"), ("pollo", "Pollo")],
                default="res",
                max_length=10,
            ),
        ),
        migrations.RemoveConstraint(
            model_name="corte",
            name="unique_corte_por_carniceria",
        ),
        migrations.AddConstraint(
            model_name="corte",
            constraint=models.UniqueConstraint(
                fields=("carniceria", "nombre", "tipo_animal"),
                name="unique_corte_por_carniceria",
            ),
        ),
    ]
