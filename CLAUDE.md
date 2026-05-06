# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a **Next.js fragrance marketplace** (Fragance Elegancio). The README contains the full architecture spec (data model, Prisma schema, component breakdown, flows). No application code exists yet — implementation follows the spec in README.md.

## Stack

- **Framework**: Next.js (App Router) + React
- **Styling**: Tailwind CSS
- **Auth**: Clerk (roles: `comprador` / `vendedor` in Clerk metadata)
- **ORM**: Prisma + PostgreSQL
- **Payments**: External webhook (Stripe / MercadoPago)
- **Notifications**: Async email via Resend / Nodemailer (fire-and-forget — failures must not block orders)

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Browse the database
```

### Prisma 7 notes

- The database URL is configured in `prisma.config.ts` (not `schema.prisma`). `datasource db` in the schema has no `url` field.
- `PrismaClient` is instantiated without `datasourceUrl` — the config file handles it.
- `prisma.config.ts` uses `import "dotenv/config"` to load `.env` / `.env.local`.

### Next.js 16 notes

- The proxy/middleware file is `src/proxy.ts` (not `middleware.ts` — renamed in Next.js 16).

## Architecture

### Route groups (App Router)

| Group | Purpose |
|---|---|
| `app/(auth)/` | Clerk SignIn / SignUp pages |
| `app/(marketplace)/` | Buyer-facing pages: catalog, product detail, cart, checkout, orders, recommendations |
| `app/(vendedor)/` | Seller panel: inventory CRUD, received orders |
| `app/api/` | All API routes (see below) |

### API routes

`catalogo/`, `carrito/`, `checkout/`, `pagos/` (webhook), `envios/`, `inventario/`, `recomendaciones/`, `auth/` (Clerk webhook)

### Key lib files

- `lib/prisma.ts` — PrismaClient singleton (must be a singleton to avoid connection exhaustion in dev)
- `lib/stock.ts` — Atomic stock reservation logic (5-minute hold via Prisma `$transaction`)
- `lib/recomendaciones.ts` — Recommendation engine (similarity on `notas_salida`, `notas_corazon`, `notas_fondo`, `ingredientes`)

### Auth & authorization

- `middleware.ts` at the root protects all private routes via Clerk before any handler runs
- Every sensitive API endpoint must additionally verify the Clerk role (`comprador` vs `vendedor`) from the token metadata

### Stock atomicity (critical)

Checkout uses `prisma.$transaction` with optimistic locking. The flow:
1. Validate real stock inside the transaction
2. Reserve items for 5 minutes (prevents overselling under concurrency)
3. Create `OrdenCompra` with `estado = "pendiente"`
4. Release reservation automatically if payment is not completed within 5 minutes

### Data model highlights (from README)

- `Usuario` is a base entity; `Comprador` and `Vendedor` reference it by PK (table-per-type inheritance)
- `Carrito` → `OrdenCompra` is 1:0..1 (one cart becomes at most one order); `id_carrito` is `@unique` on `OrdenCompra`
- Junction tables: `CarritoProducto`, `ProductoCategoria`, `ProductoOrden`, `ProveedorProducto`
- `Pago` → `Factura` is 1:1; `OrdenCompra` → `Envio` is 1:1
- The full Prisma schema is in README.md §4 — copy it verbatim to `prisma/schema.prisma` when bootstrapping

### Environment variables

```
DATABASE_URL=           # PostgreSQL connection string
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
# Payment and shipping provider keys
```
