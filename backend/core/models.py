from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


TIPO_ANIMAL_CHOICES = [
    ("res", "Res"),
    ("cerdo", "Cerdo"),
    ("pollo", "Pollo"),
]


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
    tipo_animal = models.CharField(
        max_length=10,
        choices=TIPO_ANIMAL_CHOICES,
        default="res",
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
                fields=["carniceria", "nombre", "tipo_animal"],
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
    tipo_animal = models.CharField(
        max_length=10,
        choices=TIPO_ANIMAL_CHOICES,
        default="res",
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
            cortes_activos = self.carniceria.cortes.filter(activo=True, tipo_animal=self.tipo_animal)
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


class PlanPrecio(models.Model):
    CICLO_CHOICES = [
        ("mensual", "Mensual"),
        ("trimestral", "Trimestral"),
        ("anual", "Anual"),
    ]

    ciclo = models.CharField(max_length=15, choices=CICLO_CHOICES, unique=True)
    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Precio de plan"
        verbose_name_plural = "Precios de planes"

    def __str__(self):
        return f"{self.ciclo} — ${self.precio}"


def _add_months(d, months):
    """Suma meses a una fecha sin dependencias externas."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


class Suscripcion(models.Model):
    PLAN_CHOICES = [("free", "Free"), ("pro", "Pro")]
    CICLO_CHOICES = [
        ("mensual", "Mensual"),
        ("trimestral", "Trimestral"),
        ("anual", "Anual"),
    ]
    ESTADO_CHOICES = [
        ("activa", "Activa"),
        ("vencida", "Vencida"),
        ("cancelada", "Cancelada"),
    ]

    carniceria = models.OneToOneField(
        Carniceria,
        on_delete=models.CASCADE,
        related_name="suscripcion",
    )
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default="free")
    ciclo = models.CharField(max_length=15, choices=CICLO_CHOICES, null=True, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default="activa")
    mp_preapproval_id = models.CharField(max_length=100, null=True, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Suscripción"
        verbose_name_plural = "Suscripciones"

    def __str__(self):
        return f"{self.carniceria} — {self.plan} ({self.estado})"

    def puede_crear_compra(self, tipo_animal):
        """Devuelve (puede: bool, mensaje: str)."""
        if self.plan == "free":
            if tipo_animal != "res":
                return False, (
                    f"Tu plan Free no permite registrar compras de {tipo_animal}. "
                    "Actualizá a Pro para continuar."
                )
        elif self.plan == "pro" and self.estado in ("vencida", "cancelada"):
            return False, (
                "Tu suscripción Pro está vencida. Renovate para seguir creando compras."
            )
        return True, ""

    @property
    def puede_ver_pdf(self):
        return self.plan == "pro"

    @property
    def compras_visibles_limit(self):
        """Retorna 5 para plan free, None para pro (sin límite)."""
        if self.plan == "free":
            return 5
        return None

    def activar_pro(self, ciclo, fecha_inicio):
        meses = {"mensual": 1, "trimestral": 3, "anual": 12}[ciclo]
        self.plan = "pro"
        self.estado = "activa"
        self.fecha_inicio = fecha_inicio
        self.fecha_vencimiento = _add_months(fecha_inicio, meses)
        self.save(update_fields=["plan", "estado", "fecha_inicio", "fecha_vencimiento"])
