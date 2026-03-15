# Spec 09 — Deployment de producción

**Estado:** pendiente de aprobación
**Fecha:** 2026-03-15

---

## Arquitectura de producción

```
Internet
   │
   ▼
Traefik v2.10 (puerto 443, Let's Encrypt)
   │                          │
   ▼                          ▼
api.labalanza.…          labalanza.…
   │                          │
   ▼                          ▼
[web]                     [nginx]
Django + Gunicorn      React statics
puerto 8000            + proxy /api/ → [web]
   │                          │
   └──────────┬───────────────┘
              ▼
            [db]
        PostgreSQL 16
```

Todos los contenedores corren en el servidor Ubuntu 24 (`3.224.47.11`).
- Red `traefik` (externa, ya existe): conecta `web` y `nginx` con Traefik.
- Red `internal` (bridge, definida en compose): conecta `web`, `nginx` y `db` entre sí sin exponerse a Traefik.

---

## Estructura de directorios en el servidor

```
/home/ubuntu/
├── traefik/                   ← ya existente, no tocar
├── la-balanza/                ← directorio de producción de la app
│   ├── docker-compose.prod.yml   (sincronizado desde el repo por CI)
│   ├── nginx.conf                (sincronizado desde el repo por CI)
│   └── .env.prod                 (creado manualmente, NUNCA en el repo)
└── la-balanza-frontend/       ← React build
    └── [archivos del dist/]      (copiados por CI vía SCP)
```

El directorio `/home/ubuntu/la-balanza/` es el working directory para todos los comandos `docker compose` en producción.

---

## Cambios en código existente

### `requirements/production.txt`
Agregar `whitenoise` para servir los archivos estáticos de Django (admin, DRF browsable API) directamente desde el proceso Gunicorn, sin volúmenes ni pasos separados.

### `backend/config/settings/production.py`
Agregar:
- `STATIC_ROOT = BASE_DIR / "staticfiles"` — destino de `collectstatic`.
- `STORAGES` con `WhiteNoiseStorage` como backend estático (compresión + cache headers).
- `WhiteNoiseMiddleware` en `MIDDLEWARE` inmediatamente después de `SecurityMiddleware`.
- `ALLOWED_HOSTS` no necesita cambios: ya lee de env var vía `base.py`.

### `Dockerfile`
El Dockerfile ya tiene `ARG REQUIREMENTS_FILE=development.txt` y el build arg funciona. Agregar una línea `RUN` que ejecute `collectstatic` durante el build de imagen para dejar los estáticos bakeados en la imagen:

```
ENV DJANGO_SETTINGS_MODULE=config.settings.production
RUN SECRET_KEY=build-only python manage.py collectstatic --noinput
```

> `SECRET_KEY=build-only` es suficiente: `collectstatic` no usa la clave secreta. No se bakeará ninguna credencial real en la imagen.

El `CMD` de runserver se sobreescribe en `docker-compose.prod.yml` con el comando de Gunicorn. No modificar el CMD del Dockerfile.

---

## `docker-compose.prod.yml`

### Servicios

#### `db`
- Imagen: `postgres:16-alpine`
- `env_file: .env.prod`
- Volumen nombrado `postgres_data` para persistencia
- Healthcheck igual al de desarrollo
- Redes: solo `internal` — nunca expuesto a Traefik
- Sin `ports` — solo accesible desde la red interna

#### `web`
- Imagen: `117457653783.dkr.ecr.us-east-1.amazonaws.com/la-balanza-backend:latest`
- `command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 60`
- `env_file: .env.prod`
- `depends_on: db` con condición `service_healthy`
- Redes: `traefik` + `internal`
- Sin `ports` — el acceso externo es solo vía Traefik
- Labels de Traefik:

```yaml
traefik.enable: "true"
traefik.docker.network: traefik
traefik.http.routers.labalanza-api.rule: Host(`api.labalanza.siracnetwork.com.ar`)
traefik.http.routers.labalanza-api.entrypoints: websecure
traefik.http.routers.labalanza-api.tls.certresolver: letsencrypt
traefik.http.services.labalanza-api.loadbalancer.server.port: 8000
```

> `traefik.docker.network: traefik` es obligatorio cuando el contenedor está en más de una red. Sin este label, Traefik puede elegir la red interna y los requests nunca llegan.

#### `nginx`
- Imagen: `nginx:alpine`
- Volúmenes:
  - `./nginx.conf:/etc/nginx/conf.d/default.conf:ro`
  - `/home/ubuntu/la-balanza-frontend:/usr/share/nginx/html:ro`
- `depends_on: web`
- Redes: `traefik` + `internal`
- Sin `ports`
- Labels de Traefik:

```yaml
traefik.enable: "true"
traefik.docker.network: traefik
traefik.http.routers.labalanza-frontend.rule: Host(`labalanza.siracnetwork.com.ar`)
traefik.http.routers.labalanza-frontend.entrypoints: websecure
traefik.http.routers.labalanza-frontend.tls.certresolver: letsencrypt
traefik.http.services.labalanza-frontend.loadbalancer.server.port: 80
```

### Redes

```yaml
networks:
  traefik:
    external: true
  internal:
    driver: bridge
```

### Volúmenes

```yaml
volumes:
  postgres_data:
```

---

## `nginx.conf`

Comportamiento:
- Puerto 80 (Traefik termina TLS y habla HTTP plano con los contenedores).
- `root /usr/share/nginx/html` — archivos del build de React.
- `location /` con `try_files $uri $uri/ /index.html` — necesario para React Router (SPA): cualquier ruta que no exista como archivo físico devuelve `index.html`.
- `location /api/` que hace `proxy_pass http://web:8000` — el contenedor `web` es resoluble por nombre en la red `internal`. Nginx agrega `Host`, `X-Real-IP` y `X-Forwarded-For`.

> Este proxy es la razón por la que el frontend usa URLs relativas (`/api/v1/...`) tanto en desarrollo (Vite proxy) como en producción (Nginx proxy). No se necesita CORS.

---

## `.env.prod.example`

Variables requeridas en `.env.prod` en el servidor. Este archivo de ejemplo sí va en el repo; el `.env.prod` real nunca.

```dotenv
# Django
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=cambiar-por-clave-segura-generada
ALLOWED_HOSTS=api.labalanza.siracnetwork.com.ar

# Base de datos (Django)
DB_NAME=labalanza
DB_USER=labalanza
DB_PASSWORD=cambiar-por-password-seguro
DB_HOST=db
DB_PORT=5432

# PostgreSQL (imagen oficial)
POSTGRES_DB=labalanza
POSTGRES_USER=labalanza
POSTGRES_PASSWORD=cambiar-por-password-seguro
```

> `DB_PASSWORD` y `POSTGRES_PASSWORD` deben ser idénticos. `DB_HOST=db` es el nombre del servicio dentro de la red Docker interna.

---

## GitHub Actions

### Secretos de GitHub requeridos

| Secret | Uso |
|--------|-----|
| `SSH_PRIVATE_KEY` | SCP y SSH al servidor para deploy del frontend |

> Las credenciales de AWS NO van como secrets: se usan via OIDC con el rol `arn:aws:iam::117457653783:role/LaBalanzaGitHubActionsRole`. El rol debe tener permisos de `ecr:GetAuthorizationToken`, `ecr:BatchGetImage` y `ecr:PutImage` (push desde CI) y `ecr:GetDownloadUrlForLayer` (pull en servidor).

---

### `.github/workflows/deploy-backend.yml`

**Trigger:** `push` a `main` en paths `backend/**` o `docker-compose.prod.yml` o `Dockerfile`.

**Job 1: `build-push`** — runner: `ubuntu-latest`

1. `actions/checkout@v4`
2. `aws-actions/configure-aws-credentials@v4` con `role-to-assume: arn:aws:iam::117457653783:role/LaBalanzaGitHubActionsRole` y `aws-region: us-east-1`. Requiere `permissions: id-token: write, contents: read`.
3. `aws-actions/amazon-ecr-login@v2`
4. Build de imagen: `docker build --build-arg REQUIREMENTS_FILE=production.txt -t <ecr-repo>:latest -t <ecr-repo>:${{ github.sha }} .`
5. Push de ambos tags a ECR.

> Taggear con `github.sha` además de `latest` permite rollback a una versión anterior con `docker pull <ecr-repo>:<sha>`.

**Job 2: `deploy`** — runner: `[self-hosted, dev]`, `needs: build-push`

1. `actions/checkout@v4` — para tener `docker-compose.prod.yml` y `nginx.conf` frescos del repo.
2. `aws-actions/configure-aws-credentials@v4` (igual que job 1) — necesario para autenticarse con ECR desde el servidor.
3. `aws-actions/amazon-ecr-login@v2`
4. Copiar archivos al directorio de producción:
   ```
   cp docker-compose.prod.yml /home/ubuntu/la-balanza/
   cp nginx.conf /home/ubuntu/la-balanza/
   ```
5. Pull de la nueva imagen: `docker pull <ecr-repo>:latest`
6. Restart solo del servicio web (sin bajar db ni nginx):
   ```
   docker compose -f /home/ubuntu/la-balanza/docker-compose.prod.yml up -d --no-deps web
   ```
7. Migraciones: `docker compose -f ... exec -T web python manage.py migrate --noinput`

> `--no-deps` evita reiniciar `db`. `-T` es necesario en CI (sin TTY). Las migraciones van después del `up -d` porque el contenedor nuevo ya está corriendo con la imagen nueva.

---

### `.github/workflows/deploy-frontend.yml`

**Trigger:** `push` a `main` en paths `frontend/**`.

**Job único: `build-deploy`** — runner: `ubuntu-latest`

1. `actions/checkout@v4`
2. `actions/setup-node@v4` con `node-version: '20'`
3. Build de React:
   ```
   cd frontend
   npm ci
   npm run build
   ```
4. Copiar `dist/` al servidor vía SCP (usar `appleboy/scp-action` o `rsync` vía SSH):
   - Source: `frontend/dist/`
   - Destination: `ubuntu@3.224.47.11:/home/ubuntu/la-balanza-frontend/`
   - Copiar el **contenido** de dist/, no el directorio `dist/` en sí.
   - Usar `${{ secrets.SSH_PRIVATE_KEY }}` para autenticación.
5. Restart de Nginx vía SSH:
   ```
   cd /home/ubuntu/la-balanza && docker compose -f docker-compose.prod.yml restart nginx
   ```

> El restart de Nginx es necesario para que el contenedor re-lea los archivos nuevos desde el volumen bind-mount. El build de React solo actualiza archivos en el host; Nginx no recarga automáticamente.

---

## Setup inicial del servidor (one-time, manual)

Pasos que se hacen una sola vez antes del primer deploy:

1. Crear directorio de producción:
   ```
   mkdir -p /home/ubuntu/la-balanza
   mkdir -p /home/ubuntu/la-balanza-frontend
   ```

2. Crear `.env.prod` en `/home/ubuntu/la-balanza/.env.prod` con los valores reales.

3. Levantar la base de datos por primera vez:
   ```
   cd /home/ubuntu/la-balanza
   docker compose -f docker-compose.prod.yml up -d db
   ```

4. Verificar que `ubuntu` tiene permisos de Docker (`sudo usermod -aG docker ubuntu`).

5. Agregar la clave SSH pública del deploy al `~/.ssh/authorized_keys` del usuario `ubuntu` en el servidor.

6. Configurar el self-hosted runner en el servidor (ya existente según contexto).

---

## Criterios de aceptación

### CA-01 — HTTPS en ambos dominios

`https://api.labalanza.siracnetwork.com.ar/api/v1/auth/login/` responde `200` o `400` (no error de SSL).
`https://labalanza.siracnetwork.com.ar/` carga la app React.

### CA-02 — HTTP redirige a HTTPS

`http://labalanza.siracnetwork.com.ar/` redirige a `https://labalanza.siracnetwork.com.ar/` (Traefik maneja esto con su entrypoint `web` → redirect middleware, ya configurado en el Traefik existente).

### CA-03 — React Router funciona en producción

Navegar directamente a `https://labalanza.siracnetwork.com.ar/dashboard` devuelve `index.html` (no 404). Confirma que `try_files` de Nginx está correcto.

### CA-04 — El proxy de Nginx enruta la API

Desde el frontend en producción, `POST /api/v1/auth/login/` llega al Django backend (visible en logs de `web`).

### CA-05 — Push a backend dispara deploy-backend

Un commit que modifique algo en `backend/` → el workflow `deploy-backend.yml` corre, buildea, pushea a ECR y actualiza el contenedor en el servidor.

### CA-06 — Push a frontend dispara deploy-frontend

Un commit que modifique algo en `frontend/` → el workflow `deploy-frontend.yml` corre, buildea el React y actualiza los archivos en `/home/ubuntu/la-balanza-frontend/`.

### CA-07 — Migrations corren automáticamente en deploy de backend

Después de cada deploy de backend, las migraciones pendientes se aplican sin intervención manual.

### CA-08 — La base de datos persiste entre restarts

Reiniciar el contenedor `db` no pierde datos. El volumen `postgres_data` sobrevive al restart.

### CA-09 — Deploy del backend no baja la base de datos

`up -d --no-deps web` solo reinicia el contenedor `web`. `db` y `nginx` siguen corriendo sin interrupción.

### CA-10 — Imagen taggeada con SHA disponible en ECR

Cada build pushea dos tags: `latest` y `<github.sha>`. Un `docker pull <ecr-repo>:<sha>` permite rollback a cualquier versión anterior.
