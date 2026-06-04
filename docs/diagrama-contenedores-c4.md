# Diagrama de Contenedores (C4 Nivel 2) — Fragancio Elegancio

## Descripción general

Este es un **Diagrama de Contenedores C4 (Nivel 2)**. Va un nivel más adentro que el [Diagrama de Contexto (DFD Nivel 0)](diagrama-contexto-dfd.md): en lugar de mostrar el sistema como una caja negra, descompone sus partes internas (contenedores) y muestra cómo se comunican entre sí y con los sistemas externos.

Un "contenedor" en C4 es cualquier unidad desplegable de forma independiente: una app web, un servicio backend, una base de datos, etc.

---

## Actores externos (personas)

| Actor | Descripción |
|---|---|
| **Comprador** | Usuario final de la plataforma. Navega el catálogo, arma el carrito, realiza pedidos y recibe notificaciones de pago y envío. |
| **Vendedor** | Usuario que carga y gestiona los productos del marketplace. Accede al panel de inventario. |

Ambos interactúan con el sistema exclusivamente a través de la **Web App** via HTTPS.

---

## Sistemas externos

| Sistema | Tipo | Descripción |
|---|---|---|
| **Sistema de Pagos** | External Software System | Procesamiento de pagos y facturas (Stripe / MercadoPago). Recibe solicitudes de cobro y responde vía webhook. |
| **Sistema de Envios** | External Software System | Entrega y seguimiento logístico de los pedidos. Recibe datos del envío y notifica actualizaciones de estado. |
| **Proveedores de perfumes** | External Software System | Proveedores/distribuidores de los productos del catálogo. Reciben pedidos de restock vía REST/HTTPS cuando el stock está bajo. |

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
- Delega a Servicio Usuarios y Servicio Catálogo, y accede a Fragance DB para verificar datos de usuario.

---

### 3. Servicio Usuarios `[Clerk]`

**Responsabilidad:** Datos de usuarios (perfiles, roles).

- Recibe requests desde el API Gateway.

---

### 4. Servicio Catálogo `[Node.js]`

**Responsabilidad:** Gestión de productos, búsqueda y filtros.

- Recibe requests desde el API Gateway.
- Se comunica con el Servicio Carrito solo cuando el actor es un Comprador realizando una compra.
- Manda mensajes de restock a los Proveedores de perfumes vía REST/HTTPS.

---

### 5. Servicio Carrito `[JavaScript y Node.js]`

**Responsabilidad:** Funcionalidad de pedidos, pagos y notificaciones.

- Recibe requests del Servicio Catálogo.
- Lee y escribe en Fragance DB y en Envios DB.
- Se comunica con el Sistema de Pagos.

---

### 6. Fragance DB `[Container: SQL]`

**Responsabilidad:** Base de datos principal con toda la información del marketplace, incluyendo usuarios.

- Accedida por API Gateway y Servicio Carrito.

---

### 7. Envios DB `[Container: SQL]`

**Responsabilidad:** Historial de pedidos, estado de los envíos, con sus respectivos usuarios.

- Escrita por el Servicio Carrito.
- Se conecta con el Sistema de Envios.

---

## Flujos principales

### Flujo de compra (Comprador)

```
Comprador → Web App → API Gateway → Servicio Catálogo → Servicio Carrito
                                                          → Fragance DB
                                                          → Sistema de Pagos → Notificación → Comprador
                                                          → Envios DB → Sistema de Envios → Notificación → Comprador
```

### Flujo de catálogo y búsqueda

```
Comprador → Web App → API Gateway → Servicio Catálogo
```

### Flujo de restock

```
Servicio Catálogo → Proveedores de perfumes (REST/HTTPS)
```

### Flujo de gestión de inventario (Vendedor)

```
Vendedor → Web App → API Gateway → Servicio Catálogo
```

---

## Criterio de coherencia arquitectónica

Cuando se agregue o modifique funcionalidad, verificar que:

1. **Nuevo servicio** → evaluar si encaja en uno de los contenedores existentes o justifica uno nuevo.
2. **Nueva integración externa** → aparece como sistema externo en este diagrama. Actualizar también el [DFD de contexto](diagrama-contexto-dfd.md).
3. **Acceso a base de datos** → siempre a través del servicio correspondiente, nunca directamente desde la Web App.
4. **Autenticación** → todo request sensible pasa por el API Gateway antes de llegar a cualquier servicio.
