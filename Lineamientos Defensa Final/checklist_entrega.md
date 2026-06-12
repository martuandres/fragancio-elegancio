# Checklist de Entrega — Presentación Final
### Basado en el checklist oficial de la cátedra, expandido con el estado real del proyecto

> Leyenda: `[x]` Listo · `[~]` Parcialmente listo · `[ ]` Pendiente
> Prioridad: **CRÍTICO** (sin esto se pierden puntos directos) · **IMPORTANTE** (riesgo en preguntas) · **OPCIONAL** (puntos extra / pulido)

---

## 1. Proyecto

- [x] **El sistema funciona correctamente** — CRÍTICO
  `npm run build` compila limpio. Los 10 casos de uso tienen cobertura (CU-09 con toast en lugar de email; CU-10 con banner de stock crítico en lugar de llamada REST al proveedor).

- [x] **Los principales casos de uso pueden demostrarse** — CRÍTICO
  Flujo completo demostrable: catálogo → filtros → recomendaciones → carrito → checkout → webhook firmado → factura/envío → panel vendedor → despacho → tracking del comprador.

- [~] **Se dispone de datos de prueba adecuados** — CRÍTICO
  El seed existe (`npm run seed` → 100 perfumes de PerfumAPI). Falta verificar antes de grabar: (1) base limpia y seedeada, (2) una cuenta comprador y una vendedor ya creadas con onboarding hecho, (3) el vendedor con productos propios cargados (el seed no asigna `VendedorProducto` — revisar), (4) al menos un producto con stock ≤ 5 para que aparezca el banner de stock crítico.

- [~] **Variables de entorno y servicios externos operativos** — CRÍTICO
  Verificar `DATABASE_URL`, claves de Clerk y `WEBHOOK_SECRET` en `.env.local` de la máquina donde se graba. Tener el comando curl del webhook preparado y probado (ver `script_video_demo.md`).

- [ ] **Conciliar README con el modelo real** — IMPORTANTE
  README §3/§4 describe herencia `Usuario → Comprador/Vendedor` que NO existe en el schema real (tablas separadas, PK `legajo` / `id_vendedor`). Si el tribunal lee el README y compara con la demo, hay inconsistencia. Actualizar §3, §4 y §7 (estructura de carpetas desactualizada) o tener la respuesta preparada (pregunta 11 de `prep_preguntas.md`).

- [ ] **Resolver la doble numeración de ADRs** — IMPORTANTE
  `docs/adr/ADR-001…005` (atomicidad, Jaccard, webhook, PostgreSQL, Clerk) y `docs/adrs.md` ADR-001…004 (monolito, BD, comunicación, Next.js) usan la misma numeración para decisiones distintas. Renumerar un set (ej. `adrs.md` → ADR-006…009) o fusionar. La presentación usa los de `docs/adr/` + el de monolito modular.

- [ ] **Limpiar notas internas de `adrs.md`** — IMPORTANTE
  La sección "Inconsistencias de implementación detectadas" describe bugs de `OrdenCompra` **ya corregidos** en el código actual. Si la cátedra lo lee, parece que el sistema está roto. Eliminar o marcar como "resuelto en versión X". Los bloques `> 💭` también deberían quitarse según la propia nota del documento.

---

## 2. Presentación

- [~] **La presentación respeta el tiempo máximo de 30 minutos** — CRÍTICO
  Guión listo en `presentacion_slides.md` (9 slides). Falta: convertir a PowerPoint/Google Slides, ensayar con cronómetro (intro 5' / arquitectura 5' / demo 5-8' / conclusiones 5').

- [x] **Incluye explicación de arquitectura y diseño con al menos 2 ADRs justificados** — CRÍTICO
  Slides 3-4: atomicidad ($transaction), webhook HMAC, Jaccard — cada uno con contexto, alternativas, decisión y trade-off.

- [ ] **Incluye video de demostración embebido** — CRÍTICO
  Pendiente de grabar. Guión en `script_video_demo.md`. Probar que el video reproduce DENTRO del archivo de presentación en una PC ajena (formato mp4 H.264 es lo más seguro; evitar codecs raros).

- [x] **Incluye conclusiones y aprendizajes** — CRÍTICO
  Slide 8, incluyendo partes no desarrolladas con criterio explícito (lo piden los lineamientos).

- [ ] **El archivo está listo para proyectarse desde una PC externa** — CRÍTICO
  Se proyecta desde la PC de la cátedra. Verificar: fuentes embebidas, video embebido (no link a archivo local), probar en una segunda máquina. **Entregar hasta 48 hs antes de la exposición.**

- [~] **Slide de despliegue (bonus)** — OPCIONAL ⭐ puntos extra
  Propuesta redactada en slide 9 (blue-green con deployments inmutables + expand-contract para migraciones). Falta validarla con el equipo — no existe documento previo de despliegue, fue inferida del stack.

- [ ] **Slide/mención de organización del trabajo (§4.1 de los lineamientos)** — OPCIONAL
  Los lineamientos sugieren evidencia del proceso: repositorio Git con historial de commits, `log-cambios.md` con 90+ correcciones documentadas (es un diferencial — mostrarlo). [COMPLETAR: herramienta de gestión usada, división de tareas]

---

## 3. Video Demo

- [ ] **Grabar el video (5-7 min)** — CRÍTICO
  Guión paso a paso en `script_video_demo.md`. Flujos: compra asistida → checkout + webhook → ciclo vendedor.

- [ ] **Preparar el entorno antes de grabar** — CRÍTICO
  Checklist previo en el script: seed corrido, cuentas creadas, producto con stock bajo, curl del webhook probado, ventana del navegador limpia (sin bookmarks personales ni notificaciones).

- [ ] **Verificar que NO aparezcan en cámara** — IMPORTANTE
  Errores de consola, flujos no implementados (redirección a pasarela de pago real, emails), datos personales, `.env` en pantalla.

- [ ] **Audio en off o subtítulos** — IMPORTANTE
  Decidir si el video lleva narración grabada o si un integrante narra en vivo sobre el video mudo. Recomendado: video mudo + narración en vivo (más natural y demuestra dominio; el guión de "qué decir" está en el script).

- [ ] **Embeber el video en la presentación y probarlo** — CRÍTICO
  En la PC de un integrante distinto al que lo grabó, idealmente sin internet (el video debe ser local/embebido, no YouTube).

---

## 4. Equipo

- [ ] **Todos los integrantes participaron en la preparación** — CRÍTICO
  5 integrantes: Agostino Laurella Crippa, Pierino Oscar Spina, Ana Martina Andrés, Tomás Copelotti, José Ignacio Ubici. Repartir slides: quién presenta intro, quién ADRs, quién narra la demo, quién conclusiones.

- [ ] **Todos pueden explicar su contribución** — CRÍTICO
  La cátedra puede dirigir preguntas a cualquiera (§5 de los lineamientos). [COMPLETAR: mapa integrante → módulos/decisiones]

- [ ] **Todos conocen las decisiones principales** — CRÍTICO
  Mínimo común para todos: (1) por qué `$transaction` en el checkout, (2) cómo funciona el webhook firmado y la idempotencia, (3) por qué Jaccard, (4) monolito modular vs. microservicios, (5) qué no se implementó y con qué criterio. Hacer una ronda de simulacro con `prep_preguntas.md` — cada integrante responde 3 preguntas al azar.

- [ ] **Ensayo general completo al menos una vez** — IMPORTANTE
  Con cronómetro y con el video corriendo. Detecta el 90% de los problemas de timing.

---

## Resumen de pendientes por prioridad

| Prioridad | Pendientes |
|---|---|
| **CRÍTICO** | Grabar video · convertir guión a slides · probar en PC externa · preparar datos de prueba · repartir roles del equipo · entregar 48 hs antes |
| **IMPORTANTE** | Conciliar README con schema real · resolver doble numeración de ADRs · limpiar notas obsoletas de `adrs.md` · ensayo general |
| **OPCIONAL** | Validar slide de despliegue (⭐ puntos extra) · slide de organización del trabajo |
