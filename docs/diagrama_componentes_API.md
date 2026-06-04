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

### 3. Servicio Catálogo
`[Node.js]`

Gestión de productos, búsqueda y filtros.

### 4. Lógica de Negocio
`[Container: Javascript y Node.js]`

Provee la funcionalidad de carrito, pedidos, pagos y notificaciones.

### 5. Fragance DB
`[Container: SQL]`

Base de datos con toda la información de usuarios, envíos y fragancias.

---

## Componentes

### Dentro de Web App

#### Sign In Controller
`[Component: Next.js API Route]`

Gestiona el registro, inicio de sesión y validación de roles (comprador/vendedor).

---

### Dentro de API Gateway

#### Controlador Autorización
`[Component: Next.js API Route]`

Gestiona el registro, inicio de sesión y validación de roles (comprador/vendedor).

---

### Dentro de Servicio Catálogo

| Componente | Tecnología | Descripción |
|---|---|---|
| **Controlador Catálogo** | Next.js API Route | Maneja las peticiones para navegar categorías y buscar productos |
| **Gestionar Inventario** | Node.js | Permite al vendedor dar de alta, baja o modificar productos ya existentes |
| **Servicio Stock REGULAR** | Node.js | Manejo de stock regular de productos |
| **Historial de Pedidos** | Node.js | Muestra todas las órdenes hechas por el usuario, si es que posee alguna |
| **Servicio de Entrega de Pedidos** | Node.js | Gestiona la entrega de pedidos |
| **Motor Recomendación** | Node.js | Calcula recomendaciones basadas en ingredientes y notas de salida, corazón y fondo |

---

### Dentro de Lógica de Negocio

| Componente | Tecnología | Descripción |
|---|---|---|
| **Servicio Carrito** | Node.js | Guarda los productos y sus valores respectivos |
| **Servicio Stock ATOMICIDAD** | Node.js | Responsable de la validación atómica. Asegura que no se vendan productos sin stock real y maneja la reserva temporal de 5 min. |
| **Controlador Checkout** | Next.js API Route | Recibe la intención de compra y transforma el carrito en una orden |
| **Servicio Notificación** | Node.js | Gestiona el envío de correos automáticos de forma asincrónica (si falla, la compra sigue adelante) |
| **Servicio Envio** | Node.js | Mantiene la lógica de seguimiento de estado y entrega de órdenes de compra |

---

## Relaciones entre Componentes

```
Web App
  └──► Sign In Controller

API Gateway
  └──► Controlador Autorización

Fragance DB
  └──► Controlador Autorización

Servicio Catálogo
  ├──► Controlador Catálogo
  │       └──► Motor Recomendación
  ├──► Gestionar Inventario
  ├──► Historial de Pedidos
  │       └──► Fragance DB
  ├──► Servicio de Entrega de Pedidos
  │       └──► Fragance DB
  └──► Servicio Stock REGULAR
         └──► Proveedores de perfumes

Lógica de Negocio
  └──► Servicio Carrito
         └──► Servicio Stock ATOMICIDAD
                └──► Servicio Notificación
                       └──► Sistema de Pagos
                              └──► Controlador Checkout
                                     └──► Servicio Envio
                                            └──► Sistema de Envios
                                                   └──► Servicio de Entrega de Pedidos

Sistema de Envios
  └──► Servicio de Entrega de Pedidos
```

---

## Resumen de Tecnologías

| Tecnología | Usada en |
|---|---|
| React | Web App |
| Node.js | API Gateway, Servicio Catálogo, Lógica de Negocio, y la mayoría de los componentes internos |
| Next.js API Route | Controlador Catálogo, Controlador Checkout, Controlador Autorización, Sign In Controller |
| SQL | Fragance DB |
