from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import Max
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Carniceria, PlanPrecio

CICLOS_VALIDOS = frozenset(["mensual", "trimestral", "anual"])
DIAS_VALIDOS = frozenset([30, 90, 365])
CICLO_LABEL = {"mensual": "Mensual", "trimestral": "Trimestral", "anual": "Anual"}


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
            .select_related("user", "suscripcion")
            .annotate(ultima_actividad=Max("compras__fecha"))
            .order_by("-created_at")
        )

        data = []
        for c in carnicerías:
            try:
                plan = c.suscripcion.plan
            except Exception:
                plan = "free"
            data.append({
                "id": c.id,
                "nombre": c.nombre,
                "usuario_email": c.user.email,
                "fecha_registro": c.created_at.date(),
                "plan": plan,
                "ultima_actividad": c.ultima_actividad,
            })

        return Response(data)


class AdminCarniceriaDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            c = (
                Carniceria.objects
                .select_related("user", "suscripcion")
                .annotate(ultima_actividad=Max("compras__fecha"))
                .get(pk=pk)
            )
        except Carniceria.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            s = c.suscripcion
            suscripcion_data = {
                "plan": s.plan,
                "ciclo": s.ciclo,
                "estado": s.estado,
                "fecha_vencimiento": s.fecha_vencimiento,
            }
        except Exception:
            suscripcion_data = {
                "plan": "free",
                "ciclo": None,
                "estado": "activa",
                "fecha_vencimiento": None,
            }

        return Response({
            "id": c.id,
            "nombre": c.nombre,
            "usuario_email": c.user.email,
            "fecha_registro": c.created_at.date(),
            "ultima_actividad": c.ultima_actividad,
            "suscripcion": suscripcion_data,
        })


class AdminSuscripcionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            carniceria = Carniceria.objects.select_related("suscripcion").get(pk=pk)
        except Carniceria.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        suscripcion = carniceria.suscripcion
        accion = request.data.get("accion")

        if accion == "asignar_pro":
            ciclo = request.data.get("ciclo")
            fecha_vencimiento_str = request.data.get("fecha_vencimiento")

            if not ciclo or ciclo not in CICLOS_VALIDOS:
                return Response(
                    {"error": "ciclo inválido. Debe ser mensual, trimestral o anual."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not fecha_vencimiento_str:
                return Response(
                    {"error": "fecha_vencimiento es requerida."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                fecha_vencimiento = date.fromisoformat(fecha_vencimiento_str)
            except ValueError:
                return Response(
                    {"error": "fecha_vencimiento inválida. Usar formato YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            suscripcion.plan = "pro"
            suscripcion.estado = "activa"
            suscripcion.ciclo = ciclo
            suscripcion.fecha_vencimiento = fecha_vencimiento
            suscripcion.fecha_inicio = date.today()
            suscripcion.save(
                update_fields=["plan", "estado", "ciclo", "fecha_vencimiento", "fecha_inicio"]
            )

        elif accion == "extender":
            try:
                dias = int(request.data.get("dias"))
            except (TypeError, ValueError):
                return Response(
                    {"error": "dias debe ser un número entero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if dias not in DIAS_VALIDOS:
                return Response(
                    {"error": "dias debe ser 30, 90 o 365."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            base = (
                suscripcion.fecha_vencimiento
                if suscripcion.fecha_vencimiento and suscripcion.estado == "activa"
                else date.today()
            )
            suscripcion.fecha_vencimiento = base + timedelta(days=dias)
            suscripcion.save(update_fields=["fecha_vencimiento"])

        elif accion == "cancelar":
            suscripcion.plan = "free"
            suscripcion.estado = "cancelada"
            suscripcion.ciclo = None
            suscripcion.fecha_vencimiento = None
            suscripcion.save(update_fields=["plan", "estado", "ciclo", "fecha_vencimiento"])

        else:
            return Response(
                {"error": "accion inválida. Debe ser asignar_pro, extender o cancelar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "plan": suscripcion.plan,
            "ciclo": suscripcion.ciclo,
            "estado": suscripcion.estado,
            "fecha_vencimiento": suscripcion.fecha_vencimiento,
        })


class AdminPreciosView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        precios = PlanPrecio.objects.all().order_by("ciclo")
        return Response([{"ciclo": p.ciclo, "precio": str(p.precio)} for p in precios])

    def put(self, request):
        datos = request.data
        if not isinstance(datos, list) or len(datos) != 3:
            return Response(
                {"error": "Se requieren exactamente 3 ciclos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ciclos_recibidos = {d.get("ciclo") for d in datos}
        if ciclos_recibidos != CICLOS_VALIDOS:
            return Response(
                {"error": "Se requieren los ciclos: mensual, trimestral, anual."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in datos:
            ciclo = item.get("ciclo")
            try:
                precio = Decimal(str(item.get("precio", "")))
            except InvalidOperation:
                return Response(
                    {"error": f"Precio inválido para {ciclo}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if precio <= 0:
                return Response(
                    {"error": f"El precio de {CICLO_LABEL[ciclo]} debe ser mayor a 0."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            PlanPrecio.objects.update_or_create(ciclo=ciclo, defaults={"precio": precio})

        precios = PlanPrecio.objects.all().order_by("ciclo")
        return Response([{"ciclo": p.ciclo, "precio": str(p.precio)} for p in precios])
