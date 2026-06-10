import logging

from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _enviar(subject, body, to_email):
    """Wrapper que loguea pero nunca rompe el flujo principal."""
    if not to_email:
        return
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=None,  # usa DEFAULT_FROM_EMAIL
            recipient_list=[to_email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error("Error enviando email a %s: %s", to_email, e)


def enviar_bienvenida(user):
    """Email de bienvenida tras el registro."""
    _enviar(
        subject="Bienvenido a La Balanza",
        body=(
            f"Hola {user.username},\n\n"
            "Tu cuenta en La Balanza fue creada correctamente.\n\n"
            "Ya podés calcular los precios de tus cortes y llevar el control de tu negocio.\n\n"
            "— El equipo de La Balanza"
        ),
        to_email=user.email,
    )


def enviar_activacion_pro(user, fecha_vencimiento):
    """Email de confirmación de suscripción Pro."""
    vencimiento_str = fecha_vencimiento.strftime("%d/%m/%Y") if fecha_vencimiento else "—"
    _enviar(
        subject="Tu suscripción Pro está activa",
        body=(
            f"Hola {user.username},\n\n"
            "Tu suscripción Pro de La Balanza está activa.\n\n"
            f"Fecha de vencimiento: {vencimiento_str}\n\n"
            "Ahora tenés acceso a todas las funciones: multi-animal, exportar PDF "
            "y sin límite de historial.\n\n"
            "— El equipo de La Balanza"
        ),
        to_email=user.email,
    )
