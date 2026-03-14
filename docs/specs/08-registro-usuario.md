# Spec 08 — Registro de usuario

**Estado:** pendiente de aprobación
**Fecha:** 2026-03-14

---

## Objetivo

Un usuario nuevo completa un formulario de registro, y en un solo paso se crean su cuenta de usuario y su carnicería. Recibe un token directamente y entra al dashboard sin pasar por el login.

---

## Wireframes mobile (375px)

### Login — con link a registro

```
┌─────────────────────────────┐
│  La Balanza                 │
│  Ingresá a tu cuenta        │
│                             │
│  Usuario                    │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Contraseña                 │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  [error si hay]             │
│                             │
│  ┌─────────────────────┐    │
│  │      Ingresar       │    │
│  └─────────────────────┘    │
│                             │
│  ¿Primera vez? Registrarse  │  ← link a /registro
│                             │
└─────────────────────────────┘
```

### Registro — formulario

```
┌─────────────────────────────┐
│                             │
│  La Balanza                 │
│  Crear cuenta               │
│                             │
│  Nombre de la carnicería    │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Usuario                    │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Contraseña                 │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Confirmar contraseña       │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  [error si hay]             │
│                             │
│  ┌─────────────────────┐    │
│  │   Crear cuenta      │    │
│  └─────────────────────┘    │
│                             │
│  ¿Ya tenés cuenta? Ingresar │  ← link a /
│                             │
└─────────────────────────────┘
```

### Registro — loading

```
│  [formulario deshabilitado] │
│                             │
│  ┌─────────────────────┐    │
│  │    Creando cuenta…  │    │
│  └─────────────────────┘    │
```

---

## Backend — nuevo endpoint

### `POST /api/v1/auth/registro/`

Crea un `User` y una `Carniceria` en una transacción atómica. No requiere autenticación.

**Request body:**
```json
{
  "nombre_carniceria": "Carnicería El Gaucho",
  "username": "elgaucho",
  "password": "mipassword123",
  "password_confirm": "mipassword123"
}
```

**Response `201`:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
}
```
> Mismo shape que el response de login. El cliente puede usarlo directamente para autenticarse.

**Response `400` — username ya existe:**
```json
{
  "username": ["Ya existe un usuario con ese nombre."]
}
```

**Response `400` — contraseñas no coinciden:**
```json
{
  "non_field_errors": ["Las contraseñas no coinciden."]
}
```

**Response `400` — contraseña muy simple (validadores de Django):**
```json
{
  "password": ["Esta contraseña es demasiado común."]
}
```

**Response `400` — nombre de carnicería vacío u otro campo faltante:**
```json
{
  "nombre_carniceria": ["Este campo es requerido."]
}
```

---

### Implementación backend

#### Nuevo serializer: `api/serializers/auth.py`

`RegistroSerializer` con los campos: `nombre_carniceria`, `username`, `password`, `password_confirm`.

- `password_confirm` es `write_only=True` y no se persiste.
- `validate(data)` verifica que `password == password_confirm`; si no, `raise serializers.ValidationError({"non_field_errors": [...]})`.
- `validate_password(data)` llama a `django.contrib.auth.password_validation.validate_password()` para aplicar los validadores configurados en `AUTH_PASSWORD_VALIDATORS`. Los errores de Django se re-lanzan como `ValidationError` del serializer en el campo `password`.
- `create(validated_data)` usa `transaction.atomic()`:
  1. `User.objects.create_user(username=..., password=...)` — usa `create_user` para que el password quede hasheado.
  2. `Carniceria.objects.create(user=user, nombre=nombre_carniceria)`.
  3. `Token.objects.create(user=user)`.
  4. Retorna el token.

#### Nueva vista: añadir `AuthRegistroView` en `api/views/auth.py`

- `permission_classes = [AllowAny]`
- `authentication_classes = []`
- Método `post`: instancia `RegistroSerializer`, llama `is_valid(raise_exception=True)`, llama `serializer.save()` (que retorna el token), responde con `{"token": token.key}` y status `201`.

#### Actualizar `api/urls.py`

Agregar:
```python
path("auth/registro/", AuthRegistroView.as_view()),
```

---

## Frontend — componentes a crear/modificar

### Nuevo: `pages/Registro.jsx`

- Formulario con los cuatro campos: `nombre_carniceria`, `username`, `password`, `password_confirm`.
- Validación local antes de llamar a la API:
  - Ningún campo vacío.
  - `username` sin espacios.
  - `password` de mínimo 8 caracteres.
  - `password` y `password_confirm` coinciden.
- Al submit válido: llama a `registrar(datos)` de `useAuth()`.
- En caso de error del servidor: muestra el primer mensaje recibido en el bloque de error inline.
- Link "¿Ya tenés cuenta? Ingresar" que navega a `/`.
- No requiere `PrivateRoute` — es una ruta pública.

### Modificar: `src/auth/AuthContext.jsx`

Agregar función `registrar(datos)` al contexto:
- Llama a `api.auth.registro(datos)`.
- Recibe el token, llama a `setToken(token)` y `setUser({ username: datos.username })`.
- Si la llamada falla, relanza el error para que `Registro.jsx` lo maneje.
- Después del registro exitoso, `Registro.jsx` navega a `/dashboard` (con `useNavigate`).

> `registrar()` sigue el mismo patrón que `login()`: la página llama a la función del contexto y navega si no hubo error.

### Modificar: `src/api/client.js`

Agregar en `api.auth`:
```js
registro: (datos) =>
  request('/api/v1/auth/registro/', {
    method: 'POST',
    body: JSON.stringify(datos),
  }),
```

### Modificar: `src/pages/Login.jsx`

Agregar link al pie del formulario:
```
¿Primera vez? Registrarse  →  navega a /registro
```

### Modificar: `src/App.jsx`

Agregar ruta pública `/registro`:
```jsx
<Route path="/registro" element={<Registro />} />
```
Sin `PrivateRoute` — debe ser accesible sin token.

---

## Manejo de errores en `Registro.jsx`

| Situación | Acción |
|-----------|--------|
| Campo vacío o validación local falla | Error inline, sin llamar a la API |
| `400` con `username` | Mostrar `err.data.username[0]` |
| `400` con `password` | Mostrar `err.data.password[0]` |
| `400` con `non_field_errors` | Mostrar `err.data.non_field_errors[0]` |
| `400` con otro campo | Mostrar "Error en los datos ingresados." |
| Error de red | Mostrar "Error de conexión. Verificá tu red e intentá de nuevo." |

---

## Criterios de aceptación

### Backend

#### CA-01 — Registro exitoso crea User, Carniceria y Token

`POST /auth/registro/` con datos válidos → `201` con `{"token": "..."}`. En la base de datos existen el `User`, la `Carniceria` asociada (OneToOne) y el `Token`.

#### CA-02 — Username ya existente devuelve 400

Si el `username` ya está tomado → `400` con error en el campo `username`.

#### CA-03 — Contraseñas que no coinciden devuelven 400

`password != password_confirm` → `400` con `non_field_errors`.

#### CA-04 — Contraseña débil devuelve 400

Contraseña que no supera `validate_password()` (ej: "12345678") → `400` con error en `password`.

#### CA-05 — Creación es atómica

Si falla la creación de la `Carniceria`, no queda el `User` huérfano en la base de datos (rollback).

#### CA-06 — Endpoint no requiere autenticación

`POST /auth/registro/` sin header `Authorization` → respuesta normal (no `401`).

---

### Frontend

#### CA-07 — Navegación desde login

La pantalla de login tiene el link "Registrarse" que lleva a `/registro`.

#### CA-08 — Validación local: campos vacíos

Submit con cualquier campo vacío → error inline, sin llamar a la API.

#### CA-09 — Validación local: username con espacios

Si `username` contiene espacios → error inline: "El usuario no puede contener espacios."

#### CA-10 — Validación local: contraseña corta

Si `password` tiene menos de 8 caracteres → error inline sin llamar a la API.

#### CA-11 — Validación local: contraseñas no coinciden

Si `password != password_confirm` → error inline sin llamar a la API.

#### CA-12 — Registro exitoso entra directo al dashboard

Submit válido → loading → el token queda en memoria → navega a `/dashboard`.

#### CA-13 — Error de username duplicado se muestra inline

Si el backend responde `400` con error en `username`, el mensaje aparece en el formulario.

#### CA-14 — Error de contraseña débil se muestra inline

Si el backend responde `400` con error en `password`, el mensaje aparece en el formulario.

#### CA-15 — Mobile: inputs con text-base

Todos los inputs usan `text-base` (mínimo 16px) para evitar zoom en iOS.

#### CA-16 — Link de vuelta al login

La pantalla de registro tiene link "¿Ya tenés cuenta? Ingresar" que navega a `/`.
