# Spec 02 — Modelos de negocio (core)

**Estado:** aprobado
**Fecha:** 2026-03-14

---

## Objetivo

Definir los cuatro modelos de `core` con sus campos, propiedades calculadas, reglas de negocio y criterios de aceptación.

---

## Glosario

| Término | Definición |
|---------|-----------|
| Media res | Mitad de una res vacuna comprada al proveedor |
| Rendimiento | % del peso total de la media res que representa un corte |
| Carne vendible | % del peso total que se puede vender como cortes (excluye hueso y grasa) |
| Hueso | % del peso total; no genera ingreso, su costo se absorbe en los cortes |
| Grasa | % del peso total; se vende a precio bajo, su ingreso reduce el costo neto |
| Costo neto | Costo total de compra menos el ingreso por venta de grasa |
| Precio mínimo | Precio/kg al que el carnicero recupera exactamente el costo neto, sin margen |
| Precio sugerido | Precio/kg mínimo aplicando el margen del corte |
| Plantilla | Conjunto de cortes definidos para una carnicería, reutilizable entre compras |

---

## Modelo: Carniceria

Perfil de la carnicería, uno por usuario.

### Campos

| Campo | Tipo Django | Restricciones |
|-------|-------------|---------------|
| `user` | `OneToOneField(users.User, on_delete=CASCADE)` | único, no nulo |
| `nombre` | `CharField(max_length=120)` | no nulo, no vacío |
| `created_at` | `DateTimeField(auto_now_add=True)` | automático |

### Reglas de negocio

- Se crea junto con el usuario o justo después del registro.
- No tiene propiedades calculadas propias; actúa como punto de acceso a `Corte` y `Compra`.

### Meta

```
ordering = ["nombre"]
verbose_name = "Carnicería"
verbose_name_plural = "Carnicerías"
```

---

## Modelo: Corte

Plantilla de un corte para una carnicería. Define el rendimiento y margen por defecto que se copian a cada `Compra`.

### Campos

| Campo | Tipo Django | Restricciones |
|-------|-------------|---------------|
| `carniceria` | `ForeignKey(Carniceria, on_delete=CASCADE)` | no nulo |
| `nombre` | `CharField(max_length=80)` | no nulo, no vacío |
| `porcentaje_rendimiento` | `DecimalField(max_digits=5, decimal_places=2)` | `>0`, `≤100` |
| `margen_porcentaje` | `DecimalField(max_digits=5, decimal_places=2)` | `≥0` |
| `activo` | `BooleanField(default=True)` | |
| `orden` | `PositiveIntegerField(default=0)` | usado para ordenar en UI |

### Reglas de negocio

- El `nombre` debe ser único por carnicería (`UniqueConstraint` en `nombre` + `carniceria`).
- Solo los cortes con `activo=True` se copian al crear una `Compra`.
- El `porcentaje_rendimiento` expresa cuánto pesa este corte como porcentaje del **total de la media res** (no del porcentaje de carne vendible).
- El `margen_porcentaje` es el margen de ganancia base, expresado en porcentaje (ej: `30` = 30%).

### Meta

```
ordering = ["orden", "nombre"]
verbose_name = "Corte"
verbose_name_plural = "Cortes"
constraints:
  - UniqueConstraint(fields=["carniceria", "nombre"])
  - CheckConstraint(porcentaje_rendimiento > 0)
  - CheckConstraint(porcentaje_rendimiento <= 100)
  - CheckConstraint(margen_porcentaje >= 0)
```

---

## Modelo: Compra

Representa la compra de una media res. Contiene los datos de peso, precios y distribución porcentual. Al crearse, genera automáticamente los `CompraCorte` copiando los cortes activos de la plantilla.

### Campos

| Campo | Tipo Django | Restricciones |
|-------|-------------|---------------|
| `carniceria` | `ForeignKey(Carniceria, on_delete=CASCADE)` | no nulo |
| `fecha` | `DateField()` | no nulo |
| `peso_media_res` | `DecimalField(max_digits=8, decimal_places=3)` | `>0` (kg) |
| `precio_kg` | `DecimalField(max_digits=10, decimal_places=2)` | `>0` ($/kg) |
| `porcentaje_carne` | `DecimalField(max_digits=5, decimal_places=2)` | `>0`, `<100` |
| `porcentaje_hueso` | `DecimalField(max_digits=5, decimal_places=2)` | `≥0`, `<100` |
| `porcentaje_grasa` | `DecimalField(max_digits=5, decimal_places=2)` | `≥0`, `<100` |
| `precio_grasa` | `DecimalField(max_digits=10, decimal_places=2)` | `≥0` ($/kg) |
| `notas` | `TextField(blank=True)` | opcional |
| `created_at` | `DateTimeField(auto_now_add=True)` | automático |

### Reglas de negocio

- **Invariante central:** `porcentaje_carne + porcentaje_hueso + porcentaje_grasa = 100`
  Validado en `clean()`. No se puede guardar una `Compra` que no cumpla esta suma.
- `precio_grasa` puede ser `0` (el carnicero descarta la grasa sin venderla).
- Al crear una `Compra` (señal `post_save` o lógica en `save()`), se copian todos los `Corte` con `activo=True` de la carnicería como `CompraCorte`.
- Los `CompraCorte` ya creados **no se actualizan** si la plantilla cambia; la compra es una foto del momento.

### Propiedades calculadas

Todas son `@property`. Trabajan con `Decimal`, nunca con `float`.

---

#### `costo_total`
Gasto bruto de la compra.

```
costo_total = peso_media_res × precio_kg
```

---

#### `ingreso_grasa`
Dinero recuperado por la venta de la grasa.

```
ingreso_grasa = peso_media_res × (porcentaje_grasa / 100) × precio_grasa
```

---

#### `costo_neto`
Lo que efectivamente hay que recuperar vendiendo los cortes.

```
costo_neto = costo_total − ingreso_grasa
```

---

#### `kg_carne_vendible`
Kilogramos de carne que se pueden vender como cortes.

```
kg_carne_vendible = peso_media_res × (porcentaje_carne / 100)
```

---

#### `costo_por_kg_vendible`
Costo que debe recuperarse por cada kilogramo de carne vendible.
Esta es la base del precio mínimo de **todos** los cortes de esta compra.

```
costo_por_kg_vendible = costo_neto / kg_carne_vendible
```

Precondición: `porcentaje_carne > 0` (garantizado por el campo).

### Meta

```
ordering = ["-fecha", "-created_at"]
verbose_name = "Compra"
verbose_name_plural = "Compras"
constraints:
  - CheckConstraint(peso_media_res > 0)
  - CheckConstraint(precio_kg > 0)
  - CheckConstraint(porcentaje_carne > 0)
  - CheckConstraint(porcentaje_hueso >= 0)
  - CheckConstraint(porcentaje_grasa >= 0)
  - CheckConstraint(precio_grasa >= 0)
```

---

## Modelo: CompraCorte

Instancia editable de un corte dentro de una compra concreta. Se genera automáticamente al crear la `Compra` y puede ajustarse para reflejar el animal específico comprado.

### Campos

| Campo | Tipo Django | Restricciones |
|-------|-------------|---------------|
| `compra` | `ForeignKey(Compra, on_delete=CASCADE)` | no nulo |
| `nombre` | `CharField(max_length=80)` | copiado del `Corte` |
| `porcentaje_rendimiento` | `DecimalField(max_digits=5, decimal_places=2)` | `>0`, `≤100` |
| `margen_porcentaje` | `DecimalField(max_digits=5, decimal_places=2)` | `≥0` |
| `orden` | `PositiveIntegerField(default=0)` | |

### Reglas de negocio

- El `nombre` debe ser único por compra (`UniqueConstraint` en `nombre` + `compra`).
- El `porcentaje_rendimiento` expresa cuánto pesa este corte como porcentaje del **total de la media res** (igual que en la plantilla).
- La suma de `porcentaje_rendimiento` de todos los `CompraCorte` de una misma `Compra` **debería** ser igual al `porcentaje_carne` de la compra. No se impone como constraint de DB (imposible en SQL estándar), pero sí se advierte a nivel de aplicación.
- El carnicero puede ajustar `porcentaje_rendimiento` y `margen_porcentaje` de cada `CompraCorte` sin afectar la plantilla original.

### Propiedades calculadas

---

#### `kg_corte`
Kilogramos de este corte en la media res.

```
kg_corte = compra.peso_media_res × (porcentaje_rendimiento / 100)
```

---

#### `precio_minimo_kg`
Precio mínimo por kg para recuperar el costo neto proporcional.
Es igual para todos los cortes de la misma compra (el costo se distribuye uniformemente por kg de carne vendible).

```
precio_minimo_kg = compra.costo_por_kg_vendible
```

---

#### `precio_sugerido_kg`
Precio por kg aplicando el margen del corte.

```
precio_sugerido_kg = precio_minimo_kg × (1 + margen_porcentaje / 100)
```

---

#### `precio_minimo_total`
Ingreso mínimo que debe generar la venta completa de este corte.

```
precio_minimo_total = precio_minimo_kg × kg_corte
```

---

#### `precio_sugerido_total`
Ingreso esperado vendiendo el corte completo al precio sugerido.

```
precio_sugerido_total = precio_sugerido_kg × kg_corte
```

### Meta

```
ordering = ["orden", "nombre"]
verbose_name = "Corte de compra"
verbose_name_plural = "Cortes de compra"
constraints:
  - UniqueConstraint(fields=["compra", "nombre"])
  - CheckConstraint(porcentaje_rendimiento > 0)
  - CheckConstraint(porcentaje_rendimiento <= 100)
  - CheckConstraint(margen_porcentaje >= 0)
```

---

## Criterios de aceptación

### CA-01 — Cálculo de costo de una compra

**Escenario:**
- `peso_media_res = 100` kg
- `precio_kg = 1000.00` $/kg
- `porcentaje_carne = 60`, `porcentaje_hueso = 30`, `porcentaje_grasa = 10`
- `precio_grasa = 200.00` $/kg

**Valores esperados:**
| Propiedad | Valor esperado |
|-----------|----------------|
| `costo_total` | `100000.00` |
| `ingreso_grasa` | `2000.00` |
| `costo_neto` | `98000.00` |
| `kg_carne_vendible` | `60.000` |
| `costo_por_kg_vendible` | `1633.333...` |

**Test:** `test_compra_calculo_costo_basico`

---

### CA-02 — Precio mínimo y sugerido de un corte

**Escenario:** compra de CA-01, con un `CompraCorte`:
- `nombre = "Lomo"`, `porcentaje_rendimiento = 5`, `margen_porcentaje = 50`

**Valores esperados:**
| Propiedad | Valor esperado |
|-----------|----------------|
| `kg_corte` | `5.000` |
| `precio_minimo_kg` | `1633.333...` |
| `precio_sugerido_kg` | `2450.000` |
| `precio_minimo_total` | `8166.666...` |
| `precio_sugerido_total` | `12250.000` |

**Test:** `test_compra_corte_precio_minimo_y_sugerido`

---

### CA-03 — Sin margen, precio sugerido = precio mínimo

**Escenario:** `CompraCorte` con `margen_porcentaje = 0`.

**Resultado esperado:** `precio_sugerido_kg == precio_minimo_kg`

**Test:** `test_compra_corte_sin_margen`

---

### CA-04 — Grasa sin ingreso no distorsiona el cálculo

**Escenario:** misma compra de CA-01 pero `precio_grasa = 0`.

**Valores esperados:**
| Propiedad | Valor esperado |
|-----------|----------------|
| `ingreso_grasa` | `0.00` |
| `costo_neto` | `100000.00` |
| `costo_por_kg_vendible` | `1666.666...` |

**Test:** `test_compra_grasa_precio_cero`

---

### CA-05 — Validación: porcentajes no suman 100

**Escenario:** `porcentaje_carne=60, porcentaje_hueso=30, porcentaje_grasa=5` (suma = 95).

**Resultado esperado:** `ValidationError` al llamar `compra.full_clean()`.

**Test:** `test_compra_porcentajes_invalidos`

---

### CA-06 — Validación: porcentajes suman exactamente 100

**Escenario:** `porcentaje_carne=60, porcentaje_hueso=30, porcentaje_grasa=10` (suma = 100).

**Resultado esperado:** `compra.full_clean()` no lanza excepción.

**Test:** `test_compra_porcentajes_validos`

---

### CA-07 — Copia automática de cortes al crear una Compra

**Escenario:** `Carniceria` con 3 `Corte`: 2 activos y 1 inactivo. Se crea una `Compra`.

**Resultado esperado:**
- Se crean exactamente 2 `CompraCorte`.
- Los campos `nombre`, `porcentaje_rendimiento` y `margen_porcentaje` de cada `CompraCorte` coinciden con los del `Corte` activo correspondiente.
- El `Corte` inactivo no genera `CompraCorte`.

**Test:** `test_compra_copia_cortes_activos`

---

### CA-08 — Precisión decimal: nunca float

**Escenario:** calcular `costo_por_kg_vendible` con valores que generan decimal periódico.

**Resultado esperado:** el tipo del resultado es `Decimal`, no `float`.

**Test:** `test_propiedades_retornan_decimal`

---

### CA-09 — Nombre de corte único por carnicería

**Escenario:** crear dos `Corte` con el mismo `nombre` para la misma `Carniceria`.

**Resultado esperado:** `IntegrityError` o `ValidationError`.

**Test:** `test_corte_nombre_unico_por_carniceria`

---

### CA-10 — Nombre de CompraCorte único por compra

**Escenario:** crear dos `CompraCorte` con el mismo `nombre` para la misma `Compra`.

**Resultado esperado:** `IntegrityError` o `ValidationError`.

**Test:** `test_compra_corte_nombre_unico_por_compra`
