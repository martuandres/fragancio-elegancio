# Arquitectura y diseño de sistemas

**Descripción General: Marketplace Especializado de Fragancias**  
El proyecto consiste en el diseño e implementación de un sistema de software orientado a la comercialización especializada de perfumes. A diferencia de un marketplace genérico, este sistema se centrará en optimizar el proceso de búsqueda de perfumes del usuario mediante un motor de recomendaciones avanzado el cual utilizara un algoritmo basado en atributos intrínsecos de las fragancias como sus ingredientes principales y las distintas notas que posea. En principio el mismo será un índice de coincidencia basado en estos atributos siguiendo una cuenta especifica que dará como resultado la recomendación.

El núcleo del sistema sería su capacidad de filtrado inteligente, que va a utilizar un índice de coincidencia para proponer productos basados en familias olfativas, notas de salida, corazón y fondo, permitiendo que tanto el usuario que sabe lo que quiere como él que está indeciso pueda encontrar una fragancia que cumpla con sus expectativas.

## MODELO DE DOMINIO: E-COMMERCE MARKETPLACE

# ENTIDADES Y ATRIBUTOS PRINCIPALES

* **Comprador**: legajo, email, nombre, direccion\_envio, telefono
* **Vendedor**: id\_vendedor, email, nombre, reputación, saldo, cbu
* **Producto:** id\_producto, nombre, ingrediente, notas\_salida, notas\_corazon, notas\_fondo, marca, stock
* **Variante\_Producto**: id\_variante\_producto, volumen, concentración, precio, ranking
* **Categoria**: id\_categoria, criterio
* **Carrito:** id\_carrito, estado, fecha\_creada
* **Pago:** id\_pago, estado
* **Factura:** nro\_factura, importe\_total, fecha\_emision
* **Envío:** id\_envío, estado, track\_code
* **Proveedor:** marca, email\_contacto, teléfono

# RELACIONES

* **Ofrece:** Vendedor (0..\*) — (1..\*) Producto: Un vendedor puede ofrecer cero o más productos; un producto tiene uno o más vendedores. Relación implementada mediante la tabla de unión Vendedor\_Producto.
* **Ofrece:** Proveedor (0..\*) — (1..\*) Producto: Un proveedor puede ofrecer cero o más productos; un producto tiene uno o más proveedores. Relación implementada mediante la tabla de unión Proveedor\_Producto.
* **Pertenece:** Producto (1..\*) — Categoría (0..\*): Un producto pertenece a una o más categorías; una categoría puede tener cero o más productos (puede existir sin productos aún asignados).
* **Tiene:** Producto (1) — (0..\*) Variante\_Producto: Un producto tiene cero o más variantes; una variante pertenece a exactamente un producto.
* **Tiene:** Comprador (1) — (0..\*) Carrito: Un comprador puede tener cero o más carritos a lo largo del tiempo; cada carrito pertenece a un único comprador.
* **Contiene {cantidad}:** Carrito (1) — (1..\*) Producto: Un carrito contiene uno o más productos; un mismo producto puede estar en ninguno o muchos carritos. La cantidad es un atributo propio de esta relación.
* **Necesita:** Carrito (1) — (0..1) Pago: Un carrito puede tener como máximo un pago asociado; un pago corresponde a un único carrito.
* **Crea:** Pago (1) — (1) Factura: Un pago confirmado genera exactamente una factura; una factura es generada por un único pago.
* **Enviado:** Carrito (1) — (0..1) Envío: Un carrito puede tener como máximo un envío asociado; un envío corresponde a un único carrito.

## REGLAS DE NEGOCIO

1. **Validación de Stock:** Un pago no podrá procesarse si no hay stock disponible para alguno de los productos del carrito. El stock debe ser restado de forma automática una vez confirmado el pago. Además deberá ser una operación atómica: dado el caso donde dos compradores intenten comprar el último stock disponible, el sistema procesará al primero y validará el stock antes de que el segundo intente pagar, evitando la sobreventa.
2. **Reputación del Vendedor:** Se recalcula automáticamente cada vez que un envío pasa a estado "Entregado". El atributo `reputacion` en la entidad Vendedor almacena el valor actualizado.
3. **Gestión de Carrito:** Los productos en el carrito no reservan stock hasta que se inicia el checkout. La validación de disponibilidad de stock ocurre al momento de iniciar el checkout; si el stock no es suficiente, la operación no avanza.
4. **Flujo de Pago:** Si el pago falla o es rechazado, el Pago queda en estado `rechazado` y el stock reservado durante el checkout se libera automáticamente. La reserva temporal dura 5 minutos; si el usuario no completa el pago en ese tiempo, se libera sin intervención.
5. **Restock Automático:** Cuando el stock de un producto cae a niveles críticos, el sistema envía automáticamente un pedido de reabastecimiento al Proveedor correspondiente vía REST/HTTPS. Esta operación es iniciada por el Servicio Catálogo y no requiere intervención del Vendedor.

# REQUERIMIENTOS FUNCIONALES

## Para el Comprador/Usuario

1. **Catálogo de Productos:** El sistema debe permitir navegar por categorías y buscar productos por nombre o descripción.
2. **Gestión de Carrito:** El usuario debe poder agregar, quitar y modificar cantidades de productos en un carrito de compras.
3. **Proceso de Checkout:** El sistema debe permitir iniciar el proceso de compra desde el carrito, reservando el stock, solicitando datos de envío y procesando el pago a través del sistema externo.
4. **Historial de Pedidos:** El usuario debe poder visualizar el estado de sus compras pasadas y actuales (Pendiente, Enviado, Entregado).
5. **Recomendaciones de Productos:** El sistema debe sugerir fragancias al comprador basándose en similitudes de notas olfativas (salida, corazón, fondo) e ingredientes de productos previamente vistos o comprados.

## Para el Vendedor:

6. **Gestión de Inventario (ABM):** El vendedor debe poder dar de alta, baja y modificar sus productos (precio por variante, stock, imágenes).
7. **Panel de Ventas:** El sistema debe mostrar al vendedor las órdenes recibidas que están pendientes de despacho.

## Para el Sistema (Automáticos):

8. **Sincronización de Stock:** El sistema debe descontar automáticamente las unidades del inventario una vez que el pago es confirmado.
9. **Notificaciones de Estado:** El sistema debe enviar un correo automático al comprador cuando el estado de su envío cambie. Si el servicio de notificaciones falla, la compra no debe verse afectada.
10. **Restock Automático:** El sistema debe detectar cuando el stock de un producto cae a nivel crítico y enviar un pedido de reabastecimiento al proveedor externo correspondiente de forma automática.

# REQUERIMIENTOS NO FUNCIONALES

1. **Escalabilidad Horizontal:** El backend debe estar diseñado para permitir que el "Servicio de Catálogo" escale independientemente del "Servicio de Pagos" ante picos de tráfico como por ejemplo, un hot sale.
2. **Disponibilidad (Alta Disponibilidad):** El sistema debe garantizar que, si el servicio de notificaciones falla, el usuario aún pueda completar su compra (Desacoplamiento).
3. **Integridad de Datos (Transaccionalidad):** El sistema debe asegurar que no se vendan productos sin stock real mediante el uso de transacciones o bloqueos en la base de datos.
4. **Seguridad:** Toda comunicación entre el Frontend y el Backend debe realizarse sobre HTTPS y las contraseñas deben almacenarse con algoritmos de hashing.
5. **Latencia:** La búsqueda de productos debe devolver resultados en menos de 500 ms mediante el uso de índices o caché.
6. **Consistencia Eventual:** Debido a la arquitectura distribuida, la actualización de la reputación del vendedor puede tener una demora de unos minutos respecto a la entrega del producto (Comunicación asíncrona).
7. **Interoperabilidad:** El sistema debe exponer una API documentada para que el frontend pueda consumir los servicios de forma estándar.

## DETALLE DE CASOS DE USO

| CU-01 | Consultar Catálogo de Productos |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El Comprador navega por el sistema para visualizar los productos disponibles, filtrando por categorías o términos de búsqueda para encontrar lo que necesita. |  |  |
| **Actores** | Comprador |  |  |
| **Pre Condiciones** | El comprador debe haber iniciado sesión. El sistema debe tener productos cargados en la base de datos. |  |  |
| **Post Condiciones** | El sistema muestra una lista de productos que coinciden con los criterios del usuario. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Comprador ingresa al marketplace o selecciona una categoría | El sistema solicita al Servicio Catálogo los productos disponibles y los muestra |
|  | 2 | El Comprador ingresa un término de búsqueda o aplica filtros | El sistema consulta la base de datos por nombre, categoría o notas olfativas y devuelve los resultados |
|  | 2.1 |  | Si no se encuentran resultados, el sistema muestra un mensaje y sugiere productos similares mediante el Motor de Recomendación |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | — |  |  |
| **Rendimiento** | El sistema deberá realizar la búsqueda y mostrar resultados en un máximo de 500 ms mediante el uso de índices o caché |  |  |
| **Frecuencia** | Este caso de uso se espera que se lleve a cabo una media de 10.000 veces al día |  |  |
| **Importancia** | Vital |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | — |  |  |

| CU-02 | Gestión de Carrito de Compras |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El Comprador agrega, quita o modifica cantidades de productos en su carrito para preparar una compra. |  |  |
| **Actores** | Comprador |  |  |
| **Pre Condiciones** | El Comprador debe haber iniciado sesión. El producto seleccionado debe existir en el sistema. |  |  |
| **Post Condiciones** | El carrito del Comprador refleja los productos y cantidades seleccionadas. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Comprador selecciona un producto y la cantidad deseada, y lo agrega al carrito | El sistema registra el producto con la cantidad indicada en el Carrito del Comprador (CarritoProducto). La información de variantes (volumen, concentración, precio) se obtiene en todo momento a través de la relación Producto → Variante\_Producto. |
|  | 2 | El Comprador modifica la cantidad de un producto ya en el carrito | El sistema actualiza la cantidad en CarritoProducto |
|  | 3 | El Comprador elimina un producto del carrito | El sistema elimina el registro correspondiente de CarritoProducto |
|  | 4 | El Comprador visualiza el carrito | El sistema muestra todos los productos con sus variantes, cantidades y precios calculados dinámicamente |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 | El Comprador intenta agregar un producto sin stock | El sistema informa que el producto no tiene stock disponible y no lo agrega |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Alta |  |  |
| **Importancia** | Vital |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | El carrito no reserva stock al agregar productos; la reserva ocurre recién al iniciar el checkout (CU-03). |  |  |

| CU-03 | Proceso de Checkout |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El Comprador inicia el proceso de compra desde su carrito: el sistema valida el stock, reserva los productos, genera el Pago y redirige al Sistema de Pagos externo. |  |  |
| **Actores** | Comprador, Sistema de Pagos (externo) |  |  |
| **Pre Condiciones** | El Comprador debe haber iniciado sesión. El carrito debe contener al menos un producto. |  |  |
| **Post Condiciones** | Se crea un Pago con estado `pendiente` vinculado al Carrito. El stock queda reservado por 5 minutos. Si el pago es confirmado: se genera Factura y Envío con estado `preparando`. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Comprador confirma el carrito e inicia el checkout | El Servicio Stock ATOMICIDAD valida que haya stock real para cada producto dentro de una transacción atómica |
|  | 2 |  | El sistema reserva el stock por 5 minutos y crea el Pago con estado `pendiente` |
|  | 3 |  | El sistema redirige al Comprador al Sistema de Pagos externo (MercadoPago) |
|  | 4 | El Comprador completa el pago en el Sistema de Pagos externo | El Sistema de Pagos notifica el resultado al marketplace vía webhook |
|  | 5 |  | El sistema actualiza el Pago a estado `aprobado`, genera la Factura y crea el Envío con estado `preparando` |
|  | 6 |  | El Servicio Notificación envía un correo de confirmación al Comprador de forma asíncrona |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 |  | Si el stock no es suficiente para algún producto, el sistema cancela el checkout e informa al Comprador |
|  | 2.1 |  | Si el Comprador no completa el pago en 5 minutos, el sistema libera automáticamente el stock reservado |
|  | 4.1 | El pago es rechazado por el Sistema de Pagos | El sistema actualiza el Pago a estado `rechazado` y libera el stock reservado |
| **Rendimiento** | La reserva de stock debe completarse en menos de 2 segundos |  |  |
| **Frecuencia** | Media |  |  |
| **Importancia** | Vital |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | La atomicidad del stock se garantiza con `prisma.$transaction`. El Servicio Notificación es fire-and-forget: su falla no bloquea la compra. Es un componente interno dentro de Lógica de Negocio (Servicio Carrito); no es un contenedor independiente. |  |  |

| CU-04 | Historial de Pedidos |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El Comprador consulta el estado de sus compras pasadas y actuales, incluyendo estado del pago y del envío. |  |  |
| **Actores** | Comprador |  |  |
| **Pre Condiciones** | El Comprador debe haber iniciado sesión y tener al menos un Pago registrado. |  |  |
| **Post Condiciones** | El sistema muestra la lista de compras con sus estados actualizados. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Comprador accede a la sección de historial de pedidos | El sistema recupera todos los Carritos del Comprador que tienen un Pago asociado |
|  | 2 |  | El sistema muestra la lista con el estado del Pago y el estado del Envío para cada compra |
|  | 3 | El Comprador selecciona un pedido para ver el detalle | El sistema muestra los productos, variantes, cantidades, Factura y track\_code del Envío |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 |  | Si el Comprador no tiene pedidos, el sistema muestra un mensaje informativo |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Media |  |  |
| **Importancia** | Alta |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | — |  |  |

| CU-05 | Recomendaciones de Productos |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El sistema sugiere fragancias al Comprador calculando similitudes basadas en el historial de compras y productos visitados, usando notas olfativas e ingredientes como atributos de comparación. |  |  |
| **Actores** | Comprador |  |  |
| **Pre Condiciones** | El Comprador debe haber iniciado sesión. El sistema debe tener productos cargados con atributos de notas olfativas. |  |  |
| **Post Condiciones** | El sistema devuelve una lista de productos recomendados personalizada, ordenada por índice de coincidencia. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Comprador accede a la sección de recomendaciones o visualiza el detalle de un producto | El Motor de Recomendación recupera el historial de compras y productos visitados del Comprador, junto con los atributos del producto de referencia actual (`notas_salida`, `notas_corazon`, `notas_fondo`, `ingrediente`) |
|  | 2 |  | El motor calcula un índice de coincidencia contra el resto de los productos del catálogo, ponderando por historial |
|  | 3 |  | El sistema devuelve la lista de productos recomendados personalizada, ordenada por mayor similitud |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 |  | Si el Comprador no tiene historial, el motor usa solo los atributos del producto de referencia actual para calcular similitudes |
|  | 2.1 |  | Si no hay productos con similitud suficiente, el sistema muestra los productos más vendidos como fallback (derivado de CarritoProducto con Pago aprobado) |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Alta |  |  |
| **Importancia** | Alta |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | El Motor de Recomendación vive en `lib/recomendaciones.ts`. Los atributos usados para el cálculo son los mismos que están modelados en la entidad Producto. Consistente con RF-5 y README §6.3. |  |  |

| CU-06 | Gestión de Inventario (Vendedor) |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El Vendedor da de alta, modifica o elimina productos y sus variantes desde el panel de gestión. |  |  |
| **Actores** | Vendedor |  |  |
| **Pre Condiciones** | El usuario debe haber iniciado sesión con rol `vendedor` validado por Clerk. |  |  |
| **Post Condiciones** | Los cambios quedan persistidos en la base de datos y reflejados en el catálogo. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Vendedor accede al panel de inventario | El sistema muestra los productos existentes |
|  | 2 | El Vendedor crea un nuevo producto completando nombre, marca, notas olfativas, ingredientes, stock e imagen | El sistema persiste el nuevo Producto y sus Variante\_Producto asociadas |
|  | 3 | El Vendedor modifica un producto existente (precio de variante, stock, notas olfativas, ingredientes, imagen) | El sistema actualiza los registros correspondientes |
|  | 4 | El Vendedor elimina un producto | El sistema da de baja el Producto y sus variantes |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 | El usuario no tiene rol `vendedor` | El sistema rechaza el acceso con error de autorización (Clerk + Controlador Autorización) |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Baja |  |  |
| **Importancia** | Alta |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | — |  |  |

| CU-07 | Panel de Ventas (Vendedor) |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El Vendedor consulta las órdenes de compra recibidas que están pendientes de despacho. |  |  |
| **Actores** | Vendedor |  |  |
| **Pre Condiciones** | El usuario debe haber iniciado sesión con rol `vendedor`. Deben existir Envíos con estado `preparando`. |  |  |
| **Post Condiciones** | El sistema muestra la lista de envíos en estado `preparando`. Si el Vendedor marcó un envío como despachado, los datos del despacho fueron enviados al Sistema de Envíos externo y el Envío queda en espera de la notificación de `en tránsito` vía CU-09. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Vendedor accede al panel de ventas | El sistema recupera todos los Envíos en estado `preparando` y los muestra con detalle de productos y Comprador |
|  | 2 | El Vendedor marca un envío como despachado | El sistema envía los datos del despacho (dirección, productos, orden) al Sistema de Envíos externo. El estado del Envío pasará a `en tránsito` cuando el Sistema de Envíos lo notifique vía webhook (CU-09) |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 |  | Si no hay órdenes pendientes, el sistema muestra un mensaje informativo |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Media |  |  |
| **Importancia** | Alta |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | — |  |  |

| CU-08 | Sincronización de Stock (Sistema Automático) |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | Al confirmarse un pago, el sistema descuenta automáticamente el stock de los productos comprados, genera la Factura y crea el Envío. |  |  |
| **Actores** | Sistema de Pagos (externo, vía webhook) |  |  |
| **Pre Condiciones** | Debe existir un Pago en estado `pendiente` con stock reservado. El Sistema de Pagos envía la confirmación vía webhook. |  |  |
| **Post Condiciones** | Stock decrementado. Pago en estado `aprobado`. Factura creada. Envío creado con estado `preparando`. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Sistema de Pagos envía el webhook de confirmación | El sistema valida la autenticidad del webhook |
|  | 2 |  | El sistema actualiza el Pago a estado `aprobado` |
|  | 3 |  | El sistema descuenta de `Producto.stock` la cantidad correspondiente a cada ítem, consultando la cantidad registrada en CarritoProducto |
|  | 4 |  | El sistema genera la Factura vinculada al Pago |
|  | 5 |  | El sistema crea el Envío con estado `preparando` vinculado al Carrito |
|  | 6 |  | El Servicio Notificación envía un correo de confirmación al Comprador de forma asíncrona (fire-and-forget) |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1.1 | El webhook indica pago rechazado | El sistema actualiza el Pago a estado `rechazado` y libera el stock reservado |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Media |  |  |
| **Importancia** | Vital |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | Los pasos 2 a 5 se ejecutan dentro de una transacción Prisma para garantizar atomicidad. El paso 6 es fire-and-forget: su falla no revierte la transacción. |  |  |

| CU-09 | Notificaciones de Estado de Envío (Sistema Automático) |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | El sistema envía un correo automático al Comprador cada vez que el estado de su Envío cambia. |  |  |
| **Actores** | Sistema de Envíos (externo), Servicio Notificación (componente interno de Lógica de Negocio / Servicio Carrito) |  |  |
| **Pre Condiciones** | Debe existir un Envío asociado a un Carrito con Comprador identificado. El estado del Envío debe cambiar. |  |  |
| **Post Condiciones** | El Comprador recibe un correo con el nuevo estado. La compra no se ve afectada si el envío del correo falla. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 | El Sistema de Envíos notifica un cambio de estado (en tránsito, entregado, etc.) | El sistema actualiza el campo `estado` del Envío y registra el `track_code` si aplica |
|  | 2 |  | El Servicio Notificación dispara el envío de correo al Comprador de forma asíncrona (fire-and-forget) |
|  | 3 |  | Si el nuevo estado es `entregado`, el sistema recalcula y actualiza el atributo `reputacion` del Vendedor correspondiente (Regla de Negocio 2) |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 2.1 |  | Si el Servicio Notificación falla, se registra el error en el log pero el flujo continúa sin interrupciones |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Media |  |  |
| **Importancia** | Media |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | El desacoplamiento del Servicio Notificación satisface el RNF-2 de Alta Disponibilidad. |  |  |

| CU-10 | Restock Automático (Sistema Automático) |  |  |
| :---: | :---: | :---: | :---: |
| **Descripción** | Cuando el stock de un producto cae a nivel crítico, el sistema envía automáticamente un pedido de reabastecimiento al Proveedor externo correspondiente. Cuando el Proveedor confirma el despacho vía webhook, el sistema actualiza `Producto.stock` automáticamente. |  |  |
| **Actores** | Servicio Catálogo (interno), Sistema de Proveeduría (externo) |  |  |
| **Pre Condiciones** | El stock de un Producto cae por debajo del umbral crítico (como consecuencia de una compra confirmada en CU-08). |  |  |
| **Post Condiciones** | El Proveedor recibe el pedido de restock vía REST/HTTPS. Al confirmar el despacho, `Producto.stock` queda actualizado con la cantidad repuesta. |  |  |
| **Secuencia Normal** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 1 |  | Tras decrementar el stock (CU-08), el Servicio Catálogo evalúa si el stock resultante es menor o igual al umbral crítico |
|  | 2 |  | Si la condición se cumple, el Servicio Catálogo envía un pedido de restock al Sistema de Proveeduría (Proveedor correspondiente según la relación Proveedor\_Producto) vía REST/HTTPS |
|  | 3 | El Sistema de Proveeduría recibe el pedido y prepara el despacho | — |
|  | 4 | El Sistema de Proveeduría notifica al marketplace vía webhook con la cantidad de unidades despachadas | El Servicio Catálogo recibe la notificación y actualiza `Producto.stock` sumando la cantidad repuesta |
| **Excepciones** | **#** | **Acción (Actor)** | **Reacción (Sistema)** |
|  | 2.1 |  | Si la solicitud al Proveedor falla, el sistema registra el error. El flujo de compra no se ve afectado. |
|  | 4.1 |  | Si el webhook de reposición falla o no llega, el stock no se actualiza automáticamente. El Vendedor puede corregirlo manualmente vía CU-06. |
| **Rendimiento** | — |  |  |
| **Frecuencia** | Baja |  |  |
| **Importancia** | Alta |  |  |
| **Urgencia** | Inmediatamente |  |  |
| **Comentarios** | El Proveedor al que se notifica se determina a partir de la tabla Proveedor\_Producto usando el `id_producto` afectado. El flujo de retorno (paso 4) cierra el ciclo definido en el DFD: "Sistema de Proveeduría → Marketplace: Envío de productos". |  |  |
