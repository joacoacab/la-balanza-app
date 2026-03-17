import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_add_tipo_animal"),
    ]

    operations = [
        migrations.CreateModel(
            name="Suscripcion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "plan",
                    models.CharField(
                        choices=[("free", "Free"), ("pro", "Pro")],
                        default="free",
                        max_length=10,
                    ),
                ),
                (
                    "ciclo",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("mensual", "Mensual"),
                            ("trimestral", "Trimestral"),
                            ("anual", "Anual"),
                        ],
                        max_length=15,
                        null=True,
                    ),
                ),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("activa", "Activa"),
                            ("vencida", "Vencida"),
                            ("cancelada", "Cancelada"),
                        ],
                        default="activa",
                        max_length=15,
                    ),
                ),
                (
                    "mp_preapproval_id",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                ("fecha_inicio", models.DateField(blank=True, null=True)),
                ("fecha_vencimiento", models.DateField(blank=True, null=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "carniceria",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="suscripcion",
                        to="core.carniceria",
                    ),
                ),
            ],
            options={
                "verbose_name": "Suscripción",
                "verbose_name_plural": "Suscripciones",
            },
        ),
    ]
