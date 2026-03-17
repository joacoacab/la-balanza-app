# Spec 14 — Multi-animal (res, cerdo, pollo)

## Estado: BORRADOR

## Contexto

La app actualmente solo modela compras de media res. La lógica de costeo (precio por kg, rendimiento, margen) es idéntica para cualquier animal: lo único que cambia es el tipo, el nombre de la unidad de compra y los cortes de la plantilla.

Este spec agrega soporte para res, cerdo y pollo sin duplicar lógica. Cada carnicería puede operar con uno o más animales simultáneamente.

---

## 1. Cambios en el modelo

### 1.1 Campo `tipo_animal` en `Corte`

```python
TIPO_ANIMAL_CHOICES = [('res', 'Res'), ('cerdo', 'Cerdo'), ('pollo', 'Pollo')]

tipo_animal = models.CharField(
    max_length=10,
    choices=TIPO_ANIMAL_CHOICES,
    default='res',
)
```

- Permite tener plantillas de cortes separadas por animal por carnicería.
- La restricción `unique_corte_por_carniceria` pasa de `(carniceria, nombre)` a `(carniceria, nombre, tipo_animal)`. Un mismo nombre puede existir para animales distintos (ej. "Costillas" de res y "Costillas" de cerdo).

### 1.2 Campo `tipo_animal` en `Compra`

```python
tipo_animal = models.CharField(
    max_length=10,
    choices=TIPO_ANIMAL_CHOICES,
    default='res',
)
```

- Al crear una compra, se registra qué animal corresponde.
- Al instanciar los `CompraCorte`, solo se copian los cortes activos de la carnicería cuyo `tipo_animal` coincide con el de la compra.

### 1.3 Migración de datos existentes

- `Corte.tipo_animal` → `'res'` para todos los registros existentes (ya son cortes de res).
- `Compra.tipo_animal` → `'res'` para todos los registros existentes.

---

## 2. Cambios en `onboarding.py`

### 2.1 `cargar_cortes_base` / `cargar_cortes_res`

La función existente se actualiza para incluir `tipo_animal='res'` al crear cada corte. La lógica de `get_or_create` permanece igual (idempotente). Se sigue llamando automáticamente en el registro y en el flujo Google.

### 2.2 `cargar_cortes_cerdo(carniceria)` — nueva

Idempotente. Solo crea si no existe `(carniceria, nombre, tipo_animal='cerdo')`.

Cortes base de cerdo:

| Nombre             | Rendimiento % | Margen % | Orden |
|--------------------|---------------|----------|-------|
| Bondiola           | 6.0           | 45       | 1     |
| Paleta             | 8.0           | 36       | 2     |
| Carré              | 5.0           | 45       | 3     |
| Costillas          | 7.0           | 30       | 4     |
| Lomo               | 3.0           | 52       | 5     |
| Matambre de cerdo  | 4.0           | 36       | 6     |
| Pata trasera       | 5.0           | 29       | 7     |
| Panceta            | 6.0           | 22       | 8     |
| Cabeza             | 4.0           | 0        | 9     |
| Picada de cerdo    | 4.0           | 4        | 10    |

### 2.3 `cargar_cortes_pollo(carniceria)` — nueva

Idempotente. Solo crea si no existe `(carniceria, nombre, tipo_animal='pollo')`.

Cortes base de pollo:

| Nombre          | Rendimiento % | Margen % | Orden |
|-----------------|---------------|----------|-------|
| Pechuga entera  | 20.0          | 52       | 1     |
| Suprema         | 15.0          | 52       | 2     |
| Muslo           | 18.0          | 36       | 3     |
| Pata            | 12.0          | 29       | 4     |
| Ala             | 10.0          | 22       | 5     |
| Cuarto trasero  | 22.0          | 30       | 6     |
| Menudos         | 3.0           | 4        | 7     |

### 2.4 Funciones NO llamadas automáticamente

`cargar_cortes_cerdo` y `cargar_cortes_pollo` solo se invocan desde el endpoint `POST /api/v1/cortes/cargar-plantilla/`. No se llaman en el registro ni en ningún otro flujo automático.

---

## 3. Cambios en la API

### 3.1 GET /api/v1/cortes/

Agrega filtro opcional por query param:

```
GET /api/v1/cortes/?tipo_animal=cerdo
```

Sin el parámetro, devuelve todos los cortes de todos los animales (comportamiento actual). Con el parámetro, filtra por `tipo_animal`.

Cada corte en la respuesta incluye el campo `tipo_animal`.

---

### 3.2 POST /api/v1/compras/

Acepta `tipo_animal` en el body. Si se omite, default `'res'`.

```json
{
  "fecha": "2026-03-17",
  "tipo_animal": "cerdo",
  "peso_media_res": 80.0,
  "precio_kg": 4200,
  "porcentaje_carne": 75,
  "porcentaje_hueso": 15,
  "porcentaje_grasa": 10,
  "precio_grasa": 0,
  "notas": ""
}
```

Al crear, copia solo los `Corte` activos de la carnicería con `tipo_animal` igual al de la compra.

---

### 3.3 GET /api/v1/compras/{id}/

Incluye `tipo_animal` en la respuesta.

---

### 3.4 POST /api/v1/cortes/cargar-plantilla/ — nuevo

**Autorización:** usuario autenticado.

**Body:**
```json
{ "tipo_animal": "cerdo" }
```

**Lógica:**
- Obtiene la carnicería del usuario autenticado.
- Llama a la función correspondiente: `cargar_cortes_res`, `cargar_cortes_cerdo` o `cargar_cortes_pollo`.
- Es idempotente: si ya existen los cortes, no hace nada.

**Response 200:**
```json
{ "tipo_animal": "cerdo", "cargados": true }
```

**Validación:** si `tipo_animal` no es uno de los valores válidos, devuelve `400`.

---

## 4. Cambios en el frontend

### 4.1 Bienvenida.jsx — selector de animales

El mensaje y el botón "Empezar" se mantienen. Se agrega un selector de animales entre el mensaje y el botón.

**Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│  La Balanza                                                 │
│                                                             │
│  ¡Bienvenido!                                               │
│  Res ya está listo. ¿Con qué otros animales trabajás?       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │    🐄     │  │    🐷     │  │    🐔     │                  │
│  │   Res    │  │  Cerdo   │  │  Pollo   │                  │
│  │ ✓ activo │  │          │  │          │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  (no se puede  (seleccionable)(seleccionable)               │
│   deseleccionar)                                            │
│                                                             │
│  [ Empezar ]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Res aparece siempre seleccionado y deshabilitado (ya está cargado del registro).
- El usuario puede seleccionar/deseleccionar Cerdo y Pollo.
- Al presionar "Empezar":
  - Para cada animal extra seleccionado: llama `POST /api/v1/cortes/cargar-plantilla/` con ese `tipo_animal`.
  - Las llamadas se hacen en paralelo.
  - Solo después de que todas resuelvan navega a `/nueva-compra`.
  - Si ningún animal extra fue seleccionado, navega directamente.
- Durante la carga, el botón muestra "Cargando..." y está deshabilitado.
- Si una llamada falla, mostrar error y no navegar.

---

### 4.2 NuevaCompra — selector de animal y porcentajes dinámicos

Se agrega un selector de animal antes del formulario. El formulario (`CompraForm`) recibe el animal seleccionado y ajusta labels y porcentajes default.

**Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Volver                                                   │
│  Nueva compra                                               │
│                                                             │
│  Animal                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │    🐄     │  │    🐷     │  │    🐔     │                  │
│  │   Res    │  │  Cerdo   │  │  Pollo   │                  │
│  │ ●        │  │          │  │          │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
│  Peso de la media res        ← label cambia según animal   │
│  [ _________ ] kg                                           │
│                                                             │
│  Precio de compra por kg                                    │
│  [ _________ ] $/kg                                         │
│                                                             │
│  % Carne   % Hueso   % Grasa                                │
│  [ 80  ]   [ 12  ]   [ 8   ]  ← valores según animal       │
│                                                             │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

**Labels dinámicos según animal:**

| Animal | Label unidad de compra |
|--------|------------------------|
| Res    | "Peso de la media res" |
| Cerdo  | "Peso de la media res" |
| Pollo  | "Peso del cajón"       |

**Porcentajes default según animal:**

| Animal | % Carne | % Hueso | % Grasa |
|--------|---------|---------|---------|
| Res    | 80      | 12      | 8       |
| Cerdo  | 75      | 15      | 10      |
| Pollo  | 82      | 0       | 18      |

**Comportamiento:**
- El selector muestra solo animales que el carnicero tiene activos (tiene al menos 1 corte de ese animal).
- Al cambiar de animal, los porcentajes se resetean a los defaults del animal seleccionado. Los datos ya ingresados en el formulario se pierden.
- El `tipo_animal` seleccionado se incluye en el body del `POST /api/v1/compras/`.
- Si el carnicero solo tiene res, el selector no se muestra (comportamiento actual).

---

### 4.3 Mis Cortes — tabs por animal

Se agrega un sistema de tabs para filtrar cortes por animal.

**Wireframe — carnicero con res y cerdo:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Volver                                                   │
│  Mis cortes                                                  │
│                                                             │
│  [ Res ]  [ Cerdo ]              ← solo animales activos   │
│  ──────                                                     │
│                                                             │
│  Nalga            8%   52%  [Editar] [Quitar]               │
│  Peceto           3.5% 52%  [Editar] [Quitar]               │
│  ...                                                        │
│                                                             │
│  [ + Agregar corte ]                                        │
│                                                             │
│  ─────────────────────                                      │
│  [ + Agregar animal ]           ← si hay animales sin activar│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Wireframe — "Agregar animal" (inline, sin modal):**

```
┌─────────────────────────────────────────────────────────────┐
│  [ Res ]  [ Cerdo ]                                         │
│                                                             │
│  ...lista de cortes...                                      │
│                                                             │
│  [ + Agregar corte ]                                        │
│                                                             │
│  ─────────────────────                                      │
│  Agregar animal:                                            │
│  ┌──────────┐                    ← solo muestra los que    │
│  │    🐔     │                       no están activos aún  │
│  │  Pollo   │                                              │
│  └──────────┘                                              │
│  [ Cargar cortes de pollo ]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Al entrar a Mis Cortes, se llama `GET /api/v1/cortes/` sin filtro para obtener todos.
- Los tabs se generan dinámicamente según los `tipo_animal` distintos presentes en la lista.
- El tab activo por defecto es el primero (generalmente "Res").
- Al cambiar de tab, se filtra la lista en el frontend (sin nueva llamada a la API).
- Al agregar un corte manual desde "Agregar corte", el nuevo corte hereda el `tipo_animal` del tab activo. El form de creación de corte incluye el animal como campo hidden.
- "Agregar animal": solo aparece si hay animales no activos. Muestra los animales que no tienen cortes todavía. Al presionar "Cargar cortes de [animal]", llama `POST /api/v1/cortes/cargar-plantilla/` y recarga la lista.

---

## 5. Criterios de aceptación

### Modelo y migración
- [ ] `Corte.tipo_animal` existe con choices `res`, `cerdo`, `pollo` y default `res`.
- [ ] `Compra.tipo_animal` existe con choices `res`, `cerdo`, `pollo` y default `res`.
- [ ] Todos los `Corte` preexistentes tienen `tipo_animal='res'` tras la migración.
- [ ] Todas las `Compra` preexistentes tienen `tipo_animal='res'` tras la migración.
- [ ] La constraint única de `Corte` es `(carniceria, nombre, tipo_animal)`.
- [ ] Al crear una `Compra` de tipo `cerdo`, solo se copian los `CompraCorte` de cortes con `tipo_animal='cerdo'`.

### Onboarding
- [ ] `cargar_cortes_base` / `cargar_cortes_res` crea cortes con `tipo_animal='res'`.
- [ ] `cargar_cortes_cerdo` crea los 10 cortes de cerdo definidos en el spec con `tipo_animal='cerdo'`.
- [ ] `cargar_cortes_pollo` crea los 7 cortes de pollo definidos en el spec con `tipo_animal='pollo'`.
- [ ] Las tres funciones son idempotentes (llamarlas dos veces no duplica cortes).

### API
- [ ] `GET /api/v1/cortes/` sin parámetro devuelve todos los cortes (todos los animales).
- [ ] `GET /api/v1/cortes/?tipo_animal=cerdo` devuelve solo cortes de cerdo.
- [ ] La respuesta de `/cortes/` incluye el campo `tipo_animal` en cada objeto.
- [ ] `POST /api/v1/compras/` acepta y persiste `tipo_animal`.
- [ ] `GET /api/v1/compras/{id}/` incluye `tipo_animal` en la respuesta.
- [ ] `POST /api/v1/cortes/cargar-plantilla/` con `{ tipo_animal: 'cerdo' }` carga los cortes de cerdo para la carnicería del usuario.
- [ ] `POST /api/v1/cortes/cargar-plantilla/` es idempotente.
- [ ] `POST /api/v1/cortes/cargar-plantilla/` con `tipo_animal` inválido devuelve `400`.
- [ ] `POST /api/v1/cortes/cargar-plantilla/` sin autenticación devuelve `401`.

### Frontend — Bienvenida
- [ ] Res aparece seleccionado y no es deseleccionable.
- [ ] Cerdo y Pollo son seleccionables/deseleccionables.
- [ ] Al presionar "Empezar" con Cerdo seleccionado, se llama `cargar-plantilla/` con `cerdo` antes de navegar.
- [ ] Las llamadas para animales extra se hacen en paralelo.
- [ ] Si no se selecciona ningún animal extra, navega directamente a `/nueva-compra`.
- [ ] El botón muestra "Cargando..." durante las llamadas y está deshabilitado.
- [ ] Si falla una llamada, muestra error y no navega.

### Frontend — Nueva Compra
- [ ] Si el carnicero tiene cortes de un solo animal, el selector no se muestra.
- [ ] Si tiene cortes de múltiples animales, aparece el selector.
- [ ] Al cambiar de animal, los porcentajes se resetean a los valores default del animal.
- [ ] El label del campo de peso cambia: "media res" para res/cerdo, "cajón" para pollo.
- [ ] El `tipo_animal` seleccionado se envía en el `POST /api/v1/compras/`.

### Frontend — Mis Cortes
- [ ] Los tabs se generan solo para los animales que tienen al menos 1 corte activo.
- [ ] Al cambiar de tab, la lista muestra solo los cortes del animal seleccionado.
- [ ] Al agregar un corte manual, se crea con el `tipo_animal` del tab activo.
- [ ] "Agregar animal" solo aparece si hay animales sin cortes activos.
- [ ] "Cargar cortes de [animal]" llama al endpoint y recarga la lista correctamente.

---

## 6. Fuera de alcance (v1)

- Historial filtrado por animal.
- Precios de hoy filtrados por animal.
- Eliminar un animal completo (quitar todos sus cortes de una vez).
- Animales custom definidos por el usuario.
- PDF de lista de precios filtrado por animal.
