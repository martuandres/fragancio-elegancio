# Plan de implementación — Propuesta A

> Eliminar entidad Usuario, hacer Vendedor y Comprador standalone,
> agregar relación Vendedor "ofrece" Producto. Proveedor no se toca.

---

## Qué cambia y qué NO cambia

| Archivo | Cambios |
|---|---|
| `modelo-er.md` | ✏️ Sí — eliminar entidad, actualizar 2, agregar relación |
| `modelado-datos.md` | ✏️ Sí — eliminar tabla, actualizar 2, agregar junction |
| `diagrama-contexto-dfd.md` | ✏️ Sí — agregar Vendedor como entidad externa con flujos |
| `casos-de-uso.md` | ✅ Sin cambios — ningún CU nombra la entidad Usuario |
| `diagrama-contenedores-c4.md` | ✅ Sin cambios — describe contenedores, no entidades de BD |
| `diagrama_componentes_API.md` | ✅ Sin cambios — describe componentes, no herencia de datos |

---

## 1. modelo-er.md

### 1.1 Eliminar — sección completa "Usuario *(base de herencia)*"

Borrar todo el bloque:

```
### Usuario *(base de herencia)*
| Atributo     | Descripción                        |
|--------------|------------------------------------|
| `id_usuario` | PK — identificador único           |
| `nombre`     | Nombre completo                    |
| `email`      | Correo electrónico                 |
| `contraseña` | Contraseña (hash, gestionada por Clerk) |
```

### 1.2 Modificar — encabezado y atributos de Vendedor

**Antes:**
```markdown
### Vendedor *(hereda de Usuario vía EsUn)*
| Atributo     | Descripción                              |
|--------------|------------------------------------------|
| `legajo`     | Número de legajo/registro del vendedor   |
| `saldo`      | Saldo acumulado por ventas               |
| `cbu`        | CBU bancario para acreditar ventas       |
| `reputacion` | Puntuación de reputación                 |
```

**Después:**
```markdown
### Vendedor *(entidad independiente)*
| Atributo     | Descripción                              |
|--------------|------------------------------------------|
| `legajo`     | PK — número de legajo del vendedor       |
| `email`      | Email de contacto y autenticación        |
| `nombre`     | Nombre o razón social                    |
| `saldo`      | Saldo acumulado por ventas               |
| `cbu`        | CBU bancario para acreditar ventas       |
| `reputacion` | Puntuación de reputación                 |
```

### 1.3 Modificar — encabezado y atributos de Comprador

**Antes:**
```markdown
### Comprador *(hereda de Usuario vía EsUn)*
| Atributo          | Descripción                                |
|-------------------|--------------------------------------------|
| `legajo`          | Número de legajo/registro del comprador    |
| `direccion_envio` | Dirección predeterminada de envío          |
| `telefono`        | Teléfono de contacto                       |
```

**Después:**
```markdown
### Comprador *(entidad independiente)*
| Atributo          | Descripción                                |
|-------------------|--------------------------------------------|
| `legajo`          | PK — número de legajo del comprador        |
| `email`           | Email de contacto y autenticación          |
| `nombre`          | Nombre completo                            |
| `direccion_envio` | Dirección predeterminada de envío          |
| `telefono`        | Teléfono de contacto                       |
```

### 1.4 Eliminar — sección completa "Herencia (EsUn)"

Borrar todo el bloque:

```
### Herencia (EsUn)
| Relación              | Cardinalidad | Descripción                               |
|-----------------------|--------------|-------------------------------------------|
| Usuario **EsUn** Vendedor  | 1:1     | Un usuario puede ser vendedor             |
| Usuario **EsUn** Comprador | 1:1     | Un usuario puede ser comprador            |
```

### 1.5 Agregar — nueva relación Vendedor "ofrece" Producto

En la tabla de "Relaciones entre entidades", agregar la fila:

```markdown
| Vendedor **ofrece** Producto | 0..* a 1..* | — | Un vendedor puede ofrecer cero o más productos; un producto tiene uno o más vendedores |
```

> La relación "Proveedor ofrece Producto" ya existente NO se toca.

### 1.6 Reemplazar — diagrama de cardinalidades resumido

**Antes:**
```
Usuario ──EsUn──► Vendedor
        └─EsUn──► Comprador

Proveedor ──0..*── ofrece ──1..*──► Producto ◄──1..*── tiene ──1..*── Variante_Producto
                                        ▲
                    Categoria ──1..*── pertenece ──0..*──┘

Comprador ──1── tiene ──0..*──► Carrito ──tiene (cantidad)──0..*──► Producto
                                    │
                         necesita ──┤ 0..1 ──► Pago ──crea── 1 ──► Factura
                           enviado ─┘ 0..1 ──► Envio
```

**Después:**
```
Vendedor  ──0..*── ofrece ──1..*──► Producto ◄──1..*── tiene ──1..*── Variante_Producto
Proveedor ──0..*── ofrece ──1..*──┘     ▲
                    Categoria ──1..*── pertenece ──0..*──┘

Comprador ──1── tiene ──0..*──► Carrito ──tiene (cantidad)──0..*──► Producto
                                    │
                         necesita ──┤ 0..1 ──► Pago ──crea── 1 ──► Factura
                           enviado ─┘ 0..1 ──► Envio
```

---

## 2. modelado-datos.md

### 2.1 Eliminar — sección completa "### usuario"

Borrar todo el bloque:

```
### usuario
| Columna      | Tipo    | Rol  |
|--------------|---------|------|
| `id_usuario` | —       | PK   |
| `nombre`     | —       |      |
| `email`      | —       |      |
| `contraseña` | —       |      |
```

### 2.2 Modificar — tabla Vendedor

**Antes:**
```markdown
### Vendedor
| Columna      | Tipo | Rol            |
|--------------|------|----------------|
| `legajo`     | —    | PK             |
| `saldo`      | —    |                |
| `cbu`        | —    |                |
| `reputacion` | —    |                |
| `id_usuario` | —    | FK → usuario   |
```

**Después:**
```markdown
### Vendedor
| Columna      | Tipo | Rol |
|--------------|------|-----|
| `legajo`     | —    | PK  |
| `email`      | —    |     |
| `nombre`     | —    |     |
| `saldo`      | —    |     |
| `cbu`        | —    |     |
| `reputacion` | —    |     |
```

### 2.3 Modificar — tabla Comprador

**Antes:**
```markdown
### Comprador
| Columna           | Tipo | Rol            |
|-------------------|------|----------------|
| `legajo`          | —    | PK             |
| `direccion_envio` | —    |                |
| `telefono`        | —    |                |
| `id_usuario`      | —    | FK → usuario   |
```

**Después:**
```markdown
### Comprador
| Columna           | Tipo | Rol |
|-------------------|------|-----|
| `legajo`          | —    | PK  |
| `email`           | —    |     |
| `nombre`          | —    |     |
| `direccion_envio` | —    |     |
| `telefono`        | —    |     |
```

### 2.4 Agregar — nueva tabla de unión Vendedor_Producto

Insertar después de la sección `Proveedor_Producto`:

```markdown
### Vendedor_Producto *(tabla de unión)*
| Columna       | Tipo | Rol                |
|---------------|------|--------------------|
| `legajo`      | —    | PK + FK → Vendedor |
| `id_producto` | —    | PK + FK → Producto |
```

### 2.5 Modificar — mapa de conexiones entre tablas

**Eliminar las líneas:**
```
usuario ◄─── Vendedor   (via id_usuario)
usuario ◄─── Comprador  (via id_usuario)
```

**Agregar las líneas:**
```
Vendedor  ◄─────────────────── Vendedor_Producto  (via legajo)
Producto  ◄─────────────────── Vendedor_Producto  (via id_producto)
```

> Las líneas de `Proveedor_Producto` no se tocan.

---

## 3. diagrama-contexto-dfd.md

### 3.1 Agregar — Vendedor en tabla de entidades externas

En la tabla "## Entidades externas", agregar la fila:

```markdown
| **Vendedor** | Gestiona el catálogo de productos del marketplace (altas, bajas, modificaciones de stock). Confirma el despacho de las órdenes recibidas. |
```

### 3.2 Agregar — nueva sección de flujos Marketplace ↔ Vendedor

Insertar como nueva sección después de "### Comprador ↔ Marketplace":

```markdown
### Vendedor ↔ Marketplace

| Dirección | Flujo | Descripción |
|---|---|---|
| Vendedor → Marketplace | **Gestión de inventario** | El vendedor da de alta, modifica o elimina productos y actualiza el stock desde su panel (CU-06). |
| Marketplace → Vendedor | **Notificación de orden pendiente** | El marketplace informa al vendedor cuando hay un nuevo pedido en estado `preparando` que debe despachar (CU-07). |
| Vendedor → Marketplace | **Confirmación de despacho** | El vendedor marca el pedido como despachado; el marketplace lo envía al Sistema de Envíos (CU-07). |
```

### 3.3 Eliminar — nota al pie sobre Vendedor

Borrar el párrafo final (líneas 70-71):

```
**Vendedor** no aparece como entidad externa porque en el schema actual solo tiene FK a `usuario`
(login/registro), igual que el Comprador. Si se implementa el panel del vendedor con flujos propios
(gestión de inventario, notificación de pedidos, liquidación de saldo), agregar Vendedor como entidad
externa y modelar sus flujos aquí.
```

> Esta nota ya no aplica: Vendedor ahora figura como entidad externa con sus flujos definidos.

---

## Checklist de verificación

Antes de dar por terminado, verificar que:

- [ ] En `modelo-er.md` no queda ninguna mención de "Usuario", "EsUn" ni "herencia"
- [ ] En `modelo-er.md` la relación Vendedor→Producto aparece junto a Proveedor→Producto en la tabla de relaciones
- [ ] En `modelo-er.md` el diagrama de cardinalidades muestra Vendedor y Comprador sin ancestro común
- [ ] En `modelado-datos.md` no queda ninguna tabla con FK a `usuario`
- [ ] En `modelado-datos.md` existe la sección `Vendedor_Producto` con sus dos columnas FK
- [ ] En `modelado-datos.md` el mapa de conexiones no menciona `usuario` y sí menciona `Vendedor_Producto`
- [ ] En `diagrama-contexto-dfd.md` Vendedor aparece en la tabla de entidades externas
- [ ] En `diagrama-contexto-dfd.md` existe la sección "Marketplace ↔ Vendedor" con los 3 flujos
- [ ] En `diagrama-contexto-dfd.md` la nota al pie sobre Vendedor fue eliminada
- [ ] `casos-de-uso.md` no fue modificado
- [ ] `diagrama-contenedores-c4.md` no fue modificado
- [ ] `diagrama_componentes_API.md` no fue modificado
