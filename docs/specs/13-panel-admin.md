# Spec 13 — Panel de Administración SaaS

## Estado: BORRADOR

## Contexto

Panel interno para el operador del SaaS (superuser). Permite monitorear el uso de la plataforma: clientes registrados, actividad reciente y métricas de negocio. No reemplaza al Django Admin — es una vista operativa simple y propia.

---

## Wireframe ASCII

### Pestaña 1 — Métricas

```
┌─────────────────────────────────────────────────────────────┐
│  La Balanza — Panel Admin                      [Cerrar sesión]│
├─────────────────────────────────────────────────────────────┤
│  [ Métricas ]  [ Clientes ]                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Clientes        │  │ Activos esta    │  │ Nuevos este    │ │
│  │ registrados     │  │ semana          │  │ mes            │ │
│  │      42         │  │       8         │  │       5        │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Tasa de         │  │ MRR             │  │ Clientes por   │ │
│  │ retención       │  │                 │  │ plan           │ │
│  │     64%         │  │    $ —          │  │ Free: 42       │ │
│  │ (últimos 30d)   │  │  (sin billing)  │  │ Pro: 0         │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pestaña 2 — Clientes

```
┌─────────────────────────────────────────────────────────────┐
│  La Balanza — Panel Admin                      [Cerrar sesión]│
├─────────────────────────────────────────────────────────────┤
│  [ Métricas ]  [ Clientes ]                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Nombre     │ Email       │ Registro   │ Plan │ Última  │  │
│  │            │             │            │      │ activid.│  │
│  ├────────────┼─────────────┼────────────┼──────┼─────────│  │
│  │ El Toro    │ pablo@...   │ 2025-10-01 │ Free │ 2026-   │  │
│  │            │             │            │      │ 03-15   │[Ver]
│  ├────────────┼─────────────┼────────────┼──────┼─────────│  │
│  │ La Esquina │ omar@...    │ 2025-11-15 │ Free │ 2026-   │  │
│  │            │             │            │      │ 02-27   │[Ver]
│  ├────────────┼─────────────┼────────────┼──────┼─────────│  │
│  │ ...        │ ...         │ ...        │ ...  │ ...     │  │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Endpoints

### GET /api/v1/admin/stats/

Devuelve métricas agregadas.

**Autorización:** solo `is_staff=True`. Cualquier otro usuario recibe `403 Forbidden`.

**Response 200:**
```json
{
  "total_clientes": 42,
  "activos_7_dias": 8,
  "nuevos_este_mes": 5,
  "tasa_retencion_30_dias": 64.3
}
```

**Lógica:**
- `total_clientes`: `Carniceria.objects.count()`
- `activos_7_dias`: carnicerías que tienen al menos 1 `Compra` con `fecha >= hoy - 7 días`
- `nuevos_este_mes`: carnicerías cuyo `user.date_joined` cae en el mes calendario actual
- `tasa_retencion_30_dias`: porcentaje de carnicerías que existían hace 30 días y tienen al menos 1 `Compra` en los últimos 30 días. Fórmula: `(activos_30_dias / clientes_hace_30_dias) * 100`, redondeado a 1 decimal. Devuelve `null` si no hay clientes previos.
- **MRR y clientes por plan:** no se calculan en backend por ahora — el frontend los muestra como placeholders fijos.

---

### GET /api/v1/admin/carniceria/

Devuelve la lista de carnicerías con datos operativos.

**Autorización:** solo `is_staff=True`. Cualquier otro usuario recibe `403 Forbidden`.

**Response 200:**
```json
[
  {
    "id": 1,
    "nombre": "El Toro",
    "usuario_email": "pablo@example.com",
    "fecha_registro": "2025-10-01",
    "plan": "free",
    "ultima_actividad": "2026-03-15"
  },
  ...
]
```

**Notas:**
- `ultima_actividad`: fecha de la `Compra` más reciente de esa carnicería. `null` si no tiene compras.
- `plan`: siempre `"free"` hasta que se integre billing.
- Ordenado por `fecha_registro` descendente (más recientes primero).
- Sin paginación en la primera versión (se agrega si el volumen lo requiere).

---

## Frontend

**Ruta:** `/admin-saas/`

**Acceso:** solo usuarios con `is_staff=True`. Si el usuario no tiene ese flag, redirigir a `/` o mostrar pantalla de acceso denegado.

**Comportamiento:**
- Al cargar la página, se hacen dos llamadas en paralelo: `GET /api/v1/admin/stats/` y `GET /api/v1/admin/carniceria/`.
- Mostrar un estado de carga mientras se resuelven.
- Si alguna llamada devuelve 403, mostrar mensaje "Acceso denegado" y no renderizar el panel.
- Los datos no se auto-actualizan; el usuario puede recargar manualmente.
- El panel tiene dos pestañas: "Métricas" y "Clientes". La pestaña activa por defecto es "Métricas".

**Cards de la pestaña Métricas:**
- Clientes registrados → `total_clientes`
- Activos esta semana → `activos_7_dias`
- Nuevos este mes → `nuevos_este_mes`
- Tasa de retención → `tasa_retencion_30_dias`% (mostrar `—` si es `null`)
- MRR → placeholder fijo: `$ —` con leyenda "Próximamente"
- Clientes por plan → placeholder fijo: `Free: {total_clientes}` / `Pro: 0`

**Tabla de la pestaña Clientes:**
- Columnas: Nombre, Email, Fecha de registro, Plan, Última actividad, Acciones
- `Plan` muestra siempre "Free" (badge visual)
- `Última actividad` muestra `—` si es `null`
- Botón "Ver detalle" por fila: deshabilitado o sin funcionalidad (placeholder v1)

---

## Criterios de aceptación

### Seguridad
- [ ] Un usuario sin `is_staff=True` que llama a `/api/v1/admin/stats/` recibe `403`.
- [ ] Un usuario sin `is_staff=True` que llama a `/api/v1/admin/carniceria/` recibe `403`.
- [ ] Un usuario no autenticado recibe `401`.
- [ ] El frontend con un usuario no-staff no renderiza el panel ni expone datos.

### Métricas
- [ ] `total_clientes` refleja el conteo real en DB.
- [ ] `activos_7_dias` cuenta solo carnicerías con al menos 1 compra en los últimos 7 días (ventana calculada al momento del request, no en cache).
- [ ] `nuevos_este_mes` cuenta solo carnicerías cuyo `date_joined` cae en el mes calendario actual.
- [ ] `tasa_retencion_30_dias` aplica la fórmula correcta y devuelve `null` cuando no hay base de comparación.
- [ ] MRR y clientes por plan son placeholders fijos — no se consulta backend para esos datos.

### Lista de clientes
- [ ] Cada carnicería aparece con nombre, email, fecha de registro, plan y última actividad.
- [ ] Carnicerías sin compras muestran `ultima_actividad: null` en API y `—` en frontend.
- [ ] La lista está ordenada por fecha de registro descendente.
- [ ] El botón "Ver detalle" existe pero no navega a ningún lado (v1 placeholder).

### Frontend
- [ ] La ruta `/admin-saas/` existe y carga el panel.
- [ ] El panel tiene dos pestañas navegables: "Métricas" y "Clientes".
- [ ] La pestaña "Métricas" muestra 6 cards.
- [ ] La pestaña "Clientes" muestra la tabla.
- [ ] El estado de carga es visible mientras se resuelven los requests.
- [ ] Si el usuario no es staff, no se muestra contenido del panel.

---

## Fuera de alcance (v1)

- Paginación de la lista de clientes.
- Filtros o búsqueda en la tabla.
- Gráficos o visualizaciones de evolución temporal.
- Acciones sobre clientes (desactivar, editar, etc.).
- Exportación a CSV.
- Integración de billing (MRR, planes Pro).
- Pantalla de detalle de cliente (detrás del botón "Ver detalle").
