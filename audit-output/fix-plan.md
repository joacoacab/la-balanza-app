# Fix Plan — Front Audit La Balanza
Generado a partir de audit-output/REPORT.md (auditoría completa, 12/12 rutas — 2026-07-01)

## Resumen
- 12 rutas auditadas, 0 rutas con errores de red en API propia, 0 crashes.
- 1 hallazgo bloqueante (🔴), agrupable en 6 grupos de fix reales (no 18 líneas sueltas).
- Deuda de accesibilidad concentrada en 3 patrones que se repiten en varias rutas.

---

## 🔴 Prioridad 1 — Bloqueante

### Labels sin htmlFor/id en formularios de edición de cortes
- **Archivos:** `frontend/src/components/PorcentajesInput.jsx:20-30`, `frontend/src/components/CortesTable.jsx:178-206`
- **Rutas afectadas:** /nueva-compra, /precios (reutiliza los mismos componentes)
- **Fix:** agregar `id` único por campo (ej. `porcentaje-${field}`) + `htmlFor` correspondiente en cada label. 5 campos en total.
- **Por qué es 🔴:** el resto del proyecto (Login, Registro, CorteFormModal) sí lo hace bien — es la única inconsistencia real, no una decisión de diseño.

---

## 🟡 Prioridad 2 — Patrón repetido: labels/controles sin asociación semántica

Mismo tipo de problema en 3 lugares más. Conviene arreglarlos juntos con el mismo criterio que el fix de Prioridad 1:

- `AdminPanel.jsx:152-158` — inputs de precio en Configuración sin label/aria-label
- `AdminClienteDetalle.jsx:135, 149` — labels "Ciclo" y "Fecha de vencimiento" sin htmlFor/id

**Fix sugerido:** mismo patrón que Prioridad 1 (id + htmlFor, o aria-label donde no hay label visible).

---

## 🟡 Prioridad 3 — Patrón repetido: falta h1 / jerarquía de headings

- `Dashboard.jsx:39` — solo tiene un `<p>`, sin heading
- `SuscripcionConfirmacion.jsx` — arranca en h2, sin h1
- `AdminClienteDetalle.jsx:96` — arranca en h2, sin h1

**Fix sugerido:** agregar un `h1` visualmente oculto (`sr-only`) en las 3 páginas. Si hay un patrón común de layout, evaluar si conviene resolverlo a nivel de un componente compartido en vez de 3 fixes puntuales.

---

## 🟡 Prioridad 4 — Patrón repetido: componentes sin rol ARIA

- `CorteFormModal.jsx` — overlay sin `role="dialog"` / `aria-modal`
- `AdminPanel.jsx:229-240` — tabs sin `role="tab"` / `role="tablist"` / `aria-selected`

**Fix sugerido:** agregar los roles ARIA correspondientes. Bajo esfuerzo, no requiere cambios de lógica.

---

## 🟡 Prioridad 6 — Sueltos, bajo esfuerzo

- **`Login.jsx:115`** — mensaje de error de login sin `role="alert"`/`aria-live`
- **`Login.jsx:44`, `Registro.jsx:51`** — ancho del botón de Google no se recalcula al resize (bug latente, no reproducible en carga inicial)
- **`AdminPanel.jsx:70`** — celda de email sin fallback cuando está vacío (a diferencia de "Última actividad" que sí usa `?? '—'`)
- **`AdminClienteDetalle.jsx:80`** — estado de error sin botón "← Volver" (inconsistente con `/historial/:id`, que sí lo conserva)
- **favicon.ico** — 404, agregar el archivo a `frontend/public/`

---

## Fuera de scope de este sprint (notas, no defectos)
- `/dashboard`: layout `max-w-sm` muy angosto en desktop — es decisión de diseño mobile-first, evaluar aparte si se quiere revisar.
- `/planes`: precios de PRO en $1 ARS — config de test de Mercado Pago, no bug.
- Warnings de React Router v7 (`v7_startTransition`, `v7_relativeSplatPath`) — informativos, sin acción requerida.

## No auditado / pendiente
- Ninguno — las 12 rutas del router quedaron cubiertas, incluyendo ambas rutas dinámicas.

## Pendiente / fuera de este sprint
- **Botón de Google se remonta excesivamente:** en Network se observan ~400 requests al endpoint `button?theme=...` durante la carga, la mayoría `canceled` — sugiere que el botón se remonta en cada render en vez de una sola vez. No afecta funcionalidad, pero vale la pena revisar el `useEffect` que lo inicializa en `Login.jsx`/`Registro.jsx` en una futura sesión.

## ✅ Resuelto

### Google OAuth mal configurado para dev local — resuelto 2026-07-01
- **Afectaba:** /, /registro, /dashboard, /admin-saas (cualquier ruta que renderice el botón de Google)
- **Fix aplicado:** se agregó `http://localhost:5173` (y también `http://localhost` sin puerto) a los orígenes autorizados del OAuth client ID en Google Cloud Console, y se re-guardó la configuración.
- **Nota:** no era un bug de código — era config del OAuth Client ID. Verificado en incógnito tras la propagación: el error `[GSI_LOGGER]` 403 ya no aparece en consola.
