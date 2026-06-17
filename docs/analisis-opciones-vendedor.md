# Análisis de opciones — Redefinición del concepto Vendedor

> Documento de análisis interno. No es un entregable — es para decidir qué cambiar antes del lunes.

---

## El problema en una oración

El sistema tiene dos entidades que generan inconsistencia conceptual:
- **Vendedor** (subtype de Usuario): un usuario autenticado que gestiona el inventario.
- **Proveedor** (entidad independiente, no usuario): empresa externa que suministra productos.

La lógica de negocio real se alejó del marketplace multivendedor y se acercó a una tienda con un único gestor interno cuyos productos vienen de entidades externas. Ninguna de las dos entidades actuales representa eso con precisión.

---

## Opción 1 — No cambiar nada

### Qué significa

El modelo queda exactamente como está. No se toca ningún diagrama.

La justificación implícita: el modelo *técnicamente permite* una tienda con un único Vendedor registrado. No está roto, está simplemente subutilizado.

### Qué dice cada documento hoy (sin cambios)

| Documento | Estado actual |
|---|---|
| modelo-er.md | Vendedor IS-A Usuario, Proveedor entidad externa. |
| modelado-datos.md | Tabla Vendedor con FK a Usuario, tabla proveedor independiente. |
| casos-de-uso.md | CU-06, CU-07, CU-09: actor = Vendedor (usuario autenticado). CU-10: actor externo = Proveedor. |
| diagrama-contenedores-c4.md | Vendedor como actor usuario, Sistema de Proveeduría como sistema externo. |
| diagrama_componentes_API.md | Clerk valida roles comprador/vendedor. Gestionar Inventario tiene actor claro. |

### Costo real

Cero cambios. Un día libre.

### Riesgo académico

**Moderado-alto.** Los ADRs ya escritos (ADR-001) documentan explícitamente que el sistema es un monolito de tienda única con un único gestor de catálogo. Si la cátedra cruza los ADRs con el modelo de datos, van a ver que el modelo dice "marketplace multivendedor" y los ADRs dicen "tienda única". Esa contradicción entre documentos propios es exactamente lo que evalúan en coherencia del conjunto.

### Cuándo elegir esta opción

Cuando el tiempo disponible es menor a 3 horas y la entrega de los ADRs ya compensa la inconsistencia conceptual.

---

## Opción 2 — Nueva entidad Vendedor reemplaza a ambas (Vendedor usuario + Proveedor)

### Qué significa

Se eliminan **las dos entidades actuales** (Vendedor-Usuario y Proveedor) y se crea **una nueva entidad Vendedor** que ocupa el lugar de Proveedor en el modelo de datos. Esta nueva entidad:

- **No hereda de Usuario** (rompe la relación IS-A).
- **Ofrece productos** (toma la relación que tenía Proveedor).
- **Tiene los atributos operacionales** del viejo Vendedor (reputacion, saldo, cbu) más los de contacto del Proveedor (email_contacto, telefono).
- **Es el actor de CU-06, CU-07 y CU-09** — los casos de uso del viejo Vendedor siguen aplicando, solo cambia a quién pertenecen.

> El resultado semántico: "Vendedor" pasa a ser una empresa/entidad externa que tiene credenciales para acceder al sistema pero ya no está modelada como un subtype de Usuario en el ER.

### Qué cambia en cada documento

| Documento | Cambio concreto |
|---|---|
| **modelo-er.md** | Eliminar rama "Usuario EsUn Vendedor". Eliminar entidad Proveedor. Agregar nueva entidad Vendedor standalone (sin IS-A). Renombrar ProveedorProducto → VendedorProducto. |
| **modelado-datos.md** | Eliminar tabla Vendedor (la que tenía id_usuario FK). Eliminar tabla proveedor. Agregar nueva tabla Vendedor sin FK a Usuario. Renombrar Proveedor_Producto → Vendedor_Producto. |
| **casos-de-uso.md** | CU-06, CU-07, CU-09: actor cambia de "Vendedor (usuario autenticado vía Clerk)" a "Vendedor (entidad con credenciales propias)". CU-10: "Sistema de Proveeduría" → "Vendedor" (mismo actor externo, diferente nombre). |
| **diagrama-contenedores-c4.md** | Vendedor permanece como actor externo (ya no entra por "Servicio Usuarios/Clerk" sino con auth propia o rol en Clerk sin tabla ligada). Renombrar "Sistema de Proveeduría" → "Vendedor". |
| **diagrama_componentes_API.md** | "Controlador Autorización" sigue validando el rol vendedor (puede mantenerse en Clerk aunque se elimine la tabla). Mínimos cambios de nomenclatura. |
| **Prisma schema** | Eliminar model Vendedor (el actual). Eliminar model Proveedor. Agregar model Vendedor nuevo (standalone). Renombrar ProveedorProducto → VendedorProducto. |

### Atributos de la nueva entidad Vendedor

Absorbe lo mejor de ambas entidades eliminadas:

| Atributo | Origen |
|---|---|
| `id_vendedor` (PK) | Nuevo (reemplaza legajo ambiguo) |
| `marca` | Ex-Proveedor |
| `email_contacto` | Ex-Proveedor |
| `telefono` | Ex-Proveedor |
| `saldo` | Ex-Vendedor usuario |
| `cbu` | Ex-Vendedor usuario |
| `reputacion` | Ex-Vendedor usuario |

### El punto que requiere decisión: autenticación

Al romper el IS-A con Usuario, la tabla Vendedor ya no está ligada a Clerk automáticamente. Hay dos salidas:

**Salida A (recomendada para el entregable académico):** Clerk mantiene el rol `vendedor` en sus tokens. La API sigue validando ese rol. La diferencia es que ya no existe una tabla Vendedor en la BD ligada a Usuario — el vínculo entre el Clerk user ID y el Vendedor se hace por `email` o por un campo `clerk_id` en la nueva tabla Vendedor. Esto es un detalle de implementación, no de modelo conceptual.

**Salida B (más honesta pero más trabajo):** Modelar explícitamente un campo `clerk_id` en el nuevo Vendedor, y documentar que la autenticación no pasa por la jerarquía Usuario sino por un rol Clerk separado.

Para el entregable, Salida A es suficiente. La autenticación es una preocupación de implementación — el ER y el modelado de datos no necesitan mostrar cómo funciona Clerk por dentro.

### Costo real

**Moderado.** Los cambios son mecánicos (eliminar dos entidades, agregar una nueva, renombres de junction tables) pero tocan todos los documentos. Estimación: 4-6 horas de trabajo ordenado.

### Ventaja principal

Es la opción **conceptualmente más limpia**: el modelo de datos refleja exactamente la lógica de negocio real. Un Vendedor es una empresa externa que ofrece productos y tiene credenciales para gestionar su catálogo. Nada más, nada menos.

### Riesgo

Bajo si se ejecuta de forma ordenada. El único punto delicado es explicar en los CU que el Vendedor ya no es un subtype de Usuario sino una entidad con auth propia.

---

## Opción 3 — Vendedor (Usuario) absorbe la relación de Proveedor

### Qué significa

El Vendedor sigue siendo IS-A Usuario (mantiene la herencia). **Se elimina Proveedor** como entidad separada. El Vendedor toma la relación "ofrece productos" que tenía Proveedor. La junction table ProveedorProducto → VendedorProducto (Vendedor.legajo, id_producto).

### El problema: el ciclo que la profesora señaló

En el diagrama ER, si Vendedor hereda de Usuario Y ofrece Producto, y Producto está en Carrito (de Comprador, que también hereda de Usuario), y Carrito genera Pago, y Pago confirma entrega → actualiza `Vendedor.reputacion`:

```
Usuario
  ├─── IS-A ──► Comprador ──► Carrito ──► Producto ◄── ofrece ──┐
  └─── IS-A ──► Vendedor ─────────────────────────────────────────┘
                    ▲
                    └── reputacion se actualiza cuando Carrito → Pago → Entregado
```

El camino que la profesora ve como ciclo:
`Vendedor → ofrece → Producto → en → Carrito → genera → Pago → actualiza → Vendedor`

**¿Es un ciclo real?** No en el sentido relacional. La actualización de `reputacion` es un efecto de un evento (proceso), no una foreign key que crea dependencia circular entre tablas. Pero visualmente en el diagrama ER se ve como que Vendedor "llega" a sí mismo a través de la cadena de relaciones.

**¿Se puede defender?** Sí, con esta explicación: la relación "ofrece" es de datos (quién suministra qué); la actualización de reputación es un proceso externo al modelo estructural. No hay ninguna FK que vaya de Pago a Vendedor — es solo un campo que se actualiza por lógica de negocio. Pero defender esto en una instancia de corrección oral o escrita requiere tiempo de preparación que quizás no tenés.

### Costo real

**Moderado-bajo** en cambios de documentos, pero **alto en tiempo de justificación** si la profesora ya objetó el ciclo. No es un camino recomendado si el lunes hay que defenderlo sin preparación previa.

---

## Opción 4 — Renombre puro: Vendedor usuario → Administrador, Proveedor → Vendedor

### Qué significa

La estructura relacional **no cambia en absoluto**. Solo cambian los nombres en los documentos:

- "Vendedor" (subtype de Usuario) → se llama **"Administrador"**
- "Proveedor" (entidad externa) → se llama **"Vendedor"**
- "ProveedorProducto" → **"VendedorProducto"**
- Rol Clerk `vendedor` → `admin`
- CU-06, CU-07, CU-09: actor = "Administrador"
- CU-10: sistema externo = "Vendedor"

### Por qué no sabés cómo defenderla

El riesgo de esta opción es que parece cosmético y la cátedra puede preguntarte: *"¿por qué el Administrador hereda de Usuario y tiene legajo, saldo y CBU?"* El legajo y el CBU tienen sentido para un Vendedor que recibe comisiones. Para un Administrador de tienda interna, no tanto. El renombre expone una inconsistencia de atributos que antes estaba oculta detrás del nombre "Vendedor".

Si se elige esta opción, hay que poder justificar por qué el Administrador tiene `saldo` y `cbu` — la respuesta natural sería que recibe una parte de las ventas, lo cual lo convierte en un socio comercial, no solo un administrador. En ese caso, el nombre "Administrador" tampoco es del todo correcto.

### Cuándo tiene sentido

Solo si no hay tiempo para nada más y se quiere la apariencia de consistencia semántica sin tocar la estructura. Es la opción de menor esfuerzo pero con el costo de no poder defender los atributos.

---

## Tabla comparativa

| | Opción 1 | Opción 2 | Opción 3 | Opción 4 |
|---|---|---|---|---|
| **Cambios en documentos** | Ninguno | Todos (moderado) | Todos (moderado) | Todos (solo nombres) |
| **Cambios en schema Prisma** | Ninguno | Sí (reestructura) | Sí (elimina Proveedor) | Ninguno |
| **CU-06/07/09 siguen aplicando** | Sí (sin cambios) | Sí (nuevo actor Vendedor) | Sí (sin cambios) | Sí (actor → Administrador) |
| **Coherencia con ADRs ya escritos** | Baja (hay contradicción) | Alta | Alta | Media |
| **Necesita justificación oral** | No | Poca | Mucha (el ciclo) | Media (los atributos) |
| **Riesgo si la cátedra cruza documentos** | Alto | Bajo | Medio | Medio |
| **Horas estimadas** | 0 | 4-6 | 3-5 | 1-2 |

---

## Recomendación

**Si tenés 4-6 horas disponibles:** Opción 2. Es la única que resuelve el problema de raíz y produce un modelo que cualquier integrante del equipo puede defender sin preparación adicional: "eliminamos la herencia artificial de Vendedor-Usuario porque la lógica de negocio real tiene un Vendedor externo que ofrece productos, no un usuario del sistema que gestiona un marketplace."

**Si tenés menos de 2 horas:** Opción 1, pero asegurate de que los ADRs no contradigan el modelo (si ya los entregaste, el daño está hecho). Si los ADRs aún se pueden ajustar, quitá la mención de "monolito de tienda única" o suavizala.

**Opción 3:** Solo si podés reunirte con el equipo antes del lunes y preparar la justificación del ciclo. No es una opción individual de último momento.

**Opción 4:** Evitala si hay tiempo para la 2. Si la elegís, tenés que tener lista la respuesta a "¿por qué el Administrador tiene CBU y saldo?".
