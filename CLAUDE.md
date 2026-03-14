# La Balanza — SaaS de costeo para carnicerías

## Contexto del producto
App B2B para carnicerías argentinas. Calcula el precio mínimo y sugerido de venta por corte en base al precio de compra de la media res, el rendimiento por corte, y el descarte (hueso y grasa).

## Stack
- Backend: Django + Django REST Framework
- Base de datos: PostgreSQL
- Contenedores: Docker + Docker Compose
- Python 3.12

## Metodología: SDD (Spec Driven Development)
Antes de escribir cualquier feature, siempre:
1. Escribir el spec en /docs/specs/nombre-feature.md
2. Aprobar el spec
3. Recién entonces escribir el código

Nunca escribir código sin spec aprobado.

## Estructura de apps Django
- `core` — modelos principales: Carniceria, Corte, Compra, CompraCorte
- `users` — autenticación y perfiles
- `api` — endpoints REST

## Modelos principales (ya definidos)
- User (AbstractUser)
- Carniceria (OneToOne con User)
- Corte (plantilla de cortes por carnicería)
- Compra (entrada de media res, cálculo de costo)
- CompraCorte (instancia editable de corte por compra)

## Reglas del proyecto
- Toda la lógica de negocio va en los modelos o en services/, nunca en las views
- Los cálculos de costeo son @property, no campos en DB
- Los precios siempre en DecimalField, nunca FloatField
- Español en nombres de modelos y variables de negocio
- Tests obligatorios para toda la lógica de costeo
