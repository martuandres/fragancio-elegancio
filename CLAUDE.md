# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Next.js 16 fragrance marketplace** (Fragancio Elegancio). Backend APIs are fully implemented; the frontend is partially scaffolded — the catalog page exists but seller dashboard and buyer order/cart UIs are incomplete.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS 4
- **Auth**: Clerk v7 (roles stored in `publicMetadata.role`: `"comprador"` | `"vendedor"`)
- **ORM**: Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- **Payments**: External payment provider — HMAC-SHA256 webhook at `/api/pagos/webhook`
- **Client state**: TanStack React Query v5

## Commands

```bash
npm run dev              # Dev server
npm run build            # prisma generate && next build
npm run seed             # ETL: fetch 100 perfumes from PerfumAPI → seed DB
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate client after schema changes (outputs to src/generated/prisma/client/)
npx prisma studio        # Browse DB
```

## Framework quirks

### Prisma 7
- `datasource db` in `prisma/schema.prisma` has **no `url` field** — connection is configured in `prisma.config.ts` via `import "dotenv/config"`.
- Client output goes to `src/generated/prisma/client/` (not the default location).
- `lib/prisma.ts` uses `PrismaPg` adapter; instantiate without `datasourceUrl`.

### Next.js 16
- Clerk middleware lives in `src/proxy.ts` (renamed from `middleware.ts` in Next.js 16).

## Architecture

### Route groups

| Group | Purpose |
|---|---|
| `app/(auth)/` | Clerk-hosted SignIn / SignUp |
| `app/(marketplace)/` | Buyer catalog (`/catalogo`) — other buyer pages TBD |
| `app/onboarding/` | Role selection after first sign-up |
| `app/dashboard/` | Seller panel (scaffolded) |
| `app/api/` | All API routes |

### API surface

| Route | Methods | Auth |
|---|---|---|
| `/api/catalogo` | GET | public |
| `/api/carrito` | GET, POST, DELETE | comprador |
| `/api/checkout` | POST | comprador |
| `/api/pagos/webhook` | POST | HMAC sig |
| `/api/recomendaciones` | GET | authenticated |
| `/api/inventario` | GET, POST | vendedor |
| `/api/inventario/[id]` | GET, PUT, DELETE | vendedor (owner) |
| `/api/pedidos` | GET | comprador |
| `/api/pedidos/[id]` | GET, PATCH | role-gated |
| `/api/envios/[id]` | GET, PATCH | role-gated |
| `/api/auth/onboarding` | POST | authenticated |
| `/api/auth/webhook` | POST | Clerk (no-op placeholder) |

### Auth flow

`src/proxy.ts` protects all routes except `/`, `/sign-in`, `/sign-up`, `/api/catalogo`, `/api/pagos/webhook`, `/api/auth/webhook`. Every API handler also checks `publicMetadata.role` from the Clerk token for role-based access.

**Onboarding**: after Clerk sign-up, users hit `/onboarding`, pick a role, and `POST /api/auth/onboarding` creates the `Comprador` or `Vendedor` DB record and writes the role to Clerk `publicMetadata`.

### Data model

- `Comprador` (PK: `legajo` = `"C-${Date.now()}"`) and `Vendedor` (PK: `id_vendedor`) are **separate tables**, not linked via a shared `Usuario` — the README spec differs from the actual schema.
- `Producto` → `VarianteProducto` (1:N) — variants hold `volumen`, `precio`, `concentracion`, `ranking`.
- `Carrito` → `Pago` (1:0..1, `@unique`); `Carrito` → `Envio` (1:0..1, `@unique`); `Pago` → `Factura` (1:1).
- Junction tables: `CarritoProducto`, `ProductoCategoria`, `ProveedorProducto`, `VendedorProducto`.
- `Carrito.estado`: `"activo"` | `"abandonado"` | `"convertido"`.

### Checkout atomicity (`lib/stock.ts`)

`checkoutAtomico(id_carrito, items)` runs inside `prisma.$transaction`:
1. Validate stock ≥ cantidad for every item
2. Decrement stock
3. Create `Pago` with `estado = "pendiente"`
4. Set `Carrito.estado = "convertido"`

The 5-minute reservation window is conceptual — there is no TTL job; stock is decremented immediately on checkout and reversed only via payment webhook rejection or manual cancellation.

### Recommendation engine (`lib/recomendaciones.ts`)

Weighted Jaccard similarity across tokenized `notas_salida` (30%), `notas_corazon` (40%), `notas_fondo` (20%), `ingrediente` (10%). Runs in-process against all in-stock products — O(n), viable up to ~10k products.

### Payment webhook (`/api/pagos/webhook`)

Verifies `X-Webhook-Signature: sha256=<hex>` using `WEBHOOK_SECRET`. Idempotent — skips already-approved payments. On `"aprobado"`: creates `Factura`, creates/updates `Envio` with `estado = "preparando"`. Notifications are fire-and-forget (must not throw on failure).

## Key environment variables

```
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
WEBHOOK_SECRET=          # Payment provider HMAC secret
```
