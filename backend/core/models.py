from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Carniceria(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carniceria",
    )
    nombre = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Carnicería"
        verbose_name_plural = "Carnicerías"

    def __str__(self):
        return self.nombre


class Corte(models.Model):
    carniceria = models.ForeignKey(
        Carniceria,
        on_delete=models.CASCADE,
        related_name="cortes",
    )
    nombre = models.CharField(max_length=80)
    porcentaje_rendimiento = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.01")),
            MaxValueValidator(Decimal("100")),
        ],
    )
    margen_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    activo = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "nombre"]
        verbose_name = "Corte"
        verbose_name_plural = "Cortes"
        constraints = [
            models.UniqueConstraint(
                fields=["carniceria", "nombre"],
                name="unique_corte_por_carniceria",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_rendimiento__gt=0),
                name="corte_rendimiento_positivo",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_rendimiento__lte=100),
                name="corte_rendimiento_maximo",
            ),
            models.CheckConstraint(
                condition=models.Q(margen_porcentaje__gte=0),
                name="corte_margen_no_negativo",
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.carniceria})"


class Compra(models.Model):
    carniceria = models.ForeignKey(
        Carniceria,
        on_delete=models.CASCADE,
        related_name="compras",
    )
    fecha = models.DateField()
    peso_media_res = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
    )
    precio_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    porcentaje_carne = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    porcentaje_hueso = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    porcentaje_grasa = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    precio_grasa = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-created_at"]
        verbose_name = "Compra"
        verbose_name_plural = "Compras"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(peso_media_res__gt=0),
                name="compra_peso_positivo",
            ),
            models.CheckConstraint(
                condition=models.Q(precio_kg__gt=0),
                name="compra_precio_kg_positivo",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_carne__gt=0),
                name="compra_carne_positiva",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_hueso__gte=0),
                name="compra_hueso_no_negativo",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_grasa__gte=0),
                name="compra_grasa_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(precio_grasa__gte=0),
                name="compra_precio_grasa_no_negativo",
            ),
        ]

    def clean(self):
        campos = [self.porcentaje_carne, self.porcentaje_hueso, self.porcentaje_grasa]
        if all(v is not None for v in campos):
            total = self.porcentaje_carne + self.porcentaje_hueso + self.porcentaje_grasa
            if total != Decimal("100"):
                raise ValidationError(
                    "La suma de porcentaje_carne, porcentaje_hueso y porcentaje_grasa debe ser 100."
                )

    def save(self, *args, **kwargs):
        es_nueva = self.pk is None
        super().save(*args, **kwargs)
        if es_nueva:
            cortes_activos = self.carniceria.cortes.filter(activo=True)
            CompraCorte.objects.bulk_create([
                CompraCorte(
                    compra=self,
                    nombre=corte.nombre,
                    porcentaje_rendimiento=corte.porcentaje_rendimiento,
                    margen_porcentaje=corte.margen_porcentaje,
                    orden=corte.orden,
                )
                for corte in cortes_activos
            ])

    def __str__(self):
        return f"{self.carniceria} — {self.fecha}"

    @property
    def costo_total(self):
        return self.peso_media_res * self.precio_kg

    @property
    def ingreso_grasa(self):
        return self.peso_media_res * (self.porcentaje_grasa / Decimal("100")) * self.precio_grasa

    @property
    def costo_neto(self):
        return self.costo_total - self.ingreso_grasa

    @property
    def kg_carne_vendible(self):
        return self.peso_media_res * (self.porcentaje_carne / Decimal("100"))

    @property
    def costo_por_kg_vendible(self):
        return self.costo_neto / self.kg_carne_vendible


class CompraCorte(models.Model):
    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name="cortes",
    )
    nombre = models.CharField(max_length=80)
    porcentaje_rendimiento = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.01")),
            MaxValueValidator(Decimal("100")),
        ],
    )
    margen_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "nombre"]
        verbose_name = "Corte de compra"
        verbose_name_plural = "Cortes de compra"
        constraints = [
            models.UniqueConstraint(
                fields=["compra", "nombre"],
                name="unique_compra_corte_nombre",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_rendimiento__gt=0),
                name="compra_corte_rendimiento_positivo",
            ),
            models.CheckConstraint(
                condition=models.Q(porcentaje_rendimiento__lte=100),
                name="compra_corte_rendimiento_maximo",
            ),
            models.CheckConstraint(
                condition=models.Q(margen_porcentaje__gte=0),
                name="compra_corte_margen_no_negativo",
            ),
        ]

    def __str__(self):
        return f"{self.nombre} — {self.compra}"

    @property
    def kg_corte(self):
        return self.compra.peso_media_res * (self.porcentaje_rendimiento / Decimal("100"))

    @property
    def precio_minimo_kg(self):
        return self.compra.costo_por_kg_vendible

    @property
    def precio_sugerido_kg(self):
        return self.precio_minimo_kg * (Decimal("1") + self.margen_porcentaje / Decimal("100"))

    @property
    def precio_minimo_total(self):
        return self.precio_minimo_kg * self.kg_corte

    @property
    def precio_sugerido_total(self):
        return self.precio_sugerido_kg * self.kg_corte
