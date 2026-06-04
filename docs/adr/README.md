# Architecture Decision Records — Fragancio Elegancio

Registro de decisiones arquitectónicas del sistema. Cada ADR documenta el contexto del problema, las alternativas evaluadas, la decisión tomada y sus consecuencias.

| ID | Título | Categoría | Estado |
|---|---|---|---|
| [ADR-001](ADR-001-atomicidad-checkout.md) | Mecanismo de garantía de atomicidad en el proceso de checkout | Procesamiento / Consistencia | Aceptada |
| [ADR-002](ADR-002-algoritmo-recomendaciones.md) | Algoritmo de similitud para el motor de recomendaciones | Procesamiento de datos | Aceptada |
| [ADR-003](ADR-003-integracion-pagos-webhook.md) | Método de integración con el proveedor de pagos externo | Integración externa | Aceptada |
| [ADR-004](ADR-004-base-de-datos-postgresql.md) | Motor de base de datos para la persistencia del sistema | Persistencia | Aceptada |
| [ADR-005](ADR-005-autenticacion-clerk.md) | Proveedor de autenticación y gestión de identidad | Autenticación / Seguridad | Aceptada |

## Relación con pipelines de datos

| Pipeline | ADRs relacionados |
|---|---|
| Pipeline 1 — Motor de Recomendaciones | ADR-002, ADR-004 |
| Pipeline 2 — Confirmación de Pago, Facturación y Alta de Envío | ADR-003, ADR-004 |
| Pipeline 3 — Checkout Atómico con Reserva de Stock | ADR-001, ADR-004 |
| Transversal (todos los pipelines) | ADR-005 |

