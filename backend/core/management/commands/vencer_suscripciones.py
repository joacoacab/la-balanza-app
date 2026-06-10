from datetime import date

from django.core.management.base import BaseCommand

from core.models import Suscripcion


class Command(BaseCommand):
    help = "Marca como vencidas las suscripciones Pro cuya fecha_vencimiento ya pasó"

    def handle(self, *args, **options):
        vencidas = Suscripcion.objects.filter(
            plan="pro",
            estado="activa",
            fecha_vencimiento__lt=date.today(),
        )
        count = vencidas.update(estado="vencida")
        self.stdout.write(
            self.style.SUCCESS(f"Suscripciones vencidas: {count}")
        )
