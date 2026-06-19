# Presentación Final — Fragancio Elegancio
### Guión slide por slide · Arquitectura y Diseño de Sistemas 2026 · Grupo 17

> Tiempo total: 30 min → Intro 5' · Arquitectura 5' · Demo 5-8' · Conclusiones 5' · Preguntas 10'.
> El texto en *"Orador:"* es lo que se dice; los bullets son lo que va escrito en el slide.

---

## Slide 1 — Carátula

**Contenido del slide:**

- **Fragancio Elegancio** — Marketplace Especializado de Fragancias
- Arquitectura y Diseño de Sistemas · 2026
- Grupo 17 — Comisión 17
- Integrantes:
  - Agostino Laurella Crippa
  - Pierino Oscar Spina
  - Ana Martina Andrés
  - Tomás Copelotti
  - José Ignacio Ubici

**Orador:** "Buenas, somos el Grupo 17 y vamos a presentar Fragancio Elegancio, un marketplace especializado en fragancias."

---

## Slide 2 — Descripción del sistema

**Contenido del slide:**

- **Problema:** comprar perfume online es comprar a ciegas — no se puede oler el producto. Los marketplaces genéricos solo ofrecen filtros por precio y marca.
- **Solución:** un marketplace que modela cada fragancia por sus **atributos intrínsecos** — notas de salida, corazón y fondo, e ingredientes — y los usa para búsqueda, filtrado y recomendación.
- **Usuarios:** Compradores (exploran, arman carrito, compran) y Vendedores (gestionan inventario y despachos).
- **Alcance:** catálogo con filtros olfativos · carrito y checkout con stock atómico · **pagos vía MercadoPago** (sandbox real) · facturación y envíos · motor de recomendaciones · panel del vendedor · panel de admin para demo.
- **Fuera de alcance (decisión consciente):** emails reales (fire-and-forget definido, sin SMTP), liberación automática de reservas (decremento definitivo), restock automático al proveedor (solo alerta en panel).

**Orador:** "El núcleo diferencial es el filtrado inteligente: tanto el usuario que sabe lo que quiere como el indeciso pueden encontrar una fragancia partiendo de las notas olfativas que le gustan. Eso definió nuestro modelo de datos y nuestro motor de recomendaciones, como van a ver."

---

## Slide 3 — ADR 1: Atomicidad del checkout (`prisma.$transaction`)

**Contenido del slide:**

| | |
|---|---|
| **Problema** | Dos compradores intentan comprar el último stock al mismo tiempo → sin coordinación, ambos pasan la validación y hay **sobreventa**. |
| **Alternativas** | A) Transacción ACID de PostgreSQL · B) Lock distribuido con Redis · C) Mutex en memoria Node.js · D) Optimistic locking con campo `version` |
| **Decisión** | **A — `prisma.$transaction`**: validar stock, decrementarlo, crear el `Pago` y convertir el `Carrito` en una única transacción. Si un ítem falla, rollback total. |
| **Trade-off aceptado** | Contención de locks bajo altísima concurrencia sobre el mismo producto; no escala a múltiples shards de BD (requeriría 2PC o sagas). Aceptable para el volumen inicial. |

**Orador:** "Descartamos Redis porque agrega infraestructura que habría que operar; el mutex en memoria es directamente incorrecto cuando el servidor escala a varias instancias; y el optimistic locking exige lógica de reintentos sin beneficio claro a nuestro volumen. La garantía la da el motor de base de datos, no nuestro código — eso la hace auditable. Está implementado en `lib/stock.ts` y lo van a ver funcionar en la demo."

---

## Slide 4 — ADR 2: Integración de pagos con MercadoPago + ADR 3: Recomendaciones con Jaccard

**Contenido del slide:**

**ADR — ¿Cómo integramos el pago y cómo se confirma?**

- Alternativas: webhook firmado · polling al proveedor · whitelist de IPs · llamada sincrónica.
- **Decisión:** integración con **MercadoPago SDK** (sandbox para tests). Doble path de confirmación:
  - **Back URL** — MP redirige al usuario a `/pago/exito?external_reference={id_carrito}` → el cliente llama a `POST /api/pagos/aprobar-exito` (autenticado, confirma sin consultar MP).
  - **IPN servidor-a-servidor** — MP llama a `POST /api/pagos/mercadopago` con firma `x-signature: ts=…,v1=<HMAC>` verificada con `crypto.timingSafeEqual()`.
- **Idempotencia** resuelve la carrera entre los dos paths: si `Pago.estado !== "pendiente"` → early return (sin factura duplicada).
- Trade-off: dependencia de disponibilidad de MP; `auto_return` solo funciona en HTTPS (en localhost el sandbox usa el flujo manual); los dos paths llegan casi simultáneos, la idempotencia es la única guardia.

**ADR — ¿Cómo medir similitud entre perfumes?**

- Alternativas: Jaccard ponderado · TF-IDF · embeddings (API externa) · filtrado colaborativo.
- **Decisión:** **índice de Jaccard ponderado** sobre tags de notas: corazón 40% · salida 30% · fondo 20% · ingredientes 10%. En memoria, O(n), sin infraestructura extra.
- Trade-off: no captura semántica ("Rose" ≠ "Rosa"); pesos estáticos definidos por criterio del equipo; no aprende del comportamiento del usuario.

**Orador:** "En pagos, el polling viola eficiencia y la llamada sincrónica es incompatible con 3D Secure. La clave de MercadoPago es que el pago puede confirmarse por dos caminos independientes — back_url y webhook — llegando casi simultáneos. Sin idempotencia tendríamos dos facturas para el mismo pago. En recomendaciones, el filtrado colaborativo era inviable por cold start: en el lanzamiento no hay historial. Jaccard nos da recomendaciones desde el día uno, interpretables y ajustables sin infraestructura extra."

---

## Slide 5 — Modelo de Datos

**Imagen sugerida:** diagrama E-R del proyecto (el oficial de `modelo-er.md`) o captura de `npx prisma studio`. Resaltar la cadena `Carrito → Pago → Factura / Envío`.

**Contenido del slide:**

- 12 entidades en PostgreSQL vía Prisma 7. Decisiones destacadas:
  - **`Carrito` como eje del ciclo de compra:** no existe entidad `OrdenCompra` — el carrito `convertido` cumple ese rol. Cadena: `Carrito —0..1→ Pago —1:1→ Factura` y `Carrito —0..1→ Envio` (FKs `@unique` garantizan los 1:1 a nivel motor).
  - **Precio en la variante, no en el producto:** `VarianteProducto` (volumen, concentración, precio, ranking) en relación 1:N. Un perfume EDP 100ml y EDT 50ml comparten notas pero no precio.
  - **`Comprador` y `Vendedor` como tablas separadas** (PK `legajo` / `id_vendedor`): roles disjuntos en el negocio; la identidad vive en Clerk, no en una tabla `Usuario` propia.
  - **Junction tables explícitas:** `CarritoProducto` (con `cantidad`), `VendedorProducto`, `ProveedorProducto`, `ProductoCategoria`.
  - **Estados como flujo:** `Carrito`: activo→convertido · `Pago`: pendiente→aprobado/rechazado · `Envio`: preparando→en_camino→entregado.

**Orador:** "La decisión más discutida fue eliminar `OrdenCompra`: el carrito convertido ya tiene los ítems, las cantidades y el comprador — duplicarlo era denormalizar sin ganancia. Los constraints `@unique` en las FK hacen que sea imposible, a nivel de base, que un carrito tenga dos pagos."

---

## Slide 6 — APIs

**Contenido del slide:**

Errores uniformes `{ error: { code, message } }`, paginación estándar `{ data, pagination }`.

| Ruta | Métodos | Auth |
|---|---|---|
| `/api/catalogo` | GET | pública |
| `/api/carrito` | GET·POST·DELETE | comprador |
| `/api/checkout` | POST | comprador |
| `/api/pagos/webhook` | POST | firma HMAC propio |
| `/api/pagos/mercadopago` | POST | firma MP (x-signature) |
| `/api/pagos/aprobar-exito` | POST | comprador |
| `/api/pagos/confirmar` | POST | autenticado |
| `/api/recomendaciones` | GET | autenticado |
| `/api/inventario` + `/[id]` | GET·POST·PUT·DELETE | vendedor (owner) |
| `/api/pedidos` + `/[id]` | GET·PATCH | por rol |
| `/api/pedidos/[id]/pagar` | POST | comprador |
| `/api/envios/[id]` | GET·PATCH | por rol |
| `/api/vendedor/envios` | GET | vendedor |
| `/api/admin/pedidos` | GET | admin |
| `/api/dev/simular-pago` | POST | autenticado (demo) |
| `/api/dev/avanzar-envio` | POST | autenticado (demo) |

**Ejemplo 1 — Checkout → redirect a MercadoPago:**
```http
POST /api/checkout            → 201 Created
{ "id_pago": 12, "id_carrito": 34, "importe_total": 185000,
  "estado": "pendiente", "init_point": "https://sandbox.mercadopago.com.ar/..." }
```

**Ejemplo 2 — Back URL al volver de MP (idempotente):**
```http
POST /api/pagos/aprobar-exito
{ "id_carrito": 34 }
→ 200 { "ok": true, "estado": "aprobado", "nro_factura": "clz9abc..." }
→ si ya fue procesado: 200 { "ok": true, "detalle": "pago_ya_procesado" }
```

**Orador:** "Tres detalles del contrato: errores uniformes con código de máquina, el checkout devuelve el `init_point` de MP al que el cliente redirige al usuario, y tanto la back_url como el IPN de MP son idempotentes — el segundo path en llegar devuelve early-return sin duplicar factura."

---

## Slide 7 — Demo (video embebido)

**Contenido del slide:** solo el video + un índice de los flujos. Guión completo de grabación en `script_video_demo.md`.

- **Flujo 1 — Comprar con asistencia olfativa:** catálogo → filtros por categoría → "Armar tu perfume" (selección de notas) → "Ver similares" (motor Jaccard) → agregar al carrito.
- **Flujo 2 — Checkout atómico + MercadoPago:** carrito → checkout (stock decrementado en `$transaction`, `Pago` pendiente, devuelve `init_point`) → redirect a **MercadoPago sandbox** → pago aprobado → back_url `/pago/exito` confirma vía `POST /api/pagos/aprobar-exito` → el pedido muestra **Factura** y **Envío "preparando"**. *(Para la demo en clase: usar el **Panel de Admin** `/admin` → botón "Aprobar pago" — activa el mismo webhook HMAC interno sin salir de la app.)*
- **Flujo 3 — Ciclo del vendedor:** panel de inventario (ABM + banner de **stock crítico**) → panel de ventas con órdenes pendientes → "Marcar como despachado" → el pedido del comprador pasa a **"En camino"**.

**Orador (mientras corre el video):** "Esto que ven es la transacción del ADR-1 — stock, pago y estado del carrito en una sola `$transaction`. Al volver de MercadoPago, el cliente llama a `/api/pagos/aprobar-exito`: ahí crea la Factura y el Envío en otra transacción. Si el IPN server-to-server llega al mismo tiempo, la idempotencia del ADR-2 lo descarta sin duplicar la factura." **La demo debe demostrar los ADRs, no solo pantallas.**

---

## Slide 8 — Desafíos y aprendizajes

**Contenido del slide:**

**Lo más difícil:**
- Garantizar **no-sobreventa bajo concurrencia** — entender qué garantiza una transacción y qué no.
- Diseñar el **flujo asíncrono de pagos con MercadoPago**: doble path de confirmación (back_url + IPN), idempotencia para la carrera entre ambos, firma `x-signature` propia de MP.
- Mantener **coherencia entre documentación y código**: 90+ correcciones registradas en `log-cambios.md` alineando E-R, casos de uso, C4 y schema.

**Decisiones que volveríamos a tomar:**
- `$transaction` para el checkout · webhooks firmados · Clerk para auth (auth casera era riesgo inaceptable) · monolito modular en lugar de microservicios reales.

**Qué mejoraríamos:**
- Implementar la **liberación automática de la reserva de 5 minutos** (hoy el decremento es definitivo; requiere campo `reserva_expira` + job de limpieza).
- Notificaciones por **email reales** (hoy: confirmación en UI; el patrón fire-and-forget ya está diseñado).
- **Restock automático real** hacia el proveedor (hoy: alerta de stock crítico en el panel; falta la llamada REST saliente y el webhook de reposición).

**Partes no desarrolladas — criterio:** priorizamos el **camino crítico de la compra** (catálogo→carrito→checkout→pago→envío) con sus garantías de consistencia, por sobre integraciones salientes que dependen de terceros y no afectan la integridad de los datos.

**Orador:** "El mayor aprendizaje fue que la arquitectura se decide en los flujos asíncronos y los casos borde, no en el happy path. Y que documentar decisiones con alternativas descartadas nos obligó a justificar cada elección."

---

## Slide 9 (BONUS) — Estrategia de Despliegue

> ⭐ Da puntos extra según lineamientos. **No existe documento previo de despliegue** — esta propuesta se infiere del stack real (Next.js full-stack, artefacto único, serverless-ready). Validar con el equipo antes de presentar.

**Contenido del slide:**

- **Plataforma:** Vercel (o equivalente serverless para Next.js) + PostgreSQL gestionado (Neon/Supabase).
- **Estrategia: despliegues inmutables tipo blue-green.** Cada push genera un build completo e independiente; el tráfico se conmuta de forma atómica al nuevo deployment solo si el build es exitoso. **Rollback instantáneo**: re-apuntar al deployment anterior, sin rebuild.
- **Preview deployments por branch:** cada PR genera un entorno aislado con URL propia — el equipo valida antes de mergear a `main`.
- **Por qué no canary:** el canary requiere particionar tráfico y monitoreo de métricas comparativas; para nuestro volumen inicial el costo operativo no se justifica. El switch atómico + rollback inmediato cubre el riesgo.
- **El punto crítico: migraciones de BD.** La base es compartida entre el deployment viejo y el nuevo durante el switch → las migraciones deben ser **expand-contract** (primero agregar columnas compatibles, desplegar, después limpiar), nunca destructivas en el mismo deploy.

**Orador:** "La unidad de despliegue única —decisión del ADR de Next.js full-stack— es lo que hace viable esta estrategia: un solo pipeline, un solo artefacto, un solo switch. El trade-off real está en la base de datos compartida, por eso la disciplina expand-contract en las migraciones."
