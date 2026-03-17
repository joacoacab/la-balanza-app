from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.auth import RegistroSerializer
from core.models import Carniceria
from core.services.onboarding import cargar_cortes_base

User = get_user_model()


class AuthRegistroView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.save()
        return Response(
            {"token": token.key, "es_primera_vez": True, "is_staff": False},
            status=status.HTTP_201_CREATED,
        )


class AuthLoginView(ObtainAuthToken):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "is_staff": user.is_staff})


class AuthLogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GoogleAuthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("id_token")
        if not token_str:
            return Response(
                {"error": "Token de Google inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            claims = google_id_token.verify_oauth2_token(
                token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {"error": "Token de Google inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = claims.get("email")
        if not email:
            return Response(
                {"error": "Token de Google inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
            token, _ = Token.objects.get_or_create(user=user)
            es_primera_vez = False
        except User.DoesNotExist:
            with transaction.atomic():
                base_username = email.split("@")[0]
                username = base_username
                suffix = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{suffix}"
                    suffix += 1

                user = User.objects.create_user(username=username, email=email)
                user.set_unusable_password()
                user.save()

                carniceria = Carniceria.objects.create(user=user, nombre=email)
                cargar_cortes_base(carniceria)
                token = Token.objects.create(user=user)
            es_primera_vez = True

        return Response({
            "token": token.key,
            "username": user.username,
            "es_primera_vez": es_primera_vez,
            "is_staff": user.is_staff,
        })
