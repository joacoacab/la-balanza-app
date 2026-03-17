from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import Carniceria, Suscripcion


@receiver(post_save, sender=Carniceria)
def crear_suscripcion(sender, instance, created, **kwargs):
    if created:
        Suscripcion.objects.get_or_create(
            carniceria=instance,
            defaults={"plan": "free", "estado": "activa"},
        )
