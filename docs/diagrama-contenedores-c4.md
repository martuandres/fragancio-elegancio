# Diagrama de Contenedores (C4 Nivel 2) — Fragancio Elegancio

## Descripción general

Este es un **Diagrama de Contenedores C4 (Nivel 2)**. Va un nivel más adentro que el [Diagrama de Contexto (DFD Nivel 0)](diagrama-contexto-dfd.md): en lugar de mostrar el sistema como una caja negra, descompone sus partes internas (contenedores) y muestra cómo se comunican entre sí y con los sistemas externos.

Un "contenedor" en C4 es cualquier unidad desplegable de forma independiente: una app web, un servicio backend, una base de datos, etc.

---

## Actores externos (personas)

| Actor | Descripción |
|---|---|
| **Comprador** | Usuario final de la plataforma. Navega el catálogo, arma el carrito, realiza pedidos y recibe notificaciones de pago y envío. |
| **Vendedor** | Usuario que carga y gestiona los productos del marketplace. Accede al panel de inventario y al panel de ventas para ver órdenes pendientes y confirmar despachos. |

Ambos interactúan con el sistema exclusivamente a través de la **Web App** via HTTPS.

---

## Sistemas externos

| Sistema | Tipo | Descripción |
|---|---|---|
| **Sistema de Pagos** | External Software System | Procesamiento de pagos y facturas (Stripe / MercadoPago). Recibe solicitudes de cobro y responde vía webhook. |
| **Sistema de Envios** | External Software System | Entrega y seguimiento logístico de los pedidos. Recibe datos del envío y notifica actualizaciones de estado. |
| **Sistema de Proveeduría** | External Software System | Proveedores/distribuidores de los productos del catálogo. Reciben pedidos de restock vía email cuando el stock está bajo. El Vendedor actualiza el stock manualmente al recibir la mercadería (CU-06). |

---

## Contenedores internos

### 1. Web App `[container: React]`

**Responsabilidad:** Proveer el contenido estático y las interfaces de usuario de la página.

- Es el único punto de entrada para Compradores y Vendedores.
- Se comunica únicamente con el API Gateway.


---

### 2. API Gateway `[Node.js]`

**Responsabilidad:** Enrutamiento y autenticación centralizada.

- Recibe todas las solicitudes de la Web App y las redirige al servicio interno correspondiente.
- Delega a Servicio Usuarios, Servicio Catálogo y Servicio Carrito. La verificación de autenticación y roles se realiza a través de Servicio Usuarios (Clerk).

---

### 3. Servicio Usuarios `[Clerk]`

**Responsabilidad:** Datos de usuarios (perfiles, roles).

- Recibe requests desde el API Gateway.

---

### 4. Servicio Catálogo `[Node.js]`

**Responsabilidad:** Gestión de productos, búsqueda, filtros y recomendaciones.

- Recibe requests desde el API Gateway.
- Expone el Motor de Recomendación vía `GET /api/recomendaciones`.

---

### 5. Servicio Carrito `[JavaScript y Node.js]`

**Responsabilidad:** Funcionalidad de pedidos, pagos y notificaciones.

- Recibe requests del API Gateway.
- Lee y escribe en Fragance DB.
- Se comunica con el Sistema de Pagos.
- Se comunica con el Sistema de Envios para despachar pedidos y recibir actualizaciones de estado.
- Tras decrementar el stock en el checkout, evalúa si el stock cae por debajo del umbral crítico y manda pedidos de restock al Sistema de Proveeduría vía email (fire-and-forget).

---

### 6. Fragance DB `[Container: SQL]`

**Responsabilidad:** Base de datos principal y única del sistema. Contiene toda la información del marketplace: compradores, vendedores, productos, carritos, pagos, facturas y estado de envíos.

- Accedida por Servicio Catálogo y Servicio Carrito.

---

## Flujos principales

### Flujo de compra (Comprador)

```
Comprador → Web App → API Gateway → Servicio Carrito
                                         → Fragance DB
                                         → Sistema de Pagos → Notificación → Comprador
                                         → Sistema de Envios → Notificación → Comprador
```

### Flujo de catálogo y búsqueda

```
Comprador → Web App → API Gateway → Servicio Catálogo
```

### Flujo de recomendaciones

```
Comprador → Web App → API Gateway → Servicio Catálogo (Motor de Recomendación)
                                         → Fragance DB (consulta productos con stock > 0)
```

### Flujo de restock

```
Servicio Carrito → Sistema de Proveeduría (email — pedido de restock automático, disparado durante el checkout)
Vendedor → Web App → API Gateway → Servicio Catálogo (actualización manual de stock al recibir la mercadería — CU-06)
```

### Flujo de gestión de inventario (Vendedor)

```
Vendedor → Web App → API Gateway → Servicio Catálogo
```

### Flujo de panel de ventas (Vendedor)

```
Vendedor → Web App → API Gateway → Servicio Carrito
                                         → Fragance DB (consulta órdenes en estado "preparando")
                                         → Sistema de Envíos (confirmación de despacho)
```

---

## Criterio de coherencia arquitectónica

Cuando se agregue o modifique funcionalidad, verificar que:

1. **Nuevo servicio** → evaluar si encaja en uno de los contenedores existentes o justifica uno nuevo.
2. **Nueva integración externa** → aparece como sistema externo en este diagrama. Actualizar también el [DFD de contexto](diagrama-contexto-dfd.md).
3. **Acceso a base de datos** → siempre a través del servicio correspondiente, nunca directamente desde la Web App.
4. **Autenticación** → todo request sensible pasa por el API Gateway antes de llegar a cualquier servicio.
