# Fragance Elegancio
## Marketplace Especializado de Fragancias
### Documento de Arquitectura y Especificaciones del Sistema — v1.0

---

## Tabla de Contenidos

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [Schema Prisma](#4-schema-prisma)
5. [Stack Tecnológico](#5-stack-tecnológico)
6. [Flujos Principales del Sistema](#6-flujos-principales-del-sistema)
7. [Estructura de Proyecto Next.js](#7-estructura-de-proyecto-nextjs)
8. [Consideraciones de Seguridad y Arquitecturales](#8-consideraciones-de-seguridad-y-arquitecturales)

---

## 1. Descripción General del Sistema

Fragance Elegancio es un marketplace web especializado en la compra y venta de fragancias (perfumes). La plataforma conecta a dos tipos de usuarios: **compradores**, que exploran y adquieren productos, y **vendedores** (proveedores de perfumes), que gestionan su catálogo y stock.

El sistema está diseñado con una arquitectura de microservicios orientada a la web, construida sobre Next.js en el frontend, Node.js en el backend, y una base de datos SQL gestionada con Prisma ORM.

### 1.1 Objetivos del Sistema

- Proveer un canal de venta especializado para fragancias con información detallada de producto (notas olfativas, concentración, ingredientes).
- Gestionar el flujo completo de compra: selección, carrito, checkout, pago, facturación y envío.
- Ofrecer recomendaciones inteligentes basadas en notas olfativas (salida, corazón, fondo).
- Garantizar consistencia transaccional en la gestión de stock mediante validación atómica.
- Notificar automáticamente a compradores y vendedores sobre el estado de pedidos y envíos.

### 1.2 Actores del Sistema

| Actor | Tipo | Descripción |
|---|---|---|
| Comprador | Usuario interno | Usuario final que navega el catálogo, agrega productos al carrito y realiza compras. |
| Vendedor | Usuario interno | Persona que vende en la plataforma. Gestiona su catálogo e inventario. |
| Proveedor | Entidad externa | Marca/empresa que suministra productos. Se registra con su `marca` como identificador. |
| Sistema de Envíos | Sistema externo | Servicio tercerizado responsable de la entrega física de los pedidos y el tracking. |
| Sistema de Pagos | Sistema externo | Pasarela de pago externa que procesa cobros y emite confirmaciones de transacción. |
| Sistema de Proveeduría | Sistema externo | Recibe pedidos de restock cuando el stock de un producto cae a niveles críticos. |

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Contexto (C4 — Nivel 1)

El sistema se relaciona con tres sistemas externos y dos tipos de personas:

- El **Comprador** interactúa con el marketplace seleccionando productos y recibiendo detalles de su pedido y estado de envío.
- El **Vendedor / Sistema de Proveeduría** recibe pedidos de restock desde la plataforma cuando el inventario lo requiere y envía los productos físicamente.
- El **Sistema de Envíos** recibe los pedidos confirmados y provee actualizaciones del estado de entrega.

El flujo principal es:

```
Selección de productos → Pedido → Procesamiento de pago
  → Generación de envío → Actualización de estado → Notificación al comprador
```

### 2.2 Arquitectura de Contenedores (C4 — Nivel 2)

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| Web App | React / Next.js | Provee el contenido estático de la página y la UI interactiva (catálogo, carrito, checkout, historial). |
| API Gateway | Node.js | Enrutamiento centralizado y autenticación de todas las peticiones entre cliente y servicios backend. |
| Lógica de Negocio | Node.js | Funcionalidad central: carrito, pedidos, pagos y notificaciones. |
| Servicio Catálogo | Node.js | Gestión de productos, búsqueda y filtros por categoría, marca, notas olfativas, etc. |
| Servicio Usuarios | Clerk | Autenticación, registro, inicio de sesión y validación de roles (comprador / vendedor). |
| Fragance DB | SQL (Prisma) | Base de datos relacional con toda la información de usuarios, envíos y fragancias. |
| Sistema de Envíos | Externo | Entrega y seguimiento de los envíos. |
| Sistema de Pagos | Externo | Procesamiento de pagos y facturas. |

### 2.3 Componentes del API (C4 — Nivel 3)

| Componente | Tipo | Descripción |
|---|---|---|
| Sign In Controller | Next.js API Route | Gestiona el registro, inicio de sesión y validación de roles (comprador/vendedor). |
| Controlador Autorización | Next.js API Route | Validación de permisos por rol para acceder a rutas protegidas. |
| Controlador Catálogo | Node.js | Maneja las peticiones para navegar categorías y buscar productos. |
| Controlador Checkout | Node.js | Recibe la intención de compra y transforma el carrito en una orden. |
| Servicio Carrito | Node.js | Gestiona la sesión de compra: agrega/quita productos y calcula totales. |
| Servicio Stock REGULAR | Node.js | Guarda los productos y sus valores de stock. |
| Servicio Stock ATOMICIDAD | Node.js | Validación atómica: asegura que no se vendan productos sin stock real y maneja la reserva temporal de 5 minutos. |
| Gestionar Inventario | Node.js | Permite al vendedor dar de alta, baja o modificar productos existentes. |
| Historial de Pedidos | Node.js | Muestra todas las órdenes realizadas por el usuario. |
| Servicio de Entrega de Pedidos | Node.js | Mantiene la lógica de seguimiento de estado y entrega de órdenes de compra. |
| Servicio Envío | Node.js | Integración con el sistema externo de envíos para tracking y actualización de estado. |
| Servicio Notificación | Node.js | Envío de correos automáticos de forma asíncrona. Si falla, la compra sigue adelante. |
| Motor Recomendación | Node.js | Calcula recomendaciones basadas en ingredientes y notas de salida, corazón y fondo. |

---

## 3. Modelo de Datos

La base de datos **Fragance DB** está gestionada con Prisma ORM sobre PostgreSQL. A continuación se detalla cada entidad con sus atributos y relaciones.

### 3.1 Entidades

#### Usuario *(base de herencia)*

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_usuario` | INT — PK | Identificador único del usuario. |
| `nombre` | VARCHAR | Nombre completo. |
| `email` | VARCHAR — UNIQUE | Correo electrónico único. |
| `contraseña` | VARCHAR (hash) | Contraseña hasheada (gestionada por Clerk). |

#### Comprador *(hereda de Usuario)*

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_usuario` | INT — PK + FK | Identificador heredado de Usuario; actúa a la vez como FK hacia la tabla base. |
| `legajo` | VARCHAR — UNIQUE | Número de legajo del comprador (atributo propio, no identificador de tabla). |
| `direccion_envio` | VARCHAR | Dirección predeterminada para el envío de pedidos. |
| `telefono` | VARCHAR | Número de teléfono de contacto. |

#### Vendedor *(hereda de Usuario)*

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_usuario` | INT — PK + FK | Identificador heredado de Usuario; actúa a la vez como FK hacia la tabla base. |
| `legajo` | VARCHAR — UNIQUE | Número de legajo del vendedor (atributo propio, no identificador de tabla). |
| `saldo` | DECIMAL | Saldo acumulado por ventas. |
| `cbu` | VARCHAR | CBU bancario para acreditar las ventas. |
| `reputacion` | DECIMAL | Puntuación de reputación. |

#### Proveedor *(entidad independiente, no es Usuario)*

| Atributo | Tipo | Descripción |
|---|---|---|
| `marca` | VARCHAR — PK | Nombre de la marca (identificador único). |
| `telefono` | VARCHAR | Teléfono de contacto. |
| `email_contacto` | VARCHAR | Email de contacto comercial. |

#### Producto

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_producto` | INT — PK | Identificador único del producto. |
| `marca` | VARCHAR | Marca del producto. |
| `nombre` | VARCHAR | Nombre comercial del producto. |
| `stock` | INT | Cantidad disponible en inventario. |
| `ingrediente` | TEXT | Lista de ingredientes del perfume. |
| `notas_salida` | TEXT | Notas olfativas de salida (top notes). |
| `notas_corazon` | TEXT | Notas de corazón (heart notes). |
| `notas_fondo` | TEXT | Notas de fondo (base notes). |

#### Variante_Producto

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_variante_producto` | INT — PK | Identificador único de la variante. |
| `id_producto` | INT — FK | Producto al que pertenece (relación 1:N directa). |
| `volumen` | DECIMAL | Volumen en ml de la presentación. |
| `precio` | DECIMAL | Precio específico de esta variante. |
| `concentracion` | VARCHAR | Tipo de concentración (EDT, EDP, Parfum, Cologne, etc.). |
| `ranking` | INT | Orden de la variante dentro del producto. |

#### Categoría

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_categoria` | INT — PK | Identificador único de la categoría. |
| `criterio` | VARCHAR | Descripción del tipo de categoría. |

#### Carrito

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_carrito` | INT — PK | Identificador único del carrito. |
| `id_usuario` | INT — FK | Comprador propietario (FK a Comprador.id_usuario). |
| `fecha_creada` | DATETIME | Fecha y hora de creación. |
| `estado` | ENUM | `activo` / `abandonado` / `convertido`. |

#### Pago

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_pago` | INT — PK | Identificador único del pago. |
| `id_carrito` | INT — FK UNIQUE | Carrito al que corresponde. |
| `estado` | ENUM | `pendiente` / `aprobado` / `rechazado` / `reembolsado`. |

#### Factura

| Atributo | Tipo | Descripción |
|---|---|---|
| `nro_factura` | VARCHAR — PK | Número único de factura. |
| `id_pago` | INT — FK UNIQUE | Pago al que corresponde. |
| `fecha_emision` | DATETIME | Fecha de emisión del comprobante. |
| `importe_total` | DECIMAL | Monto total facturado. |

#### Envío

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_envio` | INT — PK | Identificador único del envío. |
| `id_carrito` | INT — FK UNIQUE | Carrito al que pertenece. |
| `track_code` | VARCHAR | Código de seguimiento del sistema externo. |
| `estado` | ENUM | `preparando` / `en tránsito` / `entregado` / `devuelto`. |

### 3.2 Tablas de Relación (Junction Tables)

| Tabla | Descripción |
|---|---|
| `Carrito_Producto` | Relaciona un Carrito con los Productos que contiene, incluyendo la `cantidad`. |
| `Producto_Categoria` | Relación N:M entre Producto y Categoría. |
| `Proveedor_Producto` | Relaciona Proveedores (por `marca`) con los Productos que suministran. |

### 3.3 Relaciones entre Entidades

- Un **Usuario** puede ser **Comprador** o **Vendedor** (herencia / EsUn).
- Un **Comprador** tiene 0 o más **Carritos**; un Carrito pertenece a 1 Comprador (FK via `id_usuario`).
- Un **Carrito** contiene 1 o más **Productos** (vía `Carrito_Producto` con `cantidad`).
- Un **Carrito** tiene 0 o 1 **Pago** directo; un Pago corresponde a 1 Carrito.
- Un **Pago** genera 1 **Factura**.
- Un **Carrito** tiene 0 o 1 **Envío** directo; un Envío corresponde a 1 Carrito.
- Un **Producto** tiene 1 o más **Variantes_Producto** (precio y concentración por variante).
- Un **Producto** pertenece a 0 o más **Categorías**.
- Un **Proveedor** suministra 0 o más **Productos** (vía `Proveedor_Producto`).

---

## 4. Schema Prisma

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Usuario {
  id_usuario Int        @id @default(autoincrement())
  nombre     String
  email      String     @unique
  contrasena String
  comprador  Comprador?
  vendedor   Vendedor?
}

model Comprador {
  id_usuario      Int       @id
  legajo          String    @unique
  direccion_envio String?
  telefono        String?
  usuario         Usuario   @relation(fields: [id_usuario], references: [id_usuario])
  carritos        Carrito[]
}

model Vendedor {
  id_usuario Int      @id
  legajo     String   @unique
  saldo      Decimal  @default(0)
  cbu        String
  reputacion Decimal  @default(0)
  usuario    Usuario  @relation(fields: [id_usuario], references: [id_usuario])
}

model Proveedor {
  marca          String              @id
  telefono       String?
  email_contacto String
  productos      ProveedorProducto[]
}

model Producto {
  id_producto   Int                 @id @default(autoincrement())
  marca         String
  nombre        String
  stock         Int                 @default(0)
  ingrediente   String?
  imagen_url    String?
  notas_salida  String?
  notas_corazon String?
  notas_fondo   String?
  variante      VarianteProducto[]
  categorias    ProductoCategoria[]
  proveedores   ProveedorProducto[]
  carritoItems  CarritoProducto[]

  @@unique([nombre, marca])
}

model VarianteProducto {
  id_variante_producto Int      @id @default(autoincrement())
  id_producto          Int
  volumen              Decimal
  precio               Decimal
  concentracion        String?
  ranking              Int?
  producto             Producto @relation(fields: [id_producto], references: [id_producto])
}

model Categoria {
  id_categoria Int                 @id @default(autoincrement())
  criterio     String?
  productos    ProductoCategoria[]
}

model ProductoCategoria {
  id_producto  Int
  id_categoria Int
  producto     Producto  @relation(fields: [id_producto], references: [id_producto])
  categoria    Categoria @relation(fields: [id_categoria], references: [id_categoria])

  @@id([id_producto, id_categoria])
}

model ProveedorProducto {
  marca       String
  id_producto Int
  proveedor   Proveedor @relation(fields: [marca], references: [marca])
  producto    Producto  @relation(fields: [id_producto], references: [id_producto])

  @@id([marca, id_producto])
}

model Carrito {
  id_carrito   Int               @id @default(autoincrement())
  id_usuario   Int
  fecha_creada DateTime          @default(now())
  estado       String            @default("activo")
  comprador    Comprador         @relation(fields: [id_usuario], references: [id_usuario])
  items        CarritoProducto[]
  pago         Pago?
  envio        Envio?
}

model CarritoProducto {
  id_carrito  Int
  id_producto Int
  cantidad    Int
  carrito     Carrito  @relation(fields: [id_carrito], references: [id_carrito])
  producto    Producto @relation(fields: [id_producto], references: [id_producto])

  @@id([id_carrito, id_producto])
}

model Pago {
  id_pago    Int      @id @default(autoincrement())
  id_carrito Int      @unique
  estado     String   @default("pendiente")
  carrito    Carrito  @relation(fields: [id_carrito], references: [id_carrito])
  factura    Factura?
}

model Factura {
  nro_factura   String   @id @default(cuid())
  id_pago       Int      @unique
  fecha_emision DateTime @default(now())
  importe_total Decimal
  pago          Pago     @relation(fields: [id_pago], references: [id_pago])
}

model Envio {
  id_envio   Int      @id @default(autoincrement())
  id_carrito Int      @unique
  track_code String?
  estado     String   @default("preparando")
  carrito    Carrito  @relation(fields: [id_carrito], references: [id_carrito])
}
```

---

## 5. Stack Tecnológico

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | Next.js + React | UI del marketplace: catálogo, carrito, checkout, historial, panel vendedor. |
| Estilos | Tailwind CSS | Diseño responsivo y componentes visuales. |
| Backend API | Next.js API Routes | Controladores REST para todos los servicios del sistema. |
| Autenticación | Clerk | Gestión de sesiones, roles (comprador/vendedor) y seguridad. |
| ORM | Prisma | Modelado de datos, migraciones y queries tipadas. |
| Base de datos | PostgreSQL | Base de datos relacional principal. |
| Pagos | Sistema externo (Stripe / MercadoPago) | Procesamiento de cobros y confirmaciones. |
| Envíos | Sistema externo | Gestión de despachos y tracking. |
| Notificaciones | Servicio asíncrono (Resend / Nodemailer) | Correos automáticos de confirmación y estado. Falla gracefully. |

---

## 6. Flujos Principales del Sistema

### 6.1 Flujo de Compra (Happy Path)

1. El **Comprador** navega el catálogo y busca productos por nombre, categoría o notas olfativas.
2. Agrega uno o más productos (variantes) al **Carrito**.
3. Inicia el **Checkout**: el Controlador Checkout invoca al Servicio Stock ATOMICIDAD.
4. El **Servicio Stock ATOMICIDAD** valida que haya stock real y reserva los ítems por **5 minutos**.
5. Si la reserva es exitosa, se crea el **Pago** con estado `pendiente` vinculado al Carrito.
6. El sistema redirige al **Sistema de Pagos** externo.
7. Confirmado el pago, se genera la **Factura** y el **Envío** con estado `preparando`.
8. El **Servicio Notificación** envía un correo de confirmación de forma asíncrona.
9. El **Sistema de Envíos** externo recibe el pedido y provee un `track_code`.
10. El Comprador puede consultar el estado en el **Historial de Pedidos**.

### 6.2 Flujo de Gestión de Inventario (Vendedor)

1. El **Vendedor** accede al panel de gestión (autenticado con rol `vendedor` vía Clerk).
2. Usa **Gestionar Inventario** para dar de alta nuevos productos o variantes.
3. Modifica precios, stock, descripciones y notas olfativas de productos existentes.
4. Cuando el stock baja a niveles críticos, el sistema envía un pedido de **restock automático** al Sistema de Proveeduría.

### 6.3 Flujo de Recomendaciones

1. El **Motor de Recomendación** analiza el historial de compras y productos visitados.
2. Calcula similitudes basadas en **notas de salida, corazón y fondo**, e ingredientes.
3. Devuelve una lista de productos recomendados personalizada al Comprador.

### 6.4 Reserva Temporal de Stock (Atomicidad)

El **Servicio Stock ATOMICIDAD** implementa una reserva temporal de **5 minutos** durante el checkout. Si el usuario no completa el pago en ese tiempo, la reserva se libera automáticamente y el stock queda disponible nuevamente. Esto previene la **sobreventa** en escenarios de alta concurrencia.

---

## 7. Estructura de Proyecto Next.js

```
fragance-elegancio/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/              → Clerk SignIn
│   │   └── sign-up/              → Clerk SignUp
│   ├── (marketplace)/
│   │   ├── catalogo/             → Listado de productos
│   │   ├── producto/[id]/        → Detalle de producto
│   │   ├── carrito/              → Vista del carrito
│   │   ├── checkout/             → Proceso de compra
│   │   ├── pedidos/              → Historial de pedidos
│   │   └── recomendaciones/      → Motor de recomendación
│   ├── (vendedor)/
│   │   ├── inventario/           → CRUD de productos
│   │   └── ordenes/              → Órdenes recibidas
│   └── api/
│       ├── auth/                 → Webhooks Clerk
│       ├── catalogo/             → GET productos, categorías
│       ├── carrito/              → CRUD carrito
│       ├── checkout/             → POST crear orden + reserva stock
│       ├── pagos/                → Webhook confirmación pago
│       ├── envios/               → Tracking y estado
│       ├── inventario/           → CRUD vendedor
│       └── recomendaciones/      → GET recomendaciones
├── components/
│   ├── ui/                       → Componentes base reutilizables
│   ├── catalogo/                 → ProductCard, Filtros, Buscador
│   ├── carrito/                  → CartDrawer, CartItem
│   └── checkout/                 → CheckoutForm, OrderSummary
├── lib/
│   ├── prisma.ts                 → PrismaClient singleton
│   ├── stock.ts                  → Lógica de atomicidad y reserva
│   └── recomendaciones.ts        → Motor de recomendación
├── prisma/
│   ├── schema.prisma             → Modelo de datos completo
│   └── migrations/
├── middleware.ts                 → Auth middleware Clerk
└── .env                          → DATABASE_URL, CLERK_*, etc.
```

---

## 8. Consideraciones de Seguridad y Arquitecturales

### 8.1 Autenticación y Autorización

- **Clerk** gestiona el ciclo completo de autenticación (OAuth, email/password, MFA).
- Los roles `comprador` y `vendedor` se codifican como metadata en el token de Clerk.
- El `middleware.ts` de Next.js protege todas las rutas privadas verificando el token antes de cualquier handler.
- El **Controlador Autorización** verifica el rol en cada endpoint sensible del API.

### 8.2 Consistencia Transaccional

- Las operaciones de checkout usan transacciones Prisma (`$transaction`) para garantizar atomicidad.
- El **Servicio Stock ATOMICIDAD** implementa bloqueos optimistas para prevenir condiciones de carrera.
- La reserva temporal de 5 minutos libera el stock automáticamente si el pago no se completa.

### 8.3 Resiliencia

- El **Servicio Notificación** es asíncrono y su falla **no bloquea** la compra (patrón fire-and-forget con reintentos).
- Las integraciones con sistemas externos (Pagos, Envíos) están desacopladas mediante **webhooks**.
- El **API Gateway** centraliza el manejo de errores, rate limiting y logging.

### 8.4 Escalabilidad

- La arquitectura de microservicios permite escalar componentes individualmente (ej. escalar solo el Servicio Catálogo en picos de búsqueda).
- Next.js permite **SSR/SSG** para páginas del catálogo, reduciendo la carga del servidor en páginas de alta demanda.
- Prisma Connection Pooling (ej. con PgBouncer) para manejar múltiples conexiones concurrentes.

---

*Fragance Elegancio — Documento de Arquitectura v1.0*
