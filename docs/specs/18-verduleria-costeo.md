@# Spec 18 - Modulo Verduleria: descubrimiento y costeo

## Estado: BORRADOR

## Fecha
2026-05-22

---

## 1. Contexto

La Balanza se esta convirtiendo en un producto modular: el cliente activa los modulos de calculo que necesita para su negocio. Los modulos iniciales aprobados en la spec 17 son:

- Vaca
- Cerdo
- Pollo
- Verduleria

El modulo Verduleria no debe copiar sin validar la logica de carniceria. Aunque comparte conceptos como compra, merma, costo minimo y precio sugerido, la operacion diaria puede ser distinta: unidades, cajones, bultos, maduracion, descarte, remates, combos, flete y rotacion.

Esta spec define primero la etapa de descubrimiento. La implementacion queda bloqueada hasta completar la entrevista con un verdulero real y aprobar la formula de costeo.

---

## 2. Objetivo

Entender como calcula costos y precios un verdulero real para definir el MVP del modulo Verduleria.

El resultado de esta spec debe permitir responder:

- Que datos carga el usuario.
- Que unidad se compra y que unidad se vende.
- Como se calcula el costo real.
- Como se modela la merma.
- Como se define precio minimo.
- Como se define precio sugerido.
- Que productos base conviene precargar.
- Que queda fuera del MVP.

---

## 3. Hipotesis iniciales

Estas hipotesis son provisorias y deben validarse en entrevista:

- La verduleria compra por cajon, bolsa, bulto, kilo o unidad.
- La venta puede ser por kilo, unidad, atado, paquete o combo.
- La merma puede variar mucho por producto y por tiempo de vida.
- Algunos productos se rematan antes de perderse, recuperando parte del costo.
- El flete puede ser relevante y quizas deba distribuirse entre productos.
- El margen no necesariamente es fijo por producto; puede depender de rotacion, competencia o temporada.
- La lista de precios puede necesitar impresion o envio por WhatsApp.

---

## 4. Entrevista al verdulero

### 4.1 Contexto del negocio

- Que tipo de verduleria es: barrio, autoservicio, mayorista, reparto, mixta?
- Cuantos proveedores usa normalmente?
- Compra todos los dias, varias veces por semana o una vez por semana?
- Que productos son los mas importantes para calcular bien?
- Que productos tienen mas perdida si se calcula mal?
- Hay productos de temporada que cambian mucho la logica?

### 4.2 Compra

- Como registra una compra tipica?
- Compra por cajon, bolsa, bulto, kilo, unidad u otra unidad?
- El proveedor informa peso real o peso aproximado?
- Pesa la mercaderia al entrar?
- Como calcula el costo por kilo cuando compra por cajon?
- El costo de flete se suma a cada producto o se absorbe general?
- Hay otros costos que reparte: descarga, comision, mercado, bolsas?
- Compra el mismo producto a distintos precios el mismo dia?
- Usa costo promedio si mezcla mercaderia nueva con stock viejo?

### 4.3 Venta

- Vende por kilo, unidad, atado, paquete, bolsa o combo?
- Cambia la unidad de venta segun producto?
- Como calcula precio por unidad si compro por kilo o por cajon?
- Cambia precios durante el dia?
- Cambia precios cuando el producto madura o empieza a deteriorarse?
- Usa ofertas para liquidar mercaderia?

### 4.4 Merma y recupero

- Que considera merma?
- La merma se estima antes de vender o se mide al final?
- Hay porcentajes tipicos de merma por producto?
- Que productos tienen merma alta?
- Que se hace con producto golpeado o maduro?
- Se tira, se remata, se procesa, se dona o se usa en combos?
- El remate recupera parte del costo? Como lo estima?
- La merma depende de dias de stock?

### 4.5 Margen y precio

- Como decide el margen?
- Usa margen fijo por producto, por categoria o a ojo?
- Tiene productos gancho con margen bajo?
- Tiene productos premium con margen alto?
- Que redondeo usa: $10, $50, $100?
- Como define el precio minimo para no perder plata?
- Como define el precio sugerido?
- Compara con precios de otros comercios?

### 4.6 Stock y rotacion

- Controla stock en kilos/unidades?
- Sabe cuanto queda de cada producto?
- Quiere calcular solo compra/precio o tambien stock?
- Cuantos dias espera vender cada producto?
- Que alertas serian utiles: margen bajo, mucha merma, producto viejo, precio desactualizado?

### 4.7 Operacion diaria

- En que momento cargaria datos en la app?
- Quien cargaria datos?
- Cuanto tiempo puede dedicarle?
- Que seria una pantalla ideal para el primer uso?
- Necesita imprimir lista de precios?
- Necesita compartir lista por WhatsApp?
- Necesita historial de compras?

### 4.8 Envios

- Hace envios actualmente?
- Como toma pedidos: WhatsApp, telefono, redes, mostrador?
- Cobra envio aparte?
- El envio depende de distancia, monto o zona?
- Arma pedidos antes de enviar?
- Necesita esto en el MVP o puede ser release futura?

---

## 5. Modelo conceptual provisorio

### Producto base

Representa un producto vendible de verduleria.

Campos posibles:

- `nombre`
- `categoria`
- `unidad_compra_default`
- `unidad_venta_default`
- `merma_porcentaje_default`
- `margen_porcentaje_default`
- `orden`
- `activo`

### Compra de verduleria

Representa una compra o carga de mercaderia.

Campos posibles:

- `fecha`
- `producto`
- `cantidad_compra`
- `unidad_compra`
- `peso_estimado_kg`
- `peso_real_kg`
- `costo_total`
- `flete_total`
- `otros_costos`
- `merma_porcentaje`
- `recupero_merma`
- `margen_porcentaje`
- `notas`

### Calculos posibles

Estos calculos son candidatos, pendientes de validar:

```text
costo_compra_total = costo_total + flete_asignado + otros_costos_asignados
kg_vendibles = kg_totales * (1 - merma_porcentaje / 100)
recupero = valor estimado por remate/subproducto
costo_neto = costo_compra_total - recupero
costo_minimo_kg = costo_neto / kg_vendibles
precio_sugerido_kg = costo_minimo_kg * (1 + margen_porcentaje / 100)
```

Preguntas abiertas:

- La merma se descuenta del peso antes de calcular costo por kg o se absorbe como costo?
- El recupero de remates debe ser parte del MVP?
- El flete se carga por compra general o por producto?
- Necesitamos soportar unidad de venta distinta al kg en MVP?

---

## 6. Plantilla inicial candidata

Lista provisoria para validar:

- Papa
- Cebolla
- Tomate
- Lechuga
- Zanahoria
- Zapallo
- Morrón
- Banana
- Manzana
- Naranja
- Limón
- Acelga
- Espinaca
- Perejil
- Frutilla

La entrevista debe confirmar:

- Productos realmente frecuentes.
- Margenes aproximados.
- Mermas aproximadas.
- Unidades habituales.
- Orden de importancia.

---

## 7. Alcance MVP candidato

El MVP de Verduleria podria incluir:

- Activar modulo Verduleria.
- Cargar plantilla base de productos.
- Registrar compra de un producto.
- Calcular costo minimo y precio sugerido.
- Aplicar merma porcentual.
- Aplicar margen porcentual.
- Mostrar historial simple.
- Generar lista de precios si el usuario es Pro.

---

## 8. Fuera del MVP candidato

Queda fuera hasta validar necesidad:

- Stock avanzado.
- Pedidos.
- Envios.
- Multiples proveedores por producto en la misma compra.
- Promedio automatico entre stock viejo y nuevo.
- Control de caja.
- Integracion WhatsApp.
- Integracion con balanza fisica.
- Alertas automaticas de producto viejo.
- Recetas, combos o bolsas armadas.

---

## 9. Criterios para aprobar implementacion

Esta spec pasa a `APROBADO` cuando:

- Se completa entrevista con al menos un verdulero real.
- Se documentan formulas definitivas del MVP.
- Se define modelo minimo.
- Se define plantilla inicial.
- Se define si el MVP usa solo kg o tambien unidad/atado/paquete.
- Se define si flete y recupero entran o quedan fuera.
- Se actualizan wireframes necesarios.
- Se agregan criterios de aceptacion verificables.

---

## 10. Notas de implementacion futura

- Evitar duplicar la logica de carniceria si los calculos se pueden generalizar.
- No renombrar modelos centrales todavia si no hace falta para entregar MVP.
- Considerar una capa de "modulo" que defina labels, defaults, plantillas y reglas.
- Mantener compatibilidad con compras historicas de Vaca/Cerdo/Pollo.

## 11. Hipotesis de logica por modulo

### 11.1 Carne / Res / Pollo

- En carne (media res o pieza) el costo base se calcula a nivel de compra y se distribuye uniformemente por kg vendible.
- Esto esta bien: el costo minimo puede ser igual para todos los cortes de la misma compra.
- La discriminacion entre cortes debe hacerse en el margen y en la categoria de producto:
  - algunos cortes son premium y tienen mayor margen.
  - otros cortes son populares y tienen margen mas bajo.
- Pollo y res pueden seguir la misma logica que la carniceria actual, con plantillas de cortes independientes por tipo de animal.
- El cambio principal es que cada corte puede tener su propio `margen_porcentaje` y su posicionamiento comercial, sin alterar el costo global.
- Para pollo, la diferencia puede ser solo de nombres/plantilla de cortes y de porcentajes de rendimiento, no de la formula de costo.

### 11.2 Verduleria

- Verduleria requiere validar si el MVP debe usar:
  - compra por cajon/bolsa/bulto/kilo/unidad,
  - venta por kilo/unidad/paquete/atado/combo,
  - merma por producto o por compra,
  - recupero de remates/ofertas.
- El modelo minimo candidato es:
  - `ProductoVerduleria` con `nombre`, `categoria`, `unidad_compra_default`, `unidad_venta_default`, `merma_porcentaje_default`, `margen_porcentaje_default`, `activo`.
  - `CompraProducto` con `producto`, `cantidad_compra`, `unidad_compra`, `peso_estimado_kg`, `peso_real_kg`, `costo_total`, `flete_total`, `otros_costos`, `merma_porcentaje`, `recupero`, `margen_porcentaje`.
- Formula candidata para un producto de verduleria:
  - `costo_compra_total = costo_total + flete_total + otros_costos`
  - `costo_neto = costo_compra_total - recupero`
  - `kg_vendibles = peso_real_kg * (1 - merma_porcentaje / 100)`
  - `precio_minimo_kg = costo_neto / kg_vendibles`
  - `precio_sugerido_kg = precio_minimo_kg * (1 + margen_porcentaje / 100)`
- Si la venta no es por kg, se agrega un factor de conversion `kg_por_unidad` o se modela `unidad_venta`.
- En verduleria la merma, el flete y el recupero son variables que deben validarse con el usuario real antes de implementar.

### 11.3 Reglas de diseño

- No copiar literalmente la logica de carniceria para verduleria: compartir calculos comunes solo si el dominio es el mismo.
- Mantener compatibilidad con compras historicas de Vaca/Cerdo/Pollo.
- No renombrar modelos centrales todavia si no hace falta para entregar el MVP.
- Considerar que el modulo es una capa de configuracion que define labels, defaults, plantillas y reglas.

## 12. Agenda de entrevistas

### 12.1 Entrevista con un carnicero

Objetivo: validar la logica de costo y margen para carne, res y pollo.

Preguntas clave:

- Cuando compra una media res o un pollo, que datos registra primero?
- Como calcula el costo por kg vendible? usa precio del animal completo o ajusta por pesos reales?
- El costo minimo se aplica igual a todos los cortes de la misma compra?
- Como define si un corte es premium o popular? eso cambia solo el margen?
- Cambia el margen segun temporada, edad del animal o demanda?
- Usa formulas distintas para vaca, cerdo y pollo o el mismo metodo general?
- Necesita ver el precio por kg y tambien el precio final por corte?
- Prefiere ajustar solo el margen en cada corte, o tambien los kilos de rendimiento por corte?

### 12.2 Entrevista con un verdulero

Objetivo: documentar la logica de compra, merma y precio de verduleria.

Preguntas clave:

- Que unidad de compra usa para cada producto (cajon, bolsa, bulto, kilo, unidad)?
- Que unidad de venta usa mas frecuentemente (kilo, unidad, paquete, atado, combo)?
- Como calcula el costo real de un producto cuando lo compra por cajon o bolsa?
- Registra peso estimado, peso real, cantidad de unidades y/o precio total?
- El flete lo reparte entre todos los productos o lo absorbe en general?
- La merma la estima antes de vender o la mide despues?
- Que hace con producto maduro o golpeado: lo remata, lo regala, lo mezcla en ofertas?
- Recupera algo de la merma en remates/ofertas? como lo contabiliza?
- Usa un margen fijo por producto o por categoria?
- En que casos baja el precio? cuando vence, cuando hay exceso de stock, cuando hay comparacion con la competencia?
- Necesita una lista de precios imprimible o una guia rapida de precios sugeridos?

## 13. Proximo paso inmediato

- [ ] Agendar la entrevista con un carnicero real.
- [ ] Agendar la entrevista con un verdulero real.
- [ ] Registrar las respuestas de ambas entrevistas en este spec.
- [ ] Validar si pollo se maneja igual que res o requiere ajustes.
- [ ] Definir si el MVP de verduleria incluye venta por unidad/combo o solo por kg.
- [ ] Definir si flete y recupero entran en la version inicial.
- [ ] Una vez confirmado, aprobar esta spec y pasar a implementacion.
