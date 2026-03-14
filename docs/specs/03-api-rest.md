# Spec 03 — API REST

**Estado:** aprobado
**Fecha:** 2026-03-14

---

## Contexto

- Consumida por el frontend web de La Balanza
- Autenticación: **Token Authentication de DRF** (un token por usuario, sin JWT)
- Prefijo base: `/api/v1/`
- Un usuario = una carnicería (OneToOne). No hay multi-tenant: el scope siempre es `request.user.carniceria`
- Todas las respuestas y errores en JSON
- Los valores decimales se serializan como **string** (comportamiento por defecto de DRF con `DecimalField`), nunca como float

---

## Convenciones globales

### Códigos HTTP

| Situación | Código |
|-----------|--------|
| GET / PATCH exitoso | `200` |
| POST exitoso (creación) | `201` |
| DELETE / logout exitoso | `204` |
| Error de validación | `400` |
| Sin token o token inválido | `401` |
| Recurso inexistente o de otro usuario | `404` |

### Autorización

- Todos los endpoints requieren autenticación con token (`Authorization: Token <token>`).
- La autorización es a nivel de datos: un usuario **nunca** puede ver ni modificar recursos de otra carnicería.
- Para evitar filtración de existencia, los recursos de otro usuario devuelven `404` (no `403`).
- El campo `carniceria` **nunca** se acepta en el request body: siempre se infiere de `request.user.carniceria`.

---

## 1. Auth

### POST `/api/v1/auth/login/`

Obtiene un token de autenticación.

**Request body:**
```json
{
  "username": "carnicero1",
  "password": "secreto"
}
```

**Response `200`:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
}
```

**Response `400`** — credenciales inválidas:
```json
{
  "non_field_errors": ["Unable to log in with provided credentials."]
}
```

> Implementación: usar `rest_framework.authtoken.views.ObtainAuthToken` directamente o una vista propia que la extienda.

---

### POST `/api/v1/auth/logout/`

Invalida el token del usuario autenticado. Requiere token.

**Request body:** vacío

**Response `204`:** sin body

---

## 2. Cortes (plantilla)

### GET `/api/v1/cortes/`

Lista los cortes **activos** (`activo=True`) de la carnicería del usuario autenticado.

**Response `200`:**
```json
[
  {
    "id": 1,
    "nombre": "Lomo",
    "porcentaje_rendimiento": "5.00",
    "margen_porcentaje": "50.00",
    "orden": 0
  },
  {
    "id": 2,
    "nombre": "Asado",
    "porcentaje_rendimiento": "10.00",
    "margen_porcentaje": "30.00",
    "orden": 1
  }
]
```

> El campo `activo` no se incluye en la respuesta: este endpoint siempre retorna solo los activos.

---

### POST `/api/v1/cortes/`

Crea un corte en la plantilla de la carnicería del usuario.

**Request body:**
```json
{
  "nombre": "Paleta",
  "porcentaje_rendimiento": "8.00",
  "margen_porcentaje": "35.00",
  "orden": 2
}
```

> `orden` es opcional, default `0`.

**Response `201`:**
```json
{
  "id": 3,
  "nombre": "Paleta",
  "porcentaje_rendimiento": "8.00",
  "margen_porcentaje": "35.00",
  "orden": 2
}
```

**Response `400`** — nombre duplicado en la carnicería:
```json
{
  "nombre": ["Ya existe un corte con este nombre en tu carnicería."]
}
```

**Response `400`** — campo faltante o inválido:
```json
{
  "porcentaje_rendimiento": ["Este campo es requerido."]
}
```

---

### PATCH `/api/v1/cortes/{id}/`

Edita parcialmente un corte de la carnicería del usuario. Todos los campos son opcionales.

**Request body** (ejemplo):
```json
{
  "margen_porcentaje": "45.00"
}
```

**Response `200`:** objeto completo del corte con los valores actualizados (mismo shape que POST 201).

**Response `404`:** el corte no existe o pertenece a otra carnicería.

---

### DELETE `/api/v1/cortes/{id}/`

Desactiva un corte (**soft delete**: setea `activo=False`). No elimina la fila de la base de datos.

**Response `204`:** sin body.

**Response `404`:** el corte no existe o pertenece a otra carnicería.

> Un corte desactivado deja de aparecer en `GET /cortes/` y no se copia en futuras compras. Las `CompraCorte` existentes que lo referencian por nombre **no se ven afectadas**.

---

## 3. Compras

### GET `/api/v1/compras/`

Lista las compras de la carnicería, ordenadas por fecha descendente.

**Response `200`:**
```json
[
  {
    "id": 1,
    "fecha": "2026-03-14",
    "peso_media_res": "100.000",
    "precio_kg": "1000.00",
    "porcentaje_carne": "60.00",
    "porcentaje_hueso": "30.00",
    "porcentaje_grasa": "10.00",
    "precio_grasa": "200.00",
    "costo_total": "100000.00000",
    "costo_neto": "98000.00000",
    "notas": "",
    "created_at": "2026-03-14T10:00:00Z"
  }
]
```

---

### POST `/api/v1/compras/`

Crea una compra. Como efecto secundario, copia automáticamente los cortes activos de la plantilla como `CompraCorte`.

**Request body:**
```json
{
  "fecha": "2026-03-14",
  "peso_media_res": "100.000",
  "precio_kg": "1000.00",
  "porcentaje_carne": "60.00",
  "porcentaje_hueso": "30.00",
  "porcentaje_grasa": "10.00",
  "precio_grasa": "200.00",
  "notas": ""
}
```

> `notas` es opcional, default `""`.

**Response `201`:** objeto completo de la compra (mismo shape que un ítem de `GET /compras/`).

**Response `400`** — porcentajes no suman 100:
```json
{
  "non_field_errors": ["La suma de porcentaje_carne, porcentaje_hueso y porcentaje_grasa debe ser 100."]
}
```

**Response `400`** — campo inválido:
```json
{
  "precio_kg": ["Asegurese de que este valor sea mayor o igual a 0.01."]
}
```

---

### GET `/api/v1/compras/{id}/`

Detalle de una compra con todos los valores calculados y sus `CompraCorte`.

**Response `200`:**
```json
{
  "id": 1,
  "fecha": "2026-03-14",
  "peso_media_res": "100.000",
  "precio_kg": "1000.00",
  "porcentaje_carne": "60.00",
  "porcentaje_hueso": "30.00",
  "porcentaje_grasa": "10.00",
  "precio_grasa": "200.00",
  "costo_total": "100000.00000",
  "ingreso_grasa": "2000.00000",
  "costo_neto": "98000.00000",
  "kg_carne_vendible": "60.00000",
  "costo_por_kg_vendible": "1633.3333333333333333",
  "notas": "",
  "created_at": "2026-03-14T10:00:00Z",
  "cortes": [
    {
      "id": 1,
      "nombre": "Lomo",
      "porcentaje_rendimiento": "5.00",
      "margen_porcentaje": "50.00",
      "orden": 0,
      "kg_corte": "5.00000",
      "precio_minimo_kg": "1633.3333333333333333",
      "precio_sugerido_kg": "2450.0000000000000000",
      "precio_minimo_total": "8166.6666666666666667",
      "precio_sugerido_total": "12250.0000000000000000"
    }
  ]
}
```

> Los campos calculados (`costo_total`, `ingreso_grasa`, etc.) son de solo lectura: los calcula el servidor en tiempo real, nunca se persisten en DB.

**Response `404`:** la compra no existe o pertenece a otra carnicería.

---

## 4. Cortes de una compra

### PATCH `/api/v1/compras/{id}/cortes/{corte_id}/`

Ajusta el rendimiento o margen de un `CompraCorte` específico. Solo `porcentaje_rendimiento` y `margen_porcentaje` son editables; los demás campos (`nombre`, `orden`) son de solo lectura.

**Request body** (ambos opcionales en PATCH):
```json
{
  "porcentaje_rendimiento": "6.00",
  "margen_porcentaje": "55.00"
}
```

**Response `200`:**
```json
{
  "id": 1,
  "nombre": "Lomo",
  "porcentaje_rendimiento": "6.00",
  "margen_porcentaje": "55.00",
  "orden": 0,
  "kg_corte": "6.00000",
  "precio_minimo_kg": "1633.3333333333333333",
  "precio_sugerido_kg": "2533.3333333333333333",
  "precio_minimo_total": "9800.0000000000000000",
  "precio_sugerido_total": "15200.0000000000000000"
}
```

**Response `400`** — valor inválido:
```json
{
  "porcentaje_rendimiento": ["Asegurese de que este valor sea mayor o igual a 0.01."]
}
```

**Response `404`:** el `CompraCorte` no existe, el `corte_id` no pertenece a esa compra, o la compra pertenece a otra carnicería.

---

## Estructura de URLs en código

```
api/
  urls.py
    /auth/login/                          → AuthLoginView
    /auth/logout/                         → AuthLogoutView
    /cortes/                              → CorteListCreateView
    /cortes/{id}/                         → CorteRetrieveUpdateDestroyView
    /compras/                             → CompraListCreateView
    /compras/{id}/                        → CompraRetrieveView
    /compras/{id}/cortes/{corte_id}/      → CompraCorteUpdateView
```

---

## Serializers

| Serializer | Uso |
|-----------|-----|
| `CorteSerializer` | Lectura y escritura de `Corte` |
| `CompraListSerializer` | Lectura de `Compra` en listado (sin cortes anidados) |
| `CompraDetailSerializer` | Lectura de `Compra` en detalle (con cortes anidados) |
| `CompraCreateSerializer` | Escritura de `Compra` |
| `CompraCorteSerializer` | Lectura y escritura de `CompraCorte` |

---

## Criterios de aceptación

### CA-01 — Login exitoso devuelve token

`POST /auth/login/` con credenciales válidas → `200` con `{"token": "..."}`.

### CA-02 — Login con credenciales inválidas devuelve 400

`POST /auth/login/` con password incorrecta → `400`.

### CA-03 — Request sin token devuelve 401

Cualquier endpoint protegido sin header `Authorization` → `401`.

### CA-04 — Logout invalida el token

`POST /auth/logout/` → `204`. El mismo token usado inmediatamente después devuelve `401`.

### CA-05 — GET /cortes/ solo devuelve cortes activos

Un usuario con 3 cortes (2 activos, 1 inactivo) obtiene solo 2 en la respuesta.

### CA-06 — Aislamiento de datos entre usuarios

`GET /cortes/` del usuario A no incluye cortes del usuario B.
`GET /compras/{id}/` con id de compra del usuario B → `404`.

### CA-07 — DELETE /cortes/{id}/ hace soft delete

Después de `DELETE`, la fila en DB tiene `activo=False`. El corte ya no aparece en `GET /cortes/`.

### CA-08 — POST /compras/ valida que porcentajes sumen 100

Porcentajes que no suman 100 → `400` con mensaje en `non_field_errors`.

### CA-09 — POST /compras/ retorna la compra creada con costo_total y costo_neto

El response `201` incluye `costo_total` y `costo_neto` calculados.

### CA-10 — GET /compras/{id}/ incluye cortes con precios calculados

El detalle incluye el array `cortes` con `precio_minimo_kg` y `precio_sugerido_kg` para cada uno.

### CA-11 — PATCH /compras/{id}/cortes/{corte_id}/ actualiza precios en tiempo real

Después del PATCH, la respuesta refleja los nuevos valores calculados con los porcentajes actualizados.

### CA-12 — PATCH /compras/{id}/cortes/{corte_id}/ de otra carnicería devuelve 404

Un usuario no puede modificar `CompraCorte` de otra carnicería.

### CA-13 — nombre y orden no son editables en CompraCorte

Un PATCH que incluya `nombre` u `orden` los ignora (campos de solo lectura en el serializer).
