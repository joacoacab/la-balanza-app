"""
Tests de autenticación.
CA-01 al CA-04
"""
import pytest
from rest_framework.authtoken.models import Token


# ── CA-01 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_login_exitoso(api_client, usuario):
    resp = api_client.post(
        "/api/v1/auth/login/",
        {"username": "carnicero1", "password": "testpass123"},
        format="json",
    )
    assert resp.status_code == 200
    assert "token" in resp.data
    assert resp.data["token"] != ""
    assert Token.objects.filter(user=usuario).exists()


# ── CA-02 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_login_credenciales_invalidas(api_client, usuario):
    resp = api_client.post(
        "/api/v1/auth/login/",
        {"username": "carnicero1", "password": "wrongpassword"},
        format="json",
    )
    assert resp.status_code == 400
    assert "non_field_errors" in resp.data


# ── CA-03 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_request_sin_token_devuelve_401(api_client):
    resp = api_client.get("/api/v1/cortes/")
    assert resp.status_code == 401


# ── CA-04 ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_logout_invalida_token(client_usuario, token_usuario, usuario):
    resp = client_usuario.post("/api/v1/auth/logout/")
    assert resp.status_code == 204

    assert not Token.objects.filter(user=usuario).exists()

    resp2 = client_usuario.get("/api/v1/cortes/")
    assert resp2.status_code == 401
