import django.core.validators
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_backfill_suscripciones"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlanPrecio",
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
                    "ciclo",
                    models.CharField(
                        choices=[
                            ("mensual", "Mensual"),
                            ("trimestral", "Trimestral"),
                            ("anual", "Anual"),
                        ],
                        max_length=15,
                        unique=True,
                    ),
                ),
                (
                    "precio",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0.01"))
                        ],
                    ),
                ),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Precio de plan",
                "verbose_name_plural": "Precios de planes",
            },
        ),
    ]
