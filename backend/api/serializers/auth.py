from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from core.models import Carniceria
from core.services.onboarding import cargar_cortes_base

User = get_user_model()


class RegistroSerializer(serializers.Serializer):
    nombre_carniceria = serializers.CharField(max_length=120)
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese nombre.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except Exception as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"non_field_errors": ["Las contraseñas no coinciden."]}
            )
        return data

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data["username"],
                password=validated_data["password"],
            )
            carniceria = Carniceria.objects.create(
                user=user,
                nombre=validated_data["nombre_carniceria"],
            )
            cargar_cortes_base(carniceria)
            token = Token.objects.create(user=user)
        return token
