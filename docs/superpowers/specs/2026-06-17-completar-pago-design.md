# Design: Completar pago desde Mis Pedidos + Confirmación real desde back_url de MP

**Fecha:** 2026-06-17

## Problema

1. Si un comprador inicia el checkout pero abandona la UI de MercadoPago, el pedido queda en `pago.estado = "pendiente"` para siempre. No hay forma de retomar el pago desde el sistema.
2. Las páginas `/pago/exito`, `/pago/pendiente` y `/pago/rechazo` solo muestran UI estática. El estado real del pago en BD lo actualiza el webhook servidor-a-servidor de MP (`/api/pagos/mercadopago`), que en sandbox/local no siempre llega. El comprador ve "¡Pago aprobado!" pero el DB sigue en `pendiente`.

## Solución

Extraer la lógica de MP en dos funciones compartidas (`lib/`) y agregar dos endpoints nuevos que las usan, sin duplicar código.

---

## Capa compartida — `lib/`

### `lib/mp-preferencia.ts` — `crearPreferenciaMP`

Extrae el bloque que hoy está inline en `/api/checkout/route.ts` (líneas 78-123).

```typescript
export async function crearPreferenciaMP(
  items: { id: string; title: string; quantity: number; unit_price: number }[],
  id_carrito: number,
  baseUrl: string
): Promise<string | null>
```

- Si `MP_ACCESS_TOKEN` no está configurada, devuelve `null`.
- Si la creación falla lanza el error (el caller decide si hace rollback o no).
- Devuelve `sandbox_init_point ?? init_point ?? null`.

### `lib/mp-confirmar.ts` — `procesarPagoMP`

Extrae la lógica de aprobación/rechazo que hoy está inline en `/api/pagos/mercadopago/route.ts`.

```typescript
export async function procesarPagoMP(paymentId: string): Promise<
  | { ok: true; estado: "aprobado"; nro_factura: string }
  | { ok: true; estado: "rechazado" }
  | { ok: false; motivo: "pago_ya_procesado" | "pago_no_encontrado" | "estado_no_definitivo" }
>
```

- Llama a `mpPayment.get({ id: paymentId })`.
- Si el estado de MP no es definitivo (`approved` / `rejected` / `cancelled`), devuelve `{ ok: false, motivo: "estado_no_definitivo" }`.
- Si el pago en BD no está en `pendiente`, devuelve `{ ok: false, motivo: "pago_ya_procesado" }` (idempotencia).
- Si `aprobado`: dentro de `$transaction` actualiza `Pago`, crea `Factura`, upsert `Envio` en `preparando`. Fire-and-forget email al comprador.
- Si `rechazado`: dentro de `$transaction` actualiza `Pago`, restaura stock, `Carrito.estado = "cancelado"`.

---

## Refactor de endpoints existentes

### `POST /api/checkout`
- Reemplaza el bloque `if (process.env.MP_ACCESS_TOKEN) { ... }` por una llamada a `crearPreferenciaMP`.
- Sin cambio de interfaz ni comportamiento observable.

### `POST /api/pagos/mercadopago`
- Mantiene la verificación de firma `x-signature`.
- Reemplaza toda la lógica de aprobación/rechazo por una llamada a `procesarPagoMP(paymentId)`.
- Sin cambio de interfaz ni comportamiento observable.

---

## Endpoints nuevos

### `POST /api/pedidos/[id]/pagar`

**Auth:** comprador autenticado, dueño del pedido.

**Lógica:**
1. Busca el `Carrito` con `id_carrito = id` y verifica que `legajo` coincida con el comprador autenticado.
2. Verifica `pago.estado === "pendiente"`. Si no, devuelve 409.
3. Obtiene los ítems del carrito (`CarritoProducto` + `VarianteProducto` para precio).
4. Valida que todos los ítems tengan precio > 0.
5. Llama a `crearPreferenciaMP(items, id_carrito, baseUrl)`.
6. Devuelve `{ init_point }`. Si `init_point` es null (MP no configurado), devuelve 503.

**Respuestas:**
- `200 { init_point: string }` — listo para redirigir
- `409` — pago ya no está pendiente
- `503` — MP no configurado en este entorno

### `POST /api/pagos/confirmar`

**Auth:** comprador autenticado (previene que terceros confirmen pagos ajenos al pasar un payment_id).

**Body:** `{ payment_id: string }`

**Lógica:**
1. Valida que `payment_id` sea un string no vacío.
2. Llama a `procesarPagoMP(payment_id)`.
3. Devuelve el resultado.

**Respuestas:**
- `200 { estado: "aprobado", nro_factura: string }` — pago procesado
- `200 { estado: "rechazado" }` — rechazo procesado
- `200 { motivo: "pago_ya_procesado" }` — idempotencia, sin cambios
- `200 { motivo: "estado_no_definitivo" }` — MP todavía no resolvió
- `400` — payment_id inválido
- `502` — no se pudo consultar MP

---

## Cambios en frontend

### `/pedidos/[id]/page.tsx`

- Cuando `pedido.pago?.estado === "pendiente"`, mostrar botón "Completar pago".
- Click: `POST /api/pedidos/${id}/pagar` → si devuelve `init_point` → `window.location.href = init_point`.
- Si devuelve 503 (MP no configurado): mostrar mensaje "El pago debe completarse desde el sistema de pagos".
- El botón se oculta automáticamente cuando el polling detecta que el estado cambió a `aprobado` o `rechazado`.

### `/pago/exito/page.tsx`

- Al montar, lee `collection_id` (o `payment_id`) y `external_reference` de los query params que MP incluye en el redirect.
- Llama a `POST /api/pagos/confirmar` con `{ payment_id: collection_id }`.
- Mientras espera: muestra spinner.
- Si responde `aprobado`: muestra el contenido actual ("¡Pago aprobado!") + link al pedido.
- Si responde `estado_no_definitivo` o falla: muestra "Tu pago está siendo procesado, revisá el estado en Mis pedidos" + link.
- Si `collection_id` no viene en los params (flujo sin MP): muestra el contenido estático actual sin llamar al API.

### `/pago/pendiente/page.tsx`

- Al montar, llama a `POST /api/pagos/confirmar` con `payment_id` de query params.
- Si MP ya resolvió (aprobado/rechazado): muestra el estado real y redirige al pedido.
- Si sigue sin resolver: muestra el contenido actual ("Pago pendiente, te notificaremos").

### `/pago/rechazo/page.tsx`

- Al montar, llama a `POST /api/pagos/confirmar` para procesar el rechazo (restaurar stock, cancelar carrito).
- Muestra "Tu pago fue rechazado. El stock fue repuesto." + link al catálogo.

---

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/lib/mp-preferencia.ts` | Crear — función `crearPreferenciaMP` |
| `src/lib/mp-confirmar.ts` | Crear — función `procesarPagoMP` |
| `src/app/api/checkout/route.ts` | Modificar — usar `crearPreferenciaMP` |
| `src/app/api/pagos/mercadopago/route.ts` | Modificar — usar `procesarPagoMP` |
| `src/app/api/pedidos/[id]/pagar/route.ts` | Crear — endpoint re-pago |
| `src/app/api/pagos/confirmar/route.ts` | Crear — endpoint confirmación back_url |
| `src/app/(marketplace)/pedidos/[id]/page.tsx` | Modificar — botón "Completar pago" |
| `src/app/(marketplace)/pago/exito/page.tsx` | Modificar — llamar confirmar al montar |
| `src/app/(marketplace)/pago/pendiente/page.tsx` | Modificar — llamar confirmar al montar |
| `src/app/(marketplace)/pago/rechazo/page.tsx` | Modificar — llamar confirmar al montar |

---

## Invariantes que no cambian

- `checkoutAtomico` solo corre en el checkout original. El re-pago desde pedidos no toca stock (ya fue decrementado).
- La idempotencia de `procesarPagoMP` garantiza que si el webhook de MP y la llamada desde `/pago/exito` llegan casi al mismo tiempo, solo uno procesa el pago y el segundo devuelve `pago_ya_procesado`.
- El botón "Completar pago" solo aparece con `pago.estado === "pendiente"`. Una vez aprobado o rechazado, el polling lo oculta.
