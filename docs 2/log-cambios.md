# Registro de Modificaciones a los Diagramas

Este archivo registra todas las modificaciones realizadas a los documentos de arquitectura y diseño del proyecto, con fecha, archivo afectado y descripción del cambio.

---

## 2026-06-04

### README.md

| # | Sección | Cambio |
|---|---|---|
| 1 | Sección 6.1 — Flujo de Compra, paso 5 | `"se crea la Orden de Compra con estado pendiente"` → `"se crea el Pago con estado pendiente vinculado al Carrito"`. La entidad OrdenCompra fue eliminada del modelo; el Pago cumple ese rol. |

---

### CLAUDE.md

| # | Sección | Cambio |
|---|---|---|
| 1 | Stock atomicity — paso 3 del flujo | `Create OrdenCompra with estado = "pendiente"` → `Create Pago with estado = "pendiente" linked to the Carrito (no separate OrdenCompra entity)` |
| 2 | Data model highlights — relaciones | `Carrito → OrdenCompra is 1:0..1; id_carrito is @unique on OrdenCompra` → `Carrito → Pago is 1:0..1; Carrito → Envio is 1:0..1; id_carrito is @unique on both Pago and Envio` |
| 3 | Data model highlights — junction tables | Eliminada `ProductoOrden` de la lista de junction tables (no existe en el schema Prisma actual). Lista correcta: `CarritoProducto`, `ProductoCategoria`, `ProveedorProducto` |
| 4 | Data model highlights — relaciones 1:1 | `Pago → Factura is 1:1; OrdenCompra → Envio is 1:1` → `Pago → Factura is 1:1; Carrito → Envio is 1:1` |

---

### docs/casos-de-uso.md

| # | Sección | Cambio |
|---|---|---|
| 1 | Entidades — Usuario | Atributo `dni` reemplazado por `id_usuario` para alinear con el modelo E-R, modelado de datos y schema Prisma (la PK es `id_usuario INT`, no `dni`). |
| 2 | Entidades — Carrito | Eliminado atributo `total` (no es un atributo almacenado; se calcula dinámicamente). Agregados atributos `estado` y `fecha_creada`, que sí existen en el schema. |
| 3 | Entidades — Variante\_Producto | Agregado atributo `precio` e `id_variante_producto`. El precio vive en la variante, no en la relación. |
| 4 | Entidades — Orden de Compra | **Entidad eliminada.** OrdenCompra fue removida del modelo. Reemplazada por las entidades `Pago` y `Factura`, que ya existían en el E-R y el schema. |
| 5 | Entidades — Pago | **Entidad agregada** con atributos `id_pago` y `estado`. |
| 6 | Entidades — Factura | **Entidad agregada** con atributos `nro_factura`, `importe_total` y `fecha_emision`. |
| 7 | Relaciones — Tiene(1) | **Relación eliminada.** La relación directa Vendedor → Producto no existe en el modelo de datos (no hay FK ni junction table entre Vendedor y Producto en el schema Prisma ni en el E-R). |
| 8 | Relaciones — Tiene(2) | Cardinalidad corregida: `Comprador(1) — Carrito(1)` → `Comprador(1) — Carrito(0..*)`. Un comprador puede tener muchos carritos a lo largo del tiempo, no uno solo. Consistente con `carritos Carrito[]` en el schema Prisma. |
| 9 | Relaciones — Paga | **Relación reestructurada.** Se reemplazó `Paga: Carrito (1) — (0..*) Orden de compra` por dos relaciones separadas: `Necesita: Carrito (1) — (0..1) Pago` y `Crea: Pago (1) — (1) Factura`, consistente con el E-R y el schema. |
| 10 | Relaciones — Enviado | Sujeto corregido: `Orden de compra(1) — (1) Envío` → `Carrito(1) — (0..1) Envío`. El Envío se liga directamente al Carrito vía `id_carrito @unique`. |
| 11 | Relaciones — Posee | **Relación eliminada.** `Posee: Orden de compra — Producto` ya no aplica sin OrdenCompra. Los productos de una compra quedan registrados en `CarritoProducto`. |
| 12 | Relaciones — Ofrece | **Relación agregada:** `Proveedor (0..*) — (1..*) Producto` vía tabla `Proveedor_Producto`. Existía en el E-R y el schema pero faltaba en este documento. |
| 13 | Regla de negocio 1 | Reemplazado "orden de compra" por "pago" como entidad central del proceso, alineando con el modelo actual. |
| 14 | Regla de negocio 2 | Simplificada: eliminada la referencia a "el comprador califica" (mecanismo de calificación no modelado en ningún documento). Se mantiene la lógica de que `reputacion` en Vendedor se actualiza al entregar el pedido. |
| 15 | Regla de negocio 4 | `"la Orden debe cancelarse"` → `"el Pago queda en estado rechazado"`, alineado con los estados del modelo (`pendiente / aprobado / rechazado / reembolsado`). |
| 16 | RF 3 — Proceso de Checkout | Eliminada la referencia a "transformar un carrito en una Orden de Compra". Descripción actualizada para reflejar el flujo actual: reserva de stock + pago externo. |
| 17 | CU-02 y siguientes | El contenido original estaba truncado (artefacto de copy-paste). CU-02 queda marcado como pendiente de completar. |

---

### docs/casos-de-uso.md — segunda ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 18 | Entidades — Comprador | Agregado atributo `legajo` (PK de la entidad, presente en E-R, modelado de datos y schema Prisma). |
| 19 | Entidades — Vendedor | Agregado atributo `legajo` (PK de la entidad, presente en E-R, modelado de datos y schema Prisma). |
| 20 | Reglas de negocio | Agregada regla 5: **Restock Automático**. El sistema envía un pedido al Proveedor cuando el stock cae a niveles críticos. Consistente con DFD (flujo Marketplace → Sistema de Proveeduría), diagrama de contenedores y README sección 6.2. |
| 21 | Requerimientos Funcionales | Agregado RF-5: **Recomendaciones de Productos** (Motor de Recomendación, presente en README secciones 1.1 y 6.3 y en diagrama de contenedores, pero ausente del documento). |
| 22 | Requerimientos Funcionales | Agregado RF-10: **Restock Automático** (presente en DFD, contenedores y README pero ausente del documento). |
| 23 | CU-02 | Completado: Gestión de Carrito de Compras con secuencia normal, excepción de stock agotado y nota sobre reserva diferida al checkout. |
| 24 | CU-03 | Agregado: Proceso de Checkout. Cubre reserva atómica de stock, redirección al Sistema de Pagos externo, confirmación vía webhook, creación de Factura y Envío. |
| 25 | CU-04 | Agregado: Historial de Pedidos. Muestra Carritos con Pago asociado, estado de Pago y Envío, y detalle con track\_code y Factura. |
| 26 | CU-05 | Agregado: Recomendaciones de Productos. Cubre el Motor de Recomendación usando `notas_salida`, `notas_corazon`, `notas_fondo` e `ingrediente`. |
| 27 | CU-06 | Agregado: Gestión de Inventario (Vendedor). Cubre ABM de Productos y Variante\_Producto con validación de rol Clerk. |
| 28 | CU-07 | Agregado: Panel de Ventas (Vendedor). Muestra Envíos en estado `preparando` y permite marcarlos como despachados. |
| 29 | CU-08 | Agregado: Sincronización de Stock (Sistema). Cubre el flujo del webhook de pago: actualización de Pago, decremento de stock, creación de Factura y Envío, todo en transacción Prisma. |
| 30 | CU-09 | Agregado: Notificaciones de Estado de Envío (Sistema). Cubre el flujo asíncrono fire-and-forget del Servicio Notificación. Falla no bloquea la compra. |
| 31 | CU-10 | Agregado: Restock Automático (Sistema). Cubre el flujo Servicio Catálogo → Sistema de Proveeduría vía REST/HTTPS cuando el stock cae a nivel crítico. |

---

### docs/casos-de-uso.md — tercera ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 32 | CU-02, paso 1 | Eliminada la mención a "seleccionar una variante" al agregar al carrito. `CarritoProducto` solo almacena `id_producto` y `cantidad`; la información de variante (volumen, concentración, precio) se obtiene siempre a través de la relación Producto → Variante\_Producto, que ya está correctamente modelada en la BD. |
| 33 | CU-08, paso 3 | Corregida la redacción imprecisa: `"descuenta el stock en los registros de CarritoProducto"` → `"descuenta de Producto.stock la cantidad correspondiente a cada ítem, consultando la cantidad registrada en CarritoProducto"`. El stock vive en `Producto.stock`; CarritoProducto solo provee la cantidad a descontar. |

---

### docs/casos-de-uso.md — cuarta ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 34 | CU-03, comentario | Aclarado que el Servicio Notificación es un componente interno dentro de Lógica de Negocio (Servicio Carrito); no es un contenedor independiente. Consistente con el diagrama de componentes API donde aparece dentro del contenedor Lógica de Negocio. |
| 35 | CU-09, actores | Actualizada la descripción del Servicio Notificación: `"(interno)"` → `"(componente interno de Lógica de Negocio / Servicio Carrito)"`, alineando con el punto anterior. |
| 36 | CU-07, paso 2 | Corregido el flujo de despacho: el Vendedor ya no "actualiza el estado a `en tránsito`" directamente. Ahora el sistema envía los datos del despacho al Sistema de Envíos externo, y el estado pasará a `en tránsito` cuando ese sistema lo notifique vía webhook (CU-09). Consistente con el DFD (Sistema de Envíos → Marketplace: "Actualización pedido") y con CU-09 que define al Sistema de Envíos como quien notifica los cambios de estado. |
| 37 | CU-09, paso 3 (nuevo) | Agregado paso 3: cuando el nuevo estado es `entregado`, el sistema recalcula y actualiza el atributo `reputacion` del Vendedor correspondiente. Cubre la Regla de Negocio 2, que antes no estaba reflejada en ningún caso de uso. |

---

### docs/casos-de-uso.md — quinta ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 38 | CU-05, Descripción | Actualizada para reflejar que el motor usa historial de compras y productos visitados, no solo el producto actual. Consistente con RF-5 ("productos previamente vistos o comprados") y README §6.3 ("analiza el historial de compras y productos visitados"). |
| 39 | CU-05, paso 1 | El Motor ahora recupera el historial de compras y productos visitados del Comprador junto con los atributos del producto de referencia actual. Antes solo consideraba el producto puntual que se estaba viendo. |
| 40 | CU-05, paso 2 | Añadida la ponderación por historial al cálculo del índice de coincidencia. |
| 41 | CU-05, paso 3 | Cambiado "lista de productos ordenados por mayor similitud" a "lista de productos recomendados **personalizada**", reflejando que el resultado depende del historial individual del Comprador. |
| 42 | CU-05, excepción 1.1 (nueva) | Agregado caso borde: si el Comprador no tiene historial, el motor usa solo los atributos del producto de referencia actual. Antes este caso no estaba cubierto. |
| 43 | CU-05, Post Condiciones | Agregada la palabra "personalizada" para alinear con RF-5 y README §6.3. |
| 44 | CU-06, paso 3 | Eliminado el atributo `descripción`, que no existe en el schema Prisma, modelo E-R ni modelado de datos. Reemplazado por `notas olfativas, ingredientes`, que son los campos reales de `Producto` modificables por el Vendedor. |
| 45 | CU-08, paso 6 (nuevo) | Agregado paso 6: el Servicio Notificación envía correo de confirmación al Comprador de forma asíncrona (fire-and-forget). Cierra la inconsistencia con CU-03 paso 6, que sí lo mencionaba. El comentario del CU fue actualizado para aclarar que el paso 6 no forma parte de la transacción Prisma. |

---

### docs/casos-de-uso.md — sexta ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 46 | CU-10, Descripción | Extendida para cubrir el ciclo completo: el Proveedor confirma el despacho vía webhook y el sistema actualiza `Producto.stock` automáticamente. |
| 47 | CU-10, Post Condiciones | Actualizada: ya no dice "el sistema queda a la espera", sino que describe el estado final real: `Producto.stock` actualizado con la cantidad repuesta. |
| 48 | CU-10, paso 3 | Reformulado: el Sistema de Proveeduría recibe el pedido y prepara el despacho. Se eliminó "El sistema queda a la espera", que era un estado intermedio sin acción del sistema. |
| 49 | CU-10, paso 4 (nuevo) | El Sistema de Proveeduría notifica al marketplace vía webhook → el Servicio Catálogo actualiza `Producto.stock` sumando la cantidad repuesta. Cierra el flujo definido en el DFD: "Sistema de Proveeduría → Marketplace: Envío de productos". |
| 50 | CU-10, excepción 4.1 (nueva) | Si el webhook de reposición falla, el stock no se actualiza automáticamente y el Vendedor puede corregirlo manualmente vía CU-06. |
| 51 | CU-10, comentario | Aclarado que el paso 4 cierra el ciclo del DFD. |

---

### docs/diagrama-contenedores-c4.md

| # | Sección | Cambio |
|---|---|---|
| 52 | Sistemas externos — Proveedores de perfumes | Agregada la comunicación de retorno: "Notifican al Servicio Catálogo vía webhook cuando despachan la reposición." La descripción anterior solo mencionaba el sentido saliente. |
| 53 | Servicio Catálogo — responsabilidades | Agregada responsabilidad: "Recibe notificaciones de reposición del Sistema de Proveeduría vía webhook y actualiza `Producto.stock`." |
| 54 | Flujo de restock | Agregada la segunda línea del flujo bidireccional: `Proveedores de perfumes → Servicio Catálogo (webhook — notificación de reposición → actualiza Producto.stock)`. Antes el flujo solo mostraba la salida. |


---

### docs/modelado-datos.md

| # | Sección | Cambio |
|---|---|---|
| 56 | Tabla Producto | Agregada columna `imagen_url` (opcional). Es la columna real en la BD (presente en el schema Prisma como `imagen_url String?`) que no figura en el E-R por ser un detalle técnico de presentación. Agregada nota que explica por qué está acá pero no en el E-R. |

---

### docs/casos-de-uso.md — séptima ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 57 | CU-06, paso 2 | Agregado `imagen` a los campos que el Vendedor completa al crear un producto. Consistente con RF-6 ("imágenes") y con `imagen_url String?` en el schema Prisma. |

---

### docs/diagrama-contenedores-c4.md — segunda ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 58 | Contenedor Envios DB | **Eliminado.** El sistema tiene una única base de datos (Fragance DB). `Envios DB` como contenedor separado no existe en el schema Prisma ni en el README. El modelo `Envio` vive en Fragance DB junto al resto. |
| 59 | Servicio Carrito — responsabilidades | Eliminada la referencia a `Envios DB`. Agregado que se comunica con el Sistema de Envios directamente para despachar pedidos y recibir actualizaciones de estado. |
| 60 | Fragance DB — descripción | Actualizada para dejar claro que es la base **única** del sistema y que contiene también el estado de envíos (usuarios, productos, carritos, pagos, facturas y envíos). |
| 61 | Fragance DB — acceso | Corregido: antes decía "Accedida por API Gateway y Servicio Carrito". Ahora incluye al Servicio Catálogo, que también lee y escribe productos en la BD. |
| 62 | Flujo de compra | Eliminado el nodo `Envios DB` del flujo. El Servicio Carrito ahora se conecta directamente con el Sistema de Envios, sin pasar por una segunda base de datos. |

---

### docs/casos-de-uso.md — octava ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 63 | CU-06, paso 3 | Agregado `imagen` a los campos modificables. Consistente con RF-6 ("imágenes") y con que paso 2 (alta) ya la incluía. Antes se podía cargar imagen al crear pero no al editar. |

---

### docs/casos-de-uso.md — novena ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 64 | CU-03, excepciones | Reordenadas para seguir el orden lógico de la secuencia normal: `1.1 → 2.1 → 4.1`. Antes aparecían como `1.1 → 4.1 → 2.1`, que es confuso porque el `2.1` (timeout de 5 minutos) corresponde al paso 2 y debería ir antes del `4.1` (pago rechazado, paso 4). |
| 65 | CU-07, Post Condiciones | Completada: antes solo describía el resultado del paso 1 (mostrar la lista). Ahora también cubre el resultado del paso 2: los datos del despacho enviados al Sistema de Envíos externo y el Envío en espera de notificación `en tránsito` vía CU-09. |

---

### docs/casos-de-uso.md — décima ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 66 | Relaciones — Contiene {cantidad} | Cardinalidad corregida: `Carrito (1) — (0..*)` → `Carrito (1) — (1..*)`. Descripción actualizada: "Un carrito puede contener cero o más productos" → "Un carrito contiene uno o más productos". El README §3.3 y el E-R dicen explícitamente 1..*; la pre-condición de CU-03 ("el carrito debe contener al menos un producto") refuerza la regla de negocio. |
| 67 | CU-05, excepción 2.1 | Eliminado "mejor valorados o": no existe campo de rating en ningún modelo. Queda solo "más vendidos", que se deriva en query time de `CarritoProducto` cruzado con `Pago.estado = 'aprobado'`. No requiere columna nueva ni cambio en schema. |

---

### docs/casos-de-uso.md — undécima ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 68 | Relaciones — Tiene (Producto-Variante) | Cardinalidad y dirección corregidas para alinear con el modelo E-R: `Producto (1) — (1..*) Variante_Producto` → `Variante_Producto (1..*) — (1..*) Producto`. La relación es many-to-many (implementada con tabla de unión `Producto_Variante_Producto`), no 1:many como decía antes. La dirección semántica también se invirtió para coincidir con el E-R (`Variante_Producto tiene Producto`). |

---

### docs/modelado-datos.md

| # | Sección | Cambio |
|---|---|---|
| 69 | Tabla Producto-Variante_Producto | Agregada columna `ranking` como atributo propio de la tabla de unión. Corresponde al atributo `ranking` declarado en la relación `tiene` del modelo E-R. El título de la tabla se actualizó de "tabla de unión" a "tabla de unión con atributo propio" para ser consistente con `Carrito_Producto`. |

---

### docs/modelo-er.md

| # | Sección | Cambio |
|---|---|---|
| 70 | Diagrama ASCII de cardinalidades — relación `tiene` | Corregida la cardinalidad del lado Variante_Producto: `──1──` → `──1..*──`. El diagrama mostraba que cada Producto se relaciona con exactamente 1 Variante_Producto, contradiciendo la tabla de relaciones del mismo archivo que declara `1..* a 1..*` (many-to-many). |

---

### docs/diagrama-contenedores-c4.md — tercera ronda de cambios

| # | Sección | Cambio |
|---|---|---|
| 71 | Sistemas externos — nombre | `Proveedores de perfumes` → `Sistema de Proveeduría`. El nombre era inconsistente: el propio C4 usaba "Sistema de Proveeduría" en el cuerpo del Servicio Catálogo, y todos los demás documentos (DFD, casos de uso) usan ese nombre. Unificado en las tres ocurrencias del C4: tabla de sistemas externos, responsabilidades del Servicio Catálogo y flujo de restock. |

---

## 2026-06-05

### docs/diagrama_componentes_API.md

| # | Sección | Cambio |
|---|---|---|
| 72 | Contenedores | Agregado contenedor **Servicio Usuarios `[Clerk]`** con descripción "Gestión de identidad, sesiones y roles de usuario". Estaba presente en el diagrama de contenedores C4 pero ausente en el de componentes. |
| 73 | Componentes — Servicio Usuarios | Agregado componente interno **Autenticación y Roles `[Clerk]`**: "Gestiona perfiles de usuario, sesiones y asignación de roles (comprador/vendedor) mediante JWT." |
| 74 | Componentes — Web App — Sign In Controller | Tecnología corregida: `Next.js API Route` → `Next.js Page`. Descripción diferenciada: antes era idéntica a la de Controlador Autorización. Nueva descripción: "Maneja las páginas de login y registro del lado del cliente. Interactúa con Clerk para autenticar al usuario." |
| 75 | Componentes — API Gateway — Controlador Autorización | Tecnología corregida: `Next.js API Route` → `Next.js Middleware`. Descripción diferenciada: "Valida el JWT de Clerk y verifica el rol (comprador/vendedor) en cada endpoint sensible del API." |
| 76 | Componentes — Servicio Catálogo | Eliminados **Historial de Pedidos** y **Servicio de Entrega de Pedidos**. Ninguno tiene relación con la gestión de productos o búsqueda. |
| 77 | Componentes — Lógica de Negocio | Incorporados **Historial de Pedidos** y **Servicio de Entrega de Pedidos** (movidos desde Servicio Catálogo). Actualizada descripción de Servicio de Entrega de Pedidos para distinguirla de Servicio Envio: "Gestiona la comunicación con el Sistema de Envíos para despachar y actualizar el estado de los pedidos." |
| 78 | Relaciones — Lógica de Negocio | Cadena de relaciones reescrita. El Controlador Checkout pasa a ser el punto de entrada; Servicio Stock ATOMICIDAD es invocado por Checkout (no al revés); Sistema de Pagos confirma vía webhook disparando Servicio Notificación (async) y Servicio Envio. Historial de Pedidos e Historial de Entrega pasan a relacionarse con Fragance DB y Sistema de Envios respectivamente, como nodos independientes bajo Lógica de Negocio. |
| 79 | Relaciones — Servicio de Entrega de Pedidos duplicado | Eliminada la aparición duplicada. El componente ahora vive solo en Lógica de Negocio. La relación `Sistema de Envios → Servicio de Entrega de Pedidos` se mantiene como relación de retorno (notificación de actualización de estado). |
| 80 | Resumen de Tecnologías | Agregadas tecnologías Clerk y Next.js Page. Sign In Controller pasó de "Next.js API Route" a "Next.js Page". |

---

### prisma/schema.prisma + docs/modelado-datos.md — Corrección PK de Comprador y Vendedor

| # | Sección | Cambio |
|---|---|---|
| 81 | `Comprador` | PK cambiada: `legajo String @id` → `id_usuario Int @id`. `legajo` pasa a ser atributo UNIQUE. La PK de tablas especializadas en herencia tabla-por-tipo debe ser la misma clave que en la tabla base, actuando a la vez como FK hacia `Usuario`. |
| 82 | `Vendedor` | Ídem al punto 81: `id_usuario Int @id`, `legajo String @unique`. |
| 83 | `Carrito` | FK hacia Comprador corregida: campo `legajo String` → `id_usuario Int`. La FK debe referenciar la PK de Comprador, que ahora es `id_usuario`. Relación actualizada a `@relation(fields: [id_usuario], references: [id_usuario])`. |
| 84 | `modelado-datos.md` — tablas Comprador y Vendedor | Columnas reordenadas para reflejar el nuevo rol: `id_usuario` aparece primero como "PK + FK → usuario". `legajo` figura como "atributo propio (UNIQUE)". Agregadas notas explicativas en ambas tablas. |
| 85 | `modelado-datos.md` — tabla Carrito | FK actualizada: columna `legajo` → `id_usuario`, rol "FK → Comprador". Nota actualizada para aclarar que `id_usuario` referencia la PK de Comprador y no `legajo`. |
| 86 | `modelado-datos.md` — mapa de conexiones | Línea `Comprador ◄── Carrito (via legajo)` → `Comprador ◄── Carrito (via id_usuario)`. |

---

### prisma/schema.prisma + docs/modelado-datos.md + docs/modelo-er.md — Corrección relación Producto → Variante_Producto (N:M → 1:N)

| # | Sección | Cambio |
|---|---|---|
| 87 | `VarianteProducto` (schema) | Agregada columna `id_producto Int` como FK directa a `Producto`. Agregado campo `ranking Int?` (antes era atributo de la tabla de unión). Agregada relación `producto Producto @relation(fields: [id_producto], references: [id_producto])`. |
| 88 | `Producto` (schema) | Relación `variante` cambiada de `ProductoVarianteProducto[]` a `VarianteProducto[]`. La relación ahora es 1:N directa. |
| 89 | `ProductoVarianteProducto` (schema) | **Modelo eliminado.** La tabla de unión no tiene sentido: una variante pertenece a exactamente un producto. La N:M era incorrecta. |
| 90 | `modelado-datos.md` — tabla Variante_Producto | Agregadas columnas `id_producto` (FK → Producto) y `ranking`. Agregada nota explicando el cambio a 1:N y que `ranking` migró de la ex-tabla de unión. |
| 91 | `modelado-datos.md` — tabla Producto-Variante_Producto | **Sección eliminada.** La tabla de unión ya no existe. |
| 92 | `modelado-datos.md` — mapa de conexiones | Eliminadas las dos líneas que referenciaban `Producto-Variante_Producto`. Reemplazadas por `Producto ◄── Variante_Producto (via id_producto)`. |
| 93 | `modelo-er.md` — atributos de Variante_Producto | Agregado atributo `ranking` a la tabla de atributos. Nota actualizada: `ranking` y `concentracion` son atributos propios de `Variante_Producto`; la relación con Producto es 1:N. |
| 94 | `modelo-er.md` — tabla de relaciones | Fila `Variante_Producto tiene Producto \| 1..* a 1..* \| ranking` reemplazada por `Producto tiene Variante_Producto \| 1 a 0..* \| —`. La dirección y cardinalidad se corrigen: una variante pertenece a un único producto. El atributo `ranking` dejó de ser de la relación para pasar a `Variante_Producto`. Revierte el cambio del punto #68 (que incorrectamente forzaba N:M). |
| 95 | `modelo-er.md` — diagrama ASCII | Flecha corregida: `◄──1..*── tiene ──1..*──` → `──1── tiene ──0..*──►`. |

---

### docs/casos-de-uso.md — Correcciones por consistencia con E-R y modelado de datos

| # | Sección | Cambio |
|---|---|---|
| 96 | Entidades — Variante\_Producto | Agregado atributo `ranking`. Con la corrección 1:N, `ranking` pasó de ser atributo de la relación (tabla de unión) a ser atributo propio de la entidad. Consistente con E-R y schema Prisma actualizados. |
| 97 | Relaciones — Tiene (Variante\_Producto) | Relación corregida: `Variante_Producto (1..*) — (1..*) Producto` → `Producto (1) — (0..*) Variante_Producto`. Eliminada la mención a la tabla de unión `Producto_Variante_Producto` (fue removida). Dirección y cardinalidad alineadas con el E-R actualizado (1:N). |

