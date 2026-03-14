# Spec 01 — Setup inicial del proyecto

**Estado:** aprobado
**Fecha:** 2026-03-14

---

## Objetivo

Establecer la estructura base del proyecto La Balanza: entorno Docker, proyecto Django con apps separadas, settings por entorno y dependencias.

---

## Estructura de carpetas

```
la-balanza-app/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── CLAUDE.md
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── docs/
│   └── specs/
│       └── 01-project-setup.md
└── backend/
    ├── manage.py
    ├── config/                  # Proyecto Django (antes llamado usualmente "project")
    │   ├── __init__.py
    │   ├── urls.py
    │   ├── wsgi.py
    │   ├── asgi.py
    │   └── settings/
    │       ├── __init__.py
    │       ├── base.py
    │       ├── development.py
    │       └── production.py
    ├── core/                    # App: modelos de negocio principales
    │   ├── __init__.py
    │   ├── admin.py
    │   ├── apps.py
    │   ├── models.py
    │   ├── services/
    │   └── tests/
    ├── users/                   # App: autenticación y perfiles
    │   ├── __init__.py
    │   ├── admin.py
    │   ├── apps.py
    │   ├── models.py
    │   └── tests/
    └── api/                     # App: endpoints REST
        ├── __init__.py
        ├── apps.py
        ├── urls.py
        ├── serializers/
        ├── views/
        └── tests/
```

---

## Docker

### Dockerfile

- Imagen base: `python:3.12-slim`
- Working directory: `/app`
- Instala dependencias desde `requirements/development.txt` (en dev) o `requirements/production.txt` (en prod)
- No corre como root (usuario `appuser`)
- Expone puerto `8000`
- Comando de inicio: `python manage.py runserver 0.0.0.0:8000` (dev) / gunicorn (prod, a definir en spec posterior)

### docker-compose.yml

Servicios:

| Servicio | Imagen | Puerto host → contenedor |
|----------|--------|--------------------------|
| `db` | `postgres:16-alpine` | `5432 → 5432` |
| `web` | Build local (Dockerfile) | `8000 → 8000` |

- `web` depende de `db` con healthcheck
- Ambos leen variables de entorno desde `.env`
- Volume nombrado `postgres_data` para persistencia de la base de datos
- Volume de bind mount del código fuente (`./backend:/app`) para hot reload en desarrollo

---

## Apps Django

### `users`
- Extiende `AbstractUser`
- Se declara en settings como `AUTH_USER_MODEL = "users.User"`
- Se crea antes que `core` para evitar dependencias circulares

### `core`
- Modelos de negocio: `Carniceria`, `Corte`, `Compra`, `CompraCorte`
- Lógica de costeo como `@property` en los modelos
- Subcarpeta `services/` para lógica compleja entre modelos
- Subcarpeta `tests/` con archivos por modelo

### `api`
- Sin modelos propios
- Subcarpetas `serializers/` y `views/` organizadas por recurso
- Prefijo de URLs: `/api/v1/`

---

## Settings

### `base.py`
- `SECRET_KEY` desde variable de entorno (obligatorio)
- `DEBUG = False` por defecto
- `ALLOWED_HOSTS` desde variable de entorno (lista separada por comas)
- `INSTALLED_APPS` con las tres apps del proyecto + DRF
- `AUTH_USER_MODEL = "users.User"`
- Base de datos desde variables de entorno (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`)
- Internacionalización: `LANGUAGE_CODE = "es-ar"`, `TIME_ZONE = "America/Argentina/Buenos_Aires"`
- `DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"`

### `development.py`
- Hereda de `base`
- `DEBUG = True`
- `ALLOWED_HOSTS = ["*"]`
- Puede incluir `django-debug-toolbar` (opcional, a confirmar)

### `production.py`
- Hereda de `base`
- `DEBUG = False`
- `ALLOWED_HOSTS` estricto desde env
- A expandir en spec de deployment

---

## Variables de entorno (`.env.example`)

```dotenv
# Django
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=cambiar-esto-en-produccion
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de datos
DB_NAME=labalanza
DB_USER=labalanza
DB_PASSWORD=labalanza
DB_HOST=db
DB_PORT=5432

# PostgreSQL (usado por la imagen oficial de Postgres)
POSTGRES_DB=labalanza
POSTGRES_USER=labalanza
POSTGRES_PASSWORD=labalanza
```

---

## Dependencias

### `requirements/base.txt`
- `Django>=5.1,<6.0`
- `djangorestframework`
- `psycopg2-binary`
- `python-decouple` (lectura de variables de entorno)

### `requirements/development.txt`
- `-r base.txt`
- `pytest`
- `pytest-django`
- `model-bakery` (factories para tests)

### `requirements/production.txt`
- `-r base.txt`
- `gunicorn`

---

## Criterios de aceptación

- [ ] `docker compose up` levanta los servicios sin errores
- [ ] `docker compose exec web python manage.py migrate` corre sin errores
- [ ] `docker compose exec web python manage.py check` no reporta errores
- [ ] Las tres apps (`core`, `users`, `api`) están registradas en `INSTALLED_APPS`
- [ ] `AUTH_USER_MODEL` apunta a `users.User`
- [ ] No hay credenciales hardcodeadas; todo sensible viene de `.env`
- [ ] `docker compose exec web pytest` corre (sin tests aún, solo que el runner funciona)
