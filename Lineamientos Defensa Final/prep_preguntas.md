# Preparación de Preguntas — Presentación Final
### Las 15 preguntas más probables del tribunal · Fragancio Elegancio · Grupo 17

> Criterios de evaluación a los que apunta cada pregunta: **Demo** (3 pts) · **Coherencia** con la arquitectura (3 pts) · **Profundidad técnica** (1.5 pts).
> Regla general para responder: (1) decisión, (2) alternativas descartadas y por qué, (3) trade-off aceptado. Nunca esconder lo no implementado — nombrarlo como decisión de alcance con criterio.

---

### 1. "¿Qué pasa si dos compradores intentan comprar el último perfume en stock exactamente al mismo tiempo?"

**Apunta a:** Profundidad técnica + Coherencia (es LA pregunta de este proyecto — Regla de Negocio 1).

**Respuesta modelo:** Todo el checkout corre dentro de una única transacción ACID de PostgreSQL vía `prisma.$transaction` (`lib/stock.ts`). La transacción valida `stock >= cantidad` por cada ítem y lo decrementa en la misma operación. PostgreSQL serializa las escrituras sobre la misma fila: la segunda transacción espera a que la primera termine, y cuando relee el stock ya está en 0, falla la validación y hace rollback total — devolvemos `CHECKOUT_FALLIDO 409` con el nombre del producto. La sobreventa es imposible por diseño porque la garantía la da el motor de base de datos, no nuestro código de aplicación.

---

### 2. "¿Por qué una transacción de base de datos y no un lock distribuido con Redis?"

**Apunta a:** Profundidad técnica (alternativas del ADR de atomicidad).

**Respuesta modelo:** Evaluamos cuatro alternativas. Redis escala bien horizontalmente pero agrega una dependencia de infraestructura que habría que operar (TTL de locks, failover, locks huérfanos si un proceso muere sin liberar) — para nuestro volumen es sobre-ingeniería. El mutex en memoria de Node.js es directamente incorrecto: con múltiples instancias del servidor cada una tiene su propia memoria. El optimistic locking con campo `version` exige lógica de reintentos en la aplicación sin beneficio claro. La transacción usa lo que ya teníamos (PostgreSQL), con rollback automático. Trade-off aceptado: contención de locks si miles de personas compran el mismo producto a la vez — a esa escala migraríamos.

---

### 3. "Documentan una reserva de stock de 5 minutos. ¿Está implementada? ¿Qué pasa si el usuario nunca paga?"

**Apunta a:** Coherencia (te van a comparar doc vs. demo) — pregunta trampa si no se responde con honestidad.

**Respuesta modelo:** La reserva de 5 minutos está especificada (CU-03, Regla de Negocio 4) pero **la liberación automática no está implementada** — es una decisión de alcance documentada. Hoy el stock se decrementa definitivamente en el checkout, y se recupera solo si el webhook notifica pago rechazado o por corrección manual del vendedor. Implementarla bien requiere un campo `reserva_expira TIMESTAMP` y un job que libere reservas vencidas — y en serverless no podés tener un timer en memoria, necesitás un cron externo. Lo dejamos fuera porque no compromete la integridad: nunca se vende sin stock; en el peor caso un producto queda bloqueado hasta la conciliación. Es lo primero que haríamos en la próxima iteración.

---

### 4. "¿Por qué el índice de Jaccard y no embeddings o machine learning para las recomendaciones?"

**Apunta a:** Profundidad técnica (ADR de recomendaciones).

**Respuesta modelo:** Las fragancias se describen con conjuntos de tags discretos ("Rose, Jasmine, Bergamot") — el escenario ideal para Jaccard: `|A∩B| / |A∪B|` por campo, ponderado: corazón 40% (define el carácter del perfume), salida 30%, fondo 20%, ingredientes 10%. Embeddings capturan semántica pero agregan API externa de pago, latencia y costo — desproporcionado para cientos de productos. El filtrado colaborativo era inviable por cold start: sin historial de compras en el lanzamiento, no recomendaría nada. Jaccard funciona desde el día 1, es interpretable y corre en memoria en milisegundos. Trade-off: "Rose" y "Rosa" son tokens distintos — la calidad depende de la consistencia de carga de datos.

---

### 5. "¿Cómo evitan que alguien falsifique una confirmación de pago y obtenga productos gratis?"

**Apunta a:** Profundidad técnica + Demo (si muestran el curl del webhook).

**Respuesta modelo:** El webhook exige el header `X-Webhook-Signature` con HMAC-SHA256 del body crudo, calculado con un secreto compartido (`WEBHOOK_SECRET`) que solo conocen el proveedor y nosotros. Sin el secreto es computacionalmente inviable generar una firma válida. Además comparamos con `crypto.timingSafeEqual()` para prevenir timing attacks — una comparación de strings normal devuelve más rápido cuanto antes difiere el primer byte, lo que filtra información. Descartamos la whitelist de IPs porque las IPs del proveedor cambian sin aviso y son falsificables en ciertos contextos; HMAC es el estándar de Stripe y MercadoPago.

---

### 6. "¿Qué pasa si el proveedor de pagos envía el mismo webhook dos veces?"

**Apunta a:** Profundidad técnica (idempotencia).

**Respuesta modelo:** Es el comportamiento normal de los webhooks — los proveedores reintentan hasta recibir 2xx. El handler es idempotente: antes de escribir, verifica si el `Pago` ya está `aprobado`; si lo está, responde `409 PAGO_YA_PROCESADO` sin crear factura ni envío duplicados. Además el `Envio` se crea con `upsert` y las constraints `@unique` en BD (`Pago.id_carrito`, `Factura.id_pago`) son la última línea de defensa: aunque el código fallara, el motor rechaza el duplicado.

---

### 7. "¿Y si el webhook nunca llega? ¿El pago queda pendiente para siempre?"

**Apunta a:** Profundidad técnica (límites del diseño — pregunta de seguimiento de la 6).

**Respuesta modelo:** Sí, es un trade-off documentado del modelo asíncrono. Los proveedores reintentan automáticamente ante 5xx, lo que cubre caídas momentáneas nuestras. Pero si los reintentos se agotan, el `Pago` queda `pendiente` con el stock decrementado. La solución diseñada (no implementada) es una **conciliación periódica**: un job que consulte a la API del proveedor por los pagos pendientes con más de X minutos y los resuelva. Lo importante es que el modo de falla es seguro: queda stock bloqueado, nunca una venta sin pago.

---

### 8. "El README habla de microservicios pero ustedes despliegan un solo artefacto. ¿Qué es esto realmente?"

**Apunta a:** Coherencia (inconsistencia real entre documentos — mejor adelantarse).

**Respuesta modelo:** Es un **monolito modular** y lo documentamos como decisión arquitectónica explícita. Los "contenedores" del C4 (Servicio Catálogo, Lógica de Negocio, Servicio Usuarios) son separaciones lógicas de responsabilidad dentro de un único proceso Next.js, con boundaries por directorio (`/api/catalogo`, `/api/checkout`, `lib/stock.ts`). Microservicios reales habrían requerido transacciones distribuidas para el checkout — incompatible con el RNF de integridad — y carga operativa injustificable para un equipo de cinco. El RNF de escalado diferencial se satisface igual: en serverless cada ruta escala como función independiente aunque compartan codebase. Los boundaries internos dejan preparada la extracción futura de un dominio si el volumen lo justifica.

---

### 9. "¿Por qué PostgreSQL y no MongoDB?"

**Apunta a:** Profundidad técnica (ADR de persistencia).

**Respuesta modelo:** El modelo es inherentemente relacional: 12 entidades con junction tables (`CarritoProducto` con `cantidad`, `VendedorProducto`, `ProductoCategoria`) y una cadena de 1:1 estrictos (`Carrito→Pago→Factura`). En MongoDB esos joins serían `$lookup` lentos o lógica en la aplicación, y las relaciones 1:1 con unicidad garantizada no tienen un equivalente tan directo. Pero el motivo decisivo es el checkout atómico: las transacciones multi-documento de MongoDB son menos maduras, y sin ACID real el ADR de atomicidad no se sostiene. Además las FK nos dan integridad referencial a nivel motor: una factura huérfana es imposible.

---

### 10. "¿Por qué Clerk y no implementar la autenticación ustedes, o NextAuth?"

**Apunta a:** Profundidad técnica (ADR de auth).

**Respuesta modelo:** Auth casera quedó descartada de entrada: el sistema maneja dinero, e implementar correctamente bcrypt, CSRF, rotación de tokens y sesiones requiere expertise en seguridad que excede el alcance de la materia — un error compromete todo. NextAuth es open-source pero no trae los roles en el JWT por defecto ni componentes de UI. Clerk nos da el rol (`comprador`/`vendedor`) en `publicMetadata` del JWT — disponible en cada request **sin query a la BD**, crítico para endpoints frecuentes como el carrito — más middleware nativo de Next.js y UI preconstruida. Trade-offs aceptados: vendor lock-in y dependencia de su disponibilidad (mitigado: los JWT emitidos siguen válidos hasta expirar).

---

### 11. "¿Por qué Comprador y Vendedor son tablas separadas y no una herencia de Usuario?"

**Apunta a:** Coherencia (el README todavía describe la herencia — posible repregunta).

**Respuesta modelo:** Porque la **identidad ya vive en Clerk** — email, credenciales, sesión y rol están en el proveedor de auth. Una tabla `Usuario` propia duplicaría esa información y habría que sincronizarla. Las tablas `Comprador` (PK `legajo`) y `Vendedor` (PK `id_vendedor`) guardan solo los atributos de negocio que Clerk no modela: dirección de envío y teléfono para uno; saldo, CBU y reputación para el otro. Los roles además son disjuntos en el dominio — no hay flujos donde un usuario actúe como ambos. *(Honestidad si la repreguntan: una versión anterior del README describe herencia `Usuario→Comprador/Vendedor`; el modelo vigente es el del E-R y el schema, con tablas separadas.)*

---

### 12. "¿Por qué el precio está en VarianteProducto y no en Producto?"

**Apunta a:** Coherencia (modelo de datos).

**Respuesta modelo:** Porque el precio no es del perfume sino de la **presentación**: el mismo perfume en EDP 100ml y EDT 50ml comparte notas olfativas e ingredientes (atributos de `Producto`) pero difiere en volumen, concentración y precio (atributos de `VarianteProducto`, relación 1:N con FK directa). El campo `ranking` ordena las variantes y define cuál es la presentación principal que se muestra en el catálogo. Originalmente lo teníamos como N:M con tabla de unión y lo corregimos: una variante pertenece a exactamente un producto — está registrado en nuestro log de cambios.

---

### 13. "Dicen que si el servicio de notificaciones falla la compra no se ve afectada. ¿Cómo lo garantizan?"

**Apunta a:** Coherencia (RNF-2) + honestidad sobre el alcance.

**Respuesta modelo:** Por diseño, la notificación es **fire-and-forget**: se dispara fuera de la transacción de negocio, sin `await` bloqueante, y su excepción se captura y loguea sin propagarse — el flujo de compra ya respondió al usuario. En la implementación actual el envío de email real no está integrado (la confirmación es visual en la UI), pero el punto arquitectónico está resuelto: la notificación está fuera del camino crítico, que es exactamente lo que pide el RNF de alta disponibilidad. Integrar Resend o Nodemailer es agregar la llamada en el punto ya diseñado, sin tocar la arquitectura.

---

### 14. "¿Qué pasa con el motor de recomendaciones cuando el catálogo crezca? ¿Escala?"

**Apunta a:** Profundidad técnica (límites conocidos).

**Respuesta modelo:** El cálculo es O(n) sobre los productos con stock: por request se tokenizan las notas y se calcula Jaccard contra todo el catálogo, en memoria. Con cientos de productos tarda milisegundos; estimamos viable hasta ~10.000. Más allá, las opciones en orden de costo: (1) cachear resultados por producto — son estables, solo cambian al editar notas; (2) pre-computar la matriz de similitud offline; (3) migrar a búsqueda vectorial con `pgvector`, que mantiene PostgreSQL como única base. Elegimos no optimizar prematuramente: el cuello de botella está identificado y medido.

---

### 15. "¿Qué partes no desarrollaron y con qué criterio decidieron dejarlas afuera?"

**Apunta a:** Demo + Calidad de presentación (los lineamientos lo piden explícitamente para el slide 8).

**Respuesta modelo:** Cuatro cosas, con un criterio común: **priorizamos el camino crítico de la compra y sus garantías de consistencia** por sobre integraciones salientes con terceros. (1) La liberación automática de la reserva de 5 minutos — requiere cron externo en serverless; el modo de falla actual es seguro. (2) Emails reales — el patrón fire-and-forget está diseñado y el punto de integración existe; falta el proveedor. (3) El restock automático saliente — hoy el sistema detecta stock crítico y alerta al vendedor en su panel; falta la llamada REST al proveedor y su webhook de reposición, que dependen de un tercero que no existe en el contexto de la materia. (4) El recálculo de reputación del vendedor al entregar. Ninguna de las cuatro compromete la integridad de los datos ni el flujo de compra — y todas tienen su diseño documentado en los casos de uso CU-09 y CU-10.

---

## Preguntas de repesca (por si sobra tiempo del tribunal)

- **"¿Qué hace el middleware `proxy.ts`?"** → Intercepta toda request antes de cualquier handler; deja públicas solo `/`, sign-in/up, `/api/catalogo` y los dos webhooks; el resto exige sesión Clerk. Cada handler además re-verifica el rol — defensa en profundidad.
- **"¿Por qué `proxy.ts` y no `middleware.ts`?"** → Renombre de Next.js 16.
- **"¿Cómo cargaron los datos?"** → Seed ETL: `npm run seed` trae 100 perfumes reales de PerfumAPI con notas e ingredientes.
- **"¿Qué pasa si un comprador entra a la URL del panel vendedor?"** → Ve la UI pero toda la API devuelve 401 (`resolveVendedor()`); la barrera real es server-side. Decisión documentada en `decisiones-disenio.md`.
- **"¿Quién hizo qué?"** → [COMPLETAR — repartir antes de la presentación: cada integrante debe poder explicar su aporte y las decisiones en las que participó. El tribunal puede dirigir preguntas a cualquiera.]
