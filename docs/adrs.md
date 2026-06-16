# Architecture Decision Records — Fragancio Elegancio

> Documento generado para el Entregable 4 — Práctica de Arquitectura y Diseño de Sistemas 2026.
> Cada ADR sigue la plantilla oficial de la cátedra. Los bloques `> 💭` documentan el razonamiento
> y las fuentes usadas para tomar cada decisión — no forman parte del ADR entregable, son notas
> de trabajo que pueden eliminarse antes de entregar.

---

## Índice

| ID | Título | Categoría | Estado | Fecha |
|---|---|---|---|---|
| [ADR-001](#adr-001) | Elección de arquitectura del backend: separación interna de servicios vs. despliegue distribuido | Arquitectura del backend | Aceptada | 05/06/2026 |
| [ADR-002](#adr-002) | Elección de base de datos y estrategia de persistencia | Persistencia de datos | Aceptada | 05/06/2026 |
| [ADR-003](#adr-003) | Estrategia de comunicación entre componentes y sistemas externos | Comunicación entre componentes | Aceptada | 05/06/2026 |
| [ADR-004](#adr-004) | Elección de framework full-stack como unidad de despliegue única | Infraestructura / Despliegue | Aceptada | 05/06/2026 |

---

## ADR-001

|  ID  |    Título    |     Estado     |     Fecha     |
|---      |---|---|---|
| ADR-001 | Elección de arquitectura del backend: separación interna de servicios vs. despliegue distribuido | Aceptada | 05/06/2026 |

> 💭 **Cómo llegué a esta decisión:**
> El README §1 describe el sistema como "arquitectura de microservicios orientada a la web", pero al revisar
> el código real (`Glob` sobre `src/`) todos los servicios son rutas dentro de un único proceso Next.js
> (`src/app/api/catalogo/`, `src/app/api/checkout/`, `src/app/api/carrito/`, etc.).
> El "API Gateway" del diagrama de contenedores no es un proceso separado: es el middleware `src/proxy.ts`
> más el enrutamiento nativo de Next.js.
> Los "contenedores" del C4 Nivel 2 (Servicio Catálogo, Lógica de Negocio, Servicio Carrito) son
> separaciones lógicas de responsabilidad dentro de un único artefacto desplegable.
> Esto es un **monolito modular** con boundaries internos bien definidos, no microservicios reales.
> Fuentes: CLAUDE.md (stack), `diagrama-contenedores-c4.md`, `diagrama_componentes_API.md`,
> `src/app/api/*` (glob de implementación actual), `casos-de-uso.md` RNF-1.

### 1. Contexto

El sistema es un marketplace de fragancias que atiende a dos perfiles de usuario con patrones de acceso muy distintos: compradores (navegación frecuente del catálogo, búsqueda, checkout) y vendedores (gestión de inventario, consulta de órdenes). Los casos de uso relevantes son:

- **CU-01 (Consultar Catálogo):** estimado en 10.000 consultas/día. Requiere baja latencia (< 500 ms — RNF-5).
- **CU-03 (Proceso de Checkout):** baja frecuencia pero con lógica crítica de atomicidad de stock.
- **CU-05 (Recomendaciones):** alta frecuencia, cómputo moderado sobre atributos del producto.
- **CU-06/07 (Panel del Vendedor):** frecuencia baja, no requiere escalar.

**Motivador 1 — Escalabilidad diferencial:** El RNF-1 exige que el "Servicio de Catálogo" pueda escalar independientemente del "Servicio de Pagos" en picos de tráfico (ej.: hot sale). Las cargas son asimétricas: el catálogo puede recibir 10× más tráfico que el checkout.

**Motivador 2 — Tamaño y madurez del equipo:** El proyecto es desarrollado por un equipo pequeño en etapa temprana. Operar múltiples procesos desplegados por separado (con comunicación de red entre ellos, service discovery, healthchecks independientes, etc.) agrega carga operacional que no está justificada en esta etapa.

**Motivador 3 — Consistencia transaccional del checkout:** El CU-03 exige que la validación de stock, la creación del Pago y el cambio de estado del Carrito ocurran en una única transacción de base de datos (`prisma.$transaction`). Distribuir esto entre procesos separados requeriría transacciones distribuidas (2PC) o compensación eventual, lo cual añade complejidad innecesaria.

### 2. Alternativas consideradas

| Alternativa | Ventaja principal en este contexto | Desventaja / Motivo de descarte |
|---|---|---|
| **Microservicios verdaderos** (cada servicio en su propio proceso/contenedor, con su propia BD) | Escala independiente por servicio; tolerancia a fallos aislada; equipos autónomos por dominio | Requiere comunicación de red entre servicios (latencia), gestión de consistencia distribuida para el checkout (incompatible con RNF-3), operación compleja para un equipo pequeño. El checkout atómico es incompatible con bases de datos separadas por servicio. |
| **Monolito sin separación interna** (todo en un único módulo sin boundaries) | Máxima simplicidad de desarrollo inicial | No permite escalar componentes de forma diferenciada. El catálogo y el checkout comparten recursos sin posibilidad de aislamiento futuro. Viola RNF-1. |
| **Monolito modular con separación interna de servicios** *(elegida)* | Boundaries claros entre dominios (catálogo, carrito, pagos) dentro de un único proceso desplegable. Permite escalar a nivel de proceso único o migrar dominios a servicios independientes en el futuro. Transacciones de BD son locales y síncronas. | — (esta fue la elegida) |

### 3. Decisión tomada

**Se decide:** adoptar una arquitectura de **monolito modular** con separación lógica interna de servicios (Servicio Catálogo, Lógica de Negocio/Carrito, Servicio Usuarios) dentro de un único artefacto Next.js desplegable.

**Fundamentación:**

1. La separación interna en módulos con responsabilidades claras (rutas `/api/catalogo/`, `/api/carrito/`, `/api/checkout/`, `/api/inventario/`) satisface el objetivo del RNF-1 sin requerir despliegues separados: en plataformas serverless (como Vercel), cada ruta puede escalarse como función independiente aunque compartan el mismo codebase.
2. El checkout atómico (CU-03) usa `prisma.$transaction` sobre una única base de datos. Mantener los servicios en el mismo proceso elimina la necesidad de transacciones distribuidas y garantiza el RNF-3 de consistencia transaccional.
3. El equipo puede aplicar separación de concerns mediante convenciones de directorio (`lib/stock.ts`, `lib/recomendaciones.ts`, `app/api/<dominio>/`) sin el overhead operacional de operar múltiples procesos.

### 4. Consecuencias

| Consecuencias positivas | Trade-offs / costos |
|---|---|
| El checkout atómico es implementable con `prisma.$transaction` local, sin coordinación distribuida. | Escalar solo el catálogo a nivel de proceso implica escalar todo el monolito; la granularidad de escala depende de la plataforma (Vercel functions parcialmente lo resuelven). |
| Un único artefacto simplifica el CI/CD, el despliegue y la gestión de variables de entorno. | Si en el futuro un dominio necesita tecnología diferente (ej.: el motor de recomendaciones en Python), requiere extraerlo del monolito, lo que implica refactoring. |
| Los boundaries internos (por directorio y módulo) facilitan una futura migración a microservicios si el volumen lo justifica. | Un bug que crashea el proceso afecta todos los servicios simultáneamente, no solo el dominio donde ocurrió. |
| Decisión relacionada: ADR-003 (comunicación) debe considerar que las llamadas entre "servicios" son llamadas de función en memoria, no peticiones de red. | |

---

## ADR-002

| ID | Título | Estado | Fecha |
|---|---|---|---|
| ADR-002 | Elección de base de datos y estrategia de persistencia | Aceptada | 05/06/2026 |

> 💭 **Cómo llegué a esta decisión:**
> El modelo de datos del sistema tiene características que hacen indispensable una BD relacional:
> (1) herencia de tablas (Usuario → Comprador/Vendedor), (2) múltiples junction tables
> (CarritoProducto, ProductoCategoria, ProveedorProducto, Producto-VarianteProducto),
> (3) una cadena de referencias fuertes (Carrito → Pago → Factura, Carrito → Envio),
> (4) el checkout requiere escribir en múltiples tablas atómicamente (CU-03, CU-08).
> El motor de recomendaciones (CU-05) hace cálculos de similitud sobre campos de texto
> (notas_salida, notas_corazon, notas_fondo, ingrediente) que están modelados en la misma BD.
> Fuentes: `modelo-er.md`, `modelado-datos.md`, `prisma/schema.prisma`,
> `casos-de-uso.md` (CU-03, CU-05, CU-08), `src/lib/stock.ts`, CLAUDE.md.

### 1. Contexto

El sistema debe almacenar y relacionar múltiples entidades fuertemente vinculadas: usuarios con dos roles (Comprador y Vendedor), productos con variantes y múltiples categorías, carritos de compra, pagos, facturas y envíos. Los patrones de acceso incluyen:

**Motivador 1 — Consistencia transaccional crítica:** El proceso de checkout (CU-03) involucra validar stock, decrementarlo y crear el Pago dentro de una única operación atómica. Si cualquier paso falla, ninguno debe persistir. El RNF-3 (Integridad de Datos) exige que no se vendan productos sin stock real.

**Motivador 2 — Joins complejos frecuentes:** Las consultas clave del sistema requieren joins entre múltiples tablas: el historial de pedidos (CU-04) une Carrito + CarritoProducto + Producto + Pago + Envío; el motor de recomendaciones (CU-05) lee atributos de Producto (notas_salida, notas_corazon, notas_fondo, ingrediente) para calcular similitudes.

**Motivador 3 — Modelo de herencia y relaciones N:M:** La herencia (Usuario → Comprador, Usuario → Vendedor) y las relaciones N:M con atributos propios (CarritoProducto con `cantidad`, Producto-VarianteProducto con `ranking`) se expresan de forma natural en un modelo relacional con claves foráneas. Una BD documental requeriría lógica de join en la aplicación.

**Motivador 4 — Experiencia del equipo y ecosistema:** El stack ya incluye Prisma ORM, cuyo soporte y tipado es significativamente más maduro para PostgreSQL que para otras bases de datos.

### 2. Alternativas consideradas

| Alternativa | Ventaja principal en este contexto | Desventaja / Motivo de descarte |
|---|---|---|
| **MongoDB** (NoSQL documental) | Esquema flexible para atributos de fragancias; buen rendimiento en lecturas simples por documento | Sin soporte nativo de joins eficientes: unir Carrito + Productos + Pago requeriría múltiples queries o `$lookup`. Las transacciones multi-documento tienen restricciones en clusters; el checkout atómico sería complejo de implementar correctamente. Viola RNF-3. |
| **MySQL** | Ampliamente conocido, buen soporte transaccional, comunidad grande | Soporte de tipos avanzados más limitado que PostgreSQL (menos flexible para campos de texto extensos como listas de notas olfativas e ingredientes). El soporte de Prisma para PostgreSQL es más maduro e incluye más features. |
| **PostgreSQL + Prisma ORM** *(elegida)* | Transacciones ACID completas, soporte de joins complejos, tipado fuerte con Prisma, amplio soporte en plataformas cloud | — (esta fue la elegida) |

### 3. Decisión tomada

**Se decide:** usar **PostgreSQL** como única base de datos relacional del sistema, accedida exclusivamente mediante **Prisma ORM** (con singleton en `lib/prisma.ts` para evitar agotamiento de conexiones en desarrollo).

**Fundamentación:**

1. Las transacciones ACID de PostgreSQL resuelven directamente el motivador de consistencia del checkout: la función `checkoutAtomico` en `lib/stock.ts` ejecuta validación de stock + decremento dentro de un único `prisma.$transaction`, garantizando que o todo persiste o nada lo hace.
2. El modelo de datos es inherentemente relacional — las 12 entidades del sistema están conectadas mediante claves foráneas (ej.: `Carrito.legajo → Comprador.legajo`, `Pago.id_carrito → Carrito.id_carrito`, `Factura.id_pago → Pago.id_pago`). PostgreSQL maneja estos joins de forma nativa y eficiente.
3. Prisma genera tipos TypeScript desde el schema, lo que detecta en tiempo de compilación los errores de query más comunes y acelera el desarrollo del equipo.

### 4. Consecuencias

| Consecuencias positivas | Trade-offs / costos |
|---|---|
| El checkout atómico y la sincronización de stock (CU-08) se implementan como transacciones SQL estándar, sin lógica de compensación adicional en la aplicación. | Escalabilidad horizontal limitada: PostgreSQL escala mejor verticalmente. Si el volumen de datos crece significativamente (millones de productos/carritos), se necesitaría sharding o réplicas de lectura. |
| Las consultas del historial de pedidos y el motor de recomendaciones se expresan como joins SQL, sin lógica adicional en la aplicación. | El esquema rígido requiere migraciones explícitas (`npx prisma migrate dev`) para cualquier cambio de modelo, lo que agrega fricción al desarrollo iterativo. |
| Prisma Connection Pooling (con PgBouncer) puede manejar múltiples conexiones concurrentes sin saturar la BD, relevante en entornos serverless con muchas instancias de función. | El campo de texto libre (`ingrediente`, `notas_salida`, `notas_corazon`, `notas_fondo`) funciona para el MVP, pero si el motor de recomendaciones (CU-05) requiere búsqueda de similitud vectorial a escala, se necesitaría una extensión como `pgvector` o una BD especializada. |
| Decisión relacionada: ADR-003 (comunicación) — los sistemas externos (Pagos, Envíos) interactúan con esta BD indirectamente a través del webhook handler, no directamente. | |

---

## ADR-003

| ID | Título | Estado | Fecha |
|---|---|---|---|
| ADR-003 | Estrategia de comunicación entre componentes y sistemas externos | Aceptada | 05/06/2026 |

> 💭 **Cómo llegué a esta decisión:**
> Los casos de uso revelan tres patrones de integración fundamentalmente distintos que coexisten:
> (1) Flujos síncronos donde el usuario espera respuesta inmediata (CU-01 catálogo, CU-02 carrito,
> CU-03 inicio de checkout). (2) Flujos asíncronos donde un sistema externo notifica al marketplace
> después de que el usuario fue redirigido (CU-08 webhook de pago, CU-09 webhook de envíos).
> (3) Operaciones de soporte que no deben bloquear
> la compra si fallan (CU-09 notificaciones de email — RNF-2).
> La tensión central es: el checkout necesita ser síncrono para UX, pero la confirmación del pago
> es inherentemente asíncrona porque el usuario es redirigido a MercadoPago/Stripe.
> Fuentes: `casos-de-uso.md` (CU-03, CU-08, CU-09, CU-10), `diagrama-contenedores-c4.md`,
> `src/app/api/pagos/webhook/route.ts`, `src/proxy.ts`, CLAUDE.md, RNF-2, RNF-6.

### 1. Contexto

El sistema interactúa con tres sistemas externos (Sistema de Pagos, Sistema de Envíos, Sistema de Proveeduría) y tiene un componente interno de notificaciones. Cada integración tiene requisitos de comunicación distintos:

**Motivador 1 — Asincronía del pago:** El flujo de compra (CU-03) redirige al usuario al Sistema de Pagos externo (MercadoPago/Stripe). El marketplace no puede mantener una conexión HTTP abierta mientras el usuario completa el pago en un sitio externo; la confirmación llega minutos después mediante un callback.

**Motivador 2 — Alta disponibilidad del flujo de compra:** El RNF-2 exige que si el servicio de notificaciones falla, el usuario igual pueda completar su compra. Las notificaciones de email (CU-09) no pueden estar en el camino crítico de la confirmación de compra.

**Motivador 3 — Escalabilidad diferenciada:** El RNF-1 indica que el catálogo puede recibir 10× más tráfico que el checkout. Las respuestas del catálogo son síncronas y deben ser rápidas (< 500 ms — RNF-5); esto no es compatible con intermediar un broker de mensajes en el camino de una búsqueda.

### 2. Alternativas consideradas

| Alternativa | Ventaja principal en este contexto | Desventaja / Motivo de descarte |
|---|---|---|
| **REST síncrono puro** para todas las integraciones | Simple de implementar; bajo número de tecnologías | La confirmación de pago requeriría que el marketplace haga polling hacia MercadoPago/Stripe para detectar el resultado (latencia, complejidad, rate limits). Las notificaciones síncronas bloquearían la compra si el servidor de email no responde, violando RNF-2. |
| **Message broker centralizado** (RabbitMQ / Kafka) para toda la comunicación | Desacoplamiento total; reintentos automáticos; trazabilidad de mensajes | Añade infraestructura compleja (un broker que operar, monitorear y escalar). Para el volumen de un marketplace emergente, es sobre-ingeniería significativa. Las peticiones síncronas al catálogo (10.000/día) no se benefician de colas. |
| **Modelo híbrido: REST síncrono + webhooks + fire-and-forget** *(elegida)* | Cada patrón se aplica donde tiene sentido: REST donde la UX requiere respuesta inmediata, webhooks donde el resultado llega desde afuera de forma asíncrona, fire-and-forget para operaciones de soporte no críticas | Requiere comprender tres patrones distintos. La confiabilidad de los webhooks depende de los reintentos del sistema externo (MercadoPago/Stripe tienen reintentos automáticos). |

### 3. Decisión tomada

**Se decide:** adoptar un **modelo de comunicación híbrido** con tres patrones según el tipo de operación:

1. **REST síncrono** para todas las peticiones iniciadas por el usuario (catálogo, carrito, checkout inicial, inventario, historial). El cliente espera la respuesta antes de continuar.
2. **Webhooks** para las notificaciones de sistemas externos: el Sistema de Pagos notifica la confirmación o rechazo del pago (`POST /api/pagos/webhook`); el Sistema de Envíos notifica cambios de estado (`POST /api/envios/[id]`). El Sistema de Proveeduría no envía webhook: el marketplace le envía un email automático de restock (fire-and-forget, CU-10) y el Vendedor actualiza el stock manualmente al recibir la mercadería (CU-06).
3. **Fire-and-forget asíncrono** para el Servicio Notificación: el envío de emails se dispara sin esperar confirmación y su falla no revierte ninguna operación de negocio (RNF-2, CU-09).

**Fundamentación:**

1. Los webhooks son el mecanismo estándar que ofrecen MercadoPago y Stripe para notificar resultados de pago. No exigen que el marketplace mantenga una conexión abierta; el sistema externo reintenta automáticamente si el endpoint no responde.
2. El patrón fire-and-forget para notificaciones satisface directamente el RNF-2: el Servicio Notificación falla silenciosamente (se loguea el error) sin propagar la excepción al flujo de compra.
3. REST síncrono para el catálogo garantiza la latencia de < 500 ms requerida por RNF-5 sin la sobrecarga de serialización/deserialización de mensajes en cola.

### 4. Consecuencias

| Consecuencias positivas | Trade-offs / costos |
|---|---|
| El flujo de compra (catálogo → carrito → checkout) tiene baja latencia para el usuario. | Si un webhook de confirmación de pago no llega (el Sistema de Pagos falla su reintento), el Pago queda en estado `pendiente` indefinidamente y el stock permanece decrementado. Se necesita un proceso de conciliación periódica. |
| La disponibilidad del flujo de compra no depende de la disponibilidad del servicio de email. | Los webhooks requieren validar la autenticidad del request (firma HMAC — implementado en `src/app/api/pagos/webhook/route.ts`) para prevenir falsificaciones. |
| **CU-10 — Restock automático (flujo OUTBOUND):** tras el checkout, el marketplace evalúa si el stock cayó por debajo del umbral crítico y, de ser así, envía un email fire-and-forget al proveedor (`lib/notificaciones.ts`). El flujo es **saliente** — el sistema notifica al proveedor, no al revés. El Sistema de Proveeduría **no envía ningún webhook entrante al marketplace**, por lo tanto **no existe ni se necesita ningún endpoint para CU-10 en el openapi.yaml**. El Vendedor actualiza el stock manualmente al recibir la mercadería (CU-06). | El modelo fire-and-forget no garantiza entrega del email. Si se necesita garantía de entrega, se debe agregar una cola de reintentos (dead-letter queue), lo que acerca este componente al patrón de message broker. |
| Decisión relacionada: ADR-001 — dado que los "servicios" son módulos dentro del mismo proceso, la comunicación entre ellos es una llamada de función (no HTTP interno), lo que simplifica la implementación. | |

---

## ADR-004

| ID | Título | Estado | Fecha |
|---|---|---|---|
| ADR-004 | Elección de Next.js como framework full-stack unificado y unidad de despliegue única | Infraestructura / Despliegue | Aceptada | 05/06/2026 |

> 💭 **Cómo llegué a esta decisión:**
> El CLAUDE.md y el README §5 muestran un stack donde Next.js sirve tanto el frontend (React)
> como el backend (API Routes). No existe un servidor separado: todo vive en el mismo artefacto.
> Esto tiene consecuencias directas sobre el despliegue (un solo pipeline de CI/CD, una sola
> unidad de escala base) y sobre algunas restricciones técnicas (ej.: el serverless de Vercel
> impone límites de timeout que afectan operaciones de larga duración).
> La alternativa natural habría sido un frontend React SPA + un backend Express/Fastify separado.
> El proxy/middleware es `src/proxy.ts` (no `middleware.ts` — renombrado en Next.js 16, según CLAUDE.md).
> Fuentes: CLAUDE.md (stack, sección Next.js 16 notes), README §5 (stack tecnológico),
> README §7 (estructura de proyecto), `src/proxy.ts` (implementación del middleware).

### 1. Contexto

El sistema necesita exponer una interfaz web al usuario y una API que consuma esa interfaz. La decisión de qué framework usar para el backend y cómo estructurar el despliegue impacta directamente en la experiencia de desarrollo, el tiempo de llegada a producción y los costos operacionales.

**Motivador 1 — Tiempo de desarrollo y tamaño del equipo:** Un equipo pequeño que mantiene dos repositorios y dos pipelines de despliegue separados (frontend + backend) tiene mayor carga de coordinación. La duplicación de lógica de tipado entre cliente y servidor también es un costo habitual en arquitecturas separadas.

**Motivador 2 — Performance del catálogo:** El catálogo (CU-01, 10.000 consultas/día, < 500 ms) se beneficia de **SSR/SSG** (Server-Side Rendering / Static Site Generation). En una arquitectura de SPA pura, el catálogo requiere una carga de JavaScript + un fetch al API, lo que agrega latencia percibida y perjudica SEO de los productos.

**Motivador 3 — Seguridad del middleware:** Toda petición a una ruta privada debe pasar por la verificación de Clerk antes de llegar al handler (README §8.1). En Next.js, el middleware (`src/proxy.ts`) intercepta todas las peticiones antes de que lleguen a cualquier API Route, sin configuración adicional. En un backend separado, esta responsabilidad requeriría un middleware explícito en cada framework elegido.

**Motivador 4 — Coherencia de tipos entre frontend y backend:** El uso de TypeScript en ambas capas dentro del mismo repositorio permite compartir tipos de las respuestas API directamente, reduciendo errores de integración.

### 2. Alternativas consideradas

| Alternativa | Ventaja principal en este contexto | Desventaja / Motivo de descarte |
|---|---|---|
| **React SPA + Express.js/Fastify (separados)** | Control total sobre el servidor; independencia de framework para frontend y backend; sin restricciones de serverless | Dos repositorios o monorepo más complejo; CORS a gestionar; dos pipelines de CI/CD; SSR no disponible sin configuración adicional; los tipos no son compartidos automáticamente. Mayor tiempo de setup inicial. |
| **React SPA + Next.js solo como API** (sin usar el frontend de Next.js) | API Routes de Next.js sin acoplar al sistema de renderizado | Renuncia al SSR/SSG del catálogo; agrega la complejidad de un segundo artefacto frontend (React puro) sin beneficio claro frente a la opción anterior. |
| **Next.js full-stack (App Router + API Routes)** *(elegida)* | Frontend y backend en el mismo codebase y artefacto; SSR/SSG para catálogo; middleware unificado; tipos compartidos; despliegue único | — (esta fue la elegida) |

### 3. Decisión tomada

**Se decide:** usar **Next.js (App Router)** como framework full-stack unificado, donde el mismo artefacto sirve el frontend React (con SSR/SSG para las páginas del catálogo) y el backend REST (mediante API Routes en `src/app/api/`). El artefacto único se despliega en una plataforma que soporte Node.js o serverless functions (ej.: Vercel, Railway, Render).

**Fundamentación:**

1. El SSR/SSG de Next.js para las páginas de catálogo (`app/(marketplace)/catalogo/`) permite que el servidor pre-renderice el HTML con los productos antes de enviarlo al cliente, cumpliendo el RNF-5 (< 500 ms) y mejorando el SEO de los productos del marketplace.
2. El middleware de Next.js (`src/proxy.ts`) intercepta todas las peticiones del sistema en un único punto, permitiendo que Clerk verifique la autenticación antes de que cualquier API Route ejecute lógica de negocio. Esto implementa la defensa en profundidad descrita en el README §8.1 sin configuración duplicada.
3. Un único artefacto desplegable reduce la carga operacional del equipo (un pipeline de CI/CD, un set de variables de entorno, una URL base) y elimina la gestión de CORS entre frontend y backend.

### 4. Consecuencias

| Consecuencias positivas | Trade-offs / costos |
|---|---|
| El catálogo puede ser SSR/SSG, reduciendo latencia percibida y mejorando SEO de los productos. | En plataformas serverless (Vercel), las API Routes tienen límites de timeout (generalmente 10-60s según plan). Procesos en background (cron jobs, timers) no pueden correr dentro de una función serverless y requieren un servicio externo. |
| Un único artefacto y pipeline simplifica el despliegue y la gestión de secretos (DATABASE_URL, CLERK_*, WEBHOOK_SECRET viven en un único contexto de entorno). | El framework Next.js tiene opiniones fuertes sobre la estructura del proyecto (App Router, convención de nombres de archivos). Cambiar de framework en el futuro requeriría una migración significativa. |
| Los tipos TypeScript del schema Prisma (generados en `src/generated/prisma/`) son accesibles directamente desde los componentes React y las API Routes sin capa de serialización intermedia. | El bundle del servidor incluye dependencias de frontend y backend juntas, lo que puede afectar el cold start en entornos serverless. |
| Decisión relacionada: ADR-001 — el monolito modular es consecuencia directa de esta elección: Next.js no está diseñado para alojar múltiples servicios independientes, sino para una aplicación cohesiva. | |

---

## Notas de consistencia entre ADRs

- **ADR-001 + ADR-004** son complementarios: la elección de Next.js como framework (ADR-004) es lo que hace posible y natural el monolito modular (ADR-001). Ambas decisiones se refuerzan mutuamente.
- **ADR-002 + ADR-003** son complementarios: PostgreSQL (ADR-002) es la que hace posible la transacción atómica del checkout, que a su vez requiere que la comunicación interna del checkout sea síncrona y en el mismo proceso (ADR-003, patrón REST/función local).
- **ADR-003 + ADR-004** son complementarios: el patrón fire-and-forget y los webhooks son compatibles con serverless sin mecanismos adicionales.

