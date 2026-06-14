# Gaps Detectados — Informe de Auditoría
### Resultado del relevamiento de todos los `.md` del proyecto para la presentación final

---

## 1. Qué información estaba faltante o incompleta

### 1.1 Estrategia de despliegue — INEXISTENTE (era el bonus ⭐)

No hay ningún documento de despliegue en el proyecto. Los lineamientos dan **puntos extra** por documentarla. Es el gap más rentable de cerrar.

### 1.2 Doble set de ADRs con numeración en conflicto

Existen **dos colecciones de ADRs independientes** que usan los mismos IDs para decisiones distintas:

| ID | En `docs/adr/` (2026-06-03) | En `docs/adrs.md` (2026-06-05) |
|---|---|---|
| ADR-001 | Atomicidad del checkout | Monolito modular vs. microservicios |
| ADR-002 | Algoritmo de recomendaciones (Jaccard) | PostgreSQL + Prisma |
| ADR-003 | Webhook de pagos con HMAC | Comunicación híbrida (REST/webhook/fire-and-forget) |
| ADR-004 | PostgreSQL | Next.js full-stack |
| ADR-005 | Clerk | — |

Si el tribunal pregunta "explíquenme su ADR-002", hay dos respuestas válidas y contradictorias. Hay solapamiento además entre `adr/ADR-004` y `adrs.md ADR-002` (ambos deciden PostgreSQL).

### 1.3 Sección de "inconsistencias de implementación" obsoleta en `adrs.md`

`adrs.md` cierra con bugs CRÍTICOS sobre `OrdenCompra`, `id_pedido`, `precio` en `Producto`, etc. **Todos esos bugs ya están corregidos** en el código actual (`lib/stock.ts` usa `Pago`/`Carrito`; el webhook usa `id_carrito`; el precio se lee de `VarianteProducto`). Si la cátedra lee ese documento tal cual, concluye que el sistema está roto. También quedan los bloques `> 💭` de notas de trabajo que el propio documento dice que hay que eliminar antes de entregar.

### 1.4 README desactualizado respecto del modelo real

- README §3 y §4 describen herencia `Usuario → Comprador/Vendedor` con PK compartida `id_usuario` y un schema Prisma con modelo `Usuario`. **El schema real no tiene tabla `Usuario`**: `Comprador` (PK `legajo`) y `Vendedor` (PK `id_vendedor`) son tablas separadas. El E-R (`modelo-er.md`) y el modelado de datos (`modelado-datos.md`) sí coinciden con el schema real — el desactualizado es solo el README. (Curiosidad: `log-cambios.md` puntos 81-86 documentan el cambio A id_usuario, pero el schema vigente lo revirtió a tablas separadas; el log no registra esa reversión.)
- README §7 lista páginas que no existen con esos nombres: `producto/[id]`, `(marketplace)/recomendaciones/`, `(vendedor)/ordenes` (lo real es `/vendedor/ventas`, y las recomendaciones viven en un sheet del catálogo).
- README §1 describía "microservicios" — ya señalado dentro del propio `adrs.md`; la arquitectura real es monolito modular.
- README menciona `PAYMENT_WEBHOOK_SECRET`; la variable real es `WEBHOOK_SECRET` (CLAUDE.md y código).

### 1.5 Brechas especificación ↔ implementación (conocidas, defendibles)

| Especificado en | Qué dice | Estado real |
|---|---|---|
| CU-03 / Regla 4 / Pipeline 3 | Reserva de stock por 5 min con liberación automática | El decremento es definitivo; `RESERVATION_MINUTES` es informativo. No hay job de liberación. |
| CU-09 / RNF-2 | Email automático al comprador en cada cambio de estado de envío | Toast en la UI del vendedor ("comprador notificado"). No hay servicio de email. |
| CU-10 / RF-10 | Pedido REST al proveedor + webhook de reposición | Banner de stock crítico en el panel del vendedor. No hay llamada saliente ni webhook entrante. |
| Pipeline 2 | Pasos del webhook "dentro de una transacción" | El webhook hace escrituras secuenciales (el propio Paso 6 del pipeline lo admite como trade-off — pero la tabla del Paso 5 dice "transacción": redacción interna inconsistente). |
| `decisiones-disenio.md` | "El panel vendedor no tiene sección de pedidos recibidos" | **Obsoleto**: `/vendedor/ventas` + `GET /api/vendedor/envios` ya existen. Actualizar. |

### 1.6 Detalles menores

- `casos-de-uso.md` CU-01 dice "El comprador debe haber iniciado sesión" como precondición, pero el catálogo es **público** por diseño (`decisiones-disenio.md`, `proxy.ts`). Inconsistencia menor entre doc y código.
- La carpeta se llama `docs 2/` (con espacio) — contiene los lineamientos y el log; conviene fusionarla con `docs/`.
- `AGENTS.md` es copia operativa de CLAUDE.md — no es material de entrega, no afecta.

---

## 2. Qué desarrollé yo para compensar

| Archivo generado | Contenido nuevo (no existía en ningún .md) |
|---|---|
| `presentacion_slides.md` | Guión completo de 9 slides. Los ADRs de los slides 3-4 son síntesis fieles de `docs/adr/` (no inventé alternativas). El **slide 9 de despliegue es desarrollo mío**: estrategia blue-green con deployments inmutables + migraciones expand-contract, inferida del stack real (Next.js artefacto único, serverless-ready, PostgreSQL compartida). |
| `prep_preguntas.md` | 15 preguntas con respuestas modelo. Las respuestas técnicas salen de los ADRs y pipelines existentes; las respuestas de las preguntas 3, 11, 13 y 15 (gaps y modelo de usuarios) las redacté para convertir las inconsistencias detectadas en respuestas honestas y defendibles. |
| `checklist_entrega.md` | Checklist de la cátedra expandido con el estado real de cada ítem y prioridades. |
| `script_video_demo.md` | Guión de grabación completo, incluyendo el comando curl con firma HMAC para simular el webhook en cámara y la lista de qué NO mostrar. |

---

## 3. Decisiones que asumí (y por qué)

1. **Usé los ADRs de `docs/adr/` como los "oficiales" de la presentación** (atomicidad, Jaccard, webhook), complementados con el ADR de monolito modular de `adrs.md`. Motivo: los de `docs/adr/` están más desarrollados (alternativas con ventajas/desventajas explícitas) y mapean directo a lo que se ve en la demo.
2. **Elegí esos 3 ADRs para los slides** (atomicidad, webhook+Jaccard) porque son los únicos demostrables EN el video — maximiza el criterio "Coherencia con la arquitectura" (3 pts): lo que se muestra coincide con lo documentado.
3. **Asumí Vercel como plataforma en el slide de despliegue** porque los propios ADRs la mencionan repetidamente ("la aplicación puede escalar horizontalmente en Vercel", trade-offs de serverless en ADR-004 de `adrs.md`). Si despliegan en otro lado, la estrategia (inmutable + atomic switch) se mantiene pero hay que ajustar el nombre.
4. **En las respuestas modelo asumo honestidad total sobre los gaps** (reserva de 5 min, emails, restock). Alternativa descartada: maquillarlos — riesgo altísimo, los lineamientos piden explícitamente justificar las partes no desarrolladas y el tribunal compara doc vs. demo.
5. **Recomendé video mudo + narración en vivo** en lugar de audio grabado: demuestra dominio ante el tribunal y permite ajustar el ritmo. Es preferencia, no requisito.
6. **Asumí Grupo 17 y los 5 integrantes del README** como datos de carátula. La comisión es 17 (ya completada en los slides y el documento de arquitectura).

---

## 4. Qué tenés que revisar/completar VOS antes de la entrega

**En los archivos generados (buscar `[COMPLETAR]`):**
1. ~~`presentacion_slides.md` → número de comisión.~~ ✔ Completado: Comisión 17.
2. `prep_preguntas.md` → pregunta de repesca "¿Quién hizo qué?": mapa integrante → aporte.
3. `checklist_entrega.md` → herramienta de gestión del equipo y división de tareas.
4. `script_video_demo.md` → emails de las cuentas demo.

**En el proyecto (orden de prioridad):**
1. **Decidir sobre la doble numeración de ADRs** (§1.2) — al menos definir cuál set es el oficial para responder preguntas con consistencia.
2. **Limpiar `adrs.md`**: borrar la sección de inconsistencias obsoletas y los bloques `> 💭` (§1.3).
3. **Actualizar README §3/§4/§7** o, como mínimo, que todo el equipo sepa responder la pregunta 11 de `prep_preguntas.md` (herencia Usuario vs. tablas separadas).
4. **Actualizar `decisiones-disenio.md`**: la sección "Historial de pedidos solo para compradores" quedó obsoleta tras implementar `/vendedor/ventas`.
5. **Verificar el seed + cuentas demo** antes de grabar (el seed no crea `VendedorProducto` — el vendedor demo necesita productos cargados a mano).
6. **Validar la estrategia de despliegue del slide 9** con el equipo — es propuesta mía, no documento existente. Si la adoptan, conviene guardarla también como `docs/adr/ADR-006-estrategia-despliegue.md` para que el slide tenga respaldo documental.
7. Decidir si corrigen la precondición de CU-01 ("debe haber iniciado sesión" vs. catálogo público) — inconsistencia menor pero detectable.
