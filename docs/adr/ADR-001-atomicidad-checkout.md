# ADR-001 — Mecanismo de garantía de atomicidad en el proceso de checkout

**Estado:** Aceptada  
**Fecha:** 2026-06-03  
**Categoría:** Procesamiento / Consistencia de datos  
**Pipeline relacionado:** Pipeline 3 — Checkout Atómico con Reserva de Stock

---

## 1. Contexto

El proceso de checkout requiere ejecutar múltiples operaciones sobre la base de datos de forma coordinada: validar stock disponible, decrementar el stock de cada producto, crear la `OrdenCompra` con sus ítems, y marcar el carrito como convertido.

El problema central es que **varios compradores pueden iniciar el checkout al mismo tiempo para el mismo producto**. Sin una estrategia de coordinación, dos compradores podrían ver stock disponible simultáneamente, pasar la validación, y ambos decrementar el mismo stock — resultando en una orden creada con stock negativo (sobreventa).

Motivadores que definen los requisitos de la solución:
- **Correctitud fuerte:** bajo ninguna circunstancia se puede generar una orden para un producto sin stock real.
- **Rollback total:** si cualquier ítem del carrito falla (sin stock), ninguna modificación debe persistir — ni de otros ítems que sí tenían stock.
- **Sin infraestructura adicional:** el proyecto ya tiene PostgreSQL y Prisma; agregar componentes nuevos tiene un costo de operación y complejidad.
- **Simplicidad operativa:** el equipo es pequeño y el sistema está en etapa inicial.

---

## 2. Alternativas consideradas

### Alternativa A: Transacción de base de datos con `prisma.$transaction`

Ejecutar todas las operaciones del checkout (validar, decrementar, crear orden) dentro de una única transacción ACID de PostgreSQL usando `prisma.$transaction`. Si cualquier operación falla, la transacción hace rollback automático.

- **Ventaja:** Atomicidad garantizada a nivel de motor de base de datos — no hay estados intermedios posibles. No requiere infraestructura adicional.
- **Desventaja:** Las transacciones largas bloquean filas en la base de datos. En escenarios de altísima concurrencia (miles de checkouts simultáneos del mismo producto), puede haber contención de locks y degradación de performance.

### Alternativa B: Bloqueo distribuido con Redis

Antes de ejecutar el checkout, adquirir un lock distribuido por `id_producto` en Redis. Solo el proceso que tiene el lock puede proceder. Al finalizar, liberar el lock.

- **Ventaja:** Escala bien horizontalmente (múltiples instancias del servidor comparten el estado del lock). Control fino por producto.
- **Desventaja:** Requiere agregar Redis como nueva dependencia de infraestructura (no está en el stack actual). Añade latencia de red para adquirir/liberar el lock. Introduce el problema de locks huérfanos si el proceso muere antes de liberar.

### Alternativa C: Mutex en memoria (application-level lock)

Usar un `Map` de promesas en el proceso Node.js para serializar los checkouts por `id_producto`.

- **Ventaja:** Sin dependencias externas, sin latencia de red.
- **Desventaja:** **No funciona** con múltiples instancias del servidor (cada instancia tiene su propio espacio de memoria). Como la aplicación puede escalar horizontalmente en Vercel, este enfoque es fundamentalmente incorrecto para producción.

### Alternativa D: Control de versiones optimista (Optimistic Locking)

Agregar un campo `version` a la tabla `Producto`. Al actualizar el stock, verificar que la versión no cambió desde que se leyó. Si cambió, reintentar la operación.

- **Ventaja:** No bloquea filas — mayor throughput bajo baja concurrencia.
- **Desventaja:** Requiere lógica de reintento en el aplicativo. Si hay alta concurrencia sobre el mismo producto, puede haber muchos reintentos fallidos. Más difícil de implementar correctamente.

---

## 3. Decisión

Se usa **`prisma.$transaction` (Alternativa A)** para garantizar la atomicidad del checkout.

Todas las operaciones — validación de stock, decremento, creación de `OrdenCompra`, inserción de `ProductoOrden` y actualización del `Carrito` — se ejecutan dentro de una única transacción ACID de PostgreSQL.

---

## 4. Fundamentación

- **Conecta con el requisito de correctitud fuerte:** PostgreSQL garantiza aislamiento SERIALIZABLE dentro de la transacción — es imposible que dos transacciones concurrentes pasen la validación de stock del mismo producto si el stock es insuficiente para ambas.
- **Conecta con el requisito de rollback total:** Si el stock de cualquier ítem es insuficiente, el `throw` dentro de la transacción dispara el rollback automático de Prisma — ningún otro ítem queda con stock decrementado.
- **Conecta con el requisito de sin infraestructura adicional:** PostgreSQL ya está en el stack. No se agrega ningún componente nuevo.
- **Redis fue descartado** por este mismo motivador: agrega una dependencia de infraestructura que el equipo tendría que operar (gestión de TTL de locks, monitoring, failover).
- **El mutex en memoria fue descartado** porque es arquitectónicamente incorrecto para un sistema que puede correr en múltiples instancias.
- **El optimistic locking fue descartado** porque la lógica de reintento a nivel aplicativo añade complejidad sin beneficio tangible para el volumen de tráfico esperado en la etapa inicial.

---

## 5. Consecuencias

### Positivas
- La sobreventa es **imposible por diseño** — la garantía la da el motor de base de datos, no el código de aplicación.
- El rollback es **automático y total** — el desarrollador no necesita implementar lógica de compensación manual.
- El stack tecnológico permanece simple: un solo servidor de base de datos, sin coordinadores distribuidos.
- La implementación en `lib/stock.ts` es legible y auditable.

### Negativas / Trade-offs
- **Contención de locks bajo alta concurrencia:** Si muchos compradores hacen checkout del mismo producto simultáneamente, las transacciones se serializan y las más lentas esperan. Para el volumen inicial del marketplace esto no es un problema, pero sería un cuello de botella a escala masiva.
- **Transacciones largas:** Si el carrito tiene muchos ítems, la transacción tarda más y mantiene los locks más tiempo. Mitigado por el límite implícito de ítems por carrito.
- **No escala a múltiples bases de datos:** Si en el futuro se distribuye el catálogo en múltiples shards, `$transaction` local deja de ser suficiente. Requeriría Two-Phase Commit o sagas distribuidas.
