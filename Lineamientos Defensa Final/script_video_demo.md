# Script del Video Demo — Fragancio Elegancio
### Duración objetivo: 5–7 minutos · Video pregrabado embebido en la presentación

> Formato recomendado: grabación de pantalla a 1080p, mp4 H.264, **sin audio** (un integrante narra en vivo sobre el video — la columna "Narración en off" es su guión). Si prefieren audio grabado, usar el mismo texto.

---

## Preparación del entorno (ANTES de grabar — no aparece en el video)

1. Base de datos limpia + `npm run seed` (carga 100 perfumes de PerfumAPI).
2. `npm run dev` corriendo sin errores en consola.
3. **Cuenta comprador** ya registrada con onboarding completado (rol `comprador`). Sugerencia: `demo.comprador@[COMPLETAR]`.
4. **Cuenta vendedor** ya registrada (rol `vendedor`) **con productos propios cargados** — verificar que `GET /api/inventario` devuelve productos. ⚠️ El seed no crea relaciones `VendedorProducto`: cargar 3-4 productos a mano desde `/vendedor/inventario/nuevo` antes de grabar.
5. Editar uno de los productos del vendedor y dejarlo con **stock = 3** → activa el banner de stock crítico.
6. Probar el curl del webhook (paso 14) al menos una vez con un carrito de prueba descartable, para validar `WEBHOOK_SECRET` y el formato de la firma.
7. Navegador en ventana limpia: sin extensiones visibles, sin bookmarks personales, sin notificaciones del SO. Cerrar la consola de DevTools.
8. Tener dos sesiones listas (comprador en ventana normal, vendedor en ventana incógnito) para no perder tiempo logueando en cámara.

**Generación de la firma HMAC para el paso 14** (correr en Git Bash; reemplazar el secreto y el id):

```bash
BODY='{"id_carrito":ID_REAL,"estado":"aprobado"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -X POST http://localhost:3000/api/pagos/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIG" \
  -d "$BODY"
```

---

## FLUJO 1 — Compra asistida por notas olfativas (≈ 2 min)

| # | Pantalla esperada | Acción | Narración en off |
|---|---|---|---|
| 1 | `/catalogo` con grilla de perfumes | Scroll breve por el catálogo | "Este es el catálogo público: 100 fragancias reales cargadas por un ETL desde PerfumAPI, cada una con sus notas de salida, corazón y fondo." |
| 2 | Pills de categorías visibles | Click en categoría **Amaderado** | "El filtrado por familia olfativa traduce la categoría a las notas correspondientes — acá Cedro, Sándalo, Oud — y filtra en el servidor." |
| 3 | Resultados filtrados | Click en **"Armar tu perfume"** (abre el sheet lateral) | "Para el usuario indeciso: elige las notas que le gustan, por capa." |
| 4 | Sheet con tres secciones de notas | Seleccionar 2 notas de fondo + 1 de corazón → **"Ver perfumes"** | "El sistema puntúa cada producto según cuántas notas coinciden, ponderando más las de fondo." |
| 5 | Grilla "Perfumes recomendados" con badges "X notas coinciden" | Señalar el badge de coincidencias con el mouse | "Cada card muestra cuántas notas coinciden con la selección." |
| 6 | Card de un producto | Click en **"Ver similares"** | "Y este botón invoca al motor de recomendaciones del backend: índice de Jaccard ponderado — corazón 40%, salida 30%, fondo 20%, ingredientes 10% — tal como lo define el ADR de recomendaciones." |
| 7 | Sheet lateral con 6 productos similares y sus notas | Pausa de 2-3 segundos sobre el sheet | "Las similares comparten notas con el producto de referencia. Solo se recomiendan productos con stock." |
| 8 | Mismo sheet | **"Agregar al carrito"** en una recomendación; luego cerrar y agregar 1 producto más desde la grilla | "Agregamos dos productos. El carrito todavía no reserva stock — la reserva ocurre recién en el checkout, por regla de negocio." |

## FLUJO 2 — Checkout atómico + confirmación de pago por webhook (≈ 2 min)

| # | Pantalla esperada | Acción | Narración en off |
|---|---|---|---|
| 9 | `/carrito` con 2 ítems y total | Revisar el carrito, click **"Ir al checkout"** | "El carrito calcula el total dinámicamente desde las variantes — el precio vive en la variante, no en el producto." |
| 10 | `/checkout` con resumen del pedido | Click **"Confirmar pedido"** | "Acá ocurre lo central del sistema: dentro de una única transacción de PostgreSQL se valida el stock de cada ítem, se decrementa, se crea el Pago pendiente y el carrito pasa a convertido. Si dos personas compraran el último stock a la vez, la transacción serializa y la segunda recibe un error — la sobreventa es imposible por diseño." |
| 11 | Confirmación "Pedido registrado" con número de pedido | Anotar (mentalmente) el número de pedido | "Pedido registrado, pago pendiente. En producción acá se redirige a MercadoPago; la confirmación vuelve por webhook." |
| 12 | `/pedidos` | Abrir el pedido recién creado | "El pedido figura pendiente de pago y todavía sin envío." |
| 13 | Terminal (preparada de antemano, comando ya tipeado) | Mostrar el comando curl con el header `X-Webhook-Signature` visible | "Simulamos al proveedor de pagos: el payload viene firmado con HMAC-SHA256. Sin la firma correcta, el endpoint responde 401 — nadie puede falsificar una confirmación de pago." |
| 14 | Respuesta del curl: `{ "ok": true, "nro_factura": "..." }` | Ejecutar el curl | "Pago aprobado: el sistema genera la factura y crea el envío en estado 'preparando'." |
| 15 | `/pedidos/[id]` refrescado | Refrescar la página del pedido | "El mismo pedido ahora muestra: pago aprobado, la factura con su número e importe, y el tracking del envío en 'Preparando'." |

## FLUJO 3 — Ciclo del vendedor (≈ 1.5–2 min)

| # | Pantalla esperada | Acción | Narración en off |
|---|---|---|---|
| 16 | Ventana incógnito → `/vendedor` (sesión vendedor) | Mostrar el panel de inventario | "Del lado del vendedor: su inventario con stock y precios." |
| 17 | **Banner amarillo de stock crítico** arriba del listado | Señalar el banner con el producto de stock 3 | "El sistema detecta automáticamente productos en nivel crítico y se lo recuerda al vendedor — es la base del caso de uso de restock automático." |
| 18 | Formulario de edición | Editar un producto (cambiar precio o stock) y guardar | "ABM completo de productos: notas olfativas, ingredientes, stock, imagen." |
| 19 | Click en **"Órdenes"** → `/vendedor/ventas` | Mostrar la orden pendiente del Flujo 2, con datos del comprador y productos | "El panel de ventas lista los envíos en 'preparando' que contienen productos de este vendedor — la query cruza envíos, carritos y la relación vendedor-producto." |
| 20 | Click **"Marcar como despachado"** | Toast: "Envío actualizado · comprador notificado" | "Al despachar, el envío pasa a 'en camino' y se dispara la notificación al comprador — fire-and-forget: si fallara, el despacho no se ve afectado, como exige el requerimiento de alta disponibilidad." |
| 21 | Volver a la ventana del comprador → `/pedidos/[id]` → refrescar | El tracking visual muestra **"En camino"** activo | "Y del lado del comprador, el tracking ya refleja el nuevo estado. Ciclo completo: catálogo, carrito, checkout atómico, pago por webhook, facturación, despacho y seguimiento." |

**Cierre del video:** fundido sobre la pantalla del tracking. (≈ 10 seg de margen.)

---

## Qué NO mostrar (y por qué)

| No mostrar | Motivo |
|---|---|
| Redirección a una pasarela de pago real | No hay proveedor integrado — el checkout no redirige a ningún lado. Por eso el webhook se demuestra con curl, lo cual además luce mejor técnicamente. |
| Bandeja de email / notificaciones reales | No hay servicio de email. La notificación es el toast del paso 20 — no prometer más que eso en la narración. |
| El paso de los 5 minutos de reserva expirando | La liberación automática no está implementada. La narración dice "reserva" solo donde el sistema lo dice (respuesta del checkout); no esperar en cámara. |
| Llamada de restock real al proveedor | Solo existe el banner de alerta (paso 17). No abrir DevTools ni endpoints inexistentes. |
| Intento de compra como vendedor / acceso cruzado de roles | Funciona (devuelve error correcto) pero consume tiempo y puede confundir. Reservarlo como respuesta en preguntas. |
| Consola del navegador / archivo `.env` / Prisma Studio con datos | Riesgo de exponer secretos o warnings irrelevantes. |
| Onboarding y sign-up desde cero | Consume ~1 min de video en formularios de Clerk. Las cuentas ya están creadas; mencionarlo verbalmente si hace falta. |

## Plan B durante la grabación

- Si el curl del webhook falla en cámara → cortar, verificar `WEBHOOK_SECRET` y el `id_carrito`, regrabar desde el paso 13. No intentar debuggear en cámara.
- Si el catálogo carga lento la primera vez (cold start de dev) → calentar las páginas navegando todo el recorrido una vez antes de grabar.
- Grabar los 3 flujos como clips separados y unirlos en edición — permite regrabar un flujo sin rehacer todo.
