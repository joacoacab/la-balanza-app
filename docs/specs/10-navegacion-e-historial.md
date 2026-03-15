# Spec 10 — Navegación global e Historial de compras

**Estado:** pendiente de aprobación
**Fecha:** 2026-03-15

---

## Objetivo

Reemplazar el Dashboard como pantalla de inicio por una navegación global consistente (bottom nav) presente en todas las pantallas protegidas. Agregar la sección Historial para revisar compras anteriores.

---

## Parte 1 — Navegación global

### Wireframe: layout con bottom nav

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│  ← header fijo, igual en todas las pantallas
├─────────────────────────────┤
│                             │
│                             │
│   [contenido de la página]  │
│                             │
│                             │
├─────────────────────────────┤
│  [Compra] [Cortes] [Histor] │  ← bottom nav fija
└─────────────────────────────┘
```

### Wireframe: bottom nav — tab activo resaltado

```
┌───────────────────────────────────────┐
│  Nueva compra   Cortes    Historial   │
│  ──────────                           │  ← línea bajo el tab activo
└───────────────────────────────────────┘
```

El tab activo se distingue del resto con color de texto más oscuro y una línea inferior. Los inactivos en gris.

---

### Decisión de arquitectura: layout compartido

Se introduce `layouts/AppLayout.jsx` que contiene el header y la bottom nav. Todas las rutas protegidas se anidan bajo este layout usando `<Outlet />` de React Router.

Esto reemplaza el patrón actual donde cada página (NuevaCompra, Cortes) tiene su propio componente `Header` interno. Esos headers internos se eliminan.

**Estructura de rutas en `App.jsx` (nuevo esquema):**

```
/ (público)           → Login
/registro (público)   → Registro
/nueva-compra  ┐
/cortes        ├ protegidas, bajo AppLayout
/historial     │
/historial/:id ┘
```

`/dashboard` pasa a ser un redirect a `/nueva-compra`. Login y Registro navegan a `/nueva-compra` al completarse (en lugar de `/dashboard`).

---

## Parte 2 — Historial de compras

### Wireframe: lista de compras

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Historial                  │
│                             │
│  ┌─────────────────────────┐│
│  │ 14 mar 2026          →  ││
│  │ 100,0 kg · $1.000/kg   ││
│  │ Total:  $100.000        ││
│  │ Neto:   $ 98.000        ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ 10 mar 2026          →  ││
│  │  80,0 kg · $950/kg     ││
│  │ Total:  $ 76.000        ││
│  │ Neto:   $ 74.200        ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│  [Compra] [Cortes] [Histor] │
└─────────────────────────────┘
```

### Wireframe: lista vacía

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  Historial                  │
│                             │
│  Todavía no registraste     │
│  ninguna compra.            │
│                             │
├─────────────────────────────┤
│  [Compra] [Cortes] [Histor] │
└─────────────────────────────┘
```

### Wireframe: detalle de compra

```
┌─────────────────────────────┐
│  La Balanza          [Salir]│
├─────────────────────────────┤
│                             │
│  ← Historial                │
│                             │
│  14 mar 2026                │
│                             │
│  ┌─────────────────────────┐│
│  │ Resumen                 ││
│  │ Costo total  $100.000   ││
│  │ Costo neto   $ 98.000   ││
│  │ Kg vendibles   60,0 kg  ││
│  │ Costo/kg     $1.633/kg  ││
│  └─────────────────────────┘│
│                             │
│  Cortes                     │
│  ┌─────────────────────────┐│
│  │ Lomo · 2,5 kg           ││
│  │ Mín: $1.633/kg          ││
│  │ Sug: $2.450/kg          ││
│  └─────────────────────────┘│
│  ...                        │
│                             │
├─────────────────────────────┤
│  [Compra] [Cortes] [Histor] │
└─────────────────────────────┘
```

---

## Componentes a crear

### `layouts/AppLayout.jsx`

Responsabilidades:
- Header fijo: título "La Balanza" a la izquierda, botón "Salir" a la derecha.
- `<Outlet />` de React Router: renderiza la página activa.
- `<BottomNav />` fijo al pie.
- Maneja el `logout` de `useAuth()` y lo pasa al header.

### `components/BottomNav.jsx`

Responsabilidades:
- Tres tabs: "Nueva compra" (`/nueva-compra`), "Cortes" (`/cortes`), "Historial" (`/historial`).
- Usa `useLocation()` para determinar el tab activo comparando `location.pathname`.
- Tab activo: texto oscuro (`text-gray-900`) + línea inferior. Inactivos: `text-gray-400`.
- Cada tab es un `<Link>` de React Router, `min-h-[44px]`, ancho igual (1/3 del nav).
- Fijo al pie de pantalla: `fixed bottom-0 left-0 right-0`.
- Fondo blanco con borde superior para separarse del contenido.

### `pages/Historial.jsx`

Responsabilidades:
- Carga la lista de compras al montar (`GET /api/v1/compras/`).
- Estados: cargando, lista vacía, lista con compras, error de red con reintento.
- Cada compra es una card tappable que navega a `/historial/:id`.
- Datos mostrados por card: fecha formateada, peso, precio/kg, costo total, costo neto.
- Formato de fecha: "14 mar 2026" (día + mes abreviado en español + año).
- En caso de `401`, redirigir a `/`.

### `pages/HistorialDetalle.jsx`

Responsabilidades:
- Lee el parámetro `:id` con `useParams()`.
- Carga el detalle (`GET /api/v1/compras/{id}/`) al montar.
- Reutiliza los componentes existentes `CompraResumen` y `CortesTable` — sin duplicar lógica.
- Botón `← Historial` que navega a `/historial` con `useNavigate()`.
- Muestra la fecha de la compra como título.
- En caso de `401`, redirigir a `/`. En caso de `404`, mostrar mensaje de error.

---

## Componentes a modificar

### `App.jsx`

- Agregar `AppLayout` como layout compartido para las rutas protegidas usando rutas anidadas de React Router (`<Route element={<AppLayout />}>`).
- Agregar rutas `/historial` e `/historial/:id` dentro del layout.
- Convertir `/dashboard` en `<Navigate to="/nueva-compra" replace />`.
- Mantener `/` y `/registro` como rutas públicas sin layout.

### `pages/NuevaCompra.jsx`

- Eliminar el componente interno `Header` (el `AppLayout` provee el header).
- Eliminar `const { logout } = useAuth()` (el `AppLayout` maneja el logout).
- El contenido de la página empieza directamente con el título "Nueva compra".

### `pages/Cortes.jsx`

- Igual que NuevaCompra: eliminar el `Header` interno y el `logout` de `useAuth()`.

### `pages/Login.jsx`

- Cambiar la navegación post-login de `/dashboard` a `/nueva-compra`.

### `pages/Registro.jsx`

- Cambiar la navegación post-registro de `/dashboard` a `/nueva-compra`.

### `pages/Dashboard.jsx`

- Puede eliminarse: la ruta `/dashboard` pasa a ser un redirect y el archivo deja de usarse.

### `src/api/client.js`

Agregar en `api.compras`:
```js
listar: () => request('/api/v1/compras/'),
```

---

## Formato de fechas

La API devuelve fechas como `"2026-03-14"`. Para mostrarlas como "14 mar 2026":

```js
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function formatFecha(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${parseInt(dia)} ${MESES[parseInt(mes) - 1]} ${anio}`
}
```

Esta función se define donde se use (Historial y HistorialDetalle). No crear un archivo de utilidades separado — el spec no lo requiere.

---

## Criterios de aceptación

### Navegación global

#### CA-01 — Bottom nav visible en todas las pantallas protegidas

La bottom nav aparece en `/nueva-compra`, `/cortes`, `/historial` e `/historial/:id`.

#### CA-02 — Tab activo resaltado

Al estar en `/cortes`, el tab "Cortes" se muestra oscuro con línea inferior. Los otros dos en gris.

#### CA-03 — Navegación entre tabs sin recargar

Tocar un tab navega instantáneamente sin recargar la página (SPA).

#### CA-04 — Header consistente

El header "La Balanza" + botón "Salir" aparece igual en todas las pantallas protegidas.

#### CA-05 — Salir funciona desde cualquier pantalla

Tocar "Salir" en cualquier pantalla protegida cierra la sesión y redirige a `/`.

#### CA-06 — /dashboard redirige a /nueva-compra

Navegar a `/dashboard` redirige a `/nueva-compra` (backward compat).

#### CA-07 — Post-login va a /nueva-compra

Después de login o registro exitoso, el usuario llega a `/nueva-compra`, no a `/dashboard`.

---

### Historial

#### CA-08 — Lista de compras ordenada por fecha descendente

La compra más reciente aparece primera. El orden lo provee la API.

#### CA-09 — Estado vacío

Si no hay compras, se muestra el mensaje "Todavía no registraste ninguna compra."

#### CA-10 — Tap en compra abre el detalle

Tocar una card de la lista navega a `/historial/:id` con el detalle completo.

#### CA-11 — Detalle reutiliza CompraResumen y CortesTable

El detalle muestra los mismos componentes que NuevaCompra usa para mostrar resultados, sin duplicar código.

#### CA-12 — Botón volver en detalle

"← Historial" navega a `/historial` (no hace `window.history.back()` — usa React Router).

#### CA-13 — 401 redirige a login

Cualquier llamada con 401 en Historial o HistorialDetalle redirige a `/`.

#### CA-14 — Error de red con reintento en lista

Si `GET /compras/` falla por error de red, se muestra el error con botón "Reintentar".

#### CA-15 — 404 en detalle muestra mensaje

Si `GET /compras/{id}/` devuelve 404, se muestra un mensaje de error (no pantalla en blanco).
