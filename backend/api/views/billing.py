import hashlib
import hmac
import logging
from datetime import date, datetime

import mercadopago
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from core.models import Carniceria, PlanPrecio, Suscripcion

logger = logging.getLogger(__name__)

CICLOS_VALIDOS = frozenset(["mensual", "trimestral", "anual"])
FRECUENCIA_MAP = {"mensual": 1, "trimestral": 3, "anual": 12}


def _get_suscripcion_usuario(user):
    try:
        return user.carniceria.suscripcion, None
    except (AttributeError, Carniceria.DoesNotExist, Suscripcion.DoesNotExist) as e:
        logger.warning("Suscripción no disponible para user_id=%s: %s", getattr(user, "id", None), e)
        return None, Response(
            {
                "error": "suscripcion_no_disponible",
                "mensaje": "No se encontró una suscripción para este usuario.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )


def _frecuencia_coincide(mp_data, ciclo):
    if ciclo not in FRECUENCIA_MAP:
        logger.error("Suscripción con ciclo inválido antes de activar: %s", ciclo)
        return False

    auto_recurring = mp_data.get("auto_recurring") or {}
    frequency = auto_recurring.get("frequency")
    frequency_type = auto_recurring.get("frequency_type")

    if frequency is None or frequency_type is None:
        logger.error("PreApproval sin auto_recurring completo para ciclo=%s", ciclo)
        return False

    try:
        frequency = int(frequency)
    except (TypeError, ValueError):
        logger.error("PreApproval con frequency inválida: %s", frequency)
        return False

    expected_frequency = FRECUENCIA_MAP[ciclo]
    if frequency != expected_frequency or frequency_type != "months":
        logger.error(
            "PreApproval con frecuencia inesperada: ciclo=%s expected=%s/months got=%s/%s",
            ciclo,
            expected_frequency,
            frequency,
            frequency_type,
        )
        return False

    return True


class SuscribirView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ciclo = request.data.get("ciclo")
        if ciclo not in CICLOS_VALIDOS:
            return Response(
                {"error": "ciclo_invalido", "mensaje": "ciclo debe ser mensual, trimestral o anual."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suscripcion, error_response = _get_suscripcion_usuario(request.user)
        if error_response is not None:
            return error_response

        if settings.DEBUG and settings.MP_MOCK:
            suscripcion.ciclo = ciclo
            suscripcion.save(update_fields=["ciclo"])
            init_point = f"{settings.APP_URL}/planes/confirmacion?status=approved&mock=true"
            return Response({"init_point": init_point})

        try:
            plan_precio = PlanPrecio.objects.get(ciclo=ciclo)
        except PlanPrecio.DoesNotExist:
            return Response(
                {"error": "ciclo_invalido", "mensaje": "ciclo no configurado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)

        preapproval_data = {
            "reason": f"La Balanza Pro — {ciclo}",
            "auto_recurring": {
                "frequency": FRECUENCIA_MAP[ciclo],
                "frequency_type": "months",
                "transaction_amount": int(plan_precio.precio),
                "currency_id": "ARS",
            },
            "back_url": f"{settings.APP_URL}/planes/confirmacion",
            "payer_email": request.user.email,
            "status": "pending",
        }

        try:
            result = sdk.preapproval().create(preapproval_data)
        except Exception as e:
            logger.error("Error al crear PreApproval en MP: %s", e)
            return Response(
                {"error": "mp_error", "mensaje": "Error al comunicarse con MercadoPago."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if result["status"] not in (200, 201):
            logger.error("MP respondió con status %s: %s", result["status"], result.get("response"))
            return Response(
                {"error": "mp_error", "mensaje": "Error al comunicarse con MercadoPago."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        mp_response = result["response"]
        suscripcion.mp_preapproval_id = mp_response["id"]
        suscripcion.ciclo = ciclo
        suscripcion.save(update_fields=["mp_preapproval_id", "ciclo"])

        return Response({"init_point": mp_response["init_point"]})


class BillingEstadoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        suscripcion, error_response = _get_suscripcion_usuario(request.user)
        if error_response is not None:
            return error_response

        return Response({
            "plan": suscripcion.plan,
            "ciclo": suscripcion.ciclo,
            "estado": suscripcion.estado,
            "fecha_vencimiento": suscripcion.fecha_vencimiento,
        })


class BillingPreciosView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        precios = PlanPrecio.objects.all().order_by("ciclo")
        return Response([{"ciclo": p.ciclo, "precio": str(p.precio)} for p in precios])


class MercadoPagoWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        x_signature = request.headers.get("x-signature", "")
        x_request_id = request.headers.get("x-request-id", "")

        ts = ""
        v1 = ""
        for part in x_signature.split(","):
            key, _, value = part.strip().partition("=")
            if key == "ts":
                ts = value
            elif key == "v1":
                v1 = value

        data_id = request.data.get("data", {}).get("id", "")
        manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"

        expected = hmac.new(
            settings.MP_WEBHOOK_SECRET.encode(),
            manifest.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, v1):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        event_type = request.data.get("type", "")
        logger.info("Webhook MP recibido: type=%s preapproval_id=%s", event_type, data_id)

        if event_type == "subscription_preapproval":
            self._procesar_preapproval(data_id)

        return Response(status=status.HTTP_200_OK)

    def _procesar_preapproval(self, preapproval_id):
        try:
            suscripcion = Suscripcion.objects.get(mp_preapproval_id=preapproval_id)
        except Suscripcion.DoesNotExist:
            logger.warning("No se encontró suscripción para preapproval_id=%s", preapproval_id)
            return
        except Suscripcion.MultipleObjectsReturned:
            logger.error("Preapproval_id duplicado en suscripciones: %s", preapproval_id)
            return

        sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        try:
            result = sdk.preapproval().get(preapproval_id)
        except Exception as e:
            logger.error("Error al consultar PreApproval %s en MP: %s", preapproval_id, e)
            return

        if result["status"] != 200:
            logger.error("MP respondió %s para preapproval %s", result["status"], preapproval_id)
            return

        mp_data = result["response"]
        mp_status = mp_data.get("status")

        if mp_status == "authorized":
            if not suscripcion.ciclo:
                logger.error("Suscripción %s sin ciclo para preapproval_id=%s", suscripcion.id, preapproval_id)
                return

            if not _frecuencia_coincide(mp_data, suscripcion.ciclo):
                return

            date_created_str = mp_data.get("date_created", "")
            try:
                fecha_inicio = datetime.fromisoformat(
                    date_created_str.replace("Z", "+00:00")
                ).date()
            except (ValueError, AttributeError):
                fecha_inicio = date.today()

            suscripcion.activar_pro(ciclo=suscripcion.ciclo, fecha_inicio=fecha_inicio)

        elif mp_status in ("paused", "cancelled"):
            suscripcion.estado = "cancelada"
            suscripcion.save(update_fields=["estado"])

        else:
            logger.info("PreApproval %s en estado %s, sin cambios.", preapproval_id, mp_status)
