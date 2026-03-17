# Spec 16 — Panel Admin mejorado: acciones sobre clientes y configuración de precios

## Estado: BORRADOR

---

## 1. Contexto y objetivo

El panel admin en `/admin-saas/` ya tiene dos pestañas funcionales: **Métricas** y **Clientes**. El botón "Ver detalle" en la tabla de clientes está deshabilitado (`cursor-not-allowed`). El campo `plan` se devuelve hardcodeado como `"free"` desde el backend.

Este spec agrega:
1. **Pestaña Clientes mejorada** — detalle de cliente con acciones sobre su suscripción
2. **Pestaña Configuración** — precios de planes editables, persistidos en DB

---

## 2. Parte 1 — Pestaña Clientes mejorada

### 2.1 Cambios en la tabla existente

- El campo `plan` debe leerse desde `Suscripcion` (real), no hardcodeado
- El botón "Ver detalle" pasa de deshabilitado a funcional: navega a `/admin-saas/clientes/:id`

### 2.2 Vista de detalle del cliente

Ruta: `/admin-saas/clientes/:id`

#### Wireframe ASCII

```
┌─────────────────────────────────────────────────────────┐
│  Panel Admin                                            │
├─────────────────────────────────────────────────────────┤
│  ← Volver a clientes                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Carnicería La Norteña                          │   │
│  │  usuario@email.com  ·  Registrado: 12/01/2025   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Suscripción                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Plan:    PRO                                   │   │
│  │  Ciclo:   Anual                                 │   │
│  │  Estado:  Activa                                │   │
│  │  Vence:   15 de marzo de 2027                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Acciones                                               │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  Asignar Pro     │  │  Extender        │            │
│  │                  │  │  vencimiento     │            │
│  │  Ciclo: [Anual▼] │  │  Días: [ 30 ▼]  │            │
│  │  Vence: [fecha]  │  │                  │            │
│  │                  │  │  Nuevo vence:    │            │
│  │  [Confirmar]     │  │  15/03/2028      │            │
│  │                  │  │  [Confirmar]     │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ⚠  Cancelar suscripción                         │  │
│  │  Esto setea el plan a Free y estado a cancelado. │  │
│  │                             [Cancelar suscripción]│  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Acción "Extender vencimiento" — cálculo de nueva fecha:**

```
┌──────────────────────┐
│  Extender            │
│  ○ +30 días          │
│  ● +90 días          │
│  ○ +365 días         │
│                      │
│  Nuevo vencimiento:  │
│  14 de junio de 2027 │
│                      │
│  [Confirmar]         │
└──────────────────────┘
```

**"Cancelar suscripción" — diálogo de confirmación (inline, no modal):**

```
┌──────────────────────────────────────────────┐
│  ¿Confirmar cancelación?                     │
│  El cliente quedará en plan Free de          │
│  inmediato y no podrá crear compras de       │
│  cerdo ni pollo.                             │
│                                              │
│  [No, volver]         [Sí, cancelar]         │
└──────────────────────────────────────────────┘
```

---

## 3. Parte 2 — Pestaña Configuración

### 3.1 Wireframe ASCII

```
┌─────────────────────────────────────────────────────────┐
│  Panel Admin                                            │
├─────────────────────────────────────────────────────────┤
│  [Métricas]  [Clientes]  [Configuración ←]              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Precios de planes                                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Ciclo         Precio actual (ARS)               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Mensual       [ 80000        ]                  │  │
│  │  Trimestral    [ 210000       ]                  │  │
│  │  Anual         [ 720000       ]                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│                          [Guardar cambios]              │
│                                                         │
│  ✓ Precios actualizados.   (mensaje de éxito, 3s)       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Modelo de datos — `PlanPrecio`

```python
class PlanPrecio(models.Model):
    CICLO_CHOICES = [
        ('mensual',    'Mensual'),
        ('trimestral', 'Trimestral'),
        ('anual',      'Anual'),
    ]

    ciclo        = CharField(max_length=15, choices=CICLO_CHOICES, unique=True)
    precio       = DecimalField(max_digits=10, decimal_places=2)
    actualizado_en = DateTimeField(auto_now=True)
```

**Reglas:**
- `ciclo` es `unique` — exactamente un registro por ciclo
- `precio` nunca puede ser 0 ni negativo (`MinValueValidator(Decimal("0.01"))`)
- Data migration crea los tres registros con los precios actuales:
  - `mensual` → $80.000
  - `trimestral` → $210.000
  - `anual` → $720.000

**Impacto en código existente:**
- `api/views/billing.py`: el dict `PRECIOS` hardcodeado se reemplaza por consulta a `PlanPrecio.objects.get(ciclo=ciclo).precio`
- `frontend/src/pages/Planes.jsx`: los precios se leen desde `GET /api/v1/billing/estado/` ... No. Los precios se leen desde un nuevo endpoint público (ver sección 5.3)

---

## 5. Endpoints

### 5.1 `GET /api/v1/admin/carniceria/:id/` (nuevo)

**Auth:** Token Authentication de DRF + `is_staff`

**Response 200:**
```json
{
  "id": 7,
  "nombre": "Carnicería La Norteña",
  "usuario_email": "norteña@email.com",
  "fecha_registro": "2025-01-12",
  "ultima_actividad": "2026-03-10",
  "suscripcion": {
    "plan": "pro",
    "ciclo": "anual",
    "estado": "activa",
    "fecha_vencimiento": "2027-03-15"
  }
}
```

**Errores:**
- `404` — carnicería no encontrada

---

### 5.2 `POST /api/v1/admin/carniceria/:id/suscripcion/` (nuevo)

**Auth:** Token Authentication de DRF + `is_staff`

**Request — acción `asignar_pro`:**
```json
{
  "accion": "asignar_pro",
  "ciclo": "anual",
  "fecha_vencimiento": "2027-03-17"
}
```

**Request — acción `extender`:**
```json
{
  "accion": "extender",
  "dias": 90
}
```
`dias` debe ser uno de: `30`, `90`, `365`.

**Request — acción `cancelar`:**
```json
{
  "accion": "cancelar"
}
```

**Lógica por acción:**

| Acción | Efecto en `Suscripcion` |
|--------|------------------------|
| `asignar_pro` | `plan='pro'`, `estado='activa'`, `ciclo=ciclo`, `fecha_vencimiento=fecha_vencimiento`, `fecha_inicio=hoy` |
| `extender` | `fecha_vencimiento = fecha_vencimiento_actual + dias` (si vencida: `fecha_vencimiento = hoy + dias`) |
| `cancelar` | `plan='free'`, `estado='cancelada'`, `ciclo=None`, `fecha_vencimiento=None` |

**Response 200:**
```json
{
  "plan": "pro",
  "ciclo": "anual",
  "estado": "activa",
  "fecha_vencimiento": "2027-03-17"
}
```

**Errores:**
- `400` — acción inválida, ciclo faltante para `asignar_pro`, `dias` fuera de valores permitidos
- `404` — carnicería no encontrada

---

### 5.3 `GET /api/v1/admin/precios/` (nuevo)

**Auth:** Token Authentication de DRF + `is_staff`

**Response 200:**
```json
[
  { "ciclo": "mensual",    "precio": "80000.00" },
  { "ciclo": "trimestral", "precio": "210000.00" },
  { "ciclo": "anual",      "precio": "720000.00" }
]
```

---

### 5.4 `PUT /api/v1/admin/precios/` (nuevo)

**Auth:** Token Authentication de DRF + `is_staff`

**Request:**
```json
[
  { "ciclo": "mensual",    "precio": "90000.00" },
  { "ciclo": "trimestral", "precio": "240000.00" },
  { "ciclo": "anual",      "precio": "800000.00" }
]
```

**Lógica:** `upsert` por ciclo — `PlanPrecio.objects.update_or_create(ciclo=ciclo, defaults={"precio": precio})`. Los tres ciclos deben estar presentes; si falta alguno, devolver `400`.

**Response 200:** igual que GET — los tres registros actualizados.

**Errores:**
- `400` — precio negativo, ciclo desconocido, ciclos faltantes

---

### 5.5 `GET /api/v1/billing/precios/` (nuevo, público)

**Auth:** ninguna

Devuelve los precios actuales para que el frontend de planes los muestre sin requerir login. Mismo formato que `GET /api/v1/admin/precios/`.

> Nota: este endpoint es de solo lectura y no expone datos sensibles. Los precios son información pública visible en la pantalla de planes.

---

## 6. Cambios en endpoints existentes

### 6.1 `GET /api/v1/admin/carniceria/` (existente)

Agregar campo `plan` real (leído desde `suscripcion.plan`) en lugar del hardcodeado `"free"`:

```json
{
  "id": 7,
  "nombre": "Carnicería La Norteña",
  "usuario_email": "norteña@email.com",
  "fecha_registro": "2025-01-12",
  "plan": "pro",
  "ultima_actividad": "2026-03-10"
}
```

Requiere `select_related("user", "suscripcion")` en la query.

### 6.2 `POST /api/v1/billing/suscribir/` (existente)

Reemplazar el dict `PRECIOS` hardcodeado por consulta a `PlanPrecio`:

```python
plan_precio = PlanPrecio.objects.get(ciclo=ciclo)
monto = plan_precio.precio
```

---

## 7. Cambios en el frontend

### 7.1 `AdminPanel.jsx`

- Agregar tercera pestaña "Configuración" al array de tabs
- Habilitar el botón "Ver detalle": `navigate(`/admin-saas/clientes/${c.id}`)`
- Mostrar `plan` real con badge de color (Free = gris, Pro = verde)

### 7.2 Nueva página `AdminClienteDetalle.jsx`

Ruta: `/admin-saas/clientes/:id`

- Carga datos con `GET /api/v1/admin/carniceria/:id/`
- Tres secciones: info del cliente, estado de suscripción, acciones
- Las acciones llaman a `POST /api/v1/admin/carniceria/:id/suscripcion/`
- Tras éxito, recarga el detalle y muestra mensaje de confirmación inline
- "Cancelar suscripción" muestra confirmación inline antes de ejecutar

### 7.3 Nueva pestaña `TabConfiguracion` en `AdminPanel.jsx`

- Carga precios con `GET /api/v1/admin/precios/` al montar
- Tabla con inputs numéricos editables por ciclo
- "Guardar cambios" llama a `PUT /api/v1/admin/precios/`
- Muestra mensaje "Precios actualizados." durante 3 segundos tras éxito

### 7.4 `Planes.jsx`

- Cargar precios desde `GET /api/v1/billing/precios/` al montar (reemplaza los valores hardcodeados en `CICLOS`)
- Mientras carga: mostrar `---` en lugar del precio
- Si el endpoint falla: usar los valores hardcodeados como fallback

### 7.5 `api/client.js`

Agregar:
```javascript
api.admin.preciosGet()
api.admin.preciosPut(precios)
api.admin.clienteDetalle(id)
api.admin.clienteSuscripcion(id, body)
api.billing.precios()   // endpoint público
```

---

## 8. Rutas nuevas en frontend

| Ruta | Componente | Guard |
|------|-----------|-------|
| `/admin-saas/clientes/:id` | `AdminClienteDetalle` | `StaffRoute` |

---

## 9. Migraciones

- **`0005_add_plan_precio.py`** — crea el modelo `PlanPrecio`
- **`0006_backfill_plan_precios.py`** — data migration con los tres registros iniciales

---

## 10. Criterios de aceptación

### CA-1: Plan real en lista de clientes
- [ ] `GET /api/v1/admin/carniceria/` devuelve `plan` real desde `Suscripcion`, no hardcodeado
- [ ] La tabla de clientes muestra badge verde para Pro, gris para Free

### CA-2: Vista de detalle de cliente
- [ ] El botón "Ver detalle" navega a `/admin-saas/clientes/:id`
- [ ] La vista muestra nombre, email, fecha de registro, plan, ciclo, estado y fecha de vencimiento
- [ ] Si la carnicería no existe, devuelve 404 y el frontend muestra mensaje de error

### CA-3: Acción "Asignar Pro"
- [ ] `POST` con `accion=asignar_pro`, `ciclo` y `fecha_vencimiento` actualiza la suscripción
- [ ] La fecha de vencimiento guardada coincide exactamente con la enviada
- [ ] Tras éxito, el detalle se recarga y muestra el nuevo estado
- [ ] Si falta `ciclo` o `fecha_vencimiento`, devuelve `400`

### CA-4: Acción "Extender vencimiento"
- [ ] `POST` con `accion=extender` y `dias=30` suma 30 días al `fecha_vencimiento` actual
- [ ] `POST` con `accion=extender` y `dias=90` suma 90 días
- [ ] `POST` con `accion=extender` y `dias=365` suma 365 días
- [ ] Si el cliente tiene `estado='vencida'`, suma los días desde hoy (no desde una fecha pasada)
- [ ] `dias` con valor no permitido devuelve `400`

### CA-5: Acción "Cancelar suscripción"
- [ ] `POST` con `accion=cancelar` setea `plan='free'`, `estado='cancelada'`, `ciclo=None`, `fecha_vencimiento=None`
- [ ] El frontend muestra confirmación inline antes de ejecutar
- [ ] Tras cancelar, el detalle refleja el nuevo estado

### CA-6: Precios en DB
- [ ] Tras la data migration, existen exactamente 3 registros en `PlanPrecio` con los valores iniciales
- [ ] `GET /api/v1/admin/precios/` devuelve los tres ciclos con sus precios
- [ ] `PUT /api/v1/admin/precios/` actualiza los precios y los persiste

### CA-7: Pestaña Configuración
- [ ] La pestaña muestra los precios actuales cargados desde la DB
- [ ] Editando un precio y guardando, el nuevo valor se persiste
- [ ] El mensaje de éxito desaparece a los 3 segundos
- [ ] Un precio negativo o cero devuelve `400` y el frontend lo muestra

### CA-8: Precios dinámicos en Planes.jsx
- [ ] `Planes.jsx` carga los precios desde `GET /api/v1/billing/precios/`
- [ ] Si un admin actualiza un precio, la pantalla de planes refleja el nuevo valor tras recargar
- [ ] Si el endpoint falla, se muestran los valores hardcodeados como fallback

### CA-9: Billing usa precios de DB
- [ ] `POST /api/v1/billing/suscribir/` usa el precio de `PlanPrecio`, no el dict hardcodeado
- [ ] Si el precio en DB fue actualizado, el nuevo PreApproval usa el precio actualizado

---

## 11. Fases de implementación sugeridas

1. **Modelo y migraciones** — `PlanPrecio`, data migration con valores iniciales
2. **Endpoints admin** — `GET /admin/carniceria/:id/`, `POST /admin/carniceria/:id/suscripcion/`, `GET/PUT /admin/precios/`; actualizar `GET /admin/carniceria/` para devolver plan real
3. **Endpoint público de precios** — `GET /billing/precios/`
4. **Actualizar billing/suscribir** — leer precios desde `PlanPrecio`
5. **Frontend — detalle de cliente** — `AdminClienteDetalle.jsx` con las tres acciones
6. **Frontend — pestaña Configuración** — `TabConfiguracion` en `AdminPanel.jsx`
7. **Frontend — mejoras en lista** — habilitar "Ver detalle", badge de plan real
8. **Frontend — precios dinámicos en `Planes.jsx`**

---

*Spec creado: 2026-03-17 — pendiente de aprobación antes de escribir código*
