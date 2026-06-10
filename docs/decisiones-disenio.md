# Decisiones de Diseño — Fragancio Elegancio

Registro de decisiones arquitectónicas y de UX que no están cubiertas por los diagramas del sistema.

---

## Control de acceso a rutas de vendedor

**Decisión:** La protección de las rutas `/vendedor/*` opera en dos capas con comportamientos distintos:

1. **API (server-side):** Todas las rutas `/api/inventario/*` verifican `publicMetadata.role === "vendedor"` mediante `resolveVendedor()`. Retornan 401 si el rol no coincide. Esto es la barrera real — ningún dato se lee ni escribe sin el rol correcto.

2. **UI (client-side):** Las páginas `/vendedor/*` no redirigen por rol. Un comprador puede navegar directamente a `/vendedor/inventario/nuevo`, ver el formulario, intentar enviarlo, y recibir un 401 de la API. La operación falla silenciosamente en la capa UI pero no en la de datos.

**Punto de entrada controlado:** El botón "Vender Fragancias" en `/dashboard` sí verifica el rol (server-side via `currentUser().publicMetadata`). Si el usuario no es vendedor, muestra un toast explicativo en lugar de navegar: *"Para vender fragancias necesitás una cuenta de vendedor."*

**Motivación:** No se agrega una redirección automática en las páginas `/vendedor/*` porque implicaría convertirlas a server components (o agregar un layout con `auth()`), lo que requiere una decisión sobre el flujo de onboarding — si se ofrece al comprador cambiar de rol o crear una cuenta nueva. Queda pendiente hasta definir ese flujo.

**Consecuencia aceptada:** Un comprador que conoce la URL puede ver la UI del panel vendedor, pero no puede leer ni modificar ningún dato. El riesgo es bajo (no hay información sensible expuesta en el formulario vacío).

---

## Catálogo público con carrito protegido

**Decisión:** El catálogo (`/catalogo` y `/api/catalogo`) es público — cualquier visitante sin sesión puede ver productos. El carrito y el checkout requieren autenticación.

**Implementación en la UI:** El botón "Agregar al carrito" en cada `ProductoCard` usa `useAuth()` de Clerk para verificar el estado de sesión *antes* de llamar a la API:

- Sin sesión → redirige a `/sign-in`
- Sesión con rol `vendedor` → muestra un toast de error explicativo
- Sesión con rol `comprador` → llama a `POST /api/carrito`

**Motivación:** El middleware (`proxy.ts`) redirige a sign-in para rutas no-públicas. Si el botón llamara directamente a la API sin verificar la sesión primero, `fetch` seguiría el redirect HTTP recibiendo HTML del sign-in page con status 200, lo que dispararía un toast falso de éxito.

---

## Checkout sin integración de pago activa

**Decisión:** `POST /api/checkout` crea un `Pago` con `estado = "pendiente"` y retorna el `id_pago`. No redirige a ningún proveedor de pago externo. La confirmación llega por webhook (`POST /api/pagos/webhook`).

**Consecuencia:** Desde la UI, el usuario ve "Pedido registrado — pendiente de pago" pero no se le presenta ningún formulario de pago. El flujo completo requiere configurar un proveedor (Stripe / MercadoPago) y actualizar la página de checkout para redirigir a la URL de pago que devuelva el proveedor.

**Pendiente:** Definir qué proveedor se usa e integrar la URL de pago en la respuesta del checkout.

---

## Historial de pedidos solo para compradores

**Decisión:** `GET /api/pedidos` retorna los pedidos del comprador autenticado. No existe un endpoint equivalente para que un vendedor liste *todos* los pedidos que involucran sus productos.

**Consecuencia:** El panel vendedor (`/vendedor`) no tiene sección de "pedidos recibidos". El vendedor puede actualizar el estado de un pedido específico vía `PATCH /api/pedidos/[id]` y `PATCH /api/envios/[id]` si conoce el `id_carrito`, pero no tiene forma de descubrirlos desde la UI.

**Pendiente:** Definir si el vendedor debe ver todos los pedidos del sistema o solo los pedidos que contienen sus productos (lo cual requiere cruzar `CarritoProducto` → `Producto` → `VendedorProducto`).
