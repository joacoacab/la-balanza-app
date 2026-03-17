from datetime import date, timedelta

from django.db.models import Max
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Carniceria


class AdminStatsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        hoy = date.today()
        hace_7 = hoy - timedelta(days=7)
        hace_30 = hoy - timedelta(days=30)
        primer_dia_mes = hoy.replace(day=1)

        total_clientes = Carniceria.objects.count()

        activos_7_dias = (
            Carniceria.objects
            .filter(compras__fecha__gte=hace_7)
            .distinct()
            .count()
        )

        nuevos_este_mes = Carniceria.objects.filter(
            created_at__date__gte=primer_dia_mes
        ).count()

        clientes_previos = Carniceria.objects.filter(
            created_at__date__lt=hace_30
        ).count()

        if clientes_previos > 0:
            activos_30_dias = (
                Carniceria.objects
                .filter(created_at__date__lt=hace_30, compras__fecha__gte=hace_30)
                .distinct()
                .count()
            )
            tasa_retencion_30_dias = round(activos_30_dias / clientes_previos * 100, 1)
        else:
            tasa_retencion_30_dias = None

        return Response({
            "total_clientes": total_clientes,
            "activos_7_dias": activos_7_dias,
            "nuevos_este_mes": nuevos_este_mes,
            "tasa_retencion_30_dias": tasa_retencion_30_dias,
        })


class AdminCarnieceriaListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        carnicerías = (
            Carniceria.objects
            .select_related("user")
            .annotate(ultima_actividad=Max("compras__fecha"))
            .order_by("-created_at")
        )

        data = [
            {
                "id": c.id,
                "nombre": c.nombre,
                "usuario_email": c.user.email,
                "fecha_registro": c.created_at.date(),
                "plan": "free",
                "ultima_actividad": c.ultima_actividad,
            }
            for c in carnicerías
        ]

        return Response(data)
