# Fragancio Elegancio
## Marketplace Especializado de Fragancias
### Documento de Arquitectura y Especificaciones del Sistema — v1.1

---

## Tabla de Contenidos

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [Schema Prisma](#4-schema-prisma)
5. [Stack Tecnológico](#5-stack-tecnológico)
6. [Flujos Principales del Sistema](#6-flujos-principales-del-sistema)
7. [Estructura de Proyecto Next.js](#7-estructura-de-proyecto-nextjs)
8. [Setup y Comandos](#8-setup-y-comandos)
9. [Consideraciones de Seguridad y Arquitecturales](#9-consideraciones-de-seguridad-y-arquitecturales)

---

## 1. Descripción General del Sistema

Fragancio Elegancio es un marketplace web especializado en la compra y venta de fragancias (perfumes). La plataforma conecta a dos tipos de usuarios: **compradores**, que exploran y adquieren productos, y **vendedores** (proveedores de perfumes), que gestionan su catálogo y stock.

El sistema está diseñado con una arquitectura web full-stack construida sobre Next.js (App Router), con API Routes como backend y una base de datos SQL gestionada con Prisma ORM.

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
| API Gateway | Next.js API Routes | Enrutamiento centralizado y autenticación de todas las peticiones entre cliente y servicios backend. |
| Lógica de Negocio | Node.js | Funcionalidad central: carrito, pedidos, pagos y notificaciones. |
| Servicio Catálogo | Node.js | Gestión de productos, búsqueda y filtros por categoría, marca, notas olfativas, etc. |
| Servicio Usuarios | Clerk | Autenticación, registro, inicio de sesión y validación de roles (comprador / vendedor). |
| Fragancio DB | PostgreSQL (Prisma) | Base de datos relacional con toda la información de usuarios, envíos y fragancias. |
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

La base de datos **Fragancio DB** está gestionada con Prisma ORM sobre PostgreSQL. A continuación se detalla cada entidad con sus atributos y relaciones.

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

Relación **1:N** directa con Producto. Una variante pertenece a un único producto.

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_variante_producto` | INT — PK | Identificador único de la variante. |
| `id_producto` | INT — FK | Producto al que pertenece (FK directa, relación 1:N). |
| `volumen` | DECIMAL | Volumen en ml de la presentación. |
| `precio` | DECIMAL | Precio específico de esta variante. |
| `concentracion` | VARCHAR | Tipo de concentración (EDT, EDP, Parfum, Cologne, etc.). |
| `ranking` | INT | Orden de la variante dentro del producto (1 = principal). |

#### Categoría

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_categoria` | INT — PK | Identificador único de la categoría. |
| `criterio` | VARCHAR | Descripción del tipo de categoría. |

#### Carrito

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_carrito` | INT — PK | Identificador único del carrito. |
| `id_usuario` | INT — FK | Comprador propietario (FK a `Comprador.id_usuario`). |
| `fecha_creada` | DATETIME | Fecha y hora de creación. |
| `estado` | ENUM | `activo` / `abandonado` / `convertido`. |

#### Pago

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_pago` | INT — PK | Identificador único del pago. |
| `id_carrito` | INT — FK UNIQUE | Carrito al que corresponde (1:1 con Carrito). |
| `estado` | ENUM | `pendiente` / `aprobado` / `rechazado` / `reembolsado`. |

#### Factura

| Atributo | Tipo | Descripción |
|---|---|---|
| `nro_factura` | VARCHAR — PK | Número único de factura (CUID). |
| `id_pago` | INT — FK UNIQUE | Pago al que corresponde (1:1 con Pago). |
| `fecha_emision` | DATETIME | Fecha de emisión del comprobante. |
| `importe_total` | DECIMAL | Monto total facturado. |

#### Envío

| Atributo | Tipo | Descripción |
|---|---|---|
| `id_envio` | INT — PK | Identificador único del envío. |
| `id_carrito` | INT — FK UNIQUE | Carrito al que pertenece (1:1 con Carrito). |
| `track_code` | VARCHAR | Código de seguimiento del sistema externo. |
| `estado` | ENUM | `preparando` / `en_camino` / `entregado`. |

### 3.2 Tablas de Relación (Junction Tables)

| Tabla | Descripción |
|---|---|
| `CarritoProducto` | Relaciona un Carrito con los Productos que contiene, incluyendo la `cantidad`. |
| `ProductoCategoria` | Relación N:M entre Producto y Categoría. |
| `ProveedorProducto` | Relaciona Proveedores (por `marca`) con los Productos que suministran. |

### 3.3 Relaciones entre Entidades

- Un **Usuario** puede ser **Comprador** o **Vendedor** (herencia tabla-por-tipo, PK compartida `id_usuario`).
- Un **Comprador** tiene 0 o más **Carritos**; un Carrito pertenece a 1 Comprador (FK via `id_usuario`).
- Un **Carrito** contiene 1 o más **Productos** (vía `CarritoProducto` con `cantidad`).
- Un **Carrito** tiene 0 o 1 **Pago** (`id_carrito` UNIQUE en Pago).
- Un **Pago** genera 0 o 1 **Factura** (`id_pago` UNIQUE en Factura).
- Un **Carrito** tiene 0 o 1 **Envío** (`id_carrito` UNIQUE en Envio).
- Un **Producto** tiene 1 o más **VarianteProducto** (relación 1:N directa, FK `id_producto` en la variante).
- Un **Producto** pertenece a 0 o más **Categorías** (vía `ProductoCategoria`).
- Un **Proveedor** suministra 0 o más **Productos** (vía `ProveedorProducto`).

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
| Frontend | Next.js 16 + React | UI del marketplace: catálogo, carrito, checkout, historial, panel vendedor. |
| Estilos | Tailwind CSS | Diseño responsivo y componentes visuales. |
| Backend API | Next.js API Routes | Controladores REST para todos los servicios del sistema. |
| Autenticación | Clerk | Gestión de sesiones, roles (comprador/vendedor) y seguridad. |
| ORM | Prisma 7 | Modelado de datos, migraciones y queries tipadas. Config en `prisma.config.ts`. |
| Base de datos | PostgreSQL | Base de datos relacional principal. |
| Pagos | Sistema externo (Stripe / MercadoPago) | Procesamiento de cobros y confirmaciones vía webhook. |
| Envíos | Sistema externo | Gestión de despachos y tracking. |
| Notificaciones | Servicio asíncrono (Resend / Nodemailer) | Correos automáticos de confirmación y estado. Falla gracefully (fire-and-forget). |

---

## 6. Flujos Principales del Sistema

### 6.1 Flujo de Compra (Happy Path)

1. El **Comprador** navega el catálogo y busca productos por nombre, categoría o notas olfativas.
2. Agrega uno o más productos (variantes) al **Carrito**.
3. Inicia el **Checkout**: el Controlador Checkout invoca al Servicio Stock ATOMICIDAD.
4. El **Servicio Stock ATOMICIDAD** valida que haya stock real y decrementa el stock dentro de una `$transaction` de Prisma.
5. Si la transacción es exitosa, se crea el **Pago** con estado `pendiente` vinculado al Carrito. El Carrito pasa a estado `convertido`.
6. El sistema redirige al **Sistema de Pagos** externo.
7. La pasarela confirma el pago vía **webhook** (HMAC-SHA256). Si es aprobado, se generan la **Factura** y el **Envío** con estado `preparando`.
8. El **Servicio Notificación** envía un correo de confirmación de forma asíncrona.
9. El **Sistema de Envíos** externo recibe el pedido y provee un `track_code`.
10. El Comprador puede consultar el estado en el **Historial de Pedidos**.

### 6.2 Flujo de Gestión de Inventario (Vendedor)

1. El **Vendedor** accede al panel de gestión (autenticado con rol `vendedor` vía Clerk).
2. Usa **Gestionar Inventario** para dar de alta nuevos productos o variantes.
3. Modifica precios, stock, descripciones y notas olfativas de productos existentes.
4. Cuando el stock baja a niveles críticos, el sistema envía un pedido de **restock automático** al Sistema de Proveeduría.

### 6.3 Flujo de Recomendaciones

1. El usuario visita la página de detalle de un producto.
2. El **Motor de Recomendación** calcula similitudes usando el índice de **Jaccard** sobre las notas olfativas (salida, corazón y fondo) e ingredientes.
3. Pesos aplicados: notas_corazon 40%, notas_salida 30%, notas_fondo 20%, ingrediente 10%.
4. Devuelve los **6 productos más similares** con stock disponible.

### 6.4 Reserva Temporal de Stock (Atomicidad)

El **Servicio Stock ATOMICIDAD** (`src/lib/stock.ts`) implementa el checkout dentro de una `prisma.$transaction`. Valida el stock real, lo decrementa y crea el Pago en una sola operación atómica. Esto previene la **sobreventa** en escenarios de alta concurrencia.

---

## 7. Estructura de Proyecto Next.js

```
fragancio-elegancio/
├── src/
│   ├── proxy.ts                  → Auth middleware Clerk (Next.js 16)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/          → Clerk SignIn
│   │   │   └── sign-up/          → Clerk SignUp
│   │   ├── (marketplace)/
│   │   │   ├── catalogo/         → Listado de productos
│   │   │   ├── producto/[id]/    → Detalle de producto
│   │   │   ├── carrito/          → Vista del carrito
│   │   │   ├── checkout/         → Proceso de compra
│   │   │   ├── pedidos/          → Historial de pedidos
│   │   │   └── recomendaciones/  → Productos recomendados
│   │   ├── (vendedor)/
│   │   │   ├── inventario/       → CRUD de productos
│   │   │   └── ordenes/          → Órdenes recibidas
│   │   └── api/
│   │       ├── auth/             → Webhook de Clerk (sincroniza usuarios)
│   │       ├── catalogo/         → GET productos y categorías
│   │       ├── carrito/          → CRUD carrito
│   │       ├── checkout/         → POST crear pago + decremento de stock
│   │       ├── pagos/webhook/    → Webhook confirmación de pago
│   │       ├── envios/[id]/      → Tracking y actualización de estado
│   │       ├── inventario/       → CRUD vendedor
│   │       └── recomendaciones/  → GET recomendaciones por similitud Jaccard
│   └── lib/
│       ├── prisma.ts             → PrismaClient singleton
│       ├── stock.ts              → Checkout atómico ($transaction)
│       └── recomendaciones.ts    → Motor de similitud Jaccard
├── prisma/
│   ├── schema.prisma             → Modelo de datos completo
│   ├── seed.ts                   → ETL de catálogo desde PerfumAPI
│   └── migrations/
├── prisma.config.ts              → Config de Prisma 7 (datasource URL)
├── docs/                         → Documentación de la materia
└── openapi.yaml                  → Especificación OpenAPI
```

---

## 8. Setup y Comandos

### Requisitos previos

- Node.js 20+
- PostgreSQL (local o remoto)

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Completar los valores en .env.local

# 3. Correr migraciones
npx prisma migrate dev

# 4. Cargar catálogo inicial (consume PerfumAPI externa)
npx prisma db seed

# 5. Iniciar servidor de desarrollo
npm run dev
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk |
| `CLERK_WEBHOOK_SECRET` | Secret para validar webhooks de Clerk |
| `PAYMENT_WEBHOOK_SECRET` | Secret HMAC-SHA256 para validar webhooks de la pasarela de pagos |

### Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npx prisma migrate dev` | Correr migraciones |
| `npx prisma generate` | Regenerar Prisma Client tras cambios en el schema |
| `npx prisma studio` | Explorar la base de datos en el browser |
| `npx prisma db seed` | Cargar catálogo de fragancias desde PerfumAPI |

---

## 9. Consideraciones de Seguridad y Arquitecturales

### 9.1 Autenticación y Autorización

- **Clerk** gestiona el ciclo completo de autenticación (OAuth, email/password, MFA).
- Los roles `comprador` y `vendedor` se codifican como `publicMetadata` en el token de Clerk.
- `src/proxy.ts` protege todas las rutas privadas verificando el token antes de cualquier handler (equivalente al `middleware.ts` en versiones anteriores de Next.js).
- Cada endpoint sensible del API verifica adicionalmente el rol del token antes de ejecutar la lógica de negocio.

### 9.2 Consistencia Transaccional

- Las operaciones de checkout usan transacciones Prisma (`$transaction`) para garantizar atomicidad.
- El **Servicio Stock ATOMICIDAD** (`src/lib/stock.ts`) valida y decrementa el stock en la misma transacción que crea el Pago, previniendo condiciones de carrera.

### 9.3 Resiliencia

- El **Servicio Notificación** es asíncrono y su falla **no bloquea** la compra (patrón fire-and-forget).
- Las integraciones con sistemas externos (Pagos, Envíos) están desacopladas mediante **webhooks**.
- El webhook de pagos implementa **verificación HMAC-SHA256** e **idempotencia** (no procesa el mismo evento dos veces).

### 9.4 Escalabilidad

- Next.js permite **SSR/SSG** para páginas del catálogo, reduciendo la carga del servidor en páginas de alta demanda.
- Prisma Connection Pooling para manejar múltiples conexiones concurrentes.
- El motor de recomendaciones opera completamente en memoria (O(n) sobre el catálogo), viable para catálogos de hasta ~10 000 productos.

---

## Grupo 17 — Arquitectura y Diseño de Sistemas 2026

- Agostino Laurella Crippa
- Pierino Oscar Spina
- Ana Martina Andrés
- Tomás Copelotti
- José Ignacio Ubici

---

*Fragancio Elegancio — Documento de Arquitectura v1.1*
