# Diagrama de Contexto (DFD Nivel 0) — Marketplace Especializado de Fragancias

## Descripción general

Este es un **Diagrama de Flujo de Datos de Nivel 0 (Diagrama de Contexto)**. Muestra el sistema como un único proceso central y sus interacciones con todos los actores externos. No detalla procesos internos — su propósito es delimitar el alcance del sistema y dejar explícito quién envía/recibe qué. Esto es, este diagrama nada mas refleja como nuestro sistema se comunica con actores externos.

---

## Proceso central

| Proceso | Descripción |
|---|---|
| **Marketplace Especializado de Fragancias** | El sistema completo. Gestiona catálogo, carrito, pedidos, pagos, envíos y restock. |

---

## Entidades externas

| Entidad | Rol |
|---|---|
| **Comprador** | Usuario final que navega el catálogo, arma su carrito y realiza pedidos. |
| **Sistema de Envíos** | Servicio externo que recibe los datos del envío, ejecuta la logística y notifica actualizaciones de estado. |
| **Sistema de Proveeduría** | Proveedor/distribuidor externo que recibe solicitudes de restock y despacha productos al marketplace. |
| **MercadoPago** | Procesador de pagos externo. Recibe solicitudes de cobro y notifica el resultado vía webhook. |

---

## Flujos de datos

### Comprador ↔ Marketplace

| Dirección | Flujo | Descripción |
|---|---|---|
| Comprador → Marketplace | **Selección de productos** | El comprador elige productos del catálogo (agrega al carrito). |
| Marketplace → Comprador | **Detalle de pedido** | El comprador recibe los detalles del pedido (productos, método de pago, monto total, etc.). |
| Comprador → Marketplace | **Pedido** | El comprador envía la orden de compra final. |
| Comprador → Marketplace | **Estado de envío** | El comprador consulta el estado actual del envío de su pedido. |

### Marketplace ↔ Sistema de Envíos

| Dirección | Flujo | Descripción |
|---|---|---|
| Marketplace → Sistema de Envíos | **Detalles envío** | El marketplace envía los datos necesarios para que el sistema de logística gestione el despacho (dirección, productos, orden). |
| Sistema de Envíos → Marketplace | **Actualización pedido** | El sistema de envíos notifica cambios de estado al marketplace (en camino, entregado, etc.). |

### Marketplace ↔ MercadoPago

| Dirección | Flujo | Descripción |
|---|---|---|
| Marketplace → MercadoPago | **Solicitud de pago** | El marketplace envía los datos de la orden (monto, comprador) para iniciar el cobro. |
| MercadoPago → Marketplace | **Confirmación / rechazo de pago** | MercadoPago notifica vía webhook si el pago fue aprobado o rechazado. |

### Marketplace ↔ Sistema de Proveeduría

| Dirección | Flujo | Descripción |
|---|---|---|
| Marketplace → Sistema de Proveeduría | **Pedido de restock** | El marketplace solicita reabastecimiento de productos cuando el stock está bajo o agotado. |
| Sistema de Proveeduría → Marketplace | **Envío de productos** | El proveedor despacha los productos solicitados hacia el marketplace. |

---

## Criterio de coherencia arquitectónica

Cuando se agregue o modifique funcionalidad, verificar que:

1. **Toda interacción con el Comprador** (nuevo flujo de datos, nueva pantalla, nuevo endpoint) esté contemplada en este diagrama o justifique su ausencia (flujo puramente interno).
2. **Integraciones con terceros** (envíos, pagos, proveedores) siempre pasen por el sistema central — ningún actor externo nuevo debe agregarse sin actualizar este diagrama.
3. **MercadoPago** es una entidad externa explícita — cualquier cambio en el flujo de pagos (nuevo proveedor, nuevo webhook) debe reflejarse en este diagrama.
4. **Notificaciones por email** (Resend/Nodemailer) son un detalle de implementación interno; no constituyen una entidad externa nueva desde el punto de vista del DFD.
5. **Vendedor** no aparece como entidad externa porque en el schema actual solo tiene FK a `usuario` (login/registro), igual que el Comprador. Si se implementa el panel del vendedor con flujos propios (gestión de inventario, notificación de pedidos, liquidación de saldo), agregar Vendedor como entidad externa y modelar sus flujos aquí.
