# Spec 05 — Setup inicial del frontend

**Estado:** aprobado
**Fecha:** 2026-03-14

---

## Objetivo

Incorporar un frontend React al monorepo, integrado con el backend Django vía la API REST existente. El frontend corre como un servicio Docker independiente y en desarrollo usa el proxy de Vite para comunicarse con el backend sin CORS.

---

## Estructura de carpetas

```
la-balanza-app/
├── docker-compose.yml          ← se agrega servicio `frontend`
├── backend/                    ← sin cambios
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.jsx            ← punto de entrada
        ├── App.jsx
        ├── api/
        │   └── client.js       ← fetch wrapper con token en memoria
        ├── auth/
        │   ├── AuthContext.jsx  ← proveedor de sesión
        │   └── useAuth.js
        ├── components/
        │   └── ui/             ← componentes reutilizables (botones, inputs, etc.)
        ├── pages/
        │   ├── Login.jsx
        │   └── Dashboard.jsx   ← placeholder inicial
        └── styles/
            └── index.css       ← directivas Tailwind
```

---

## Servicio Docker

### `frontend/Dockerfile`

- Imagen base: `node:20-alpine`
- Working directory: `/app`
- Instala dependencias con `npm ci`
- En desarrollo: corre `npm run dev` con Vite en modo watch
- Expone puerto `5173` (puerto por defecto de Vite)
- Volume de bind mount del código fuente para hot reload

### Cambios en `docker-compose.yml`

Se agrega el servicio `frontend` al lado de `db` y `web`:

| Servicio    | Imagen / Build          | Puerto host → contenedor |
|-------------|-------------------------|--------------------------|
| `db`        | `postgres:16-alpine`    | `5432 → 5432`            |
| `web`       | Build local (Dockerfile)| `8000 → 8000`            |
| `frontend`  | Build `./frontend`      | `5173 → 5173`            |

Configuración del servicio `frontend`:
- `build: ./frontend`
- `ports: ["5173:5173"]`
- `volumes: ["./frontend:/app", "/app/node_modules"]` — el segundo volume evita que el bind mount pise `node_modules` del contenedor
- `depends_on: [web]` — el backend debe estar arriba primero
- `env_file: ./frontend/.env`

---

## Proxy de Vite

En `vite.config.js`, configurar el proxy para que las peticiones a `/api/` se reenvíen al servicio `web` dentro de la red Docker:

```
/api/v1/ → http://web:8000/api/v1/
```

Esto permite que el frontend llame a `/api/v1/auth/login/` sin CORS, y sin hardcodear la URL del backend en el código. En producción, este proxy lo reemplazará un reverse proxy (Nginx o similar, a definir en spec de deployment).

El proxy debe:
- Redirigir todas las rutas que comiencen con `/api/`
- Cambiar el origen del request (`changeOrigin: true`)
- Funcionar tanto desde el browser del host (a través del port mapping) como desde dentro de la red Docker

---

## Autenticación: token en memoria

El token de DRF **no se guarda en localStorage ni en cookies**. Se guarda en una variable de módulo dentro de `src/api/client.js` (memoria de la app). Esto implica:

- Si el usuario recarga la página, pierde la sesión y debe volver a loguearse
- No hay riesgo de XSS robando el token de localStorage
- `AuthContext` expone el estado de sesión y las funciones `login` / `logout` al árbol de componentes
- El `client.js` es el único lugar que conoce el token; lo adjunta en el header `Authorization: Token <token>` en cada request

Esta decisión es intencional y debe respetarse. No agregar persistencia de token sin un spec aprobado.

---

## Dependencias principales (`package.json`)

### `dependencies`
- `react` — `^18.x`
- `react-dom` — `^18.x`
- `react-router-dom` — `^6.x` (routing SPA)

### `devDependencies`
- `vite` — `^5.x`
- `@vitejs/plugin-react` — plugin oficial para JSX/Fast Refresh
- `tailwindcss` — `^3.x`
- `postcss` — requerido por Tailwind
- `autoprefixer` — requerido por Tailwind

### Scripts (`package.json`)
```
"dev":   "vite --host 0.0.0.0"   ← --host expone el servidor dentro de Docker
"build": "vite build"
"preview": "vite preview"
```

El flag `--host 0.0.0.0` es necesario para que Vite sea accesible desde fuera del contenedor (el browser del host).

---

## Variables de entorno

El frontend usa variables de entorno de Vite (prefijo `VITE_`). Solo se usan para configuración no sensible, ya que las variables de Vite quedan embebidas en el bundle del cliente.

### `frontend/.env.example`
```dotenv
# URL base de la API (solo para sobreescribir en producción)
# En desarrollo no es necesaria, el proxy de Vite la maneja
VITE_API_BASE_URL=
```

En desarrollo, `VITE_API_BASE_URL` queda vacío y el cliente usa paths relativos (`/api/v1/...`), que el proxy de Vite resuelve al backend.

---

## Consideraciones de diseño: mobile first

- El layout base debe ser de una columna, optimizado para pantallas de 375px de ancho en adelante
- Usar clases responsive de Tailwind de menor a mayor (`sm:`, `md:`, `lg:`)
- Los elementos interactivos (botones, inputs) deben tener área de toque mínima de 44×44px
- Tipografía legible sin zoom en móvil (`text-base` como mínimo en contenido)
- El viewport meta tag debe estar configurado en `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

Estas reglas aplican a todo el desarrollo posterior del frontend.

---

## Deuda técnica documentada

- **Reload = logout en móvil:** guardar el token solo en memoria implica que recargar la página cierra la sesión. En un spec futuro evaluar persistencia del token via httpOnly cookie o refresh token para mejorar la experiencia en celular.

---

## Criterios de aceptación

- [ ] `docker compose up` levanta los tres servicios (`db`, `web`, `frontend`) sin errores
- [ ] El frontend es accesible desde el browser del host en `http://localhost:5173`
- [ ] Hot reload funciona: editar un archivo `.jsx` actualiza el browser sin recargar manualmente
- [ ] Una petición a `/api/v1/` desde el frontend es redirigida al backend Django (verificable en la tab Network del browser — el request va a `localhost:5173/api/v1/` y el servidor responde con datos de Django)
- [ ] No hay errores de CORS en la consola del browser durante el desarrollo
- [ ] El token de autenticación no aparece en `localStorage` ni en cookies al inspeccionar el browser
- [ ] La página renderiza contenido en mobile (375px de ancho) sin scroll horizontal
- [ ] `node_modules` no está en el directorio `frontend/` del host (queda dentro del contenedor)
