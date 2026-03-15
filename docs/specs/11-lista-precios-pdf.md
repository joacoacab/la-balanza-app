# Spec 11 — Lista de precios imprimible en PDF

## Objetivo
Permitir al carnicero generar y descargar un PDF con los precios sugeridos de venta por corte, listo para imprimir y pegar en la carnicería.

## Contexto
- La pantalla de generación es mobile-first, pero el PDF se imprime en papel A4.
- La generación ocurre 100% en el frontend (no requiere cambios en el backend).
- La fuente de datos es el objeto `compra` que ya existe en las pantallas involucradas: resultado de Nueva Compra e HistorialDetalle.

---

## Layout del PDF (A4)

### Encabezado
| Campo | Fuente |
|---|---|
| Nombre de la carnicería | `carniceria.nombre` (del contexto de usuario) |
| Fecha de la compra | `compra.fecha` formateada como `DD/MM/YYYY` |
| Subtítulo fijo | "Lista de precios" |

### Cuerpo — tabla de cortes
Columnas, en orden:

| Columna | Fuente | Formato |
|---|---|---|
| Nombre del corte | `compra_corte.nombre` | Texto |
| Precio sugerido/kg | `compra_corte.precio_sugerido_kg` | `$X.XXX/kg` |

- Ordenado alfabéticamente por nombre de corte.
- Solo se listan cortes con `precio_sugerido_kg > 0`.
- Sin columnas de costo ni márgenes (información sensible).

### Pie de página
- Texto fijo: `"Generado con La Balanza"` — alineado al centro, tipografía pequeña.
- Número de página si el contenido ocupa más de una hoja.

---

## Implementación

### Librería
`jsPDF` vía npm (`npm install jspdf`). No se usa ningún plugin adicional.

### Función a crear
`frontend/src/utils/generarListaPreciosPdf.js`

Firma esperada:
```
generarListaPreciosPdf({ nombreCarniceria, compra, cortes })
```
- Genera el PDF y dispara la descarga automáticamente.
- Nombre del archivo descargado: `lista-precios-YYYY-MM-DD.pdf`
- No retorna nada; es un efecto secundario puro.

### Dónde se agrega el botón

**1. Resultado de Nueva Compra**
- Pantalla: `src/pages/NuevaCompra.jsx` (o el componente que muestra el resultado tras calcular)
- Ubicación: debajo de la tabla de cortes, antes del botón "Volver"
- Texto del botón: `"Imprimir lista de precios"`

**2. Detalle de compra en Historial**
- Pantalla: `src/pages/HistorialDetalle.jsx`
- Ubicación: debajo del resumen de la compra, antes del botón "Volver"
- Texto del botón: `"Imprimir lista de precios"`

### Estilo del botón
- Mismo estilo que los botones secundarios existentes en la app (borde, sin fondo de color).
- Ancho completo (`w-full`) en mobile.
- Ícono opcional: impresora o descarga (lucide-react).

---

## Criterios de aceptación

1. El botón aparece en ambas pantallas indicadas.
2. Al pulsar el botón, se descarga un archivo `.pdf` sin navegar fuera de la pantalla.
3. El PDF contiene el nombre de la carnicería, la fecha de la compra y la lista de cortes con su precio sugerido.
4. Los cortes con `precio_sugerido_kg = 0` o nulo no aparecen en el PDF.
5. Los cortes están ordenados alfabéticamente.
6. El PDF es legible impreso en A4 (fuente mínima 11pt, márgenes ≥ 15mm).
7. El pie de página muestra `"Generado con La Balanza"`.
8. Funciona en Chrome/Safari mobile (descarga directa sin popup bloqueado).
9. No se realiza ninguna llamada adicional al backend al generar el PDF.
