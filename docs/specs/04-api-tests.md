# Spec 04 — Tests de integración de la API

**Estado:** aprobado
**Fecha:** 2026-03-14

---

## Objetivo

Cubrir todos los criterios de aceptación del spec 03 con tests de integración que ejerciten la API de punta a punta: request HTTP → view → serializer → modelo → respuesta.

---

## Herramientas

- `pytest` + `pytest-django`
- `rest_framework.test.APIClient`
- `model_bakery.baker`
- Marcador `@pytest.mark.django_db` en todos los tests

---

## Estructura de archivos

```
api/tests/
├── __init__.py           (ya existe)
├── conftest.py           ← fixtures compartidos
├── test_auth.py          ← CA-01 al CA-04
├── test_cortes.py        ← CA-05 al CA-07 + extras
├── test_compras.py       ← CA-08 al CA-10 + extras
└── test_compra_cortes.py ← CA-11 al CA-13
```

---

## Datos de referencia para cálculos

Los fixtures de compra usan estos valores para poder verificar precios calculados en los assertions:

| Campo | Valor |
|-------|-------|
| `peso_media_res` | `100.000` kg |
| `precio_kg` | `1000.00` |
| `porcentaje_carne` | `60.00` |
| `porcentaje_hueso` | `30.00` |
| `porcentaje_grasa` | `10.00` |
| `precio_grasa` | `200.00` |
| → `costo_total` redondeado | `"100000.00"` |
| → `costo_neto` redondeado | `"98000.00"` |
| → `costo_por_kg_vendible` redondeado | `"1633.33"` |

Corte de referencia:

| Campo | Valor |
|-------|-------|
| `nombre` | `"Lomo"` |
| `porcentaje_rendimiento` | `5.00` |
| `margen_porcentaje` | `50.00` |
| → `kg_corte` redondeado | `"5.00"` |
| → `precio_minimo_kg` redondeado | `"1633.33"` |
| → `precio_sugerido_kg` redondeado | `"2450.00"` |
| → `precio_minimo_total` redondeado | `"8166.67"` |
| → `precio_sugerido_total` redondeado | `"12250.00"` |

---

## Fixtures compartidos (`conftest.py`)

| Fixture | Scope | Descripción |
|---------|-------|-------------|
| `usuario` | function | `User` con `Carniceria` asociada. Credenciales: `username="carnicero1"`, `password="testpass123"` |
| `otro_usuario` | function | Segundo `User` con su propia `Carniceria`. Credenciales: `username="carnicero2"`, `password="testpass123"` |
| `token_usuario` | function | `Token` de DRF para `usuario` |
| `token_otro_usuario` | function | `Token` de DRF para `otro_usuario` |
| `client_usuario` | function | `APIClient` con `HTTP_AUTHORIZATION: Token <token_usuario>` |
| `client_otro_usuario` | function | `APIClient` con `HTTP_AUTHORIZATION: Token <token_otro_usuario>` |
| `api_client` | function | `APIClient` sin credenciales |
| `corte_activo` | function | `Corte` activo (`activo=True`) perteneciente a `usuario.carniceria` con los valores del corte de referencia |
| `corte_inactivo` | function | `Corte` con `activo=False` perteneciente a `usuario.carniceria` |
| `compra_base` | function | `Compra` de `usuario.carniceria` con los valores de referencia. Sin cortes en la plantilla (la carnicería no tiene `Corte` activos en este fixture) |
| `compra_con_lomo` | function | `Corte` activo "Lomo" creado **antes** de la `Compra`, seguido de una `Compra` de `usuario.carniceria`. Al crearse la compra, se copia el corte automáticamente. |

> **Nota sobre `usuario` y `Carniceria`:** El modelo `User` y `Carniceria` son OneToOne. El fixture debe crear ambos y devolver el `User`.

> **Nota sobre `compra_base` vs `compra_con_lomo`:** `compra_base` sirve para testear listado y detalle sin cortes. `compra_con_lomo` sirve para testear precios calculados en `CompraCorte`.

---

## Tests de Auth (`test_auth.py`) — CA-01 al CA-04

---

### `test_login_exitoso` — CA-01

**Escenario:** usuario existe en DB.

**Acción:** `POST /api/v1/auth/login/` con `{"username": "carnicero1", "password": "testpass123"}`.

**Resultado esperado:**
- Status `200`
- Response body contiene clave `"token"` con un string no vacío
- El token existe en la tabla `authtoken_token` en DB

---

### `test_login_credenciales_invalidas` — CA-02

**Escenario:** usuario existe en DB.

**Acción:** `POST /api/v1/auth/login/` con password incorrecta.

**Resultado esperado:**
- Status `400`
- Response body contiene clave `"non_field_errors"`

---

### `test_request_sin_token_devuelve_401` — CA-03

**Escenario:** ningún token en el cliente.

**Acción:** `GET /api/v1/cortes/` sin header `Authorization`.

**Resultado esperado:**
- Status `401`

---

### `test_logout_invalida_token` — CA-04

**Escenario:** `token_usuario` existe en DB.

**Acción:**
1. `POST /api/v1/auth/logout/` con `client_usuario` → debe devolver `204`
2. `GET /api/v1/cortes/` con el mismo cliente (mismo token) → debe devolver `401`

**Resultado esperado:**
- Primer request: status `204`
- Segundo request: status `401`
- El token ya no existe en la tabla `authtoken_token` en DB

---

## Tests de Cortes (`test_cortes.py`) — CA-05, CA-06, CA-07 + extras

---

### `test_listar_cortes_solo_activos` — CA-05

**Escenario:** `usuario.carniceria` tiene 2 cortes activos y 1 inactivo.

**Acción:** `GET /api/v1/cortes/` con `client_usuario`.

**Resultado esperado:**
- Status `200`
- Response es una lista de exactamente 2 elementos
- Ningún elemento tiene el nombre del corte inactivo
- Ningún elemento contiene el campo `"activo"`

---

### `test_listar_cortes_aislamiento` — CA-06

**Escenario:** `usuario.carniceria` tiene 1 corte activo. `otro_usuario.carniceria` tiene 1 corte activo con nombre diferente.

**Acción:** `GET /api/v1/cortes/` con `client_usuario`.

**Resultado esperado:**
- Status `200`
- Response contiene solo el corte de `usuario.carniceria`
- El corte de `otro_usuario` no aparece

---

### `test_crear_corte` — extra

**Escenario:** `usuario.carniceria` no tiene cortes.

**Acción:** `POST /api/v1/cortes/` con `client_usuario` y body:
```json
{"nombre": "Paleta", "porcentaje_rendimiento": "8.00", "margen_porcentaje": "35.00", "orden": 2}
```

**Resultado esperado:**
- Status `201`
- Response contiene `id`, `nombre`, `porcentaje_rendimiento`, `margen_porcentaje`, `orden`
- El corte creado pertenece a `usuario.carniceria` (verificado en DB)
- `activo=True` en DB

---

### `test_crear_corte_nombre_duplicado` — extra

**Escenario:** `usuario.carniceria` ya tiene un corte con `nombre="Lomo"`.

**Acción:** `POST /api/v1/cortes/` con `client_usuario` y `nombre="Lomo"`.

**Resultado esperado:**
- Status `400`
- Response contiene clave `"nombre"` con mensaje de error

---

### `test_editar_corte_parcial` — extra

**Escenario:** `corte_activo` existe en `usuario.carniceria`.

**Acción:** `PATCH /api/v1/cortes/{corte_activo.id}/` con `client_usuario` y body `{"margen_porcentaje": "45.00"}`.

**Resultado esperado:**
- Status `200`
- Response contiene `"margen_porcentaje": "45.00"`
- Los demás campos del corte no cambian
- El cambio persiste en DB

---

### `test_editar_corte_otra_carniceria_devuelve_404` — extra

**Escenario:** `otro_usuario.carniceria` tiene un corte.

**Acción:** `PATCH /api/v1/cortes/{corte_de_otro.id}/` con `client_usuario`.

**Resultado esperado:**
- Status `404`

---

### `test_soft_delete_corte` — CA-07

**Escenario:** `corte_activo` existe en `usuario.carniceria`.

**Acción:**
1. `DELETE /api/v1/cortes/{corte_activo.id}/` con `client_usuario`
2. `GET /api/v1/cortes/` con `client_usuario`

**Resultado esperado:**
- Primer request: status `204`, sin body
- La fila en DB tiene `activo=False` (verificado con `Corte.objects.get(pk=...)`)
- Segundo request: status `200`, el corte eliminado no aparece en la lista

---

### `test_delete_corte_otra_carniceria_devuelve_404` — extra

**Escenario:** `otro_usuario.carniceria` tiene un corte activo.

**Acción:** `DELETE /api/v1/cortes/{corte_de_otro.id}/` con `client_usuario`.

**Resultado esperado:**
- Status `404`
- La fila en DB sigue con `activo=True`

---

## Tests de Compras (`test_compras.py`) — CA-08 al CA-10 + extras

---

### `test_listar_compras` — extra

**Escenario:** `compra_base` existe en `usuario.carniceria`.

**Acción:** `GET /api/v1/compras/` con `client_usuario`.

**Resultado esperado:**
- Status `200`
- Response es una lista de 1 elemento con campos: `id`, `fecha`, `peso_media_res`, `precio_kg`, `costo_total`, `costo_neto`, `created_at`
- No contiene `cortes`, `porcentaje_carne`, ni otros campos fuera de los 7 definidos

---

### `test_listar_compras_aislamiento` — CA-06 (compras)

**Escenario:** `compra_base` pertenece a `usuario.carniceria`. `otro_usuario.carniceria` también tiene una compra.

**Acción:** `GET /api/v1/compras/` con `client_usuario`.

**Resultado esperado:**
- Status `200`
- Response contiene solo 1 elemento (el de `usuario`)

---

### `test_crear_compra_porcentajes_validos` — CA-09

**Escenario:** `usuario.carniceria` sin cortes activos en la plantilla.

**Acción:** `POST /api/v1/compras/` con `client_usuario` y los datos de referencia (porcentajes suman 100).

**Resultado esperado:**
- Status `201`
- Response contiene `"costo_total": "100000.00"` y `"costo_neto": "98000.00"`
- Response contiene solo los 7 campos de `CompraListSerializer`
- La compra fue creada en DB con `carniceria=usuario.carniceria`

---

### `test_crear_compra_porcentajes_invalidos` — CA-08

**Escenario:** ninguno relevante.

**Acción:** `POST /api/v1/compras/` con `client_usuario` y `porcentaje_carne=60, porcentaje_hueso=30, porcentaje_grasa=5` (suma = 95).

**Resultado esperado:**
- Status `400`
- Response contiene clave `"non_field_errors"` con el mensaje de la regla de negocio

---

### `test_crear_compra_genera_compra_cortes` — extra

**Escenario:** `usuario.carniceria` tiene 2 cortes activos y 1 inactivo.

**Acción:** `POST /api/v1/compras/` con los datos de referencia.

**Resultado esperado:**
- Status `201`
- En DB existen exactamente 2 `CompraCorte` para la compra creada
- Los nombres de los `CompraCorte` coinciden con los de los cortes activos

---

### `test_detalle_compra_incluye_cortes_y_precios` — CA-10

**Escenario:** `compra_con_lomo` existe (compra con el corte "Lomo" copiado como `CompraCorte`).

**Acción:** `GET /api/v1/compras/{compra_con_lomo.id}/` con `client_usuario`.

**Resultado esperado:**
- Status `200`
- Response incluye todos los campos calculados de la compra: `costo_total`, `ingreso_grasa`, `costo_neto`, `kg_carne_vendible`, `costo_por_kg_vendible`
- Response incluye `"cortes"` como array con 1 elemento
- El elemento de `cortes` contiene:
  - `"precio_minimo_kg": "1633.33"`
  - `"precio_sugerido_kg": "2450.00"`
  - `"precio_minimo_total": "8166.67"`
  - `"precio_sugerido_total": "12250.00"`

---

### `test_detalle_compra_otra_carniceria_devuelve_404` — CA-06 (detalle)

**Escenario:** `otro_usuario.carniceria` tiene una compra.

**Acción:** `GET /api/v1/compras/{compra_de_otro.id}/` con `client_usuario`.

**Resultado esperado:**
- Status `404`

---

## Tests de CompraCorte (`test_compra_cortes.py`) — CA-11 al CA-13

---

### `test_patch_compra_corte_actualiza_precios` — CA-11

**Escenario:** `compra_con_lomo` existe. El `CompraCorte` "Lomo" tiene `porcentaje_rendimiento=5.00` y `margen_porcentaje=50.00`.

**Acción:** `PATCH /api/v1/compras/{id}/cortes/{corte_id}/` con `client_usuario` y body:
```json
{"porcentaje_rendimiento": "8.00", "margen_porcentaje": "40.00"}
```

**Resultado esperado:**
- Status `200`
- Response refleja los nuevos valores calculados en tiempo real:
  - `"porcentaje_rendimiento": "8.00"`
  - `"margen_porcentaje": "40.00"`
  - `"kg_corte": "8.00"` (100 × 0.08)
  - `"precio_minimo_kg": "1633.33"`
  - `"precio_sugerido_kg": "2286.67"` (1633.33 × 1.40, redondeado)
  - `"precio_minimo_total": "13066.67"` (1633.33 × 8, redondeado)
  - `"precio_sugerido_total": "18293.33"` (2286.67 × 8, redondeado)
- Los cambios persisten en DB

---

### `test_patch_compra_corte_otra_carniceria_devuelve_404` — CA-12

**Escenario:** `compra_con_lomo` pertenece a `usuario.carniceria`.

**Acción:** `PATCH /api/v1/compras/{id}/cortes/{corte_id}/` con `client_otro_usuario`.

**Resultado esperado:**
- Status `404`
- La DB no cambia

---

### `test_patch_compra_corte_corte_id_equivocado_devuelve_404` — extra

**Escenario:** `compra_con_lomo` pertenece a `usuario.carniceria`.

**Acción:** `PATCH /api/v1/compras/{id}/cortes/99999/` con `client_usuario` (pk inexistente).

**Resultado esperado:**
- Status `404`

---

### `test_patch_compra_corte_ignora_nombre_y_orden` — CA-13

**Escenario:** `compra_con_lomo` existe. El `CompraCorte` "Lomo" tiene `orden=0`.

**Acción:** `PATCH /api/v1/compras/{id}/cortes/{corte_id}/` con `client_usuario` y body:
```json
{"nombre": "Nuevo Nombre", "orden": 99, "margen_porcentaje": "30.00"}
```

**Resultado esperado:**
- Status `200`
- Response contiene `"nombre": "Lomo"` (sin cambios)
- Response contiene `"orden": 0` (sin cambios)
- Response contiene `"margen_porcentaje": "30.00"` (sí actualizado)
- En DB: `nombre="Lomo"`, `orden=0`, `margen_porcentaje=30.00`

---

## Notas de implementación

### Creación de `usuario` con `Carniceria`
`baker.make` crea el `User` pero `Carniceria` necesita ser creada explícitamente porque el OneToOne no se crea automáticamente. El fixture debe hacer `baker.make(Carniceria, user=usuario)`.

### Passwords en los fixtures
`baker.make(User)` no establece passwords usables. El fixture `usuario` debe llamar `user.set_password("testpass123")` y `user.save()` para que el login por credenciales funcione.

### Valor exacto de `precio_sugerido_total` en CA-11
El cálculo exacto usa las propiedades sin redondeo intermedio:
- `costo_por_kg_vendible` = 98000 / 60 (sin redondear)
- `precio_sugerido_kg` = (98000/60) × 1.40
- `precio_sugerido_total` = (98000/60) × 1.40 × 8

El redondeo se aplica **solo al serializar**, no entre propiedades. Los valores en la columna "Resultado esperado" de CA-11 son los resultados de aplicar `.quantize(Decimal("0.01"))` al resultado exacto de cada propiedad.
