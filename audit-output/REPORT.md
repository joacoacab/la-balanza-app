# Front Audit — La Balanza

## /login (`/`) — 2026-07-01T16:50Z
🟡 Error de consola: Google GSI devuelve 403 ("The given origin is not allowed for the given client ID") — `VITE_GOOGLE_CLIENT_ID` no tiene `http://localhost:5173` en los orígenes autorizados del OAuth client en Google Cloud Console. Afecta al botón "Continuar con Google" en `/` y `/registro`. No es un bug de código, es config del client ID de OAuth. Afecta también a: `/admin-saas` (el login de staff pasa por el mismo `Login.jsx`).
✅ (corregido, ver re-audit 2026-07-01T17:50Z) A11y: el mensaje de error de login (`frontend/src/pages/Login.jsx:115`) era un `<p>` sin `role="alert"`/`aria-live` — no se anunciaba automáticamente a lectores de pantalla. Fix aplicado: `role="alert"`.
✅ (corregido, ver re-audit 2026-07-01T17:50Z) Responsive (latente, no reproducible en carga fresca): el ancho del botón de Google (`frontend/src/pages/Login.jsx:44`, `googleBtnRef.current?.offsetWidth`) se calculaba una sola vez en el `useEffect` de montaje y no se recalculaba al resize/rotación. Fix aplicado: `ResizeObserver` que vuelve a llamar `renderButton` en cada resize del contenedor.
🟢 Login/logout funcional: credenciales correctas → redirect a `/dashboard`; credenciales incorrectas → `POST /api/v1/auth/login/` 400 + mensaje "Usuario o contraseña incorrectos." visible, sin romper el form.
🟢 Labels: inputs "Usuario" y "Contraseña" correctamente asociados vía `htmlFor`/`id`.
🟢 Sin overflow horizontal en 375x667 / 768x1024 / 1440x900 (con carga fresca en cada viewport).

## /registro — 2026-07-01T16:51Z
🟡 Mismo error de consola GSI 403 que en `/login` (raíz común, ver arriba).
🟢 Validación client-side (`frontend/src/pages/Registro.jsx:66-76`) funciona: contraseñas no coincidentes bloquean el submit sin llamar al backend, mensaje "Las contraseñas no coinciden." visible.
🟢 Labels: los 5 campos del form (`nombre_carniceria`, `reg-email`, `reg-username`, `reg-password`, `reg-password-confirm`) están correctamente asociados vía `htmlFor`/`id`.
🟡 Menor inconsistencia: los inputs de Registro no tienen atributo HTML `required` (a diferencia de Login que sí lo usa en sus 2 campos) — la validación depende 100% de JS (`validate()`), funciona pero no hay refuerzo nativo del navegador.
🟢 Sin overflow horizontal en 375x667 / 768x1024 / 1440x900.

## /dashboard — 2026-07-01T16:4x Z (audit previo)
Ver resumen en el chat de la sesión anterior — 3 hallazgos 🟡: GSI 403 (mismo root cause), falta heading semántico en `<main>`, layout desktop muy angosto (`max-w-sm`).

## Setup — 2026-07-01T16:55Z
Se crearon usuarios de test dedicados para esta tanda de rutas protegidas (ver `.claude/skills/front-audit/test-credentials.md`, gitignorado):
- `audit_test_staff` — creado vía shell, is_staff=True, sin carnicería propia.
- `audit_test_user` — registrado vía flujo real de UI (`/registro`) en vez de shell, porque `Carniceria` no se autocrea con `create_user`: requiere pasar por `AuthRegistroView` (`backend/api/views/auth.py:22`), que crea la `Carniceria` + carga cortes base de vaca (`cargar_cortes_base`). Esto también permitió auditar `/bienvenida` de forma realista (solo se llega ahí con `location.state.fromAuth`, que únicamente setean los flows de registro/Google login).
No se tocó ningún usuario real preexistente.

## /bienvenida — 2026-07-01T16:56Z
🟢 Redirect correcto post-registro (`POST /api/v1/auth/registro/` → 201 → `/bienvenida` con `state.fromAuth`).
🟢 Jerarquía de headings correcta: h1 "La Balanza", h2 "¡Bienvenido!".
🟢 Botones Vaca/Cerdo/Pollo con texto accesible (iconos decorativos + label visible).
🟢 Sin overflow horizontal en 375/768/1440.
🟡 Nota (no defecto): esta ruta solo es alcanzable vía redirect con state `fromAuth` — navegar directo a la URL redirige a `/dashboard`. Es la validación de flujo esperada, no un bug.

## /nueva-compra — 2026-07-01T17:00Z
🔴 A11y: en `frontend/src/components/PorcentajesInput.jsx:20-30`, los labels "% Carne", "% Hueso", "% Grasa" no tienen `htmlFor`/`id` — a diferencia del resto de los inputs del mismo form (`CompraForm.jsx`), que sí están correctamente asociados. Lectores de pantalla no anuncian el nombre del campo al enfocarlo. Fix: agregar `id` único por campo (ej. `porcentaje-${field}`) y `htmlFor` correspondiente en el label.
🔴 A11y: mismo patrón en `frontend/src/components/CortesTable.jsx:178-206` — labels "Kg del corte" y "Precio de venta ($/kg)" del formulario de edición inline sin `htmlFor`/`id`.
🟢 Cálculo de compra funciona correctamente: todas las requests (`POST /api/v1/compras/`, `GET /api/v1/compras/:id/`) devuelven 2xx, resultado se renderiza con Resumen + tabla de 24 cortes.
🟢 Edición inline de corte (abrir/cancelar) funciona sin errores de consola.
🟢 Jerarquía de headings correcta (h1 → h2 "Resumen" / h2 "Cortes").
🟢 Sin overflow horizontal en 375/768/1440, tanto en el form vacío como en el resultado con 24 cortes.

## /cortes — 2026-07-01T17:01Z
🟢 Sin errores de consola (esta ruta no renderiza el botón de Google, confirma que el 403 de GSI está confinado a `/` y `/registro`).
🟢 Todas las requests 2xx (`GET /api/v1/cortes/`).
🟢 Modal de editar/agregar corte (`CorteFormModal.jsx`) tiene labels correctamente asociados vía `htmlFor`/`id` — no repite el problema de `PorcentajesInput`/`CortesTable`.
🟡 A11y menor: `CorteFormModal.jsx` (overlay `fixed inset-0`) no tiene `role="dialog"`/`aria-modal="true"` ni manejo de foco — un lector de pantalla no anuncia que se abrió un diálogo modal.
🟢 Layout en grid responsive (`grid-cols-[repeat(auto-fit,minmax(170px,1fr))]`) usa bien el espacio en desktop, sin quedar angosto como `/dashboard` o `/login`.
🟢 Sin overflow horizontal en 375/768/1440.

## /historial — 2026-07-01T17:02Z
🟢 Sin errores de consola, todas las requests 2xx (`GET /api/v1/compras/`).
🟢 Jerarquía de headings correcta (h1 → h2 "Historial").
🟢 Sin overflow horizontal en 375/768/1440.
⏳ Pendiente: `/historial/:id` (ruta dinámica) no fue auditada — no se proveyó un ID en este batch. Hay una compra real disponible ahora en `/historial/25` (creada durante el audit de `/nueva-compra`) para una próxima corrida con `/front-audit historial/25`.

## /precios — 2026-07-01T17:03Z
🟢 Sin errores de consola, todas las requests 2xx (`GET /api/v1/compras/`, `GET /api/v1/compras/:id/`).
🟢 Reutiliza `CompraResumen`/`CortesTable` de `/nueva-compra` (mismos hallazgos de a11y ya registrados ahí, no se duplican).
🟢 Sin overflow horizontal en 375/768/1440.

## /planes — 2026-07-01T17:04Z
🟢 Sin errores de consola, todas las requests 2xx (`GET /api/v1/billing/estado/`, `GET /api/v1/billing/precios/`).
🟢 Jerarquía de headings correcta (h1 → h2 "Mi plan" → h3 "FREE"/"PRO").
🟢 Radio buttons de período de facturación (Mensual/Trimestral/Anual) con texto accesible correcto.
🟢 Sin overflow horizontal en 375/768/1440.
🟡 Nota (no defecto): precios de PRO muestran "$1 ARS" en los 3 períodos — parece config de test de Mercado Pago (`MP_ACCESS_TOKEN` en `.env` es de test), no un bug de UI.

## /planes/confirmacion — 2026-07-01T17:05Z
🟡 A11y: `frontend/src/pages/SuscripcionConfirmacion.jsx` no tiene ningún `h1` en la página (es standalone, fuera de `AppLayout`) — el heading más alto es `h2` ("¡Suscripción activa!" / "Suscripción activada correctamente (modo prueba)"). Fix sugerido: agregar un `h1` visualmente oculto o promover el h2 a h1.
🟢 Modo mock (`?mock=true`, usado para auditar sin pasar por Mercado Pago real) renderiza correctamente sin llamadas a la API.
🟢 Sin overflow horizontal en 375/768/1440.
⏳ No se probó el flujo real de polling (`GET /api/v1/billing/estado/` cada 2s hasta 10 intentos) para no esperar los ~20s sin necesidad — el modo mock cubre el mismo layout visual.

## /historial/25 — 2026-07-01T17:08Z
🟢 Ruta dinámica con ID real (compra creada durante el audit de `/nueva-compra`). Sin errores de consola, requests 2xx (`GET /api/v1/compras/25/`).
🟢 Reutiliza `CompraResumen`/`CortesTable`, mismos hallazgos de a11y ya registrados en `/nueva-compra` (no se duplican).
🟢 Caso de error probado con ID inexistente (`/historial/999999`): `GET /api/v1/compras/999999/` → 404, manejado con mensaje "Compra no encontrada." sin crash ni pantalla en blanco. Los 404 aparecen como error de consola (comportamiento normal del navegador ante un fetch fallido), no indican un bug de la app.
🟢 Sin overflow horizontal en 375/768/1440.

## /admin-saas — 2026-07-01T17:09Z
🟡 Mismo error de consola GSI 403 que en `/login` (login de staff pasa por el mismo formulario, ver entrada de `/login`).
🟡 A11y: en `frontend/src/pages/AdminPanel.jsx:70`, la celda de email en la tabla de clientes (`{c.usuario_email}`) no tiene fallback cuando está vacío — a diferencia de "Última actividad" (línea 75) que sí usa `?? '—'`. Con varios clientes reales sin email cargado, la celda queda visualmente vacía sin indicar que el dato falta.
🟡 A11y: los inputs de precio en la pestaña Configuración (`AdminPanel.jsx:152-158`) no tienen `label`/`aria-label` — un lector de pantalla anuncia "spinbutton 1.00" sin indicar a qué ciclo (Mensual/Trimestral/Anual) corresponde. El contexto solo está en la celda vecina de la misma fila.
🟡 A11y menor: las tabs "Métricas"/"Clientes"/"Configuración" (`AdminPanel.jsx:229-240`) son `<button>` sin `role="tab"`/`role="tablist"`/`aria-selected` — funcionan visualmente pero no se anuncian como un grupo de tabs a lectores de pantalla.
🟢 Funcional: las 3 tabs cargan y renderizan correctamente (`GET /api/v1/admin/stats/`, `/api/v1/admin/carniceria/`, `/api/v1/admin/precios/` → 200 OK).
🟢 Tabla de clientes usa HTML semántico correcto (`<table>`, `columnheader`) y `overflow-x-auto` — en mobile no genera overflow de página, la tabla scrollea internamente.
🟢 Sin overflow horizontal en 375/768/1440 (tabs Métricas y Clientes verificadas).
⚠️ No se guardaron cambios en la pestaña Configuración (precios reales de planes, `$1 ARS` en las 3 modalidades — parece config de test de Mercado Pago) para no afectar datos de producción/otros usuarios.
⏳ No se auditó `/admin-saas/clientes/:id` (ruta dinámica separada, no incluida en este batch).

## /admin-saas/clientes/8 — 2026-07-01T17:13Z
🟡 A11y: `frontend/src/pages/AdminClienteDetalle.jsx` no tiene ningún `h1` en la página — arranca directo en `h2` (nombre del cliente, línea 96). Mismo patrón que `/planes/confirmacion`. Fix sugerido: agregar `h1` visualmente oculto o promover a `h1`.
🟡 A11y: labels "Ciclo" y "Fecha de vencimiento" en el formulario "Asignar Pro" (`AdminClienteDetalle.jsx:135` y `:149`) sin `htmlFor`/`id` — mismo patrón recurrente ya visto en `PorcentajesInput.jsx` y `CortesTable.jsx` (ver `/nueva-compra`). Los radios de "Extender vencimiento" (línea 178-188) sí son accesibles porque el `<input>` está anidado dentro del `<label>`.
🟡 UX/inconsistencia: en el estado de error (`AdminClienteDetalle.jsx:80`, probado con `/admin-saas/clientes/999999` → `GET /api/v1/admin/carniceria/999999/` 404), la página solo muestra el texto "Cliente no encontrado." sin ningún botón para volver — a diferencia de `/historial/:id` con ID inválido, que sí conserva el botón "← Volver" en su estado de error. Fix sugerido: envolver el mensaje de error con el mismo botón "← Volver a clientes" que ya existe en el estado normal (línea 87-92).
🟢 Funcional: carga de detalle de cliente (`GET /api/v1/admin/carniceria/8/` → 200), datos de suscripción (Plan/Ciclo/Estado/Vencimiento) se muestran correctamente.
🟢 Sin overflow horizontal en 375/768/1440.
⚠️ No se ejecutó ninguna acción de "Asignar Pro", "Extender vencimiento" ni "Cancelar suscripción" — modificarían la suscripción real del cliente 8 (usuario `prueba1`, carnicería "pruea"), que no es una cuenta de test.

## /login (`/`) — re-audit 2026-07-01T17:50Z (post-fix)
Auditoría completa de re-verificación tras aplicar los fixes de accesibilidad. Reemplaza el estado de los 2 hallazgos marcados como corregidos arriba.
🟢 Consola: solo el error de GSI 403 preexistente (config OAuth, no código — ver hallazgo original). 0 errores nuevos.
🟢 Requests: `POST /api/v1/auth/login/` → 400 con credenciales inválidas (esperado) y → 200 con credenciales válidas + redirect a `/dashboard`. 0 requests fallidos a la API propia.
🟢 A11y confirmado en accessibility tree: el mensaje de error ahora aparece como `alert "Usuario o contraseña incorrectos."` (antes `paragraph` genérico).
🟢 Responsive confirmado: sin overflow horizontal en 375x667/768x1024/1440x900 con carga fresca **y** al hacer resize 1440→375 sin reload (el escenario que reproducía el bug original ya no causa overflow ni requests de Google con ancho desactualizado).
🟢 Labels "Usuario"/"Contraseña" siguen correctamente asociados (sin cambios, no eran parte de los fixes).
Screenshots actualizados en `audit-output/login/{mobile-375x667,tablet-768x1024,desktop-1440x900}.png`.

## Google OAuth (GSI 403) — RESUELTO — 2026-07-01
Causa: el origin http://localhost:5173 no estaba correctamente propagado/guardado
en el OAuth Client ID de Google Cloud Console pese a aparecer en la UI. Se agregó
también http://localhost (sin puerto) como origin adicional y se re-guardó la
configuración. Verificado en incógnito tras unos minutos de propagación: el error
[GSI_LOGGER] 403 ya no aparece en consola. Afectaba a /, /registro, /dashboard,
/admin-saas (cualquier ruta con el botón de Google).

Nota secundaria (no bloqueante, no arreglada aún): en Network se observan ~400
requests al endpoint button?theme=... durante la carga, la mayoría canceled —
sugiere que el botón de Google se remonta en cada render en vez de una sola vez.
No afecta funcionalidad pero vale la pena revisar el useEffect que lo inicializa
en una futura sesión.
