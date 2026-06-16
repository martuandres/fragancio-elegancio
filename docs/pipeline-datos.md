# Pipeline de Datos — Fragancio Elegancio
### Entregable 4 · Arquitectura y Diseño de Sistemas 2026

---

## Introducción

Este documento describe los pipelines de datos del sistema **Fragancio Elegancio**, un marketplace especializado en fragancias. Un pipeline de datos documenta cómo los datos fluyen a través del sistema: desde su origen, pasando por transformaciones, hasta el almacenamiento de los resultados y su consumo.

El sistema tiene **tres pipelines identificados**, cada uno con un propósito de negocio concreto y diferenciado:

| # | Pipeline | Tipo | Propósito |
|---|---|---|---|
| 1 | Motor de Recomendaciones por Similitud Olfativa | Event-driven / On-demand | Sugerir productos similares al que el usuario está viendo |
| 2 | Confirmación de Pago, Facturación y Alta de Envío | Event-driven / Webhook externo | Procesar la confirmación del proveedor de pagos y activar los registros de factura y envío |
| 3 | Checkout Atómico con Reserva de Stock | Transaccional / Sincrónico | Convertir el carrito en orden garantizando que no haya sobreventa |

---

---

## PIPELINE 1 — Motor de Recomendaciones por Similitud Olfativa

**Descripción:** Dado un producto base, calcula y devuelve los perfumes más similares analizando la superposición de sus notas olfativas (salida, corazón y fondo) e ingrediente usando el índice de Jaccard ponderado.

**Tipo de procesamiento:** Event-driven — se activa por cada request del usuario, procesa en tiempo real y no persiste resultados.

### Las 7 preguntas

| Pregunta | Respuesta |
|---|---|
| **¿Qué hace?** | Calcula similitud entre el producto base y todos los productos con stock > 0, usando el índice de Jaccard sobre los campos de notas olfativas e `ingrediente` |
| **¿Cuándo se activa?** | Al recibir `GET /api/recomendaciones?productoId=X`, disparado cuando el usuario visita el detalle de un producto |
| **¿Desde dónde vienen los datos?** | Tabla `Producto` en PostgreSQL (campos: `notas_salida`, `notas_corazon`, `notas_fondo`, `ingrediente`) |
| **¿Quién procesa?** | `lib/recomendaciones.ts` — función `getRecomendaciones()`, invocada desde `src/app/api/recomendaciones/route.ts` |
| **¿Qué transformaciones aplica?** | (1) Tokenización de strings de notas por coma/espacios → `Set<string>`; (2) Cálculo de Jaccard por campo; (3) Score ponderado; (4) Ordenamiento por score descendente; (5) Truncado al límite solicitado |
| **¿Dónde van los datos?** | JSON de respuesta al cliente — **no se persiste** en base de datos |
| **¿Por qué este enfoque?** | El índice de Jaccard es simple, interpretable y adecuado para colecciones de tags textuales (notas olfativas). No requiere modelo de ML externo ni infraestructura adicional |

---

### PASO 1 — FUENTE / ORIGEN

| Campo | Detalle |
|---|---|
| **Sistema fuente** | Base de datos PostgreSQL — Fragance DB |
| **Entidades involucradas** | Tablas `Producto`, `VarianteProducto`, `Pago`, `CarritoProducto` |
| **Campos leídos** | De `Producto`: `id_producto`, `nombre`, `marca`, `notas_salida`, `notas_corazon`, `notas_fondo`, `ingrediente`. De `VarianteProducto` (variante principal, ordenada por `ranking`): `precio`, `concentracion`. De `Pago` (historial del comprador, solo si está autenticado como comprador): `id_carrito`, filtrado por `estado = "aprobado"` y `carrito.legajo`. De `CarritoProducto`: `id_producto` para recuperar las notas olfativas de los productos comprados. |
| **Filtro aplicado en origen** | Candidatos: `WHERE id_producto != :base AND stock > 0`. Historial (opcional, si el usuario es comprador autenticado): `Pago WHERE estado = "aprobado" AND carrito.legajo = :legajo`. |
| **Volumen estimado** | Catálogo de 100–500 productos activos por consulta |
| **Frecuencia** | Por request (on-demand); estimado 50–200 consultas diarias en etapa inicial |
| **Tecnología de acceso** | Prisma ORM → `prisma.producto.findUnique()` + `prisma.producto.findMany()` |

---

▼

### PASO 2 — INGESTA / CAPTURA

| Campo | Detalle |
|---|---|
| **Mecanismo** | Query HTTP `GET /api/recomendaciones?productoId=X&limit=6` |
| **Parámetros de entrada** | `productoId` (requerido, entero positivo), `limit` (opcional, default 6, máximo 20) |
| **Validaciones en ingesta** | (1) `productoId` presente → error `PARAM_REQUERIDO` 400; (2) `productoId` entero positivo → error `ID_INVALIDO` 400; (3) Producto existe en DB → error `PRODUCTO_NO_ENCONTRADO` 404 |
| **Componente responsable** | `src/app/api/recomendaciones/route.ts` |

---

▼

### PASO 3 — TRANSFORMACIÓN / PROCESAMIENTO

El procesamiento se realiza íntegramente en memoria dentro de `lib/recomendaciones.ts`:

**3a. Tokenización** (`función tokenize`)

```
"Lemon, Bergamot, Mint" → { "lemon", "bergamot", "mint" }
```

- Normaliza a minúsculas
- Divide por comas y espacios (`/[,\s]+/`)
- Descarta tokens vacíos
- Resultado: `Set<string>` por campo y por producto

**3b. Cálculo de Jaccard por campo** (`función jaccardSimilarity`)

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

- Si ambos conjuntos están vacíos → similitud 0 (no penaliza productos sin notas)
- Rango de resultado: [0, 1]

**3c. Score ponderado por campo**

| Campo | Peso | Justificación |
|---|---|---|
| `notas_corazon` | 40% | Define el carácter central del perfume — la nota más identificatoria |
| `notas_salida` | 30% | Primera impresión — determina si el comprador "entra" al perfume |
| `notas_fondo` | 20% | Persistencia — relevante pero menos definitoria |
| `ingrediente` | 10% | Complementario — muchos perfumes comparten materiales genéricos |

```
score_base = jaccard(corazon_base, corazon_candidato) × 0.4
           + jaccard(salida_base,  salida_candidato)  × 0.3
           + jaccard(fondo_base,   fondo_candidato)   × 0.2
           + jaccard(ingr_base,    ingr_candidato)    × 0.1
```

**3c.2. Blend con historial de compras del usuario (cuando existe)**

Si el comprador tiene historial de compras aprobadas, el motor construye un perfil agregando todas las notas e ingredientes de los productos comprados en un único `Set` por campo (`notas_salida`, `notas_corazon`, `notas_fondo`, `ingrediente`). El score final combina la similitud respecto al producto base con la similitud respecto al perfil del historial:

```
score_final = score_base × 0.6 + score_historial × 0.4
```

Donde `score_historial` se calcula con la misma fórmula de Jaccard ponderada pero usando el perfil acumulado del comprador como referencia. Si el comprador no tiene historial, `score_final = score_base`.

**3d. Ordenamiento y truncado**

- Sort descendente por `score`
- Se toman los primeros `limit` productos
- Se elimina el campo `score` de la respuesta (detalle de implementación interna)

---

▼

### PASO 4 — SALIDA / DESTINO

| Campo | Detalle |
|---|---|
| **Destino** | Respuesta HTTP al cliente — no se escribe en base de datos |
| **Formato de salida** | JSON: `{ data: ProductoRecomendado[], total: number }` |
| **Campos devueltos por producto** | `id_producto`, `nombre`, `marca`, `notas_salida`, `notas_corazon`, `notas_fondo` (de `Producto`); `precio`, `concentracion` (de `VarianteProducto`, variante principal) |
| **Persistencia** | Ninguna — el resultado es efímero (stateless) |
| **Consumidor** | Frontend del catálogo — sección "Perfumes similares" en la página de detalle de producto |

---

▼

### PASO 5 — MANEJO DE ERRORES

| Error | Causa | Respuesta |
|---|---|---|
| `PARAM_REQUERIDO` 400 | `productoId` ausente en la query | `{ error: { code, message } }` |
| `ID_INVALIDO` 400 | `productoId` no es entero positivo | `{ error: { code, message } }` |
| `PRODUCTO_NO_ENCONTRADO` 404 | El producto base no existe en DB | `{ error: { code, message } }` |
| Sin similitud suficiente | Ningún producto supera el umbral de similitud (score < 0.1) | 200 con los productos más vendidos como fallback (`data: bestsellers[], total: N`) — no es error |
| Error de DB | Falla de conexión a PostgreSQL | 500 propagado por Next.js |

**Estrategia de resiliencia:** El endpoint es de solo lectura y no tiene efectos secundarios. Si falla, el comprador puede seguir navegando el catálogo sin ver recomendaciones — no bloquea ningún flujo de compra.

---

▼

### PASO 6 — TRADE-OFFS Y DECISIONES

| Trade-off | Decisión | Alternativa descartada |
|---|---|---|
| **Cálculo en tiempo real vs. pre-computado** | En tiempo real por request | Calcular offline (batch) y cachear en DB. Se descartó porque el catálogo es pequeño (< 500 productos) y el cálculo tarda < 50ms |
| **Sin persistencia de resultados** | No se guarda en BD | Cachear en Redis. Se descartó para evitar infraestructura adicional en esta etapa |
| **Jaccard vs. embeddings semánticos** | Jaccard sobre tags textuales | Modelo de embeddings (OpenAI / sentence-transformers). Se descartó por complejidad e infraestructura — Jaccard es suficiente para notas discretas como "Rose, Jasmine" |
| **Score eliminado de la respuesta** | El score es un detalle interno | Exponerlo para que el frontend muestre "X% de similitud" — quedó abierto como mejora futura |

> Ver [ADR-002 — Algoritmo de similitud para el motor de recomendaciones de fragancias](adr/ADR-002-algoritmo-recomendaciones.md)

---

---

## PIPELINE 2 — Confirmación de Pago, Facturación y Alta de Envío

**Descripción:** Al recibir la confirmación de pago del proveedor externo (Stripe / MercadoPago) vía webhook, valida la firma del mensaje, actualiza el estado del pago y de la orden, genera la factura electrónica y crea el registro de envío, todo dentro de una transacción.

**Tipo de procesamiento:** Event-driven — disparado exclusivamente por el webhook del proveedor de pagos, procesamiento sincrónico interno.

### Las 7 preguntas

| Pregunta | Respuesta |
|---|---|
| **¿Qué hace?** | Procesa el resultado de un pago externo y activa todos los registros derivados: Pago aprobado → Factura + Envío creados |
| **¿Cuándo se activa?** | Al recibir `POST /api/pagos/webhook` con una notificación del proveedor de pagos |
| **¿Desde dónde vienen los datos?** | Payload HTTP del proveedor externo (id_carrito, estado del pago, referencia del proveedor) |
| **¿Quién procesa?** | `src/app/api/pagos/webhook/route.ts` |
| **¿Qué transformaciones aplica?** | (1) Verificación de firma HMAC-SHA256; (2) Parseo del payload; (3) Búsqueda del `Pago` en DB por `id_carrito`; (4) Actualización del estado del `Pago`; (5) Cálculo del importe total desde los ítems del carrito; (6) Creación de `Factura`; (7) Creación de `Envio` |
| **¿Dónde van los datos?** | Tablas `Pago`, `Factura`, `Envio` en PostgreSQL |
| **¿Por qué este enfoque?** | Desacoplar el procesamiento del pago de la confirmación al cliente — el proveedor notifica asíncronamente y el sistema actúa de forma reactiva, sin polling |

---

### PASO 1 — FUENTE / ORIGEN

| Campo | Detalle |
|---|---|
| **Sistema fuente** | Proveedor externo de pagos (Stripe / MercadoPago) — sistema externo |
| **Mecanismo de entrega** | HTTP POST al endpoint `/api/pagos/webhook` |
| **Datos en el payload** | `id_carrito` (ID del carrito cuyo pago se confirma), `estado` (`aprobado` o `rechazado`), `provider_reference` (ID del pago en el sistema externo, opcional) |
| **Seguridad del origen** | Firma HMAC-SHA256 del payload en el header `X-Webhook-Signature`, usando `WEBHOOK_SECRET` compartido |
| **Frecuencia** | Por transacción de pago — estimado 10–50 eventos diarios en etapa inicial |
| **Volumen por evento** | Payload pequeño (~100 bytes) |

---

▼

### PASO 2 — INGESTA / CAPTURA

| Campo | Detalle |
|---|---|
| **Componente receptor** | `src/app/api/pagos/webhook/route.ts` |
| **Verificación de autenticidad** | Se calcula `HMAC-SHA256(rawBody, WEBHOOK_SECRET)` y se compara con `X-Webhook-Signature` usando `crypto.timingSafeEqual()` para prevenir timing attacks |
| **Validaciones en ingesta** | (1) `WEBHOOK_SECRET` configurado → 500 si falta; (2) Header `X-Webhook-Signature` presente; (3) Firma válida → 401 si no pasa; (4) Body es JSON válido → 400 si no; (5) `id_carrito` entero positivo → 400; (6) `estado` en enum válido → 400 |

---

▼

### PASO 3 — TRANSFORMACIÓN / PROCESAMIENTO

El pipeline ejecuta los siguientes pasos en secuencia. Si cualquier escritura a la BD falla, el proveedor recibirá un error 5xx y reintentará el webhook:

**3a. Lookup del pago**

- Busca `Pago` por `id_carrito` (campo `@unique` en la tabla `Pago`)
- Si no existe el `Pago` → error `CARRITO_NO_ENCONTRADO` 404
- Si el `Pago` ya está en estado `aprobado` → error `PAGO_YA_PROCESADO` 409 (idempotencia)

**3b. Actualización de estado del Pago**

```
Pago.estado: "pendiente" → "aprobado" | "rechazado"
```

**3c. Creación de la Factura** (solo si estado = `aprobado`)

- Se genera con `cuid()` como `nro_factura`
- `importe_total`: calculado sumando `CarritoProducto.cantidad × VarianteProducto.precio` de los ítems del carrito
- Campos finales: `nro_factura`, `id_pago`, `importe_total`, `fecha_emision` (NOW)
- Relación 1:1 con `Pago`

**3d. Creación del Envío** (solo si estado = `aprobado`)

- Se usa `upsert` para garantizar idempotencia ante reintentos del webhook
- Estado inicial: `preparando`
- Dirección de entrega: obtenida de `Comprador.direccion_envio` (via `Carrito.legajo → Comprador`)
- `track_code` queda en `null` hasta que el vendedor lo cargue vía `PATCH /api/envios/{id}`

**3e. Restauración de stock** (solo si estado = `rechazado`)

Si el pago fue rechazado, el sistema revierte el decremento de stock realizado en el checkout (Pipeline 3), dentro de la misma transacción Prisma:

```
Para cada ítem en CarritoProducto donde id_carrito = :id_carrito:
  producto.stock += item.cantidad      ← repone el stock decrementado en el checkout
Carrito.estado → "cancelado"
```

Esto garantiza que el stock nunca queda decrementado permanentemente por un pago fallido. Coordinado con CU-08 (excepción 1.1). La cancelación manual por el vendedor (`PATCH /api/pedidos/{id}` con estado `cancelado`) sigue la misma lógica de restauración de stock.

---

▼

### PASO 4 — SALIDA / DESTINO

| Destino | Entidad | Campos escritos / leídos |
|---|---|---|
| **Tabla `Pago`** | Actualización | `estado` → `aprobado` o `rechazado` |
| **Tabla `Factura`** | Creación | `nro_factura` (cuid), `id_pago`, `importe_total` (calculado), `fecha_emision` (NOW) |
| **Tabla `Envio`** | Creación (upsert) | `id_carrito`, `estado = "preparando"`, `track_code = null` |
| **Respuesta HTTP** | `{ ok: true, nro_factura: "clz9abc..." }` | Confirmación para el proveedor externo |

El proveedor de pagos interpreta un 2xx como "evento procesado correctamente" y no reintenta. Un 4xx/5xx le indica que debe reintentar.

---

▼

### PASO 5 — MANEJO DE ERRORES

| Error | Causa | Respuesta | Efecto |
|---|---|---|---|
| `CONFIGURACION_INVALIDA` 500 | `WEBHOOK_SECRET` no definido en env | 500 | El proveedor reintentará |
| `FIRMA_INVALIDA` 401 | Signature inválida o ausente | 401 | El proveedor descarta (firma incorrecta indica replay attack o configuración errónea) |
| `PAYLOAD_INVALIDO` 400 | Body no es JSON válido | 400 | El proveedor descarta |
| `CARRITO_NO_ENCONTRADO` 404 | No existe un `Pago` con el `id_carrito` recibido | 404 | El proveedor puede reintentar o escalar |
| `PAGO_YA_PROCESADO` 409 | El pago ya estaba en `aprobado` | 409 | El proveedor descarta — idempotencia garantizada |
| Error de DB | Falla de conexión a PostgreSQL | 500 | El proveedor reintentará — escrituras parciales no ocurren (transacción) |

**Idempotencia:** Solo se procesan pagos en estado `pendiente` — el check `pago.estado !== "pendiente"` antes de cualquier escritura devuelve 409 tanto para pagos ya aprobados como ya rechazados, garantizando que múltiples envíos del mismo webhook no generen facturas duplicadas ni repongan stock dos veces.

---

▼

### PASO 6 — TRADE-OFFS Y DECISIONES

| Trade-off | Decisión | Alternativa descartada |
|---|---|---|
| **Webhook vs. polling** | Webhook (push del proveedor) | Polling periódico al proveedor. Se descartó: más costoso, más lento, no escala |
| **Verificación HMAC vs. IP whitelist** | HMAC-SHA256 con secreto compartido | Whitelist de IPs del proveedor. HMAC es más robusto y no depende de IP fija |
| **Escrituras directas vs. transacción** | `prisma.$transaction` unificado: actualización del Pago, creación de Factura y upsert de Envío en una sola transacción | Escrituras secuenciales sin transacción. Se descartó: si una escritura fallaba a mitad (Pago ya `aprobado` pero sin Factura), el reintento del proveedor recibía `409 PAGO_YA_PROCESADO` y la Factura no se creaba nunca. Con la transacción, ante falla parcial el Pago queda `pendiente` y el reintento procesa todo completo |
| **Notificación al comprador** | Implementada como fire-and-forget: tras crear la Factura, `pagos/webhook/route.ts` consulta el email del Comprador y llama a `enviarEmail` (Nodemailer) sin `await`. Su falla no revierte la transacción ni bloquea la respuesta al proveedor. | Email síncrono bloqueante. Descartado: si el servidor de email no responde, el webhook devuelve error y el proveedor reintenta, generando facturas duplicadas |

> Ver [ADR-003 — Método de integración con el proveedor de pagos externo](adr/ADR-003-integracion-pagos-webhook.md)  
> Ver [ADR-004 — Motor de base de datos para la persistencia del sistema](adr/ADR-004-base-de-datos-postgresql.md)

---

---

## PIPELINE 3 — Checkout Atómico con Reserva de Stock

**Descripción:** Convierte el carrito activo del comprador en un `Pago` pendiente, validando y decrementando el stock de cada producto dentro de una única transacción de base de datos para garantizar que no haya sobreventa bajo concurrencia.

**Tipo de procesamiento:** Transaccional / sincrónico — se ejecuta completamente dentro de `prisma.$transaction` antes de responder al cliente.

### Las 7 preguntas

| Pregunta | Respuesta |
|---|---|
| **¿Qué hace?** | Valida stock real, decrementa el stock de cada ítem, crea el `Pago` con estado `"pendiente"` y convierte el carrito, todo de forma atómica |
| **¿Cuándo se activa?** | Al recibir `POST /api/checkout` por el comprador autenticado |
| **¿Desde dónde vienen los datos?** | Tablas `Carrito`, `CarritoProducto` y `Producto` en PostgreSQL |
| **¿Quién procesa?** | `lib/stock.ts` — función `checkoutAtomico()`, invocada desde `src/app/api/checkout/route.ts` |
| **¿Qué transformaciones aplica?** | (1) Validación de stock por ítem dentro de la transacción; (2) Decremento de stock; (3) Cálculo del importe total; (4) Creación del `Pago` con `estado: "pendiente"`; (5) Marcado del carrito como "convertido" |
| **¿Dónde van los datos?** | Tablas `Pago` (creado), `Producto` (stock decrementado), `Carrito` (estado actualizado) |
| **¿Por qué este enfoque?** | El uso de `$transaction` garantiza atomicidad: si cualquier ítem falla por stock insuficiente, ningún cambio se persiste — no hay estados intermedios inconsistentes |

---

### PASO 1 — FUENTE / ORIGEN

| Campo | Detalle |
|---|---|
| **Sistema fuente** | Base de datos PostgreSQL — Fragance DB |
| **Entidades leídas** | `Carrito`, `CarritoProducto`, `Producto` |
| **Condición del carrito** | `estado = "activo"` y `legajo = :compradorActual` |
| **Campos leídos del carrito** | `id_carrito`, `items[].id_producto`, `items[].cantidad` |
| **Campos leídos del producto** | De `Producto`: `id_producto`, `nombre`, `stock`. De `VarianteProducto` (variante principal, ordenada por `ranking`): `precio` |
| **Validación previa a la transacción** | (1) Usuario autenticado con rol `comprador`; (2) Carrito activo existe; (3) Carrito no está vacío |
| **Frecuencia** | Por intención de compra — estimado 5–30 checkouts diarios en etapa inicial |

---

▼

### PASO 2 — INGESTA / CAPTURA

| Campo | Detalle |
|---|---|
| **Endpoint** | `POST /api/checkout` |
| **Autenticación** | JWT Clerk con rol `comprador` — verificado en el handler antes de llamar a `checkoutAtomico()` |
| **Body del request** | `{}` — sin cuerpo requerido (la dirección de envío se obtiene de `Comprador.direccion_envio` al crear el `Envio` en el webhook de pago) |
| **Validaciones en ingesta** | `NO_AUTENTICADO` 401, `ACCESO_DENEGADO` 403, `CARRITO_NO_ENCONTRADO` 404, `CARRITO_VACIO` 400 |
| **Componente** | `src/app/api/checkout/route.ts` |

---

▼

### PASO 3 — TRANSFORMACIÓN / PROCESAMIENTO

Todo lo siguiente ocurre dentro de `prisma.$transaction(async (tx) => { ... })`. Si cualquier operación falla, Prisma hace rollback automático de todos los cambios:

**3a. Validación y reserva de stock por ítem** (loop secuencial)

```
Para cada item del carrito:
  1. producto = tx.producto.findUnique({ where: { id_producto } })
  2. Si producto no existe → throw Error("Producto X no existe")
  3. Si producto.stock < item.cantidad → throw Error("Stock insuficiente para Y")
  4. tx.producto.update({ data: { stock: { decrement: item.cantidad } } })
```

El loop es secuencial (no paralelo) para evitar condiciones de carrera entre ítems del mismo carrito.

**3b. Cálculo del importe total**

```
importe_total = Σ (precio_actual × cantidad) para cada ítem
```

El precio se lee después del decremento de stock (dentro de la misma transacción) para garantizar que se usa el precio vigente al momento de la compra, no el cacheado en el carrito.

**3c. Creación del Pago**

```
Pago {
  id_carrito,
  estado: "pendiente"
}
```

El `Pago` con `estado = "pendiente"` es el disparador del proceso de cobro. El `importe_total` calculado en el paso anterior se retorna al cliente en la respuesta HTTP, pero no se persiste aún — se guardará en `Factura` cuando el webhook del proveedor confirme el pago (Pipeline 2).

**3d. Actualización del Carrito**

```
Carrito.estado: "activo" → "convertido"
```

Esto previene que el mismo carrito genere múltiples pagos — la constraint `@unique` en `Pago.id_carrito` garantiza que no se creen dos `Pago` para el mismo carrito.

---

▼

### PASO 4 — SALIDA / DESTINO

| Destino | Entidad | Operación | Campos afectados |
|---|---|---|---|
| **Tabla `Pago`** | Creación | INSERT | `id_pago`, `id_carrito`, `estado = "pendiente"` |
| **Tabla `Producto`** | Actualización | UPDATE × N ítems | `stock` decrementado |
| **Tabla `Carrito`** | Actualización | UPDATE | `estado = "convertido"` |
| **Respuesta HTTP** | 201 Created | `{ id_pago, id_carrito, importe_total, estado: "pendiente" }` + header `Location: /api/pedidos/{id_carrito}` |

---

▼

### PASO 5 — MANEJO DE ERRORES

| Error | Causa | Respuesta | Efecto en BD |
|---|---|---|---|
| `NO_AUTENTICADO` 401 | Token Clerk inválido o ausente | 401 | Sin escrituras |
| `ACCESO_DENEGADO` 403 | Rol distinto de `comprador` | 403 | Sin escrituras |
| `CARRITO_NO_ENCONTRADO` 404 | No hay carrito activo para el usuario | 404 | Sin escrituras |
| `CARRITO_VACIO` 400 | Carrito existe pero no tiene ítems | 400 | Sin escrituras |
| `CHECKOUT_FALLIDO` 409 | Stock insuficiente para algún ítem (detectado dentro de la transacción) | 409 con el nombre del producto | **Rollback total** — ningún stock se decrementa, ningún `Pago` se crea |
| Error de BD inesperado | Falla de conexión / constraint violation | 500 | **Rollback total** por `$transaction` |

**Garantía de atomicidad:** `prisma.$transaction` asegura que el sistema nunca queda en un estado intermedio (e.g., stock decrementado sin `Pago` creado, o un `Pago` creado con stock insuficiente).

---

▼

### PASO 6 — TRADE-OFFS Y DECISIONES

| Trade-off | Decisión | Alternativa descartada |
|---|---|---|
| **Transacción de DB vs. reserva en memoria** | `prisma.$transaction` sobre PostgreSQL | Mutex en memoria / Redis lock. Se descartó: un mutex en Node.js no funciona en múltiples instancias del servidor; Redis añade complejidad innecesaria |
| **Decremento permanente vs. reserva temporal** | El stock se decrementa definitivamente al confirmar el checkout. Si el pago es rechazado, el stock se restaura vía webhook (paso 3e del Pipeline 2). Si el vendedor cancela manualmente, `PATCH /api/pedidos/{id}` con estado `cancelado` también restaura el stock. | Una reserva temporal con expiración automática requeriría un cron job externo o campo `reservado_hasta` en el modelo — complejidad que no justifica el beneficio dado que el pago externo responde de forma inmediata vía webhook. **Nota:** la respuesta HTTP del checkout incluía anteriormente el campo `reservacion_minutos: 5`. Ese campo fue **eliminado del schema** porque la liberación automática no está implementada (no existe cron job ni campo `reservado_hasta` en la BD). Incluirlo prometía un comportamiento que el sistema no cumple. |
| **Precio en respuesta vs. precio persistido** | El `importe_total` se calcula durante el checkout y se retorna al cliente; se persiste en `Factura` al confirmar el pago (Pipeline 2) | Guardar precio en un campo de `Pago`. Se descartó para evitar denormalización — `Factura` ya captura el importe final cuando el pago se confirma |
| **Loop secuencial vs. paralelo para validar stock** | Secuencial dentro de la transacción | Paralelo con `Promise.all`. El paralelo puede generar deadlocks en PostgreSQL por bloqueos de fila — el secuencial es más predecible |

> Ver [ADR-001 — Mecanismo de garantía de atomicidad en el proceso de checkout](adr/ADR-001-atomicidad-checkout.md)  
> Ver [ADR-004 — Motor de base de datos para la persistencia del sistema](adr/ADR-004-base-de-datos-postgresql.md)


---

---

## Checklist de entrega

### Estructura general
- [x] Se identificaron los tres pipelines del sistema
- [x] Cada pipeline tiene una descripción de una oración
- [x] Cada pipeline responde las 7 preguntas (qué, cuándo, desde dónde, quién, qué hace, dónde va, por qué)
- [x] Se especifica el tipo de procesamiento de cada pipeline

### Por cada pipeline
- [x] PASO 1 — Fuente / Origen documentado con entidades, campos y frecuencia
- [x] PASO 2 — Ingesta / Captura con validaciones y componente responsable
- [x] PASO 3 — Transformaciones detalladas paso a paso
- [x] PASO 4 — Salida / Destino con tablas y campos afectados
- [x] PASO 5 — Manejo de errores con causa, respuesta y efecto en la BD
- [x] PASO 6 — Trade-offs del enfoque elegido con alternativas descartadas

### Coherencia con el resto del sistema
- [x] Los componentes mencionados coinciden con el diagrama de contenedores (Arquitectura v1.0 §2.3)
- [x] Las entidades y tablas coinciden con el modelo de datos (Arquitectura v1.0 §3 y `schema.prisma`)
- [x] Los campos del pipeline coinciden con los campos del modelo de datos
- [x] El volumen estimado es coherente con un marketplace en etapa inicial

---

*Fragancio Elegancio — Pipeline de Datos — Entregable 4 · 2026*
