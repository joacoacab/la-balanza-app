# Spec 15 — Billing con MercadoPago

## Estado: BORRADOR

---

## 1. Contexto y objetivo

La Balanza necesita monetizarse. Actualmente todos los usuarios tienen acceso completo sin restricciones. Este spec define el sistema de suscripciones usando MercadoPago PreApproval (cobros recurrentes).

**Objetivo:** Implementar un modelo freemium con dos planes — Free (limitado) y Pro (pago) — con cobro recurrente vía MercadoPago y bloqueo parcial al vencer.

---

## 2. Planes y precios

| Plan | Precio | Ciclo |
|------|--------|-------|
| Free | $0 | — |
| Pro  | $80.000 ARS | Mensual |
| Pro  | $210.000 ARS | Trimestral (≈ $70.000/mes) |
| Pro  | $720.000 ARS | Anual (≈ $60.000/mes) |

### Límites del plan Free

- Solo puede crear compras de **res** (no cerdo, no pollo)
- Máximo **5 compras** visibles en el historial (las más recientes)
- Sin acceso a generación de **PDF**

### Plan Pro

- Sin restricciones de animal
- Historial completo
- Generación de PDF habilitada

---

## 3. Wireframe ASCII — Pantalla de planes

```
┌─────────────────────────────────────────────────┐
│  La Balanza                          [≡ Menú]   │
├─────────────────────────────────────────────────┤
│                                                  │
│           Tu plan actual: FREE                   │
│                                                  │
│  ┌──────────────┐   ┌───────────────────────┐   │
│  │     FREE     │   │         PRO           │   │
│  │              │   │                       │   │
│  │  • Solo res  │   │  • Res, cerdo, pollo  │   │
│  │  • 5 compras │   │  • Historial completo │   │
│  │  • Sin PDF   │   │  • PDF ilimitados     │   │
│  │              │   │                       │   │
│  │   Tu plan    │   │  Elegí tu ciclo:      │   │
│  │   actual     │   │  ○ Mensual  $80.000   │   │
│  │              │   │  ○ Trimest. $210.000  │   │
│  │              │   │  ● Anual    $720.000  │   │
│  │              │   │                       │   │
│  │              │   │  [  SUSCRIBIRME  ]    │   │
│  └──────────────┘   └───────────────────────┘   │
│                                                  │
│  ℹ️  Los precios son en ARS e incluyen IVA.      │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Estado: suscripción activa (Pro)**

```
┌─────────────────────────────────────────────────┐
│  La Balanza                          [≡ Menú]   │
├─────────────────────────────────────────────────┤
│                                                  │
│           Tu plan actual: PRO ✓                  │
│                                                  │
│   Plan: Anual                                    │
│   Próximo vencimiento: 15 de marzo de 2027       │
│   Estado: Activa                                 │
│                                                  │
│   [  Cancelar suscripción  ]                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Banner de bloqueo (inline, no modal)**

```
┌─────────────────────────────────────────────────┐
│  ⚠️  Tu plan Free no permite crear compras de   │
│  cerdo. Actualizá a Pro para desbloquear todos  │
│  los animales.           [ Ver planes ]          │
└─────────────────────────────────────────────────┘
```

---

## 4. Modelo de datos

### 4.1 Modelo `Suscripcion` (en `core`)

```python
class Suscripcion(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro')]
    CICLO_CHOICES = [
        ('mensual', 'Mensual'),
        ('trimestral', 'Trimestral'),
        ('anual', 'Anual'),
    ]
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('vencida', 'Vencida'),
        ('cancelada', 'Cancelada'),
    ]

    carniceria       = OneToOneField(Carniceria, on_delete=CASCADE, related_name='suscripcion')
    plan             = CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    ciclo            = CharField(max_length=15, choices=CICLO_CHOICES, null=True, blank=True)
    estado           = CharField(max_length=15, choices=ESTADO_CHOICES, default='activa')
    mp_preapproval_id = CharField(max_length=100, null=True, blank=True)
    fecha_inicio     = DateField(null=True, blank=True)
    fecha_vencimiento = DateField(null=True, blank=True)
    creado_en        = DateTimeField(auto_now_add=True)
    actualizado_en   = DateTimeField(auto_now=True)
```

**Notas:**
- `ciclo` y `fecha_vencimiento` son `null` cuando `plan='free'` (sin vencimiento)
- `mp_preapproval_id` se popula cuando MP confirma la suscripción vía webhook
- `estado='activa'` es el estado inicial para plan Free (no vence)

### 4.2 Creación automática al registrar Carniceria

En el `post_save` signal de `Carniceria` (o en el serializer de registro), crear automáticamente:

```python
Suscripcion.objects.create(
    carniceria=carniceria,
    plan='free',
    estado='activa',
)
```

### 4.3 Lógica de acceso (`Suscripcion`)

Métodos de conveniencia en el modelo (como `@property`):

- `puede_crear_compra(animal)` → `bool` — verifica plan y estado
- `puede_ver_pdf` → `bool`
- `compras_visibles_limit` → `int | None` — 5 para free, None para pro

### 4.4 Variables de entorno nuevas

```
MP_ACCESS_TOKEN=APP_USR-xxxx       # Token de producción de MercadoPago
MP_WEBHOOK_SECRET=xxxx              # Secret para verificar firma HMAC del webhook
```

---

## 5. Endpoints

### 5.1 `POST /api/v1/billing/suscribir/`

**Autenticación:** requerida (Token Authentication de DRF)

**Request:**
```json
{ "ciclo": "mensual" | "trimestral" | "anual" }
```

**Lógica:**
1. Validar que `ciclo` sea un valor permitido
2. Determinar el monto según la tabla de precios
3. Crear PreApproval en MercadoPago API con:
   - `reason`: `"La Balanza Pro — {ciclo}"`
   - `auto_recurring.frequency`: 1
   - `auto_recurring.frequency_type`: `"months"` (1, 3, o 12 según ciclo)
   - `auto_recurring.transaction_amount`: monto ARS
   - `auto_recurring.currency_id`: `"ARS"`
   - `back_url`: URL de la app (pantalla de confirmación)
   - `payer_email`: email del usuario
4. Guardar `mp_preapproval_id` en `Suscripcion` con estado pendiente
5. Devolver `init_point`

**Response 200:**
```json
{ "init_point": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=..." }
```

**Errores:**
- `400` — ciclo inválido
- `502` — error al comunicarse con MP

---

### 5.2 `GET /api/v1/billing/estado/`

**Autenticación:** requerida

**Response 200:**
```json
{
  "plan": "pro",
  "ciclo": "anual",
  "estado": "activa",
  "fecha_vencimiento": "2027-03-15"
}
```

Para plan free:
```json
{
  "plan": "free",
  "ciclo": null,
  "estado": "activa",
  "fecha_vencimiento": null
}
```

---

### 5.3 `POST /api/v1/webhooks/mercadopago/`

**Autenticación:** ninguna (endpoint público). La autenticidad se verifica por firma HMAC.

**Flujo del webhook con verificación de firma:**

```
MercadoPago                    Backend La Balanza
     │                                │
     │  POST /webhooks/mercadopago/   │
     │  Headers:                      │
     │    x-signature: ts=...,v1=...  │
     │    x-request-id: <uuid>        │
     │  Body: { "type": "...",        │
     │          "data": { "id": "..." }│
     │        }                       │
     │ ──────────────────────────────>│
     │                                │ 1. Extraer ts y v1 del header x-signature
     │                                │ 2. Construir manifest:
     │                                │    "id:{data.id};request-id:{x-request-id};ts:{ts};"
     │                                │ 3. HMAC-SHA256(manifest, MP_WEBHOOK_SECRET)
     │                                │ 4. Comparar con v1 (comparación segura)
     │                                │ 5. Si no coincide → 400 (sin log del body)
     │                                │ 6. Si coincide → procesar evento
     │  HTTP 200 OK                   │
     │ <──────────────────────────────│
```

**Tipos de evento relevantes:**

| `type` | Acción |
|--------|--------|
| `subscription_preapproval` | Verificar estado en MP, actualizar `Suscripcion` |
| `payment` | Registrar pago, extender `fecha_vencimiento` |

**Procesamiento del evento `subscription_preapproval`:**

1. Obtener `preapproval_id` de `data.id`
2. Consultar MP API: `GET /preapproval/{id}`
3. Según `status` de MP:
   - `authorized` → `plan='pro'`, `estado='activa'`, calcular `fecha_vencimiento`
   - `paused` / `cancelled` → `estado='cancelada'`
   - `pending` → no cambiar nada, loguear

**Cálculo de `fecha_vencimiento`:**
- Mensual: `fecha_inicio + 1 mes`
- Trimestral: `fecha_inicio + 3 meses`
- Anual: `fecha_inicio + 12 meses`

La `fecha_inicio` se toma del campo `date_created` de la respuesta de MP.

**Response:**
- `200 OK` — siempre, para que MP no reintente (incluso si el evento se ignora)
- `400` — solo si la firma es inválida

---

## 6. Bloqueo parcial en endpoints existentes

### 6.1 Permiso reutilizable: `PuedeCrearCompra`

Crear una DRF permission class en `api/permissions.py`:

```
class PuedeCrearCompra(BasePermission):
    def has_permission(self, request, view):
        animal = request.data.get('animal', 'res')
        suscripcion = request.user.carniceria.suscripcion
        puede, mensaje = suscripcion.puede_crear_compra(animal)
        if not puede:
            self.message = mensaje
        return puede
```

Aplicar en `CompraViewSet` para los métodos `create` (`POST`).

### 6.2 Respuesta 403 estándar

```json
{
  "error": "plan_insuficiente",
  "mensaje": "Tu plan Free no permite registrar compras de cerdo. Actualizá a Pro para continuar.",
  "accion": "ver_planes"
}
```

### 6.3 Historial limitado

En `CompraViewSet.get_queryset()`, si `plan='free'`:
```python
qs = qs.order_by('-fecha')[:5]
```

### 6.4 Bloqueo de PDF

En el endpoint de generación de PDF, verificar `suscripcion.puede_ver_pdf`. Si es False, devolver `403` con mensaje claro.

---

## 7. Flujo completo de suscripción

```
Usuario                  Frontend              Backend               MercadoPago
   │                        │                     │                       │
   │  Toca "Actualizar a Pro"│                     │                       │
   │ ──────────────────────>│                     │                       │
   │                        │ Muestra pantalla    │                       │
   │                        │ de planes           │                       │
   │  Elige ciclo "Anual"   │                     │                       │
   │ ──────────────────────>│                     │                       │
   │                        │ POST /billing/      │                       │
   │                        │ suscribir/          │                       │
   │                        │ { ciclo: "anual" }  │                       │
   │                        │ ───────────────────>│                       │
   │                        │                     │ POST /preapproval     │
   │                        │                     │ ─────────────────────>│
   │                        │                     │   { init_point }      │
   │                        │                     │ <─────────────────────│
   │                        │ { init_point }      │                       │
   │                        │ <───────────────────│                       │
   │                        │ redirect(init_point)│                       │
   │ <──────────────────────│                     │                       │
   │  Paga en MercadoPago   │                     │                       │
   │ ──────────────────────────────────────────────────────────────────>  │
   │  Redirige a back_url   │                     │                       │
   │ <──────────────────────│                     │                       │
   │                        │                     │  Webhook POST         │
   │                        │                     │ <─────────────────────│
   │                        │                     │ Verifica firma HMAC   │
   │                        │                     │ Consulta GET          │
   │                        │                     │ /preapproval/{id}     │
   │                        │                     │ ─────────────────────>│
   │                        │                     │   { status: "authorized" }
   │                        │                     │ <─────────────────────│
   │                        │                     │ Actualiza Suscripcion │
   │                        │                     │ plan='pro'            │
   │                        │                     │ estado='activa'       │
   │                        │ GET /billing/estado/│                       │
   │                        │ ───────────────────>│                       │
   │                        │ { plan: "pro", ... }│                       │
   │                        │ <───────────────────│                       │
   │  Muestra confirmación  │                     │                       │
   │ <──────────────────────│                     │                       │
```

---

## 8. Frontend — Componentes nuevos

| Componente | Ruta | Descripción |
|-----------|------|-------------|
| `PlanesScreen` | `/planes` | Pantalla de selección de plan y ciclo |
| `SuscripcionConfirmacion` | `/planes/confirmacion` | Back URL de MercadoPago, muestra resultado |
| `useSuscripcion` | hook | Consume `GET /billing/estado/`, provee plan y estado |
| `PlanBadge` | componente | Badge inline con el plan actual (Free / Pro) |
| `BloqueoPlanBanner` | componente | Banner amarillo con CTA a pantalla de planes |

### Integración en navegación

- Agregar opción "Mi plan" en el menú lateral
- `PlanBadge` visible en el header junto al nombre de la carnicería
- `BloqueoPlanBanner` se muestra inline cuando un endpoint devuelve `403` con `error: "plan_insuficiente"`

---

## 9. Migraciones y datos existentes

Al crear la migración, todos los usuarios existentes deben quedar con `plan='free'` y `estado='activa'`. Usar `post_migrate` signal o data migration.

---

## 10. Criterios de aceptación

### CA-1: Creación automática de suscripción
- [ ] Al registrar una nueva carnicería, se crea automáticamente una `Suscripcion` con `plan='free'` y `estado='activa'`
- [ ] Los usuarios existentes tienen una `Suscripcion` luego de la migración

### CA-2: Flujo de suscripción
- [ ] `POST /billing/suscribir/` con ciclo válido devuelve un `init_point` de MercadoPago
- [ ] `POST /billing/suscribir/` con ciclo inválido devuelve `400`
- [ ] El `init_point` redirige al checkout real de MercadoPago en sandbox

### CA-3: Webhook
- [ ] El webhook rechaza requests con firma HMAC inválida (devuelve `400`)
- [ ] El webhook acepta requests con firma válida (devuelve `200`)
- [ ] Luego del webhook con `status=authorized`, la suscripción queda `plan='pro'`, `estado='activa'` con `fecha_vencimiento` correcta
- [ ] El webhook es idempotente: procesarlo dos veces no duplica datos

### CA-4: Bloqueo plan Free
- [ ] Un usuario Free que intenta crear una compra de cerdo recibe `403` con `error: "plan_insuficiente"`
- [ ] Un usuario Free que crea una compra de res puede hacerlo normalmente
- [ ] El historial de un usuario Free muestra máximo 5 compras
- [ ] Un usuario Free que intenta generar PDF recibe `403`

### CA-5: Bloqueo por vencimiento
- [ ] Un usuario Pro con `estado='vencida'` no puede crear compras (recibe `403`)
- [ ] Un usuario Pro con `estado='vencida'` puede ver su historial (lectura habilitada)

### CA-6: Estado de suscripción
- [ ] `GET /billing/estado/` devuelve el plan y estado actuales del usuario autenticado
- [ ] El frontend muestra el plan correcto en `PlanBadge` y pantalla de planes

### CA-7: Frontend
- [ ] La pantalla de planes muestra los tres ciclos con precios correctos
- [ ] Al completar el pago en MP y volver a la app, se muestra confirmación de activación
- [ ] El `BloqueoPlanBanner` aparece cuando se intenta una acción bloqueada

---

## 11. Seguridad

- **Nunca** confiar en el body del webhook para actualizar el plan directamente. Siempre consultar la API de MP para verificar el estado real.
- La verificación de firma HMAC debe usar comparación de tiempo constante (`hmac.compare_digest`) para evitar timing attacks.
- `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` nunca en el repositorio. Solo en variables de entorno.
- El endpoint del webhook no requiere Token Authentication de DRF pero sí verificación de firma.
- Loguear todos los webhooks recibidos (con tipo y preapproval_id), sin loguear el body completo.

---

## 12. Fases de implementación sugeridas

1. **Modelo y migración** — `Suscripcion`, signal de creación automática, data migration para usuarios existentes
2. **Lógica de bloqueo** — métodos en `Suscripcion`, permission class `PuedeCrearCompra`, aplicar en endpoints
3. **Integración MP — suscribir** — `POST /billing/suscribir/` con creación de PreApproval
4. **Webhook** — `POST /webhooks/mercadopago/` con verificación de firma y actualización de estado
5. **Endpoint estado** — `GET /billing/estado/`
6. **Frontend** — `PlanesScreen`, `useSuscripcion`, `BloqueoPlanBanner`, integración en navegación
7. **Tests** — unitarios de lógica de bloqueo, integración del webhook con mock de MP API

---

*Spec creado: 2026-03-17 — pendiente de aprobación antes de escribir código*
