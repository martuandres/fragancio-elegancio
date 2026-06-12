# Fragancio Elegancio — Documento de Arquitectura
### Arquitectura y Diseño de Sistemas — 2026 · Grupo 17 · Comisión 17

**Integrantes:** Agostino Laurella Crippa · Pierino Oscar Spina · Ana Martina Andrés · Tomás Copelotti · José Ignacio Ubici

---

## 1. Introducción y Descripción del Sistema

Comprar un perfume por internet es, en esencia, comprar a ciegas: el comprador no puede oler el producto, y los marketplaces genéricos solo le ofrecen filtros por precio y por marca. Fragancio Elegancio nace para resolver ese problema: es un marketplace especializado en fragancias que describe cada perfume por sus atributos intrínsecos — las notas olfativas de salida, de corazón y de fondo, y sus ingredientes principales — y usa esa información para que el comprador encuentre lo que busca aunque nunca lo haya olido.

El núcleo diferencial del sistema es su capacidad de filtrado y recomendación inteligente. Un motor de recomendaciones calcula un índice de coincidencia entre fragancias a partir de sus notas e ingredientes, de modo que tanto el usuario que sabe exactamente qué quiere como el que está indeciso puedan llegar a una fragancia que cumpla sus expectativas. Alrededor de ese núcleo, el sistema cubre el ciclo completo de compra: catálogo con búsqueda y filtros, carrito, checkout con garantía de stock, pago a través de un procesador externo, facturación, envío con seguimiento y notificaciones de estado.

El sistema conecta a dos tipos de usuarios: los **compradores**, que exploran el catálogo y realizan compras, y los **vendedores**, que gestionan su inventario y despachan las órdenes recibidas. El valor que aporta es doble: al comprador le reduce la incertidumbre de comprar sin oler, y al vendedor le da un canal de venta especializado con gestión de inventario, alertas de stock crítico y panel de ventas.

### 1.1 Actores del sistema

| Actor | Relación con el sistema | Acciones principales |
|---|---|---|
| **Comprador** | Usuario final de la plataforma. Interactúa exclusivamente a través de la Web App. | Navega el catálogo y filtra por categorías, notas olfativas o búsqueda por texto; recibe recomendaciones personalizadas; arma y modifica su carrito; inicia el checkout; consulta el historial de pedidos y el estado de sus envíos. |
| **Vendedor** | Usuario que comercializa productos en el marketplace. Accede a paneles propios protegidos por rol. | Da de alta, modifica y elimina productos y sus variantes (ABM de inventario, incluyendo precios, stock, notas olfativas e imágenes); consulta el panel de ventas con las órdenes pendientes de despacho; confirma despachos y actualiza el estado y tracking de los envíos. |

Ambos actores coinciden con las entidades externas humanas del Diagrama de Contexto (DFD Nivel 0).

### 1.2 Sistemas externos

| Sistema | Qué provee | Cómo lo usa el sistema | Dirección del flujo |
|---|---|---|---|
| **Sistema de Pagos (MercadoPago / Stripe)** | Procesamiento de cobros y confirmación de transacciones. | El marketplace envía la solicitud de pago (monto, comprador) y recibe el resultado (aprobado / rechazado) vía webhook firmado con HMAC-SHA256 en `POST /api/pagos/webhook`. | **Bidireccional** — solicitud saliente, confirmación entrante por webhook. |
| **Sistema de Envíos** | Logística de entrega y seguimiento (tracking). | El marketplace envía los datos del despacho (dirección, productos, orden) cuando el vendedor confirma; el sistema externo notifica los cambios de estado (en camino, entregado) y el `track_code`. | **Bidireccional** — datos de despacho salientes, actualizaciones de estado entrantes. |
| **Sistema de Proveeduría** | Reabastecimiento de productos del catálogo. | Cuando el stock de un producto cae a nivel crítico, el Servicio Catálogo envía un pedido de restock vía REST/HTTPS; el proveedor notifica el despacho de la reposición vía webhook y el sistema actualiza `Producto.stock`. | **Bidireccional** — pedido de restock saliente, notificación de reposición entrante. |
| **Servicio Usuarios (Clerk)** | Autenticación, gestión de sesiones, identidad y roles. | Todo registro, inicio de sesión y validación de rol se delega a Clerk; el rol (`comprador` / `vendedor`) viaja en el `publicMetadata` del JWT y se verifica en cada request. | **Bidireccional** — el frontend autentica contra Clerk; el backend valida los JWT emitidos. |

> Nota de alcance: las integraciones salientes hacia el Sistema de Proveeduría (llamada REST de restock) y el envío de emails reales están especificadas en los casos de uso pero no implementadas en esta versión; ver §4.2 y §6.

### 1.3 Requerimientos funcionales y no funcionales

#### Requerimientos Funcionales

**Para el Comprador:**

1. **RF-1 — Catálogo de Productos:** el sistema debe permitir navegar por categorías y buscar productos por nombre o descripción.
2. **RF-2 — Gestión de Carrito:** el usuario debe poder agregar, quitar y modificar cantidades de productos en un carrito de compras.
3. **RF-3 — Proceso de Checkout:** el sistema debe permitir iniciar el proceso de compra desde el carrito, reservando el stock, solicitando datos de envío y procesando el pago a través del sistema externo.
4. **RF-4 — Historial de Pedidos:** el usuario debe poder visualizar el estado de sus compras pasadas y actuales (Pendiente, Enviado, Entregado).
5. **RF-5 — Recomendaciones de Productos:** el sistema debe sugerir fragancias al comprador basándose en similitudes de notas olfativas (salida, corazón, fondo) e ingredientes de productos previamente vistos o comprados.

**Para el Vendedor:**

6. **RF-6 — Gestión de Inventario (ABM):** el vendedor debe poder dar de alta, baja y modificar sus productos (precio por variante, stock, imágenes).
7. **RF-7 — Panel de Ventas:** el sistema debe mostrar al vendedor las órdenes recibidas que están pendientes de despacho.

**Para el Sistema (automáticos):**

8. **RF-8 — Sincronización de Stock:** el sistema debe descontar automáticamente las unidades del inventario una vez que el pago es confirmado.
9. **RF-9 — Notificaciones de Estado:** el sistema debe enviar un correo automático al comprador cuando el estado de su envío cambie. Si el servicio de notificaciones falla, la compra no debe verse afectada.
10. **RF-10 — Restock Automático:** el sistema debe detectar cuando el stock de un producto cae a nivel crítico y enviar un pedido de reabastecimiento al proveedor externo correspondiente de forma automática.

#### Requerimientos No Funcionales

1. **RNF-1 — Escalabilidad Horizontal:** el backend debe estar diseñado para permitir que el Servicio Catálogo escale independientemente del servicio de pagos ante picos de tráfico (por ejemplo, un hot sale).
2. **RNF-2 — Alta Disponibilidad:** el sistema debe garantizar que, si el servicio de notificaciones falla, el usuario aún pueda completar su compra (desacoplamiento).
3. **RNF-3 — Integridad de Datos (Transaccionalidad):** el sistema debe asegurar que no se vendan productos sin stock real mediante el uso de transacciones o bloqueos en la base de datos.
4. **RNF-4 — Seguridad:** toda comunicación entre frontend y backend debe realizarse sobre HTTPS y las contraseñas deben almacenarse con algoritmos de hashing.
5. **RNF-5 — Latencia:** la búsqueda de productos debe devolver resultados en menos de 500 ms mediante el uso de índices o caché.
6. **RNF-6 — Consistencia Eventual:** la actualización de la reputación del vendedor puede tener una demora de unos minutos respecto a la entrega del producto (comunicación asíncrona).
7. **RNF-7 — Interoperabilidad:** el sistema debe exponer una API documentada para que el frontend pueda consumir los servicios de forma estándar.

#### Reglas de Negocio

1. **RN-1 — Validación de Stock:** un pago no puede procesarse si no hay stock disponible para algún producto del carrito. La validación y el descuento de stock deben ser una operación atómica: ante dos compradores que intentan comprar el último stock disponible, el sistema procesa al primero y el segundo falla la validación — se evita la sobreventa.
2. **RN-2 — Reputación del Vendedor:** se recalcula automáticamente cada vez que un envío pasa a estado "entregado".
3. **RN-3 — Gestión de Carrito:** los productos en el carrito no reservan stock; la validación de disponibilidad ocurre al iniciar el checkout.
4. **RN-4 — Flujo de Pago:** si el pago falla o es rechazado, el Pago queda en estado `rechazado` y el stock reservado durante el checkout se repone automáticamente.
5. **RN-5 — Restock Automático:** cuando el stock cae a nivel crítico, el sistema solicita reabastecimiento al Proveedor correspondiente sin intervención del Vendedor.

### 1.4 Casos de Uso – Historias de Usuario

Los diez casos de uso del sistema, en su versión corregida (consistente con el modelo de datos vigente y el producto final — el historial de correcciones está registrado en `docs 2/log-cambios.md`):

#### CU-01 — Consultar Catálogo de Productos

| Campo | Detalle |
|---|---|
| **Descripción** | El Comprador navega el sistema para visualizar los productos disponibles, filtrando por categorías o términos de búsqueda. |
| **Actores** | Comprador |
| **Pre Condiciones** | El sistema debe tener productos cargados. El catálogo es de acceso público — no requiere sesión iniciada (la sesión es necesaria recién al agregar al carrito, CU-02). |
| **Post Condiciones** | El sistema muestra una lista de productos que coinciden con los criterios del usuario. |
| **Secuencia Normal** | 1. El Comprador ingresa al marketplace o selecciona una categoría → el sistema solicita al Servicio Catálogo los productos disponibles y los muestra. 2. El Comprador ingresa un término de búsqueda o aplica filtros → el sistema consulta la base por nombre, categoría o notas olfativas y devuelve los resultados. 2.1. Si no hay resultados, muestra un mensaje y sugiere productos similares mediante el Motor Recomendación. |
| **Rendimiento** | Búsqueda y resultados en máximo 500 ms (RNF-5). |
| **Frecuencia / Importancia** | ~10.000 consultas/día · Vital |

#### CU-02 — Gestión de Carrito de Compras

| Campo | Detalle |
|---|---|
| **Descripción** | El Comprador agrega, quita o modifica cantidades de productos en su carrito para preparar una compra. |
| **Actores** | Comprador |
| **Pre Condiciones** | Sesión iniciada con rol `comprador`. El producto seleccionado existe. |
| **Post Condiciones** | El carrito refleja los productos y cantidades seleccionadas. |
| **Secuencia Normal** | 1. El Comprador agrega un producto con su cantidad → el sistema lo registra en `CarritoProducto`; la información de variantes (volumen, concentración, precio) se obtiene vía la relación Producto → Variante_Producto. 2. Modifica una cantidad → el sistema actualiza `CarritoProducto`. 3. Elimina un producto → el sistema borra el registro. 4. Visualiza el carrito → el sistema muestra productos, variantes, cantidades y precios calculados dinámicamente. |
| **Excepciones** | 1.1. Producto sin stock → el sistema informa y no lo agrega. |
| **Comentarios** | El carrito **no reserva stock** al agregar (RN-3); la reserva ocurre recién al iniciar el checkout (CU-03). |
| **Frecuencia / Importancia** | Alta · Vital |

#### CU-03 — Proceso de Checkout

| Campo | Detalle |
|---|---|
| **Descripción** | El Comprador inicia la compra desde su carrito: el sistema valida el stock, lo reserva, genera el Pago y deriva el cobro al Sistema de Pagos externo. |
| **Actores** | Comprador, Sistema de Pagos (externo) |
| **Pre Condiciones** | Sesión iniciada con rol `comprador`. Carrito con al menos un producto. |
| **Post Condiciones** | `Pago` creado con estado `pendiente`, vinculado al Carrito (estado `convertido`). Si el pago se confirma: `Factura` generada y `Envio` creado en estado `preparando`. |
| **Secuencia Normal** | 1. El Comprador confirma el carrito e inicia el checkout → el Servicio Stock ATOMICIDAD valida stock real por ítem dentro de una transacción atómica. 2. El sistema reserva el stock y crea el `Pago` en `pendiente`. 3. El sistema deriva el cobro al Sistema de Pagos externo. 4. El Comprador completa el pago → el Sistema de Pagos notifica el resultado vía webhook. 5. El sistema actualiza el `Pago` a `aprobado`, genera la `Factura` y crea el `Envio` en `preparando`. 6. El Servicio Notificación envía el correo de confirmación de forma asíncrona. |
| **Excepciones** | 1.1. Stock insuficiente para algún ítem → checkout cancelado con rollback total, se informa al Comprador. 2.1. El pago no se completa en 5 minutos → el stock reservado se libera (ver Comentarios). 4.1. Pago rechazado → `Pago` pasa a `rechazado` y el stock se repone (RN-4). |
| **Rendimiento** | Reserva de stock en menos de 2 segundos. |
| **Comentarios** | La atomicidad se garantiza con `prisma.$transaction` (ADR-001). El Servicio Notificación es fire-and-forget. **Brecha de alcance documentada:** la liberación automática a los 5 minutos no está implementada — hoy el stock se repone solo ante rechazo del pago (webhook) o cancelación; ver §4.2. |
| **Frecuencia / Importancia** | Media · Vital |

#### CU-04 — Historial de Pedidos

| Campo | Detalle |
|---|---|
| **Descripción** | El Comprador consulta el estado de sus compras pasadas y actuales, incluyendo estado de pago y de envío. |
| **Actores** | Comprador |
| **Pre Condiciones** | Sesión iniciada y al menos un Pago registrado. |
| **Post Condiciones** | El sistema muestra la lista de compras con sus estados actualizados. |
| **Secuencia Normal** | 1. El Comprador accede al historial → el sistema recupera todos sus Carritos con Pago asociado. 2. El sistema muestra estado del Pago y del Envío de cada compra. 3. El Comprador abre un pedido → el sistema muestra productos, variantes, cantidades, Factura y `track_code` del Envío. |
| **Excepciones** | 1.1. Sin pedidos → mensaje informativo. |
| **Frecuencia / Importancia** | Media · Alta |

#### CU-05 — Recomendaciones de Productos

| Campo | Detalle |
|---|---|
| **Descripción** | El sistema sugiere fragancias calculando similitudes a partir del historial del Comprador y los atributos olfativos del producto de referencia. |
| **Actores** | Comprador |
| **Pre Condiciones** | Sesión iniciada. Productos cargados con atributos de notas olfativas. |
| **Post Condiciones** | Lista personalizada de productos recomendados, ordenada por índice de coincidencia. |
| **Secuencia Normal** | 1. El Comprador accede a recomendaciones o ve el detalle de un producto → el Motor Recomendación recupera su historial y los atributos del producto de referencia (`notas_salida`, `notas_corazon`, `notas_fondo`, `ingrediente`). 2. El motor calcula el índice de coincidencia contra el resto del catálogo, ponderando por historial. 3. Devuelve la lista personalizada ordenada por mayor similitud. |
| **Excepciones** | 1.1. Sin historial → el motor usa solo los atributos del producto de referencia. 2.1. Sin similitudes suficientes → fallback a los productos más vendidos (derivado de `CarritoProducto` con Pago aprobado). |
| **Comentarios** | El Motor Recomendación vive en `lib/recomendaciones.ts` (ADR-002: índice de Jaccard ponderado). Consistente con RF-5. |
| **Frecuencia / Importancia** | Alta · Alta |

#### CU-06 — Gestión de Inventario (Vendedor)

| Campo | Detalle |
|---|---|
| **Descripción** | El Vendedor da de alta, modifica o elimina productos y sus variantes desde el panel de gestión. |
| **Actores** | Vendedor |
| **Pre Condiciones** | Sesión iniciada con rol `vendedor` validado por Clerk. |
| **Post Condiciones** | Los cambios quedan persistidos y reflejados en el catálogo. |
| **Secuencia Normal** | 1. El Vendedor accede al panel de inventario → el sistema muestra sus productos. 2. Crea un producto (nombre, marca, notas olfativas, ingredientes, stock, imagen) → el sistema persiste el `Producto` y sus `Variante_Producto`. 3. Modifica un producto (precio de variante, stock, notas, ingredientes, imagen) → el sistema actualiza los registros. 4. Elimina un producto → el sistema da de baja el `Producto` y sus variantes. |
| **Excepciones** | 1.1. Usuario sin rol `vendedor` → acceso rechazado (Clerk + Controlador Autorización). |
| **Frecuencia / Importancia** | Baja · Alta |

#### CU-07 — Panel de Ventas (Vendedor)

| Campo | Detalle |
|---|---|
| **Descripción** | El Vendedor consulta las órdenes recibidas pendientes de despacho y confirma despachos. |
| **Actores** | Vendedor |
| **Pre Condiciones** | Sesión con rol `vendedor`. Existen Envíos en estado `preparando`. |
| **Post Condiciones** | Lista de envíos `preparando` mostrada. Al confirmar un despacho, los datos se envían al Sistema de Envíos y el Envío queda a la espera de la notificación de cambio de estado (CU-09). |
| **Secuencia Normal** | 1. El Vendedor accede al panel de ventas → el sistema recupera los Envíos en `preparando` con detalle de productos y Comprador. 2. Marca un envío como despachado → el sistema envía los datos del despacho al Sistema de Envíos externo; el estado avanzará cuando ese sistema lo notifique (CU-09). |
| **Excepciones** | 1.1. Sin órdenes pendientes → mensaje informativo. |
| **Frecuencia / Importancia** | Media · Alta |

#### CU-08 — Sincronización de Stock (Sistema Automático)

| Campo | Detalle |
|---|---|
| **Descripción** | Al confirmarse un pago vía webhook, el sistema actualiza el Pago, genera la Factura y crea el Envío. |
| **Actores** | Sistema de Pagos (externo, vía webhook) |
| **Pre Condiciones** | Existe un `Pago` en estado `pendiente` con stock ya descontado en el checkout. |
| **Post Condiciones** | `Pago` en `aprobado`, `Factura` creada, `Envio` creado en `preparando`. |
| **Secuencia Normal** | 1. El Sistema de Pagos envía el webhook → el sistema valida la autenticidad (firma HMAC-SHA256). 2. Actualiza el `Pago` a `aprobado`. 3. Calcula el importe a partir de las cantidades en `CarritoProducto` y los precios de `Variante_Producto`. 4. Genera la `Factura` vinculada al Pago. 5. Crea el `Envio` en `preparando` vinculado al Carrito. 6. El Servicio Notificación envía el correo de confirmación de forma asíncrona (fire-and-forget). |
| **Excepciones** | 1.1. Webhook indica pago rechazado → el `Pago` pasa a `rechazado`, el stock se repone y el Carrito pasa a `cancelado` (RN-4). |
| **Comentarios** | Los pasos 2–5 corren dentro de una transacción Prisma; el paso 6 queda fuera de la transacción y su falla no la revierte. El handler es idempotente: solo procesa pagos `pendiente` (reintentos → `409 PAGO_YA_PROCESADO`). |
| **Frecuencia / Importancia** | Media · Vital |

#### CU-09 — Notificaciones de Estado de Envío (Sistema Automático)

| Campo | Detalle |
|---|---|
| **Descripción** | El sistema notifica al Comprador cada cambio de estado de su Envío. |
| **Actores** | Sistema de Envíos (externo), Servicio Notificación (componente interno de Lógica de Negocio) |
| **Pre Condiciones** | Existe un Envío asociado a un Carrito con Comprador identificado; su estado cambia. |
| **Post Condiciones** | El Comprador recibe la notificación del nuevo estado. La compra no se afecta si la notificación falla. |
| **Secuencia Normal** | 1. El Sistema de Envíos notifica un cambio de estado → el sistema actualiza `Envio.estado` y registra el `track_code` si aplica. 2. El Servicio Notificación dispara la notificación al Comprador de forma asíncrona (fire-and-forget). 3. Si el nuevo estado es `entregado`, el sistema recalcula la `reputacion` del Vendedor (RN-2). |
| **Excepciones** | 2.1. El Servicio Notificación falla → se loguea el error y el flujo continúa sin interrupciones (RNF-2). |
| **Comentarios** | **Brechas de alcance:** el email real no está integrado (la notificación es visual en la UI) y el recálculo de reputación no está implementado — el patrón fire-and-forget y el campo `reputacion` existen; ver §4.2. |
| **Frecuencia / Importancia** | Media · Media |

#### CU-10 — Restock Automático (Sistema Automático)

| Campo | Detalle |
|---|---|
| **Descripción** | Cuando el stock cae a nivel crítico, el sistema solicita reabastecimiento al Proveedor; al confirmarse el despacho vía webhook, `Producto.stock` se actualiza automáticamente. |
| **Actores** | Servicio Catálogo (interno), Sistema de Proveeduría (externo) |
| **Pre Condiciones** | El stock de un Producto cae bajo el umbral crítico tras una compra confirmada (CU-08). |
| **Post Condiciones** | Pedido de restock enviado vía REST/HTTPS; al confirmarse el despacho, `Producto.stock` actualizado con la cantidad repuesta. |
| **Secuencia Normal** | 1. Tras decrementar el stock, el Servicio Catálogo evalúa el umbral crítico. 2. Si se cumple, envía el pedido de restock al Sistema de Proveeduría (resuelto vía `Proveedor_Producto`) por REST/HTTPS. 3. El Proveedor prepara el despacho. 4. El Proveedor notifica vía webhook la cantidad despachada → el Servicio Catálogo suma la reposición a `Producto.stock`. |
| **Excepciones** | 2.1. La solicitud al Proveedor falla → se loguea; el flujo de compra no se afecta. 4.1. El webhook de reposición no llega → el Vendedor corrige el stock manualmente vía CU-06. |
| **Comentarios** | **Brecha de alcance:** la versión actual detecta el stock crítico y lo alerta en el panel del vendedor (banner); la llamada REST saliente y el webhook de reposición no están implementados; ver §4.2. |
| **Frecuencia / Importancia** | Baja · Alta |

### 1.5 Modelo de Entidad-Relación

La última versión depurada del modelo E-R está en `docs/modelo-er.md` (fuente de verdad conceptual, alineada con el diagrama oficial del proyecto y con `prisma/schema.prisma` tras las correcciones del Entregable 3). Sus definiciones centrales:

**Entidades:** `Comprador` (PK `legajo`), `Vendedor` (PK `id_vendedor`), `Proveedor` (PK `marca`), `Producto`, `Variante_Producto`, `Categoria`, `Carrito`, `Pago`, `Factura`, `Envio`.

**Relaciones y cardinalidades:**

| Relación | Cardinalidad | Atributo de relación |
|---|---|---|
| Vendedor **ofrece** Producto | 0..\* a 1..\* | — |
| Proveedor **ofrece** Producto | 0..\* a 1..\* | — |
| Producto **tiene** Variante_Producto | 1 a 0..\* | — |
| Producto **pertenece** Categoria | 1..\* a 0..\* | — |
| Comprador **tiene** Carrito | 1 a 0..\* | — |
| Carrito **contiene** Producto | 1..\* a 0..\* | `cantidad` |
| Carrito **necesita** Pago | 1 a 0..1 | — |
| Pago **crea** Factura | 1 a 1 | — |
| Carrito **enviado** Envio | 1 a 0..1 | — |

**Decisiones de modelado destacadas:**

- **No existe entidad `Usuario` ni jerarquía de herencia.** `Comprador` y `Vendedor` son entidades independientes con PKs propias (`legajo` / `id_vendedor`): la identidad (email, credenciales, sesión, rol) vive en Clerk, y duplicarla en una tabla propia obligaría a sincronizarla. Las tablas locales guardan solo los atributos de negocio que Clerk no modela (dirección de envío y teléfono; saldo, CBU y reputación). Los roles son además disjuntos en el dominio.
- **No existe entidad `OrdenCompra`.** El `Carrito` en estado `convertido` cumple ese rol: ya tiene los ítems, las cantidades y el comprador. La cadena `Carrito → Pago → Factura` y `Carrito → Envio` reemplaza a la orden intermedia sin denormalizar.
- **Producto → Variante_Producto es 1:N directa** (corrección de la docente en el Entregable 3: se eliminó la tabla de unión N:M). El precio, el volumen, la concentración y el `ranking` son atributos de la variante, no del producto: el mismo perfume en EDP 100 ml y EDT 50 ml comparte notas pero no precio.
- `imagen_url` no figura en el E-R por ser un detalle de presentación, no un concepto del negocio; sí existe en el modelado lógico y el schema.

### 1.6 Modelo Conceptual de Datos

El modelo conceptual es consistente con el E-R de §1.5 y se materializa en el modelado de datos lógico (`docs/modelado-datos.md`) y en `prisma/schema.prisma`. La diferencia entre niveles es de abstracción, no de contenido: el modelado lógico agrega las claves foráneas y tablas de unión que implementan las relaciones conceptuales.

**Dominio del catálogo:** `Producto` concentra los atributos olfativos (`notas_salida`, `notas_corazon`, `notas_fondo`, `ingrediente`), la `marca` y el `stock`. Sus presentaciones comerciales viven en `Variante_Producto` (FK directa `id_producto`). La clasificación es N:M vía `Producto_Categoria`, y la oferta comercial se registra en las tablas de unión `Vendedor_Producto` y `Proveedor_Producto`.

**Dominio de la compra:** `Carrito` (FK `legajo` → Comprador) es el eje del ciclo de vida de una compra, con estados `activo → convertido` (checkout exitoso) o `cancelado` (pago rechazado / cancelación, con reposición de stock) y `abandonado`. Sus ítems viven en `Carrito_Producto` (con atributo propio `cantidad`). `Pago` (estados `pendiente / aprobado / rechazado / reembolsado`) y `Envio` (estados `preparando / en_camino / entregado`) se anclan al carrito mediante FK `id_carrito` con restricción de unicidad — los 1:0..1 quedan garantizados por el motor de base de datos, no por código de aplicación. `Factura` se ancla 1:1 a `Pago` (`id_pago` único, `nro_factura` CUID).

**Integridad:** todas las relaciones se implementan con claves foráneas reales; es imposible a nivel de motor crear una factura huérfana o un segundo pago para el mismo carrito.

---

## 2. Diagramas de Arquitectura

### 2.1 Diagrama de Contexto

El Diagrama de Contexto (DFD Nivel 0, `docs/diagrama-contexto-dfd.md`) muestra al **Marketplace Especializado de Fragancias** como proceso central único, rodeado por cinco entidades externas: Comprador, Vendedor, Sistema de Envíos, Sistema de Proveeduría y MercadoPago.

#### 2.1.1 Flujos principales identificados

| Quién inicia | Flujo | Qué se comunica |
|---|---|---|
| Comprador → Marketplace | **Selección de productos** | El comprador elige productos del catálogo y los agrega a su carrito. |
| Marketplace → Comprador | **Detalle de pedido** | El sistema le devuelve el detalle de su pedido: productos, método de pago, monto total. |
| Comprador → Marketplace | **Pedido** | El comprador confirma la orden de compra final. |
| Comprador → Marketplace | **Estado de envío** | El comprador consulta en qué estado está la entrega de su pedido. |
| Vendedor → Marketplace | **Gestión de inventario** | El vendedor da de alta, modifica o elimina productos y actualiza stock desde su panel. |
| Marketplace → Vendedor | **Notificación de orden pendiente** | El sistema le informa al vendedor que hay un pedido nuevo que debe despachar. |
| Vendedor → Marketplace | **Confirmación de despacho** | El vendedor marca el pedido como despachado. |
| Marketplace → Sistema de Envíos | **Detalles de envío** | El sistema entrega los datos para la logística: dirección, productos, orden. |
| Sistema de Envíos → Marketplace | **Actualización de pedido** | El servicio logístico informa los cambios de estado (en camino, entregado). |
| Marketplace → MercadoPago | **Solicitud de pago** | El sistema envía los datos de la orden (monto, comprador) para iniciar el cobro. |
| MercadoPago → Marketplace | **Confirmación / rechazo de pago** | El procesador informa si el pago fue aprobado o rechazado. |
| Marketplace → Sistema de Proveeduría | **Pedido de restock** | El sistema solicita reabastecimiento cuando el stock está bajo. |
| Sistema de Proveeduría → Marketplace | **Envío de productos** | El proveedor despacha los productos solicitados y lo notifica. |

#### 2.1.2 Decisiones de diseño en el nivel de contexto

**Autenticación delegada fuera del sistema (Clerk).** La gestión de identidad — registro, login, hashing de contraseñas, sesiones, MFA — se delegó por completo a un proveedor externo en lugar de implementarse dentro del límite del sistema. La justificación es de riesgo y de foco: el sistema maneja dinero, e implementar autenticación correctamente (bcrypt, CSRF, rotación de tokens, comparaciones timing-safe) requiere expertise en seguridad que excede el alcance del proyecto; un error en esa pieza compromete todo lo demás. El trade-off aceptado es el vendor lock-in y la dependencia de disponibilidad de un tercero (mitigado porque los JWT emitidos siguen siendo válidos hasta su expiración). Esta decisión está formalizada en el ADR-005.

**El procesamiento de pagos queda fuera del límite del sistema.** El marketplace nunca toca datos de tarjetas: el cobro lo ejecuta MercadoPago/Stripe y el sistema solo recibe el resultado. Esto elimina la carga regulatoria de procesar medios de pago y convierte la confirmación en un flujo inherentemente asíncrono (el usuario interactúa con su banco, 3D Secure, etc.), lo que a su vez determinó el mecanismo de integración por webhook (ADR-003).

**Las notificaciones por email no son una entidad externa.** Aunque usan un servicio de correo, se modelan como detalle de implementación interno del proceso central — no aparecen en el DFD. El criterio: el DFD refleja con quién intercambia datos el negocio, y el correo es un mecanismo de salida, no un actor con flujos propios hacia el sistema.

### 2.2 Diagrama de Contenedores

El Diagrama de Contenedores (C4 Nivel 2, `docs/diagrama-contenedores-c4.md`) descompone el sistema en seis contenedores internos. Importante: estos "contenedores" son **separaciones lógicas de responsabilidad dentro de un único artefacto desplegable** (monolito modular sobre Next.js) — ver decisión (a) más abajo.

#### 2.2.1 Contenedores del sistema

| Contenedor | Tecnología | Responsabilidad | Se comunica con | Protocolo |
|---|---|---|---|---|
| **Web App** | React (Next.js) | Contenido estático e interfaces de usuario. Único punto de entrada de Compradores y Vendedores. | API Gateway | HTTPS |
| **API Gateway** | Node.js (Next.js routing + middleware `src/proxy.ts`) | Enrutamiento y autenticación centralizada: recibe todas las solicitudes de la Web App y las deriva al servicio interno correspondiente. | Servicio Usuarios, Servicio Catálogo, Fragance DB | HTTPS / llamadas en proceso |
| **Servicio Usuarios** | Clerk | Identidad, sesiones y roles (`comprador` / `vendedor`) vía JWT. | API Gateway, Web App | HTTPS (JWT) |
| **Servicio Catálogo** | Node.js | Gestión de productos, búsqueda y filtros; recomendaciones; detección de stock crítico y pedido de restock. | API Gateway, Servicio Carrito, Fragance DB, Sistema de Proveeduría | Llamadas en proceso · REST/HTTPS y webhook con Proveeduría |
| **Servicio Carrito (Lógica de Negocio)** | Node.js | Pedidos, pagos, envíos y notificaciones: carrito, checkout atómico, procesamiento del webhook de pagos, historial. | Servicio Catálogo, Fragance DB, Sistema de Pagos, Sistema de Envíos | Llamadas en proceso · webhooks HTTPS con externos |
| **Fragance DB** | PostgreSQL (vía Prisma) | Base de datos única del sistema: compradores, vendedores, productos, carritos, pagos, facturas y envíos. | API Gateway, Servicio Catálogo, Servicio Carrito | SQL (Prisma ORM) |

#### 2.2.2 Decisiones arquitectónicas

**(a) Organización de servicios: monolito modular con separación interna de servicios.**

Se descartaron los microservicios verdaderos (cada servicio en su propio proceso, con su propia base de datos) por tres motivos documentados en el ADR de arquitectura del backend: (1) el checkout exige que la validación de stock, su decremento y la creación del Pago ocurran en **una única transacción de base de datos** — distribuir esto entre procesos requeriría transacciones distribuidas (2PC) o compensación eventual, incompatible con el RNF-3; (2) un equipo de cinco personas no justifica la carga operacional de service discovery, healthchecks y despliegues independientes; (3) las llamadas entre dominios son llamadas de función en memoria, sin latencia de red. También se descartó el monolito sin separación interna porque viola el RNF-1: sin boundaries no hay camino de escalado diferencial ni de extracción futura.

La opción elegida mantiene boundaries claros por directorio (`/api/catalogo`, `/api/carrito`, `/api/checkout`, `/api/inventario`, `lib/stock.ts`, `lib/recomendaciones.ts`) dentro de un único proceso Next.js. **Ventajas conscientes:** transacciones locales, un solo pipeline de CI/CD, migración futura a servicios independientes facilitada por los boundaries. **Limitaciones conscientes:** escalar "solo el catálogo" a nivel de proceso implica escalar todo el artefacto (mitigado en plataformas serverless, donde cada ruta escala como función independiente); un bug que tira el proceso afecta a todos los dominios; usar otra tecnología en un dominio (ej. recomendaciones en Python) exigiría extraerlo.

**(b) Estrategia de persistencia: PostgreSQL único, accedido vía Prisma ORM.**

El modelo es inherentemente relacional: múltiples N:M con junction tables (`Carrito_Producto` con `cantidad`, `Vendedor_Producto`, `Proveedor_Producto`, `Producto_Categoria`) y una cadena de 1:1 estrictos (`Carrito → Pago → Factura`, `Carrito → Envio`) que se garantizan con FKs únicas a nivel de motor. El criterio decisivo (ADR-004) fue la transaccionalidad: el checkout atómico depende de transacciones ACID reales — en MongoDB los joins serían `$lookup` lentos o lógica en aplicación, y sus transacciones multi-documento son menos maduras; sin ACID, el ADR de atomicidad no se sostiene. MySQL se descartó por no ofrecer ventajas concretas sobre PostgreSQL y por el soporte más maduro de Prisma para este último. Trade-offs aceptados: esquema rígido con migraciones explícitas, y escalado horizontal más complejo que en NoSQL (sharding requeriría Citus o réplicas de lectura).

**(c) Mecanismo de comunicación: modelo híbrido — REST síncrono + webhooks + fire-and-forget.**

Coexisten tres patrones, cada uno donde corresponde (ADR de comunicación):

1. **REST síncrono** para todo lo iniciado por el usuario (catálogo, carrito, checkout, inventario, historial): la UX exige respuesta inmediata y el RNF-5 exige < 500 ms — intermediar un broker en una búsqueda no tiene sentido.
2. **Webhooks** para las notificaciones de sistemas externos: confirmación/rechazo de pago (`POST /api/pagos/webhook`, firmado HMAC-SHA256), actualizaciones del Sistema de Envíos y reposición del Sistema de Proveeduría. El motivo de fondo: la confirmación del pago es inherentemente asíncrona (el usuario completa el pago en el sitio del proveedor) y el polling fue descartado por costoso, lento y limitado por rate limits.
3. **Fire-and-forget** para el Servicio Notificación: se dispara sin esperar confirmación y su falla no revierte ninguna operación de negocio (RNF-2).

Se descartó un message broker centralizado (RabbitMQ/Kafka) por ser sobre-ingeniería para el volumen del sistema: infraestructura que operar y monitorear sin beneficio para los flujos síncronos dominantes. Trade-off aceptado: la confiabilidad de los webhooks depende de los reintentos del proveedor externo; si se agotan, un pago puede quedar `pendiente` — la mitigación diseñada es una conciliación periódica (no implementada).

### 2.3 Diagrama de Componentes

#### 2.3.1 Arquitectura interna adoptada

El backend se organiza en **módulos por dominio funcional** dentro de cada contenedor lógico, siguiendo el patrón de Next.js App Router: cada dominio tiene su controlador (API Route en `src/app/api/<dominio>/route.ts`) que valida la entrada y la autorización, y delega la lógica de negocio compleja a servicios puros en `src/lib/` (`stock.ts`, `recomendaciones.ts`, `prisma.ts`). El criterio de separación de responsabilidades es:

- **Controladores (API Routes):** parseo y validación de requests, verificación de rol, mapeo de errores al formato uniforme `{ error: { code, message } }`. No contienen reglas de negocio.
- **Servicios (`lib/`):** reglas de negocio puras y reutilizables — el checkout atómico y el motor de recomendaciones no saben nada de HTTP.
- **Middleware transversal (`src/proxy.ts`):** autenticación previa a cualquier handler, en un único punto.
- **Acceso a datos:** exclusivamente vía el cliente Prisma (singleton en `lib/prisma.ts`); ningún componente accede a la base por fuera del ORM.

#### 2.3.2 Descripción de componentes

Componentes según `docs/diagrama_componentes_API.md`, agrupados por contenedor:

**Web App**

| Componente | Responsabilidad | Interactúa con | Mecanismo |
|---|---|---|---|
| **Sign In Controller** `[Next.js Page]` | Maneja las páginas de login y registro del lado del cliente. | Servicio Usuarios (Clerk) | Componentes `<SignIn/>`/`<SignUp/>` de Clerk sobre HTTPS |

**API Gateway**

| Componente | Responsabilidad | Interactúa con | Mecanismo |
|---|---|---|---|
| **Controlador Autorización** `[Next.js Middleware — src/proxy.ts]` | Valida el JWT de Clerk y verifica el rol (comprador/vendedor) antes de cada endpoint sensible. | Servicio Usuarios; todos los controladores | Middleware que intercepta toda request antes del handler |

**Servicio Usuarios**

| Componente | Responsabilidad | Interactúa con | Mecanismo |
|---|---|---|---|
| **Autenticación y Roles** `[Clerk]` | Gestiona perfiles, sesiones y asignación de roles mediante JWT (`publicMetadata.role`). | Sign In Controller, Controlador Autorización | JWT firmado; webhook `user.created` |

**Servicio Catálogo**

| Componente | Responsabilidad | Interactúa con | Mecanismo |
|---|---|---|---|
| **Controlador Catálogo** `[Next.js API Route]` | Atiende la navegación por categorías y la búsqueda de productos. | Motor Recomendación, Fragance DB | Llamada de función + Prisma |
| **Gestionar Inventario** `[Node.js]` | ABM de productos y variantes del vendedor. | Fragance DB | Prisma |
| **Servicio Stock REGULAR** `[Node.js]` | Manejo del stock regular de productos y detección de nivel crítico. | Fragance DB, Sistema de Proveeduría | Prisma · REST/HTTPS saliente (diseñado) |
| **Motor Recomendación** `[Node.js — lib/recomendaciones.ts]` | Calcula recomendaciones por índice de Jaccard ponderado sobre notas e ingredientes. | Fragance DB | Prisma; cálculo en memoria |

**Lógica de Negocio (Servicio Carrito)**

| Componente | Responsabilidad | Interactúa con | Mecanismo |
|---|---|---|---|
| **Servicio Carrito** `[Node.js]` | Gestiona la sesión de compra: ítems, cantidades y totales calculados dinámicamente. | Fragance DB | Prisma |
| **Controlador Checkout** `[Next.js API Route]` | Punto de entrada de la compra: valida el carrito, invoca la reserva de stock y deriva al sistema de pagos. | Servicio Stock ATOMICIDAD, Sistema de Pagos | Llamada de función · HTTPS |
| **Servicio Stock ATOMICIDAD** `[Node.js — lib/stock.ts]` | Validación atómica: asegura que no se venda sin stock real, dentro de una transacción de base de datos. | Fragance DB | `prisma.$transaction` |
| **Servicio Notificación** `[Node.js]` | Envío de notificaciones de forma asíncrona; si falla, la compra sigue adelante. | Comprador (email/UI) | Fire-and-forget |
| **Servicio Envio** `[Node.js]` | Lógica de seguimiento de estado y entrega de órdenes. | Sistema de Envíos, Fragance DB | HTTPS · Prisma |
| **Historial de Pedidos** `[Node.js]` | Recupera todas las órdenes del usuario con sus estados. | Fragance DB | Prisma |
| **Servicio de Entrega de Pedidos** `[Node.js]` | Comunicación con el Sistema de Envíos para despachar y recibir actualizaciones de estado. | Sistema de Envíos | HTTPS / webhook entrante |

---

## 3. Stack Tecnológico

| Tecnología | Uso en el sistema | Justificación |
|---|---|---|
| **Next.js 16 (App Router)** | Framework full-stack: el mismo artefacto sirve el frontend React y el backend REST (API Routes en `src/app/api/`). | Frente a la alternativa React SPA + Express separados: un solo codebase y pipeline (clave para un equipo de cinco), sin CORS que gestionar, tipos compartidos entre cliente y servidor, y SSR/SSG para el catálogo — que con 10.000 consultas/día y exigencia de < 500 ms (RNF-5) se beneficia del pre-renderizado. El middleware único (`src/proxy.ts`, renombrado de `middleware.ts` en Next.js 16) intercepta toda request antes de cualquier handler. Trade-off: opiniones fuertes del framework y límites de timeout en serverless. |
| **React 19** | UI interactiva del marketplace: catálogo con filtros, carrito, checkout, paneles del vendedor. | Viene integrado con Next.js; el modelo de componentes encaja con la UI por roles (vistas de comprador y vendedor comparten componentes de producto). |
| **Tailwind CSS 4** | Estilado de toda la interfaz. | Diseño responsivo sin mantener una capa CSS separada; velocidad de iteración para un frontend que se construyó en paralelo a la API. |
| **Clerk v7** | Autenticación, sesiones y roles. El rol (`comprador`/`vendedor`) viaja en `publicMetadata` del JWT. | ADR-005: la auth casera se descartó por riesgo (el sistema maneja dinero; bcrypt/CSRF/rotación de tokens exigen expertise que excede la materia); NextAuth se descartó porque no trae roles en el JWT por defecto ni UI preconstruida; Auth0 por menor integración con App Router. El rol en el JWT evita una query a la BD en cada request — crítico en endpoints frecuentes como el carrito. Trade-off: vendor lock-in y dependencia de disponibilidad externa. |
| **Prisma 7** | ORM: schema declarativo, migraciones, cliente tipado (generado en `src/generated/prisma/client/`), transacciones. | Tipado TypeScript desde el schema (los errores de query se detectan en compilación) y `$transaction`, que es la base del checkout atómico (ADR-001). Conexión configurada en `prisma.config.ts`; singleton en `lib/prisma.ts` para no agotar conexiones. |
| **PostgreSQL** | Base de datos única del sistema (Fragance DB). | ADR-004: transacciones ACID reales (requisito del checkout), FKs que garantizan integridad referencial a nivel motor, joins nativos para historial y recomendaciones. MongoDB descartado por joins vía `$lookup` y transacciones multi-documento menos maduras; MySQL por no aportar ventajas frente al soporte más maduro de Prisma para PostgreSQL. |
| **TanStack React Query v5** | Estado de servidor en el cliente: fetching, caché e invalidación de datos de la API. | Evita gestionar manualmente loading/error/revalidación en cada vista; la invalidación por clave encaja con el patrón de mutaciones del carrito y el inventario. |
| **HMAC-SHA256 (crypto nativo de Node)** | Verificación de la firma del webhook de pagos, con `crypto.timingSafeEqual()`. | ADR-003: estándar de Stripe/MercadoPago; la whitelist de IPs se descartó por frágil (las IPs del proveedor cambian sin aviso). `timingSafeEqual` previene timing attacks. Sin dependencias adicionales. |

---

## 4. Patrones de Diseño y Atributos de Calidad

### 4.1 Patrones aplicados

| Patrón | Dónde se aplica | Qué problema resuelve en este sistema |
|---|---|---|
| **Monolito modular** | Organización general del backend (ADR de arquitectura; C4 Nivel 2). | Mantiene boundaries por dominio (catálogo, carrito/pagos, usuarios) sin el costo de transacciones distribuidas ni operación multi-proceso, preservando el checkout como transacción local. |
| **Transacción atómica (unidad de trabajo)** | `Servicio Stock ATOMICIDAD` — `lib/stock.ts`, `checkoutAtomico()` con `prisma.$transaction`; también el webhook de pagos. | Impide la sobreventa bajo concurrencia (RN-1, RNF-3): validar stock, decrementarlo, crear el `Pago` y convertir el `Carrito` persisten todo o nada, con rollback automático. |
| **Webhook (integración orientada a eventos) + receptor idempotente** | `POST /api/pagos/webhook` (Controlador en Lógica de Negocio). | Resuelve la asincronía del pago externo sin polling. La idempotencia (solo se procesan pagos `pendiente`; reintentos → `409 PAGO_YA_PROCESADO`) evita facturas o envíos duplicados ante los reintentos normales del proveedor; las constraints `@unique` en BD son la última línea de defensa. |
| **Verificación de firma HMAC con comparación timing-safe** | Mismo webhook (`verificarFirma()` con `crypto.timingSafeEqual`). | Impide que un atacante falsifique una confirmación de pago y obtenga productos sin pagar (RNF-4). |
| **Fire-and-forget** | `Servicio Notificación` (componente de Lógica de Negocio). | Saca las notificaciones del camino crítico de la compra: su falla se loguea y no revierte ni bloquea ninguna operación de negocio (RNF-2). |
| **Middleware / interceptor centralizado** | `Controlador Autorización` — `src/proxy.ts`. | Toda request pasa por la verificación de sesión de Clerk antes de llegar a cualquier handler; los handlers re-verifican el rol (defensa en profundidad). Solo quedan públicas `/`, sign-in/up, `/api/catalogo` y los webhooks. |
| **Singleton** | `lib/prisma.ts` (cliente Prisma único). | Evita el agotamiento de conexiones a PostgreSQL por instanciación repetida del cliente, especialmente en desarrollo con hot-reload y en entornos serverless. |
| **Pipeline ETL** | `prisma/seed.ts` (`npm run seed`). | Carga inicial del catálogo: extrae ~100 perfumes reales de PerfumAPI, transforma sus atributos al modelo propio (notas, ingredientes, variantes) y los persiste — los datos de prueba reflejan el dominio real. |

### 4.2 Atributos de calidad

| RNF | Soporte arquitectónico | Estado |
|---|---|---|
| **RNF-1 Escalabilidad horizontal** | El monolito modular con boundaries por ruta permite que, en plataformas serverless, cada API Route escale como función independiente: el catálogo puede recibir 10× el tráfico del checkout sin compartir instancias. Los boundaries dejan preparada la extracción de un dominio a servicio propio si el volumen lo exige. | Soportado por diseño, con la limitación consciente de que el escalado diferencial a nivel de *proceso* depende de la plataforma de despliegue. |
| **RNF-2 Alta disponibilidad (notificaciones)** | Patrón fire-and-forget: el Servicio Notificación queda fuera de la transacción de negocio y del camino crítico; su excepción se captura y loguea sin propagarse. | El punto arquitectónico está resuelto. **Gap explícito:** el envío de email real no está integrado (la confirmación es visual en la UI); integrarlo es agregar la llamada en el punto ya diseñado. |
| **RNF-3 Integridad transaccional** | `prisma.$transaction` en el checkout (validación + decremento + creación de `Pago` + conversión del carrito) y en el webhook (actualización de `Pago` + `Factura` + `Envio`, o reposición de stock + cancelación). La garantía la da el motor PostgreSQL, no el código de aplicación. FKs y constraints `@unique` completan la integridad. | Soportado e implementado — es el atributo mejor cubierto del sistema (ADR-001, ADR-004). |
| **RNF-4 Seguridad** | HTTPS en toda comunicación; hashing de contraseñas delegado a Clerk (el sistema nunca almacena credenciales); middleware de autenticación previo a todo handler más re-verificación de rol por endpoint; firma HMAC-SHA256 con comparación timing-safe en el webhook de pagos. | Soportado e implementado. |
| **RNF-5 Latencia < 500 ms en búsqueda** | Consultas sobre claves primarias e índices únicos de PostgreSQL; paginación estándar en el catálogo; SSR/SSG de Next.js reduce la latencia percibida; el motor de recomendaciones corre en memoria (milisegundos para cientos de productos). | Soportado parcialmente: **no hay capa de caché implementada** (el RNF la menciona como alternativa a índices). A escala mayor se agregaría caché de resultados del catálogo. |
| **RNF-6 Consistencia eventual (reputación)** | El diseño ubica el recálculo de `reputacion` en la reacción asíncrona al cambio de estado del envío (CU-09 paso 3), tolerando demora. | **Sin soporte implementado aún:** el campo `reputacion` existe en `Vendedor` pero el recálculo automático no está desarrollado. Es un gap de alcance declarado. |
| **RNF-7 Interoperabilidad** | API REST documentada en **OpenAPI 3.0** (`openapi.yaml`, validada — 13 endpoints), con formato uniforme de errores `{ error: { code, message } }` y paginación estándar `{ data, pagination }`. | Soportado e implementado. |

---

## 5. Flujos Principales del Sistema

Los componentes se nombran tal como aparecen en los diagramas (§2.2 y §2.3).

### 5.1 Flujo de autenticación

1. El usuario accede a la **Web App** y abre la página de registro o login, gestionada por el **Sign In Controller** (página Next.js que monta los componentes de Clerk).
2. El **Sign In Controller** envía las credenciales directamente al **Servicio Usuarios (Clerk)**, que valida email y contraseña (almacenada con hashing del lado de Clerk — el sistema nunca ve ni guarda credenciales, RNF-4).
3. Clerk genera un **JWT firmado** que incluye `publicMetadata` y lo entrega al navegador como cookie de sesión.
4. **Onboarding (solo primer ingreso):** el usuario nuevo es dirigido a `/onboarding`, elige su rol, y `POST /api/auth/onboarding` crea el registro de negocio correspondiente en **Fragance DB** (`Comprador` con `legajo` generado, o `Vendedor`) y escribe `role: "comprador" | "vendedor"` en el `publicMetadata` de Clerk. A partir de ahí el rol viaja dentro del token.
5. **Requests posteriores:** cada petición llega primero al **Controlador Autorización** (`src/proxy.ts`, middleware del API Gateway), que verifica la validez del JWT contra Clerk antes de que la request alcance cualquier handler. Las únicas rutas exentas son las públicas: `/`, sign-in/sign-up, `/api/catalogo` y los webhooks.
6. **Defensa en profundidad:** el controlador de cada endpoint sensible re-verifica el rol leyendo `publicMetadata.role` del token — sin query adicional a la base — y responde `401/403` si no corresponde (por ejemplo, un comprador llamando a `/api/inventario`).

### 5.2 Flujo de compra con checkout atómico (flujo principal del dominio)

Es el flujo que concentra más reglas de negocio (RN-1, RN-3, RN-4) y más componentes; corresponde a CU-01, CU-02 y CU-03 y al Pipeline 3.

1. El **Comprador** navega el catálogo en la **Web App**; el **Controlador Catálogo** (Servicio Catálogo) resuelve búsquedas y filtros contra **Fragance DB**, y el **Motor Recomendación** sugiere similares por índice de Jaccard ponderado (corazón 40 %, salida 30 %, fondo 20 %, ingrediente 10 %).
2. El Comprador agrega productos: el **Servicio Carrito** registra cada ítem en `CarritoProducto` con su `cantidad`. Por **RN-3, el carrito no reserva stock** — la validación se difiere al checkout.
3. El Comprador confirma la compra: la request pasa por el **Controlador Autorización** (sesión + rol `comprador`) y llega al **Controlador Checkout** (`POST /api/checkout`), que valida que exista un carrito `activo` no vacío.
4. El Controlador Checkout invoca al **Servicio Stock ATOMICIDAD** (`checkoutAtomico()` en `lib/stock.ts`), que ejecuta dentro de **una única `prisma.$transaction`** sobre Fragance DB:
   - a. Para cada ítem, valida `stock >= cantidad` (**RN-1**). Si algún ítem no alcanza, lanza una excepción → **rollback total**: ningún stock queda decrementado, ningún pago creado; el cliente recibe `409 CHECKOUT_FALLIDO` con el producto causante.
   - b. Decrementa el stock de cada producto (secuencialmente, para evitar deadlocks por bloqueo de filas).
   - c. Crea el **`Pago` con estado `pendiente`** vinculado al carrito (la constraint `@unique` sobre `Pago.id_carrito` impide un segundo pago para el mismo carrito).
   - d. Convierte el carrito: `Carrito.estado: "activo" → "convertido"`.
5. Si la transacción confirma, el sistema responde `201` con `id_pago`, `importe_total` (calculado con los precios vigentes de `VarianteProducto`) y el estado `pendiente`; el cobro queda en manos del **Sistema de Pagos** externo.
6. La concurrencia queda resuelta por el motor: si dos compradores disputan la última unidad, PostgreSQL serializa las escrituras sobre la fila de stock; la segunda transacción relee stock 0, falla la validación y hace rollback — **la sobreventa es imposible por diseño** (RNF-3).
7. Por **RN-4**, si el pago resulta rechazado, el stock se repone y el carrito pasa a `cancelado` — eso ocurre en el flujo 5.3.

### 5.3 Flujo de confirmación de pago vía webhook (comunicación con sistema externo)

Flujo asíncrono disparado por el Sistema de Pagos; corresponde a CU-08 y al Pipeline 2.

1. El **Sistema de Pagos** envía `POST /api/pagos/webhook` con el payload `{ id_carrito, estado }` y el header `X-Webhook-Signature: sha256=<hex>`.
2. El controlador del webhook (Lógica de Negocio) calcula `HMAC-SHA256(rawBody, WEBHOOK_SECRET)` y lo compara con la firma usando `crypto.timingSafeEqual()`. Firma ausente o inválida → `401 FIRMA_INVALIDA`; nada se procesa (RNF-4).
3. Busca el **`Pago`** por `id_carrito` en **Fragance DB**. **Control de idempotencia:** si el pago no está en `pendiente`, responde `409 PAGO_YA_PROCESADO` — los reintentos normales del proveedor no generan facturas duplicadas ni doble reposición de stock.
4. **Si `estado = "aprobado"`**, dentro de una única `prisma.$transaction`:
   - a. Actualiza `Pago.estado → "aprobado"`.
   - b. Calcula el `importe_total` sumando `cantidad × precio` de cada ítem (`CarritoProducto` × `VarianteProducto` de ranking principal).
   - c. Crea la **`Factura`** (`nro_factura` CUID, 1:1 con el Pago).
   - d. Hace **upsert del `Envio`** con estado `preparando` (el upsert refuerza la idempotencia ante reintentos).
   - Si cualquier escritura falla, el rollback deja el Pago en `pendiente` y el siguiente reintento del proveedor procesa todo completo.
5. **Si `estado = "rechazado"`**, dentro de otra `$transaction` (RN-4): actualiza el Pago a `rechazado`, **repone el stock** de cada ítem (`increment` por cantidad) y pasa el `Carrito` a `cancelado` — lo que además bloquea una cancelación manual posterior con doble reposición.
6. El **Servicio Notificación** dispara la confirmación al Comprador en modo fire-and-forget, fuera de la transacción: su falla se loguea y no afecta la facturación (RNF-2).
7. Desde aquí continúa el ciclo logístico: el **Vendedor** ve la orden `preparando` en su panel de ventas, confirma el despacho a través del **Servicio de Entrega de Pedidos** hacia el **Sistema de Envíos**, y los cambios de estado (`en_camino`, `entregado`) y el `track_code` se actualizan en el Envío, visibles para el Comprador en su **Historial de Pedidos** (CU-07, CU-09).

---

## 6. Conclusión

**Cómo responde la arquitectura al dominio.** El dominio de un marketplace de fragancias impone dos exigencias asimétricas: por un lado, un catálogo de lectura intensiva donde el diferencial competitivo es la información olfativa del producto; por el otro, un ciclo de compra donde un error de consistencia (vender sin stock, facturar sin pago) destruye la confianza. La arquitectura responde a esa asimetría en cada nivel: el modelo de datos pone las notas olfativas en el centro de la entidad `Producto` (lo que habilita un motor de recomendaciones por Jaccard sin infraestructura de ML), y el camino de la compra se construyó entero sobre garantías del motor de base de datos — transacción atómica en el checkout, constraints `@unique` para los 1:1 de la cadena `Carrito → Pago → Factura / Envio`, webhook firmado e idempotente para el único evento que entra desde afuera con consecuencias económicas. La decisión más estructurante fue la **organización de servicios como monolito modular**: dominios separados por boundaries internos (catálogo, carrito/pagos, usuarios) dentro de un único artefacto Next.js. Se eligió porque el checkout exige una transacción local — microservicios reales habrían requerido transacciones distribuidas, incompatibles con el RNF-3 — y porque la carga operativa de un despliegue distribuido no se justifica para un equipo de cinco personas, mientras que los boundaries dejan abierta la extracción futura de un dominio.

**Trade-offs asumidos conscientemente.** (1) Escalar un dominio implica escalar el artefacto completo; se mitiga en serverless, donde cada ruta escala como función, pero la granularidad fina depende de la plataforma. (2) La confirmación de pago depende de los reintentos del proveedor: si se agotan, un pago queda `pendiente` con stock bloqueado — el modo de falla es seguro (nunca una venta sin pago) pero exige una conciliación periódica que no se construyó. (3) Vendor lock-in en Clerk a cambio de no implementar autenticación propia en un sistema que maneja dinero. (4) Jaccard no captura semántica ("Rose" ≠ "Rosa") ni aprende del comportamiento: se aceptó porque funciona desde el día 1, es interpretable y el catálogo es acotado. (5) Varias capacidades especificadas se dejaron fuera con un criterio explícito — priorizar el camino crítico de la compra y sus garantías de consistencia por sobre integraciones salientes con terceros: la liberación automática de la reserva de 5 minutos, los emails reales, la llamada saliente de restock y el recálculo de reputación. Ninguna compromete la integridad de los datos, y todas tienen su diseño documentado (CU-03, CU-09, CU-10).

**Qué quedaría por resolver si el sistema escalara.** Primero, lo operativo del dinero: la conciliación periódica de pagos pendientes y la reserva con expiración real (`reserva_expira` + job externo — en serverless no hay timers en memoria). Segundo, la lectura: caché del catálogo y de recomendaciones para sostener el RNF-5 más allá del alcance actual de los índices, y pre-cómputo o `pgvector` para el motor de similitud cuando el catálogo supere el orden de los 10.000 productos. Tercero, la escritura: bajo altísima concurrencia sobre un mismo producto, la serialización de locks de la transacción se vuelve cuello de botella; a esa escala correspondería revisar el optimistic locking o extraer el dominio de checkout. Por último, si un dominio exigiera tecnología propia o un equipo dedicado, los boundaries del monolito modular son precisamente el plano de corte para extraerlo como servicio — la arquitectura actual no es el destino final, sino la decisión correcta para el tamaño real del problema y del equipo.

---

*Fragancio Elegancio — Documento de Arquitectura · Defensa Final 2026 · Grupo 17*
