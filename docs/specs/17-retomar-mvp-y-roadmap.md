# Spec 17 - Retomar MVP y roadmap

## Estado: APROBADO

## Fecha
2026-05-19

---

## 1. Contexto

La Balanza es un MVP funcional para carnicerias, con backend Django/DRF y frontend React/Vite. El repo ya incluye specs, autenticacion, calculo de compras, gestion de cortes, multi-animal, billing, panel admin y despliegue en AWS.

El objetivo de esta etapa no es agrandar el producto, sino recuperar el estado del MVP, estabilizarlo y dejarlo publicable con el menor alcance posible.

Se mantiene SDD como metodo de trabajo:

1. Cada cambio funcional debe estar respaldado por una spec.
2. Las specs nuevas arrancan como `BORRADOR`.
3. Solo se implementa una vez aprobado el alcance.
4. Si durante la implementacion aparece una deuda fuera de alcance, se documenta como deuda o release futura.

---

## 2. Objetivo del MVP retomado

Publicar una version MVP modular que permita configurar La Balanza segun los tipos de calculo que necesita cada cliente.

La idea de producto es:

> Tenes una balanza y le cargas los modulos que necesitas para calcular costos y precios.

El MVP debe permitir:

- Registrar o iniciar sesion.
- Elegir uno o mas modulos durante bienvenida/onboarding.
- Cargar plantillas base segun los modulos activados.
- Gestionar plantilla de productos/cortes.
- Registrar una compra.
- Calcular costo minimo y precio sugerido.
- Editar kilos/margen de items dentro de una compra.
- Consultar historial y precios recientes.
- Administrar clientes y planes desde panel interno.
- Tener un modelo Free/Pro consistente, aunque el cobro real pueda seguir validandose con cautela.

Para carnicerias, el MVP debe soportar vaca, cerdo y pollo como modulos independientes.

Para verdulerias, el MVP debe incluir primero una fase de descubrimiento con un verdulero real para documentar la logica de costos. Solo despues de esa spec aprobada se implementa el modulo.

---

## 3. Alcance de estabilizacion

### 3.0 Modulos y bienvenida

El onboarding debe dejar de asumir que todo usuario es una carniceria. La Balanza debe presentar modulos de calculo activables por cliente.

**Criterios de aceptacion**

- En bienvenida, el usuario ve una unica pantalla de seleccion de modulos.
- El usuario puede seleccionar uno o varios modulos.
- Debe seleccionar al menos un modulo para continuar.
- Modulos MVP:
  - Vaca
  - Cerdo
  - Pollo
  - Verduleria
- Los modulos seleccionados definen las plantillas iniciales disponibles.
- Si el usuario elige vaca, se cargan cortes base de vaca.
- Si el usuario elige cerdo, se cargan cortes base de cerdo.
- Si el usuario elige pollo, se cargan cortes base de pollo.
- Si el usuario elige verduleria, se carga una plantilla inicial solo despues de aprobar la spec de verduleria.
- El cliente puede activar o desactivar modulos despues desde su panel de configuracion personal.
- El panel admin muestra los modulos activados/adquiridos por el cliente.
- El nombre de producto visible puede seguir siendo "La Balanza".

### 3.0.1 Modulos disponibles

El marketplace de modulos no debe ser complejo en el MVP. Debe ser una seleccion simple de modulos disponibles.

**Criterios de aceptacion**

- El usuario ve opciones de modulo como tarjetas seleccionables.
- Cada modulo comunica brevemente que tipo de costos y precios permite calcular.
- El usuario puede completar onboarding sin configuraciones avanzadas.
- La estructura queda preparada para agregar otros modulos en futuras releases.

### 3.0.2 Configuracion personal de modulos

El cliente debe poder gestionar sus modulos despues del onboarding.

**Criterios de aceptacion**

- Existe una pantalla de configuracion personal o seccion equivalente.
- El usuario ve sus modulos activos.
- El usuario puede activar modulos disponibles.
- El usuario puede desactivar modulos que ya no usa, sin borrar datos historicos.
- Al activar un modulo, se cargan sus plantillas base si todavia no existen.
- Al desactivar un modulo, deja de aparecer para crear nuevas compras.
- Los datos historicos de un modulo desactivado siguen disponibles en historial.

### 3.0.3 Planes, socios y trial

La gestion de modulos es una funcionalidad Pro.

Durante la etapa de prueba:

- A socios/amigos que ayudan a probar se les puede activar Pro manualmente desde el panel admin.
- A clientes nuevos se les otorga Pro por 5 dias.
- Al finalizar el trial, pasan al plan basico/free si no se suscriben.

**Criterios de aceptacion**

- Todo usuario nuevo inicia con trial Pro de 5 dias.
- Durante trial Pro puede activar varios modulos.
- Al vencer el trial, se aplican limites del plan basico/free.
- El panel admin permite identificar y administrar socios/testers.
- El panel admin permite ver plan, estado, vencimiento y modulos activos/adquiridos.
- La UI muestra claramente si el usuario esta en trial, Pro activo o plan basico/free.

### 3.1 Entorno local verificable

El proyecto debe poder validarse localmente con:

- Backend tests corriendo contra PostgreSQL local o Docker Compose.
- Frontend `npm run build` corriendo sin errores de permisos.
- Makefile con comandos rapidos para levantar, testear, buildear y bakupear.

### 3.2 Bugs bloqueantes a corregir

#### Sin cortes configurados

En la pantalla de nueva compra, si el usuario no tiene cortes configurados, la UI no debe quedar en estado de carga infinito.

**Criterios de aceptacion**

- Si `api.cortes.listar()` devuelve lista vacia, se muestra el estado "Sin cortes configurados".
- El estado `null` queda reservado para "cargando".
- El usuario puede navegar a la pantalla de cortes para cargar plantilla o crear cortes.

#### PDF en plan Free/Basico

El plan Free/Basico no debe permitir generar PDF.

**Criterios de aceptacion**

- La UI no muestra accion de imprimir PDF para usuarios Free/Basico, o la muestra bloqueada con CTA a planes.
- El comportamiento se aplica tanto en "Nueva compra" como en "Precios".
- La regla queda centralizada en el estado de suscripcion, no duplicada como texto suelto.

#### Validacion de cortes por animal

La validacion de nombre duplicado debe respetar el `tipo_animal` real del corte al editar.

**Criterios de aceptacion**

- Editar un corte de cerdo o pollo sin enviar `tipo_animal` no valida contra `vaca` por defecto.
- Sigue estando prohibido duplicar nombre dentro de la misma carniceria y mismo animal.
- Se agregan o actualizan tests para cubrir el caso.

#### Mock de MercadoPago en desarrollo

El flujo mock debe representar claramente una suscripcion aprobada o declararse solo como redireccion fake.

**Criterios de aceptacion**

- En desarrollo, al completar el mock, el usuario ve estado Pro activo si el flujo dice `status=approved`.
- Si no se activa Pro automaticamente, la UI no debe decir que la suscripcion fue aprobada.
- El comportamiento queda cubierto por test o por una nota tecnica explicita.

#### Trial Pro vencido

El trial Pro debe vencer de forma predecible y aplicar limites de plan basico/free.

**Criterios de aceptacion**

- Una suscripcion trial vencida no conserva permisos Pro.
- La app informa al usuario que el periodo de prueba termino.
- Los socios/testers pueden quedar en Pro activo manualmente sin depender del trial.

### 3.3 Tests y build

**Criterios de aceptacion**

- La suite backend corre sin errores de entorno.
- Los tests existentes se actualizan si el contrato de API cambio por multi-animal.
- `npm run build` corre sin errores.
- Los comandos de verificacion quedan documentados en esta spec o en README futuro.

### 3.4 Baseline tecnico retomado

Fecha de verificacion: 2026-05-22.

**Backend**

Comando:

```bash
make test
```

Resultado:

- 48 tests pasan.
- La DB local corre con Docker Compose.
- Fuera de Docker, usar `DB_HOST=127.0.0.1`; dentro de Docker se mantiene `DB_HOST=db`.

**Frontend**

El build de codigo pasa.

Comando usado para validar sin tocar el `dist` bloqueado:

```bash
make build-frontend-temp
```

Resultado:

- Build exitoso.
- Queda warning de chunks grandes, no bloqueante para MVP.

**Deuda de entorno**

`frontend/dist` quedo con ownership `nobody:nogroup` por un build previo en contenedor. Eso bloquea `npm run build` con el `outDir` por defecto. Para restaurar el build normal hay que borrar o cambiar permisos de `frontend/dist` desde el host:

```bash
sudo rm -rf frontend/dist
```

No es codigo fuente; es artefacto generado.

**Comandos rapidos**

Se agrega un `Makefile` en la raiz con targets:

```bash
make help
make up
make down
make logs
make migrate
make test
make build-frontend
make build-frontend-temp
make backup-db
make restore-db FILE=backups/archivo.sql
```

---

## 4. Fuera del MVP

Estas ideas son importantes, pero no deben bloquear la publicacion inicial:

- Migrar frontend a Vercel.
- Verduleria avanzada sin validar con usuario real.
- Sistema de envios.
- Marketplace de modulos con busqueda, categorias, instalacion/desinstalacion compleja, cobro por modulo o ranking.
- Optimizacion avanzada de pricing por negocio.
- App mobile nativa.
- Facturacion o integraciones fiscales.

---

## 5. Despliegue: AWS actual vs Vercel para frontend

### Estado actual

El proyecto ya contempla despliegue en AWS con:

- Backend como contenedor.
- Frontend servido por nginx.
- Traefik como proxy y TLS.
- Dominios separados para frontend y API.

### Opcion futura: frontend en Vercel

Vercel es viable para el frontend porque el cliente es React + Vite y produce assets estaticos. Segun la documentacion oficial de Vercel para Vite, el flujo natural es conectar el repo, configurar variables de entorno `VITE_*` y dejar que Vercel ejecute el build.

Para La Balanza, la migracion implicaria:

- Mantener backend y DB en AWS.
- Publicar solo `frontend/` en Vercel.
- Configurar `VITE_API_BASE_URL` apuntando a la API productiva.
- Revisar CORS/CSRF si el frontend queda en otro dominio.
- Configurar redirects/rewrites para rutas SPA.
- Mantener variables no secretas del cliente con prefijo `VITE_`.

**Decision propuesta para MVP**

No migrar antes de publicar. Mantener AWS mientras se estabiliza el MVP.

**Decision propuesta para release futura**

Evaluar Vercel si se busca:

- Deploy previews por PR.
- Publicacion frontend mas simple.
- Mejor DX visual para iterar UI.
- Separar ciclo de deploy frontend/backend.

---

## 6. Roadmap de producto

### Release 1 - MVP modular inicial

Objetivo: publicar La Balanza como motor modular de calculo de costos.

Incluye:

- Seleccion multiple de modulos en bienvenida.
- Modulos Vaca, Cerdo y Pollo.
- Modulo Verduleria si la logica queda validada mediante entrevista y spec aprobada.
- Configuracion personal para activar/desactivar modulos.
- Trial Pro de 5 dias para clientes nuevos.
- Activacion manual de Pro para socios/testers.
- Historial limitado para Free.
- PDF solo Pro.
- Admin interno para gestionar clientes y precios.
- Panel admin mostrando plan, estado, vencimiento y modulos activos/adquiridos.

### Release 1.1 - Pulido comercial

Objetivo: mejorar adopcion sin cambiar el dominio.

Posibles mejoras:

- Mejor onboarding de nombre de carniceria.
- Estados vacios con CTA claros.
- Datos demo o plantilla inicial visible.
- Textos de plan mas claros.
- Checklist de publicacion.

### Release 2 - Modulos ampliados

Objetivo: agregar nuevos modulos luego de validar que el patron vaca/cerdo/pollo/verduleria funciona.

Hipotesis:

- Carniceria y verduleria comparten logica de compra, rendimiento, merma, margen y precio sugerido.
- Cambian nombres del negocio, unidades, plantillas y conceptos de merma.

Primer alcance posible posterior al MVP:

- Renombrar internamente `Carniceria` a un concepto mas general solo si hace falta.
- Mantener una arquitectura de plantillas por modulo.
- Agregar nuevos modulos sin tocar el core de calculo cuando sea posible.

No incluir en esta release:

- Stock avanzado.
- Proveedores multiples.
- Recetas/combos.
- Caja o POS.

### Release 3 - Envios

Objetivo: permitir operar entregas simples sobre pedidos o listas de precios.

Primer alcance posible:

- Clientes finales.
- Direcciones.
- Pedido simple.
- Estado de envio: pendiente, en camino, entregado, cancelado.
- Costo de envio manual.
- Notas para repartidor.

Decision pendiente:

- Si los envios pertenecen a La Balanza como producto principal o a un modulo separado.
- Si hay que modelar pedidos antes que envios.
- Si se integra WhatsApp, mapas o pagos.

---

## 7. Orden de trabajo propuesto

1. Aprobar esta spec.
2. Crear spec de descubrimiento para verduleria.
3. Hacer encuesta/entrevista con verdulero y documentar reglas.
4. Aprobar alcance de verduleria MVP.
5. Corregir entorno local y permisos de build.
6. Ejecutar tests/build para obtener baseline.
7. Implementar bienvenida con seleccion multiple de modulos y ajustes de modelo necesarios.
8. Implementar verduleria si la spec queda aprobada.
9. Corregir bugs bloqueantes del MVP.
10. Actualizar tests.
11. Revalidar backend y frontend.
12. Dejar resumen de estado y proxima decision de release.

---

## 8. Descubrimiento para verduleria

Antes de implementar verduleria, se debe hacer una encuesta similar a la que se hizo con el carnicero. El objetivo es capturar la logica real del negocio y evitar copiar ciegamente el modelo de carniceria.

### 8.1 Preguntas de entrevista

#### Contexto del negocio

- Que tipo de verduleria es: barrio, autoservicio, mayorista, reparto, mixto?
- Compra principalmente por cajon, bolsa, kilo, unidad o bulto?
- Vende principalmente por kilo, unidad, paquete, atado o combo?
- Que productos son los mas importantes para calcular bien?

#### Compra y costo

- Como registra una compra tipica?
- Que datos mira: precio por cajon, peso estimado, peso real, cantidad de unidades, flete, comision?
- El costo de flete se reparte entre todos los productos o se absorbe por compra?
- Usa precio promedio cuando compra el mismo producto a distintos proveedores?
- Cambia el precio durante el dia o durante la semana?

#### Merma y rendimiento

- Que significa "merma" en verduleria?
- La merma se calcula por producto, por compra, por dia o a ojo?
- Hay productos con descarte fijo esperado?
- Que pasa con mercaderia golpeada o madura: se remata, se tira, se procesa?
- Se recupera algo de la merma vendiendo ofertas, bolsas o combos?

#### Margen y precio de venta

- Como decide el precio de venta?
- Usa margen fijo por producto o por categoria?
- Hay productos gancho con menor margen?
- Redondea precios? A que unidad: $10, $50, $100?
- Calcula precio minimo para no perder plata?
- Que productos necesitan precio sugerido mas urgente?

#### Stock y rotacion

- Controla stock o solo compra/vende por experiencia?
- Cuantos dias espera vender cada producto?
- La vida util afecta el margen?
- Hay alertas utiles: producto viejo, margen bajo, mucha merma?

#### Operacion diaria

- Que seria una "compra" dentro de la app para el verdulero?
- Que seria una "lista de precios" util?
- Necesita imprimir o compartir por WhatsApp?
- Quien cargaria los datos y en que momento del dia?

#### Envios y pedidos

- Hace envios actualmente?
- Como recibe pedidos: WhatsApp, telefono, mostrador, redes?
- Necesita armar pedidos antes de calcular envio?
- El costo de envio lo paga el cliente, se absorbe o depende de distancia/monto?

### 8.2 Entregable de la entrevista

Despues de la entrevista se debe crear una spec nueva:

`docs/specs/18-verduleria-costeo.md`

Esa spec debe definir:

- Glosario de verduleria.
- Modelo minimo de datos.
- Formula de costo.
- Formula de merma/rendimiento.
- Formula de precio minimo.
- Formula de precio sugerido.
- Plantilla inicial de productos.
- Wireframes necesarios.
- Criterios de aceptacion.
- Que queda fuera del MVP de verduleria.

---

## 9. Referencias

- Vercel - Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite
- Vercel - Environment Variables: https://vercel.com/docs/environment-variables
