# Spec 12 — Login con Google y Onboarding automático

## Objetivo
Permitir que el usuario entre a La Balanza con su cuenta de Google y, en el momento de crear cuenta (por cualquier método), cargar automáticamente los 25 cortes de res como plantilla de inicio.

---

## Parte 1 — Login con Google

### Flujo completo

```
Usuario                  Frontend                  Backend              Google
  │                         │                         │                    │
  │ toca "Continuar         │                         │                    │
  │  con Google"            │                         │                    │
  │────────────────────────▶│                         │                    │
  │                         │ inicializa GSI popup    │                    │
  │                         │────────────────────────────────────────────▶│
  │                         │                         │                    │
  │ elige cuenta Google     │                         │                    │
  │────────────────────────▶│                         │                    │
  │                         │◀───────────────────────────────── id_token ─│
  │                         │                         │                    │
  │                         │ POST /api/v1/auth/google/                    │
  │                         │  { id_token }           │                    │
  │                         │────────────────────────▶│                    │
  │                         │                         │ verifica token     │
  │                         │                         │───────────────────▶│
  │                         │                         │◀──── claims (OK) ──│
  │                         │                         │                    │
  │                         │                         │ busca/crea User    │
  │                         │                         │ + Carniceria       │
  │                         │                         │ + cortes base (*)  │
  │                         │                         │                    │
  │                         │◀──── { token, es_primera_vez } ─────────────│
  │                         │                         │                    │
  │                         │ guarda token            │                    │
  │                         │ navega a /bienvenida    │                    │
  │                         │ o /dashboard            │                    │
  │◀────────────────────────│                         │                    │
```
`(*)` Solo si el usuario es nuevo.

### Wireframe — Login.jsx

```
┌─────────────────────────────────────┐
│                                     │
│  La Balanza                         │
│  Ingresá a tu cuenta                │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  G  Continuar con Google    │    │  ← botón nuevo, borde gris
│  └─────────────────────────────┘    │
│                                     │
│  ── o ──                            │  ← separador
│                                     │
│  Usuario                            │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Contraseña                         │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │         Ingresar            │    │  ← botón existente (sin cambios)
│  └─────────────────────────────┘    │
│                                     │
│  ¿Primera vez? Registrarse          │
│                                     │
└─────────────────────────────────────┘
```

Mismo layout en `Registro.jsx`: el botón de Google va arriba del formulario, con separador "o" debajo.

### Endpoint nuevo: `POST /api/v1/auth/google/`

**Request**
```json
{ "id_token": "<JWT de Google>" }
```

**Response — éxito (200)**
```json
{
  "token": "<DRF auth token>",
  "es_primera_vez": true
}
```

**Response — error (400)**
```json
{ "error": "Token de Google inválido." }
```

**Lógica interna de la vista:**
1. Recibe `id_token`.
2. Verifica con `google.oauth2.id_token.verify_oauth2_token(id_token, requests.Request(), GOOGLE_CLIENT_ID)`.
3. Extrae `email` de los claims.
4. `User.objects.get_or_create(email=email)`:
   - Si existe → obtiene su `Token` de DRF. `es_primera_vez = False`.
   - Si no existe → crea `User` con `username` derivado del email (parte antes del `@`, con sufijo numérico si colisiona), crea `Carniceria` con nombre = email como placeholder, llama al servicio de onboarding, crea `Token`. `es_primera_vez = True`.
5. Devuelve `{ token, es_primera_vez }`.

**Nota sobre `username` en usuarios Google:** estos usuarios no tienen contraseña utilizable (`set_unusable_password()`). Si intentan hacer login con usuario/password recibirán el error estándar de credenciales incorrectas.

### Librería backend
`google-auth` (ya disponible como dependencia transitiva en muchos entornos; agregar a `requirements/base.txt` si no está).

### Variables de entorno nuevas
| Variable | Usado en | Descripción |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Backend + Frontend | Client ID de la app en Google Cloud Console |

`GOOGLE_CLIENT_SECRET` no es necesario para verificar `id_token` con la librería `google-auth`; la verificación se hace contra los certificados públicos de Google usando solo el Client ID.

---

## Parte 2 — Onboarding automático

### Situación actual
- El management command `cargar_cortes_base.py` tiene la lista de 25 cortes y la lógica de carga.
- `RegistroSerializer.create()` **no llama al onboarding** hoy — los nuevos usuarios por usuario/password tampoco reciben cortes base. Este spec lo corrige.

### Servicio a crear: `core/services/onboarding.py`

Función pública:
```
cargar_cortes_base(carniceria) → None
```
- Extrae la lista `CORTES` del management command (o la duplica en el servicio).
- Hace `Corte.objects.get_or_create(carniceria=carniceria, nombre=nombre, defaults={...})` por cada corte.
- Idempotente: si los cortes ya existen, no falla ni duplica.

### Dónde se llama
| Punto de entrada | Cuándo llamar |
|---|---|
| `RegistroSerializer.create()` | Siempre, dentro del `transaction.atomic()` existente, después de crear la `Carniceria` |
| Vista `POST /api/v1/auth/google/` | Solo cuando el usuario es nuevo (`created=True`) |

---

## Parte 3 — Pantalla de Bienvenida

### Cuándo se muestra
Solo cuando la respuesta del backend incluye `es_primera_vez: true`. Aplica a ambos métodos de registro (Google y usuario/password).

**Ajuste necesario en registro por usuario/password:** `AuthRegistroView` debe incluir `es_primera_vez: true` en su respuesta, y el frontend debe redirigir a `/bienvenida` en lugar de `/dashboard` al registrarse.

### Wireframe — Bienvenida.jsx

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│  La Balanza                         │
│                                     │
│  ¡Bienvenido!                       │
│                                     │
│  Ya cargamos los 25 cortes de res   │
│  para que empieces ahora mismo.     │
│                                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │         Empezar             │    │  → navega a /nueva-compra
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

- Sin bottom nav ni header.
- Botón "Empezar" navega a `/nueva-compra`.
- Ruta: `/bienvenida` — pública solo si hay token activo (protegida igual que el resto de la app).

### Cambios en AuthContext / flujo de registro
- `AuthContext.registrar()` debe leer `es_primera_vez` de la respuesta y exponerlo para que `Registro.jsx` decida a dónde navegar.
- `AuthContext.loginConGoogle(id_token)` — nueva función que llama a `POST /api/v1/auth/google/` y devuelve `es_primera_vez`.

---

## Archivos a crear / modificar

### Backend
| Archivo | Acción |
|---|---|
| `core/services/onboarding.py` | Crear — función `cargar_cortes_base(carniceria)` |
| `api/serializers/auth.py` | Modificar — `RegistroSerializer.create()` llama al servicio; respuesta incluye `es_primera_vez: true` |
| `api/views/auth.py` | Modificar — `AuthRegistroView` devuelve `es_primera_vez: true`; nueva `GoogleAuthView` |
| `api/urls.py` | Modificar — agregar `path("auth/google/", GoogleAuthView.as_view())` |
| `requirements/base.txt` | Modificar — agregar `google-auth` si no está |

### Frontend
| Archivo | Acción |
|---|---|
| `src/auth/AuthContext.jsx` | Modificar — nueva función `loginConGoogle(id_token)`; `registrar()` retorna `es_primera_vez` |
| `src/api/client.js` | Modificar — agregar `api.auth.google(id_token)` |
| `src/pages/Login.jsx` | Modificar — agregar botón Google + separador |
| `src/pages/Registro.jsx` | Modificar — agregar botón Google + separador; navegar a `/bienvenida` si `es_primera_vez` |
| `src/pages/Bienvenida.jsx` | Crear |
| `src/App.jsx` | Modificar — agregar ruta `/bienvenida` |
| `index.html` | Modificar — agregar script GSI de Google |

---

## Criterios de aceptación

### Google OAuth
1. El botón "Continuar con Google" aparece en `Login.jsx` y `Registro.jsx`.
2. Al completar el popup de Google, el usuario queda autenticado sin pasos adicionales.
3. Un usuario que ya existe por usuario/password puede también ingresar con Google si usa el mismo email.
4. Si el `id_token` es inválido o expiró, el backend devuelve 400 y el frontend muestra un error.
5. El `GOOGLE_CLIENT_ID` se inyecta vía variable de entorno; no está hardcodeado en el código.

### Onboarding
6. Un usuario nuevo (por Google o por registro normal) tiene exactamente 25 cortes cargados al entrar por primera vez.
7. El onboarding es idempotente: llamarlo dos veces sobre la misma carnicería no duplica cortes.
8. Un usuario existente que hace login con Google no recibe cortes duplicados.

### Pantalla de bienvenida
9. `/bienvenida` se muestra solo cuando `es_primera_vez: true` — no al hacer login.
10. El botón "Empezar" navega a `/nueva-compra`.
11. La pantalla no tiene bottom nav ni header de la app.
12. Si el usuario accede directamente a `/bienvenida` sin ser primera vez, se redirige al dashboard.
