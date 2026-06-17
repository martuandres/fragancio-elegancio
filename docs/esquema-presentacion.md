# Esquema de Presentación — Fragancio Elegancio

> Basado en los lineamientos de la cátedra (30 min total, video pregrabado, sin demo en vivo).
> Puntaje total: 10 pts — distribución en la tabla de grading al final.

---

## Mapa de tiempo

| Bloque | Slides | Tiempo | Quien habla (sugerencia) |
|---|---|---|---|
| Introducción y contexto | 1-2 | 5 min | Integrante A |
| Arquitectura y decisiones | 3-5 | 5 min | Integrante B |
| Modelo de datos y APIs | 6-7 | 3 min | Integrante C |
| Demo (video) | 8 | 5-8 min | — (video corre solo) |
| Desafíos y aprendizajes | 9 | 5 min | Todos rotan |
| Preguntas | — | 10 min | Todos |

---

## Slide 1 — Carátula

**Contenido:**
- Nombre: Fragancio Elegancio — Marketplace Especializado de Fragancias
- Integrantes + comisión
- Logo o imagen del sistema (screenshot del catálogo)

**Tip:** Poner una imagen del catálogo funcionando de fondo. Transmite que hay algo real.

---

## Slide 2 — Descripción del sistema

**Contenido obligatorio:**
- **Problema:** conectar compradores que buscan fragancias personalizadas con vendedores que gestionan su catálogo, con un proceso de compra completo integrado a un procesador de pagos externo
- **Usuarios:** Comprador (navega, compra, recibe recomendaciones) y Vendedor (gestiona inventario, ve órdenes)
- **Alcance definido:**
  - ✅ Catálogo con búsqueda por notas olfativas
  - ✅ Motor de recomendaciones (Jaccard ponderado)
  - ✅ Flujo de compra completo (carrito → checkout → pago MercadoPago → confirmación)
  - ✅ Panel del vendedor (inventario CRUD + vista de pedidos)
  - ⚠️ Reserva temporal de stock (declarada en diseño, no implementada en fase actual)
  - ⚠️ Notificaciones por email (fire-and-forget, pendiente de proveedor)

**Tip:** La viñeta de "alcance definido" responde directamente al lineamiento §4 párrafo final: *"Para las partes no desarrolladas, especificar por qué."*

---

## Slides 3-4 — Decisiones arquitectónicas (ADRs)

> Cubren 3 pts del puntaje ("Coherencia con la arquitectura") y directamente responden §1 de lineamientos.

### Slide 3 — ADR-001 y ADR-002

**Primer ADR — Arquitectura del backend: monolito modular**

| Sección | Texto para el slide |
|---|---|
| Problema | RNF-1 pedía que el catálogo escale independientemente de los pagos. Nos preguntamos: ¿microservicios separados o separación interna? |
| Alternativas | Microservicios reales vs. Monolito modular con boundaries internos |
| Decisión | Monolito modular dentro de Next.js. Rutas `/api/catalogo`, `/api/checkout`, `/api/carrito` como módulos separados en el mismo proceso |
| Trade-off | Ganamos: checkout atómico con `prisma.$transaction` sin coordinación distribuida. Perdimos: escala granular por proceso |

**Segundo ADR — Persistencia: PostgreSQL + Prisma**

| Sección | Texto para el slide |
|---|---|
| Problema | El checkout requería escribir stock + pago + estado de carrito de forma atómica. El motor de recomendaciones necesita joins entre atributos de productos |
| Alternativas | MongoDB (NoSQL) vs. PostgreSQL |
| Decisión | PostgreSQL + Prisma ORM |
| Trade-off | Ganamos: `prisma.$transaction` garantiza que no se vende sin stock real (RNF-3). Perdimos: migraciones explícitas en cada cambio de modelo |

### Slide 4 — ADR-003

**Tercer ADR — Comunicación: REST + Webhooks + Fire-and-forget**

Mostrar como diagrama de flujo simple:

```
Usuario inicia checkout  →  REST síncrono  →  Reserva stock + crea Pago pendiente
                                              ↓
                         Redirige a MercadoPago (externo)
                                              ↓
MercadoPago confirma  →  WEBHOOK POST /api/pagos/webhook  →  Aprueba pago + crea Factura + crea Envío
                                              ↓
                         Email al comprador  →  FIRE-AND-FORGET (falla sin bloquear la compra)
```

| Sección | Texto para el slide |
|---|---|
| Problema | La confirmación del pago llega minutos después de que el usuario fue redirigido a MercadoPago. No podemos mantener una conexión HTTP abierta |
| Decisión | Híbrido: REST para flujos que el usuario espera + Webhooks para callbacks externos + Fire-and-forget para notificaciones |
| Trade-off | Si el webhook de pago no llega (MercadoPago falla reintentos), el pago queda en `pendiente` indefinidamente |

---

## Slide 5 — Modelo de datos

**Contenido:**
- Mostrar el diagrama ER simplificado (las entidades principales, sin las junction tables)
- Destacar 2-3 decisiones del modelo:

**Decisión 1 — Herencia de usuario:** Comprador y Vendedor son entidades independientes autenticadas vía Clerk, sin tabla base compartida en BD.

**Decisión 2 — Carrito como unidad central:** El Carrito vincula todo: tiene ítems (`CarritoProducto`), genera un `Pago` (0..1), genera un `Envío` (0..1). Nunca se borra — permite historial de pedidos completo.

**Decisión 3 — Stock en `Producto`, precio en `VarianteProducto`:** Un producto puede tener variantes (volumen, concentración, precio) sin duplicar el stock global.

**Visual sugerido:** Versión simplificada del ER con flechas entre: Vendedor → Producto → VarianteProducto, Comprador → Carrito → CarritoProducto → Producto, Carrito → Pago → Factura, Carrito → Envío.

---

## Slide 6 — APIs

**Contenido:** Mostrar tabla de endpoints + un ejemplo de request/response real.

**Tabla resumida:**

| Endpoint | Método | Auth | Para qué |
|---|---|---|---|
| `/api/catalogo` | GET | pública | Listado con filtros, búsqueda por notas olfativas |
| `/api/carrito` | GET/POST/DELETE | comprador | Gestión del carrito activo |
| `/api/checkout` | POST | comprador | Inicia compra: valida stock + crea Pago pendiente + redirige a MP |
| `/api/pagos/webhook` | POST | HMAC-SHA256 | Confirma pago: crea Factura + crea Envío |
| `/api/recomendaciones` | GET | autenticado | Motor Jaccard ponderado |
| `/api/inventario` | GET/POST | vendedor | CRUD de productos del vendedor |
| `/api/pedidos` | GET | comprador | Historial de órdenes con estado de pago y envío |

**Ejemplo destacado para el slide:**

Request a `/api/recomendaciones`:
```
GET /api/recomendaciones?id_producto=42
→ [ { id_producto: 7, nombre: "Chanel N°5", score: 0.82 }, ... ]
```

Explicar: el score es el índice de Jaccard ponderado calculado en `lib/recomendaciones.ts` (notas_corazon 40%, notas_salida 30%, notas_fondo 20%, ingrediente 10%).

---

## Slide 7 — Demo (video pregrabado)

> **Modo recomendado:** Apagar MercadoPago real (`NEXT_PUBLIC_MP_ENABLED` ≠ "true") y usar
> `/api/dev/simular-pago` para simular la aprobación. Esto permite mostrar el flujo end-to-end
> completo sin depender de una conexión externa ni de una cuenta de MP activa.

### Flujos a grabar (en este orden, ~7 minutos)

**Segmento 1 — Flujo del comprador: buscar y comprar (3 min)**

1. Abrir `/catalogo` — mostrar grid de productos, filtrar por categoría
2. Click en un producto → `/producto/{id}`:
   - Mostrar notas olfativas (salida / corazón / fondo) en pills
   - Mostrar variantes de volumen y precio
   - **Scroll abajo: mostrar sección "También te puede gustar"** — recomendaciones Jaccard ya están en la página
3. Click "Agregar al carrito" → ir a `/carrito` → ver item + total
4. Click "Ir al checkout" → `/checkout`:
   - Mostrar dirección de envío (editarla si hace falta)
   - Mostrar resumen del pedido con total
   - Click "Confirmar pedido" (MP desactivado) → redirige a `/pedidos/{id}` con estado `pendiente`

**Segmento 2 — Webhook: simular aprobación del pago (1.5 min)**

5. Abrir Postman (o la pantalla del admin) → hacer `POST /api/dev/simular-pago` con:
   ```json
   { "id_carrito": {id del paso 4}, "estado": "aprobado" }
   ```
6. Mostrar la respuesta 200 del servidor
7. Volver al browser → refrescar `/pedidos/{id}` → el pedido ahora muestra:
   - Pago: `aprobado`
   - Envío: `preparando`
   - Factura generada

**Segmento 3 — Flujo del vendedor: ver órdenes y despachar (2.5 min)**

8. Cambiar a cuenta vendedor → `/vendedor`:
   - Mostrar lista de productos con stock
   - Mostrar banner amarillo de "Stock crítico" si algún producto tiene ≤ 5 unidades
9. Click "Órdenes" → `/vendedor/ventas`:
   - Mostrar el pedido del segmento 1 como orden pendiente de despacho
   - Ver nombre del comprador, dirección, productos
10. Click "Marcar como despachado" → toast "Envío actualizado · comprador notificado" → orden desaparece de la lista
11. *(Opcional, 30 seg)* Ir a `/vendedor/inventario/nuevo` → mostrar el formulario de carga de producto

### Preparación antes de grabar
- Tener en la BD: al menos 1 cuenta comprador, 1 cuenta vendedor, productos con stock ≥ 1
- `NEXT_PUBLIC_MP_ENABLED` debe NO ser "true" (así el checkout va directo a `/pedidos/`)
- Anotar el `id_carrito` que va a aparecer después del checkout para usarlo en Postman
- Tener Postman ya abierto con el request configurado para no perder tiempo

### Tips de grabación
- Grabar a 1920×1080, sin audio de fondo
- Poner captions encima del video indicando qué flujo va ("[1] Comprador busca y compra", "[2] Webhook aprueba el pago", "[3] Vendedor despacha")
- Editar para cortar tiempos de carga
- Embeber directamente en PowerPoint/Google Slides (no link externo)

---

## Slide 8 — Desafíos y aprendizajes

**Estructura sugerida: cada integrante habla de uno.**

**Desafío técnico 1 — Atomicidad del checkout:**
El mayor riesgo era la sobreventa: dos compradores comprando el último stock al mismo tiempo. Lo resolvimos con `prisma.$transaction`: dentro de una única transacción de BD, validamos stock y lo decrementamos antes de crear el pago. Si cualquier paso falla, el rollback es automático.

**Desafío técnico 2 — Coherencia entre documentación e implementación:**
La arquitectura documentada (diagramas C4, modelo ER, casos de uso) evolucionó durante el desarrollo. En más de una oportunidad el código avanzó antes de actualizar los documentos, generando inconsistencias. Lo que aprendimos: los documentos son contratos, no decoración.

**Desafío de diseño — El ciclo en el modelo ER:**
La entidad Vendedor heredaba de Usuario junto con Comprador. Cuando quisimos agregar la relación Vendedor→Producto, el diagrama generaba un ciclo visual a través del ancestro compartido. La solución (propuesta A): eliminar la entidad base Usuario y hacer Vendedor standalone.

**¿Qué haríamos diferente?**
- Implementar la reserva temporal de stock con TTL real (campo `reserva_expira` en BD + job de cleanup)
- Separar el Servicio de Notificaciones con una cola de reintentos (dead-letter queue) en lugar de fire-and-forget puro

---

## Slide 9 (opcional, +puntos) — Estrategia de despliegue

> Sección §4.2 de los lineamientos: da puntos extras.

**Propuesta:** Rolling update en Vercel

- Cada push a `main` dispara un build automático en Vercel
- Vercel hace un **rolling update** sin downtime: la nueva versión solo recibe tráfico una vez que pasa el healthcheck
- Las Prisma migrations se corren como `postinstall` script antes del deploy
- Variables de entorno (`DATABASE_URL`, `CLERK_*`, `WEBHOOK_SECRET`) viven en Vercel Environment Variables — nunca en el repo

**Diagrama:**
```
Push a main → CI/CD Vercel → Build Next.js → Run prisma migrate → Deploy rolling
                                                                        ↓
                                          Nuevo tráfico → nueva versión
                                          Tráfico existente → versión anterior (hasta que drena)
```

---

## Grading vs. contenido mapeado

| Criterio | Pts | Cubierto por |
|---|---|---|
| Demo funcional | 3 | Video segmentos 1+2 (flujo completo buyer + seller) |
| Coherencia con arquitectura | 3 | Slides ADR conectados al video + APIs + modelo |
| Calidad de presentación | 1.5 | Estructura limpia, tiempo respetado, todos hablan |
| Profundidad técnica | 1.5 | Desafíos técnicos + preguntas con cada integrante preparado |
| Participación | 1 | Rotar oradores en cada sección |
| **Total** | **10** | |

---

## Checklist de preparación

**Video:**
- [ ] `NEXT_PUBLIC_MP_ENABLED` ≠ "true" (checkout sin MP real)
- [ ] Cuenta comprador + cuenta vendedor + productos con stock en la BD
- [ ] Postman configurado con `POST /api/dev/simular-pago` listo antes de grabar
- [ ] Grabar segmento comprador: catálogo → producto → recomendaciones → carrito → checkout → pedido pendiente
- [ ] Grabar segmento webhook: simular pago aprobado → pedido cambia a aprobado + envío preparando
- [ ] Grabar segmento vendedor: ver orden → marcar despachado
- [ ] Editar: cortar tiempos muertos, agregar captions por segmento
- [ ] Embeber en la presentación (no link externo)

**Slides:**
- [ ] 3 ADRs con problema / alternativas / decisión / trade-off
- [ ] Modelo ER simplificado con las 3 decisiones destacadas
- [ ] Tabla de APIs + ejemplo de request/response
- [ ] Slide de desafíos con un integrante por punto
- [ ] Slide de deploy (opcional pero suma puntos)

**Equipo:**
- [ ] Cada integrante tiene asignado qué sección expone
- [ ] Todos pueden responder: "¿por qué usaron PostgreSQL?" / "¿por qué monolito?" / "¿cómo funciona el webhook?"
- [ ] Presentación entregada 48hs antes en formato listo para PC externa
