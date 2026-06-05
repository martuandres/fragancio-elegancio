# Diagrama de Componentes — API de Perfumes

> Documentación generada a partir del diagrama draw.io `diagrama_componentes_API__2__drawio.svg`

---

## Sistemas Externos

| Nombre | Tipo | Descripción |
|---|---|---|
| **Proveedores de perfumes** | External Software System | Proveedores de los productos que aparecen con stock en la página |
| **Sistema de Pagos** | External Software System | Procesamiento de pagos y facturas |
| **Sistema de Envios** | External Software System | Entrega y seguimiento de los envíos |

---

## Contenedores

### 1. Web App
`[Container: React]`

Provee el contenido estático de la página.

### 2. API Gateway
`[Container: Node.js]`

Enrutamiento y autenticación.

### 3. Servicio Usuarios
`[Container: Clerk]`

Gestión de identidad, sesiones y roles de usuario.

### 4. Servicio Catálogo
`[Node.js]`

Gestión de productos, búsqueda y filtros.

### 5. Lógica de Negocio
`[Container: Javascript y Node.js]`

Provee la funcionalidad de carrito, pedidos, pagos y notificaciones.

### 6. Fragance DB
`[Container: SQL]`

Base de datos con toda la información de usuarios, envíos y fragancias.

---

## Componentes

### Dentro de Web App

#### Sign In Controller
`[Component: Next.js Page]`

Maneja las páginas de login y registro del lado del cliente. Interactúa con Clerk para autenticar al usuario.

---

### Dentro de API Gateway

#### Controlador Autorización
`[Component: Next.js Middleware]`

Valida el JWT de Clerk y verifica el rol (comprador/vendedor) en cada endpoint sensible del API.

---

### Dentro de Servicio Usuarios

#### Autenticación y Roles
`[Component: Clerk]`

Gestiona perfiles de usuario, sesiones y asignación de roles (comprador/vendedor) mediante JWT.

---

### Dentro de Servicio Catálogo

| Componente | Tecnología | Descripción |
|---|---|---|
| **Controlador Catálogo** | Next.js API Route | Maneja las peticiones para navegar categorías y buscar productos |
| **Gestionar Inventario** | Node.js | Permite al vendedor dar de alta, baja o modificar productos ya existentes |
| **Servicio Stock REGULAR** | Node.js | Manejo de stock regular de productos |
| **Motor Recomendación** | Node.js | Calcula recomendaciones basadas en ingredientes y notas de salida, corazón y fondo |

---

### Dentro de Lógica de Negocio

| Componente | Tecnología | Descripción |
|---|---|---|
| **Servicio Carrito** | Node.js | Guarda los productos y sus valores respectivos |
| **Controlador Checkout** | Next.js API Route | Punto de entrada de la compra: valida el carrito, invoca la reserva de stock y redirige al sistema de pagos |
| **Servicio Stock ATOMICIDAD** | Node.js | Responsable de la validación atómica. Asegura que no se vendan productos sin stock real y maneja la reserva dentro de una transacción de base de datos. |
| **Servicio Notificación** | Node.js | Gestiona el envío de correos automáticos de forma asincrónica (si falla, la compra sigue adelante) |
| **Servicio Envio** | Node.js | Mantiene la lógica de seguimiento de estado y entrega de órdenes de compra |
| **Historial de Pedidos** | Node.js | Muestra todas las órdenes hechas por el usuario, si es que posee alguna |
| **Servicio de Entrega de Pedidos** | Node.js | Gestiona la comunicación con el Sistema de Envíos para despachar y actualizar el estado de los pedidos |

---

## Relaciones entre Componentes

```
Web App
  └──► Sign In Controller
         └──► Servicio Usuarios [Clerk]

API Gateway
  └──► Controlador Autorización
         └──► Servicio Usuarios [Clerk]

Servicio Catálogo
  ├──► Controlador Catálogo
  │       └──► Motor Recomendación
  ├──► Gestionar Inventario
  │       └──► Fragance DB
  └──► Servicio Stock REGULAR
         └──► Proveedores de perfumes

Lógica de Negocio
  ├──► Servicio Carrito
  │       └──► Fragance DB
  ├──► Controlador Checkout
  │       ├──► Servicio Stock ATOMICIDAD
  │       │       └──► Fragance DB
  │       └──► Sistema de Pagos
  │              ├──► Servicio Notificación  (async — fire-and-forget)
  │              └──► Servicio Envio
  │                     └──► Sistema de Envios
  ├──► Historial de Pedidos
  │       └──► Fragance DB
  └──► Servicio de Entrega de Pedidos
         └──► Sistema de Envios

Sistema de Envios
  └──► Servicio de Entrega de Pedidos  (notificación de actualización de estado)
```

---

## Resumen de Tecnologías

| Tecnología | Usada en |
|---|---|
| React | Web App |
| Clerk | Servicio Usuarios |
| Node.js | API Gateway, Servicio Catálogo, Lógica de Negocio, y la mayoría de los componentes internos |
| Next.js API Route | Controlador Catálogo, Controlador Checkout, Controlador Autorización |
| Next.js Page | Sign In Controller |
| SQL | Fragance DB |
