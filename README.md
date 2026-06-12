# Fragancio Elegancio

Marketplace de fragancias construido con **Next.js 16** (App Router), **React 19**, **Prisma 7 + PostgreSQL** y **Clerk** para autenticación. Los pagos se confirman vía webhook HMAC-SHA256 de una pasarela externa.

## Setup

Requisitos: Node.js 20+ y PostgreSQL.

```bash
npm install
# Crear .env con las variables de abajo
npx prisma migrate dev    # Migraciones
npm run seed              # Carga ~100 perfumes desde PerfumAPI
npm run dev               # http://localhost:3000
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk |
| `CLERK_WEBHOOK_SECRET` | Secret del webhook de Clerk |
| `WEBHOOK_SECRET` | Secret HMAC para el webhook de pagos |

## Roles y onboarding

Hay dos roles, guardados en Clerk (`publicMetadata.role`): **comprador** y **vendedor**.

1. El usuario se registra en `/sign-up` (Clerk).
2. Es redirigido a `/onboarding`, donde elige su rol.
3. `POST /api/auth/onboarding` crea el registro `Comprador` o `Vendedor` en la DB y escribe el rol en Clerk.

> Para probar ambos flujos hacen falta **dos cuentas**: una con cada rol. El rol se valida en cada endpoint del API.

## Flujos de negocio

### 1. Compra (comprador)

1. **Catálogo** — navega `/catalogo` (público, `GET /api/catalogo`).
2. **Carrito** — agrega productos (`POST /api/carrito`). El carrito queda en estado `activo`.
3. **Checkout** — `POST /api/checkout` ejecuta una transacción atómica (`lib/stock.ts`):
   - Valida stock suficiente para todos los ítems (si falta, falla todo).
   - **Decrementa el stock inmediatamente**.
   - Crea el `Pago` en estado `pendiente` y pasa el carrito a `convertido`.
4. **Confirmación de pago** — la pasarela externa avisa por webhook (ver abajo):
   - `aprobado` → se crea la `Factura` y el `Envio` en estado `preparando`.
   - `rechazado` → se **repone el stock** y el carrito pasa a `cancelado`.
5. **Seguimiento** — el comprador ve sus pedidos en `/pedidos` y el estado del envío en `GET /api/envios/[id]`.

No hay job de expiración: el stock reservado en checkout solo se libera por rechazo del pago o cancelación manual.

### 2. Webhook de pagos (simular la pasarela)

`POST /api/pagos/webhook` con header `X-Webhook-Signature: sha256=<hex>`, donde `<hex>` es el HMAC-SHA256 del body crudo usando `WEBHOOK_SECRET`.

```bash
BODY='{"id_carrito":1,"estado":"aprobado"}'   # estado: "aprobado" | "rechazado"
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')
curl -X POST http://localhost:3000/api/pagos/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIG" \
  -d "$BODY"
```

Es **idempotente**: solo procesa pagos `pendiente`; reenviar el mismo evento devuelve `409 PAGO_YA_PROCESADO`. Firma inválida → `401`.

### 3. Gestión de inventario (vendedor)

- Panel en `/vendedor` (alta en `/vendedor/inventario/nuevo`, edición, ventas en `/vendedor/ventas`).
- API: `GET/POST /api/inventario` y `GET/PUT/DELETE /api/inventario/[id]` (solo el vendedor dueño del producto).

### 4. Gestión de pedidos y envíos (vendedor)

- `PATCH /api/pedidos/[id]` con `estado`: `"en_camino"` | `"entregado"` | `"cancelado"`.
- **Cancelación**: solo si el carrito está `convertido` y el envío sigue en `preparando`. Repone el stock y marca el pago como `reembolsado` (si estaba aprobado) o `rechazado`.
- `PATCH /api/envios/[id]` actualiza `estado` (`preparando` → `en_camino` → `entregado`) y/o `track_code`. El `[id]` es el `id_carrito`.

### 5. Recomendaciones

`GET /api/recomendaciones` (autenticado) — similitud de Jaccard ponderada sobre notas olfativas: corazón 40%, salida 30%, fondo 20%, ingredientes 10%. Devuelve solo productos con stock.

## API

| Ruta | Métodos | Acceso |
|---|---|---|
| `/api/catalogo` | GET | Público |
| `/api/carrito` | GET, POST, DELETE | Comprador |
| `/api/checkout` | POST | Comprador |
| `/api/pedidos` | GET | Comprador |
| `/api/pedidos/[id]` | GET, PATCH | GET ambos roles, PATCH vendedor |
| `/api/envios/[id]` | GET, PATCH | GET autenticado, PATCH vendedor |
| `/api/inventario` | GET, POST | Vendedor |
| `/api/inventario/[id]` | GET, PUT, DELETE | Vendedor (dueño) |
| `/api/vendedor/envios` | GET | Vendedor |
| `/api/recomendaciones` | GET | Autenticado |
| `/api/pagos/webhook` | POST | Firma HMAC |
| `/api/auth/onboarding` | POST | Autenticado |
| `/api/auth/webhook` | POST | Clerk |
| `/api/health` | GET | Público |

## Estados

| Entidad | Estados |
|---|---|
| `Carrito` | `activo` → `convertido` (checkout) → `cancelado` (rechazo/cancelación); también `abandonado` |
| `Pago` | `pendiente` → `aprobado` / `rechazado`; `reembolsado` (cancelación post-aprobación) |
| `Envio` | `preparando` → `en_camino` → `entregado` |

## Modelo de datos (resumen)

- `Comprador` (PK `legajo`) y `Vendedor` (PK `id_vendedor`) son tablas independientes — no hay tabla `Usuario` compartida.
- `Producto` tiene N `VarianteProducto` (volumen, precio, concentración). El stock vive en `Producto`.
- `Carrito` 1:0..1 `Pago` 1:0..1 `Factura`; `Carrito` 1:0..1 `Envio`.
- Junction tables: `CarritoProducto`, `ProductoCategoria`, `ProveedorProducto`, `VendedorProducto`.

Schema completo en `prisma/schema.prisma`. Especificación del API en `openapi.yaml`.

---

## Grupo 17 — Arquitectura y Diseño de Sistemas 2026

- Agostino Laurella Crippa
- Pierino Oscar Spina
- Ana Martina Andrés
- Tomás Copelotti
- José Ignacio Ubici
