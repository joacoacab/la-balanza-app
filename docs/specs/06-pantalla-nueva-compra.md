# Spec 06 — Pantalla Nueva Compra

**Estado:** pendiente de aprobación
**Fecha:** 2026-03-14

---

## Objetivo

Pantalla principal del producto. El carnicero ingresa los datos de la media res recién comprada y obtiene en segundos el precio mínimo y sugerido de venta por corte.

El flujo completo dura menos de 30 segundos: tipear los datos → tocar "Calcular" → ver precios.

---

## Wireframe mobile (375px)

### Estado inicial — formulario vacío

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Nueva compra               │
│                             │
│  Precio por kg ($)          │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Peso media res (kg)        │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Rendimiento                │
│  % Carne  % Hueso  % Grasa  │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  80  │ │  12  │ │   8  │ │
│  └──────┘ └──────┘ └──────┘ │
│                             │
│  Precio grasa ($/kg)        │
│  ┌─────────────────────┐    │
│  │  0                  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │      Calcular       │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

### Estado loading

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  [formulario deshabilitado] │
│                             │
│  ┌─────────────────────┐    │
│  │    Calculando...    │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

### Estado error de validación

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Nueva compra               │
│                             │
│  [formulario]               │
│                             │
│  ┌─────────────────────────┐│
│  │ ⚠ Los porcentajes deben ││
│  │   sumar 100. Actualmente││
│  │   suman 95.             ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────┐    │
│  │      Calcular       │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### Estado resultado — tabla de cortes

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  ← Nueva compra             │
│                             │
│  Resumen                    │
│  Costo total    $100.000    │
│  Costo neto     $ 98.000    │
│  Kg vendibles      60,0 kg  │
│  Costo/kg vend.  $1.633/kg  │
│                             │
│  ─────────────────────────  │
│                             │
│  Cortes                     │
│                             │
│  Lomo                       │
│  5,0 kg                     │
│  Mín: $1.633/kg             │
│  Sug: $2.450/kg             │
│                             │
│  Asado                      │
│  10,0 kg                    │
│  Mín: $1.633/kg             │
│  Sug: $2.122/kg             │
│                             │
│  ─────────────────────────  │
│  [Nueva compra]             │
│                             │
└─────────────────────────────┘
```

### Estado vacío — sin cortes en plantilla

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Sin cortes configurados    │
│                             │
│  Todavía no configuraste    │
│  ningún corte. Los cortes   │
│  determinan los precios de  │
│  venta.                     │
│                             │
│  (configuración de cortes   │
│   en pantalla futura)       │
│                             │
└─────────────────────────────┘
```

> El estado vacío se detecta cuando `GET /api/v1/cortes/` devuelve un array vacío antes de habilitar el formulario. Si hay cortes, se muestra el formulario directamente.

---

## Componentes a crear

### Árbol de componentes

```
pages/NuevaCompra.jsx          ← página, maneja estado global de la pantalla
  ├── components/CompraForm.jsx     ← formulario de entrada
  │     └── components/PorcentajesInput.jsx  ← grupo % Carne / % Hueso / % Grasa
  ├── components/CompraResumen.jsx  ← tarjeta de resumen (costo total, costo neto, etc.)
  └── components/CortesTable.jsx   ← lista de cortes con precios
```

### `pages/NuevaCompra.jsx`

Responsabilidades:
- Detecta si hay cortes en plantilla al montar (llamada a `GET /api/v1/cortes/`).
- Maneja el estado de la pantalla: `idle | loading | result | error`.
- Orquesta las llamadas a la API: `POST /compras/` seguido de `GET /compras/{id}/`.
- En estado `result`, muestra `CompraResumen` + `CortesTable` y un botón "Nueva compra" que vuelve a `idle`.

### `components/CompraForm.jsx`

Responsabilidades:
- Campos controlados: `precio_kg`, `peso_media_res`, `porcentaje_carne`, `porcentaje_hueso`, `porcentaje_grasa`, `precio_grasa`.
- Valores iniciales: `porcentaje_carne=80`, `porcentaje_hueso=12`, `porcentaje_grasa=8`, `precio_grasa=0`.
- Validación local antes de llamar a la API:
  - `precio_kg` > 0 y `peso_media_res` > 0 (campos requeridos).
  - Los tres porcentajes deben sumar exactamente 100.
- Muestra el mensaje de error de validación inline (debajo del formulario, antes del botón).
- Cuando `loading=true`, deshabilita todos los inputs y el botón.
- Llama a `onSubmit(formData)` al hacer submit; no llama a la API directamente.

### `components/PorcentajesInput.jsx`

Responsabilidades:
- Tres inputs numéricos en una fila: `% Carne`, `% Hueso`, `% Grasa`.
- Recibe `values` y `onChange` como props.
- Muestra el total en tiempo real debajo de los tres campos: `"Total: 100 ✓"` o `"Total: 95 — deben sumar 100"`.

### `components/CompraResumen.jsx`

Responsabilidades:
- Recibe el objeto `compra` del detalle del backend.
- Muestra: `costo_total`, `costo_neto`, `kg_carne_vendible`, `costo_por_kg_vendible`.
- Formatea los números en pesos argentinos (sin usar `Intl` si agrega complejidad innecesaria — string con puntos de miles es suficiente por ahora).

### `components/CortesTable.jsx`

Responsabilidades:
- Recibe el array `compra.cortes`.
- Por cada corte muestra: `nombre`, `kg_corte`, `precio_minimo_kg`, `precio_sugerido_kg`.
- Layout en lista (no tabla HTML), una card por corte, para legibilidad en mobile.

---

## API — llamadas y manejo de errores

### Al montar `NuevaCompra`

```
GET /api/v1/cortes/
```
- Respuesta vacía `[]` → mostrar estado vacío, bloquear formulario.
- Error de red → mostrar mensaje de error genérico, permitir reintentar.

### Al hacer submit del formulario

**Paso 1:**
```
POST /api/v1/compras/
Body: {
  fecha: <hoy en formato YYYY-MM-DD>,
  precio_kg, peso_media_res,
  porcentaje_carne, porcentaje_hueso, porcentaje_grasa,
  precio_grasa
}
```

| Respuesta | Acción |
|-----------|--------|
| `201` con `{id}` | Continuar con paso 2 |
| `400` con `non_field_errors` | Mostrar el mensaje del backend (porcentajes) |
| `400` con otros campos | Mostrar mensaje genérico "Error en los datos ingresados" |
| `401` | Redirigir a login (token expirado o perdido) |
| Error de red | Mostrar "Error de conexión. Verificá tu red e intentá de nuevo." |

**Paso 2:**
```
GET /api/v1/compras/{id}/
```

| Respuesta | Acción |
|-----------|--------|
| `200` | Mostrar resultado (estado `result`) |
| Cualquier error | Mostrar "La compra se creó pero no se pudieron cargar los precios. Reintentá." |

### Agregar al `api` client

```js
api.compras.crear(datos)     // POST /api/v1/compras/
api.compras.detalle(id)      // GET /api/v1/compras/{id}/
api.cortes.listar()          // GET /api/v1/cortes/
```

---

## Routing

Agregar la ruta `/nueva-compra` en `App.jsx`, protegida con `PrivateRoute`.

El `Dashboard` existente incluirá un botón/link a `/nueva-compra` (cambio mínimo al Dashboard, solo agregar la navegación).

---

## Formato de fecha

La fecha de la compra es siempre "hoy" al momento de hacer submit. Se genera en el cliente:

```js
new Date().toISOString().slice(0, 10)  // → "2026-03-14"
```

No hay selector de fecha en esta pantalla. Si el carnicero necesita registrar una compra pasada, será un spec futuro.

---

## Criterios de aceptación

### CA-01 — Carga inicial con cortes

Con al menos un corte activo en la plantilla, la pantalla muestra el formulario con los valores por defecto (`% Carne: 80`, `% Hueso: 12`, `% Grasa: 8`, `Precio grasa: 0`).

### CA-02 — Carga inicial sin cortes

Con cero cortes activos, la pantalla muestra el estado vacío y no muestra el formulario.

### CA-03 — Validación local: porcentajes

Si `% Carne + % Hueso + % Grasa ≠ 100` al hacer submit, se muestra el error inline sin llamar a la API.

### CA-04 — Validación local: campos requeridos

Si `precio_kg` o `peso_media_res` están vacíos o son 0, el formulario no se envía y se indica el error.

### CA-05 — Flujo completo exitoso

Submit con datos válidos → loading → tabla de cortes visible con `precio_minimo_kg` y `precio_sugerido_kg` para cada corte.

### CA-06 — Resumen de compra visible

En el estado resultado se muestran `costo_total`, `costo_neto`, `kg_carne_vendible` y `costo_por_kg_vendible`.

### CA-07 — Botón "Nueva compra"

Al tocar "Nueva compra" en el estado resultado, vuelve al formulario con los valores por defecto.

### CA-08 — Error de red

Si la llamada POST falla por error de red, se muestra el mensaje de error y el formulario queda editable para reintentar.

### CA-09 — 401 redirige a login

Si cualquier llamada devuelve `401`, el usuario es redirigido a `/` (login).

### CA-10 — Total de porcentajes en tiempo real

`PorcentajesInput` muestra el total sumado mientras el usuario tipea, antes de hacer submit.

### CA-11 — Mobile: sin scroll horizontal

En 375px de ancho, ningún elemento desborda horizontalmente.

### CA-12 — Mobile: inputs usables sin zoom

Los inputs tienen `font-size` suficiente para que iOS/Android no haga zoom automático al hacer foco (`text-base` como mínimo, equivalente a 16px).
