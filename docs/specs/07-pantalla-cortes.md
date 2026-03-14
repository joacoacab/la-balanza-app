# Spec 07 — Pantalla Gestión de Cortes

**Estado:** pendiente de aprobación
**Fecha:** 2026-03-14

---

## Objetivo

El carnicero gestiona la plantilla de cortes de su carnicería: agrega, edita y desactiva cortes. Esta plantilla define qué cortes se copian automáticamente cada vez que se crea una compra.

---

## Wireframes mobile (375px)

### Estado: cargando

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Mis cortes                 │
│                             │
│  Cargando...                │
│                             │
└─────────────────────────────┘
```

### Estado: lista con cortes

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Mis cortes                 │
│                             │
│  ┌─────────────────────────┐│
│  │ Lomo                    ││
│  │ Rend: 5% · Margen: 50%  ││
│  │               [Editar]  ││
│  │            [Desactivar] ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ Asado                   ││
│  │ Rend: 10% · Margen: 30% ││
│  │               [Editar]  ││
│  │            [Desactivar] ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │    + Agregar corte      ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Estado: lista vacía

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Mis cortes                 │
│                             │
│  Todavía no agregaste       │
│  ningún corte.              │
│                             │
│  ┌─────────────────────────┐│
│  │    + Agregar corte      ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Estado: error de carga inicial

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Mis cortes                 │
│                             │
│  ┌─────────────────────────┐│
│  │ Error al cargar cortes. ││
│  │ Verificá tu red.        ││
│  │                         ││
│  │    [Reintentar]         ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

### Modal: agregar corte nuevo

```
┌─────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░┌─────────────────────┐░░░│
│░░░│  Nuevo corte        │░░░│
│░░░│                     │░░░│
│░░░│  Nombre             │░░░│
│░░░│  ┌───────────────┐  │░░░│
│░░░│  │               │  │░░░│
│░░░│  └───────────────┘  │░░░│
│░░░│                     │░░░│
│░░░│  % Rendimiento      │░░░│
│░░░│  ┌───────────────┐  │░░░│
│░░░│  │               │  │░░░│
│░░░│  └───────────────┘  │░░░│
│░░░│                     │░░░│
│░░░│  % Margen           │░░░│
│░░░│  ┌───────────────┐  │░░░│
│░░░│  │               │  │░░░│
│░░░│  └───────────────┘  │░░░│
│░░░│                     │░░░│
│░░░│  [Cancelar][Guardar]│░░░│
│░░░└─────────────────────┘░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────┘
```

> El modal de editar es idéntico pero con el título "Editar corte" y los campos pre-rellenos con los valores actuales.

### Modal: confirmar desactivación

```
┌─────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░┌─────────────────────┐░░░│
│░░░│  ¿Desactivar        │░░░│
│░░░│  "Lomo"?            │░░░│
│░░░│                     │░░░│
│░░░│  El corte dejará de │░░░│
│░░░│  aparecer en nuevas │░░░│
│░░░│  compras. Las       │░░░│
│░░░│  compras anteriores │░░░│
│░░░│  no se modifican.   │░░░│
│░░░│                     │░░░│
│░░░│      [Cancelar]     │░░░│
│░░░│   [Sí, desactivar]  │░░░│
│░░░└─────────────────────┘░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────┘
```

---

## Decisión de diseño: modal para agregar y editar

Se usa un único modal/formulario tanto para agregar como para editar (misma UI, props distintas). La alternativa inline fue descartada porque en pantallas pequeñas el teclado virtual puede tapar los campos y resulta más difícil de implementar sin errores. Un modal centrado en pantalla es más predecible en mobile.

---

## Componentes a crear

### Árbol de componentes

```
pages/Cortes.jsx              ← página, orquesta estado y llamadas a API
  ├── components/CorteCard.jsx     ← card individual con botones editar/desactivar
  ├── components/CorteFormModal.jsx ← modal reutilizado para agregar y editar
  └── components/ConfirmDialog.jsx  ← diálogo de confirmación para desactivar
```

---

### `pages/Cortes.jsx`

Responsabilidades:
- Carga la lista de cortes al montar (`GET /api/v1/cortes/`).
- Maneja el estado global de la pantalla mediante un objeto `modal`:

```
modal = null                           → no hay modal abierto
modal = { tipo: 'agregar' }            → modal de nuevo corte
modal = { tipo: 'editar', corte }      → modal de editar con datos pre-rellenos
modal = { tipo: 'confirmar', corte }   → diálogo de confirmación de desactivación
```

- Ejecuta las mutaciones (POST, PATCH, DELETE) y actualiza la lista localmente tras éxito, sin recargar todo desde la API.
- En caso de `401` en cualquier llamada, redirige a `/`.

Estado local:
- `cortes`: array (null mientras carga)
- `errorCarga`: string | null (error del GET inicial)
- `modal`: objeto según arriba
- `guardando`: boolean (deshabilita botones del modal durante mutaciones)
- `errorModal`: string | null (error de validación o red dentro del modal)

---

### `components/CorteCard.jsx`

Responsabilidades:
- Recibe un objeto `corte` y callbacks `onEditar`, `onDesactivar`.
- Muestra: nombre, porcentaje_rendimiento, margen_porcentaje.
- Dos botones: "Editar" y "Desactivar", ambos con `min-h-[44px]`.

---

### `components/CorteFormModal.jsx`

Responsabilidades:
- Recibe `corte` (null = nuevo, objeto = editar), `onGuardar(datos)`, `onCancelar`, `guardando`, `error`.
- Maneja estado interno del formulario: `nombre`, `porcentaje_rendimiento`, `margen_porcentaje`.
- Cuando recibe `corte`, pre-rellena los campos con sus valores.
- Validación local antes de llamar a `onGuardar`:
  - `nombre` no vacío.
  - `porcentaje_rendimiento` > 0.
  - `margen_porcentaje` > 0.
- Título dinámico: "Nuevo corte" o "Editar corte".
- Overlay que cubre toda la pantalla. El modal en sí es una card blanca centrada.
- Mientras `guardando=true`, deshabilita inputs y botón Guardar.
- `error` se muestra inline en el modal (errores de servidor o red).

---

### `components/ConfirmDialog.jsx`

Responsabilidades:
- Recibe `nombre` (del corte), `onConfirmar`, `onCancelar`, `guardando`.
- Muestra el mensaje fijo sobre el efecto del soft delete.
- Mientras `guardando=true`, deshabilita el botón "Sí, desactivar".
- Overlay igual al de `CorteFormModal`.

---

## Routing y navegación

- Agregar ruta `/cortes` en `App.jsx`, protegida con `PrivateRoute`.
- Agregar botón/link "Mis cortes" en `Dashboard.jsx`, al lado del existente "Nueva compra".

---

## API — llamadas y manejo de errores

### Al montar `Cortes`

```
GET /api/v1/cortes/
```

| Respuesta | Acción |
|-----------|--------|
| `200` | Mostrar lista (puede ser vacía) |
| `401` | Redirigir a `/` |
| Error de red | Mostrar error con botón "Reintentar" |

---

### Al guardar un corte nuevo

```
POST /api/v1/cortes/
Body: { nombre, porcentaje_rendimiento, margen_porcentaje }
```

| Respuesta | Acción |
|-----------|--------|
| `201` | Agregar el corte al inicio de la lista local, cerrar modal |
| `400` con `nombre` | Mostrar error en modal: "Ya existe un corte con ese nombre." |
| `400` otros campos | Mostrar en modal: "Error en los datos ingresados." |
| `401` | Redirigir a `/` |
| Error de red | Mostrar en modal: "Error de conexión. Intentá de nuevo." |

---

### Al guardar edición de un corte

```
PATCH /api/v1/cortes/{id}/
Body: { nombre, porcentaje_rendimiento, margen_porcentaje }
```

| Respuesta | Acción |
|-----------|--------|
| `200` | Reemplazar el corte en la lista local, cerrar modal |
| `400` con `nombre` | Mostrar error en modal: "Ya existe un corte con ese nombre." |
| `400` otros campos | Mostrar en modal: "Error en los datos ingresados." |
| `401` | Redirigir a `/` |
| `404` | Recargar lista desde API, cerrar modal |
| Error de red | Mostrar en modal: "Error de conexión. Intentá de nuevo." |

---

### Al confirmar desactivación

```
DELETE /api/v1/cortes/{id}/
```

| Respuesta | Acción |
|-----------|--------|
| `204` | Quitar el corte de la lista local, cerrar diálogo |
| `401` | Redirigir a `/` |
| `404` | Quitar de la lista local (ya estaba desactivado), cerrar diálogo |
| Error de red | Mostrar error en el diálogo: "Error de conexión. Intentá de nuevo." |

> La actualización de la lista es **local** en todos los casos exitosos: no se vuelve a llamar a `GET /cortes/` después de cada mutación.

---

## Criterios de aceptación

### CA-01 — Carga inicial exitosa

Al entrar a la pantalla, se muestra la lista de cortes activos de la carnicería.

### CA-02 — Lista vacía

Si la carnicería no tiene cortes activos, se muestra el estado vacío con el botón "Agregar corte" visible.

### CA-03 — Error de carga con reintento

Si el GET inicial falla por error de red, se muestra el error y un botón "Reintentar" que vuelve a llamar a la API.

### CA-04 — Agregar corte exitoso

Completar el modal y tocar "Guardar" → el corte nuevo aparece en la lista sin recargar la página.

### CA-05 — Nombre duplicado al agregar

Si el nombre ya existe, el modal muestra el error del backend y permanece abierto.

### CA-06 — Validación local en modal

Intentar guardar con nombre vacío o porcentajes en 0 → error inline en el modal, sin llamar a la API.

### CA-07 — Editar corte exitoso

Tocar "Editar" → el modal se abre con los valores actuales pre-rellenos → guardar → la card se actualiza en la lista.

### CA-08 — Desactivar corte con confirmación

Tocar "Desactivar" → aparece el diálogo de confirmación → "Sí, desactivar" → el corte desaparece de la lista.

### CA-09 — Cancelar desactivación

Tocar "Cancelar" en el diálogo de confirmación → el corte permanece en la lista.

### CA-10 — Loading durante guardado

Mientras se procesa POST/PATCH/DELETE, el botón de acción muestra estado de carga y los inputs están deshabilitados.

### CA-11 — 401 redirige a login

Cualquier respuesta `401` en cualquier llamada redirige inmediatamente a `/`.

### CA-12 — Mobile: sin scroll horizontal en 375px

Ningún elemento desborda horizontalmente en pantalla de 375px.

### CA-13 — Inputs en modal con text-base

Todos los inputs del modal usan `text-base` (mínimo 16px) para evitar zoom automático en iOS.
