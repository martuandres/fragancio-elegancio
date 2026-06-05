# Modelado de Datos — Fragancio Elegancio

## Qué es este documento y por qué difiere del modelo E-R

El **modelo E-R** (`modelo-er.md`) describe el modelo conceptual: entidades, atributos propios
y relaciones. No muestra explícitamente cómo se conectan las tablas a nivel de columnas.

Este documento es el **modelado de datos lógico**: muestra cada tabla con todas sus columnas,
incluyendo las claves foráneas (FK) que son las que permiten navegar las relaciones entre tablas.
Por eso algunos atributos aparecen acá pero no en el E-R (por ejemplo, `id_usuario` en `Carrito`
no es un atributo propio del carrito, sino la FK que lo conecta con `Comprador`; o `id_carrito`
en `Pago` y `Envio` que son las FKs que los anclan al carrito que les dio origen).

**Fuente:** diagrama de modelado de datos del proyecto.

---

## Tablas

### usuario
| Columna      | Tipo    | Rol  |
|--------------|---------|------|
| `id_usuario` | —       | PK   |
| `nombre`     | —       |      |
| `email`      | —       |      |
| `contraseña` | —       |      |

---

### Vendedor
| Columna      | Tipo | Rol                        |
|--------------|------|----------------------------|
| `id_usuario` | —    | PK + FK → usuario          |
| `legajo`     | —    | atributo propio (UNIQUE)   |
| `saldo`      | —    |                            |
| `cbu`        | —    |                            |
| `reputacion` | —    |                            |

> `id_usuario` es al mismo tiempo la PK de Vendedor y la FK que lo conecta con Usuario (estrategia tabla-por-tipo). `legajo` es un atributo propio del vendedor, no su identificador de tabla.

---

### Comprador
| Columna           | Tipo | Rol                        |
|-------------------|------|----------------------------|
| `id_usuario`      | —    | PK + FK → usuario          |
| `legajo`          | —    | atributo propio (UNIQUE)   |
| `direccion_envio` | —    |                            |
| `telefono`        | —    |                            |

> `id_usuario` es al mismo tiempo la PK de Comprador y la FK que lo conecta con Usuario (estrategia tabla-por-tipo). `legajo` es un atributo propio del comprador, no su identificador de tabla.

---

### proveedor
| Columna          | Tipo | Rol |
|------------------|------|-----|
| `marca`          | —    | PK  |
| `telefono`       | —    |     |
| `email_contacto` | —    |     |

---

### Producto
| Columna         | Tipo | Rol              |
|-----------------|------|------------------|
| `id_producto`   | —    | PK               |
| `nombre`        | —    |                  |
| `marca`         | —    |                  |
| `stock`         | —    |                  |
| `ingrediente`   | —    |                  |
| `notas_salida`  | —    |                  |
| `notas_corazon` | —    |                  |
| `notas_fondo`   | —    |                  |
| `imagen_url`    | —    | opcional         |

> `imagen_url` no aparece en el modelo E-R porque ese nivel es conceptual y no incluye detalles de implementación técnica (URLs, rutas de archivos, etc.). Sí se incluye acá porque el modelado de datos refleja las columnas reales de la base de datos.

---

### Variante_Producto
| Columna                | Tipo | Rol                  |
|------------------------|------|----------------------|
| `id_variante_producto` | —    | PK                   |
| `id_producto`          | —    | FK → Producto        |
| `precio`               | —    |                      |
| `concentracion`        | —    |                      |
| `volumen`              | —    |                      |
| `ranking`              | —    |                      |

> La relación Producto → Variante_Producto es **1:N**: una variante pertenece a un único producto. Se eliminó la tabla de unión `Producto-Variante_Producto` y `id_producto` se agregó directamente como FK en esta tabla. El atributo `ranking` también pasó a ser un atributo propio de la variante.

---

### Proveedor_Producto *(tabla de unión)*
| Columna       | Tipo | Rol                |
|---------------|------|--------------------|
| `marca`       | —    | PK + FK → proveedor |
| `id_producto` | —    | PK + FK → Producto  |

---

### Producto_Categoria *(tabla de unión)*
| Columna        | Tipo | Rol                  |
|----------------|------|----------------------|
| `id_categoria` | —    | PK + FK → Categoria  |
| `id_producto`  | —    | PK + FK → Producto   |

---

### Categoria
| Columna        | Tipo | Rol |
|----------------|------|-----|
| `id_categoria` | —    | PK  |
| `criterio`     | —    |     |

---

### Carrito
| Columna        | Tipo | Rol               |
|----------------|------|-------------------|
| `id_carrito`   | —    | PK                |
| `estado`       | —    |                   |
| `fecha_creada` | —    |                   |
| `id_usuario`   | —    | FK → Comprador    |

> `id_usuario` no es un atributo propio del carrito: es la FK que lo conecta con el Comprador dueño del carrito. Referencia `id_usuario` (PK de Comprador) y no `legajo` (que es un atributo propio del Comprador, no su identificador de tabla).

---

### Carrito_Producto *(tabla de unión con atributo propio)*
| Columna       | Tipo | Rol               |
|---------------|------|-------------------|
| `id_producto` | —    | PK + FK → Producto |
| `id_carrito`  | —    | PK + FK → Carrito  |
| `cantidad`    | —    | atributo propio    |

---

### Pago
| Columna      | Tipo | Rol             |
|--------------|------|-----------------|
| `id_pago`    | —    | PK              |
| `estado`     | —    |                 |
| `id_carrito` | —    | FK → Carrito    |

> `id_carrito` no es un atributo propio del pago: es la FK que lo ancla al carrito que originó el pago.

---

### Factura
| Columna         | Tipo | Rol          |
|-----------------|------|--------------|
| `nro_factura`   | —    | PK           |
| `id_pago`       | —    | FK → Pago    |
| `importe_total` | —    |              |
| `fecha_emision` | —    |              |

---

### Envio
| Columna      | Tipo | Rol          |
|--------------|------|--------------|
| `id_envio`   | —    | PK           |
| `estado`     | —    |              |
| `track_code` | —    |              |
| `id_carrito` | —    | FK → Carrito |

> `id_carrito` no es un atributo propio del envío: es la FK que lo ancla al carrito que originó el envío.

---

## Mapa de conexiones entre tablas

```
usuario ◄─── Vendedor   (via id_usuario)
usuario ◄─── Comprador  (via id_usuario)

Comprador ◄─────────────────── Carrito        (via id_usuario)
proveedor ◄─────────────────── Proveedor_Producto (via marca)
Producto  ◄─────────────────── Proveedor_Producto (via id_producto)
Producto  ◄─────────────────── Variante_Producto  (via id_producto)
Producto  ◄─────────────────── Producto_Categoria (via id_producto)
Categoria ◄─────────────────── Producto_Categoria (via id_categoria)
Producto  ◄─────────────────── Carrito_Producto   (via id_producto)
Carrito   ◄─────────────────── Carrito_Producto   (via id_carrito)
Carrito   ◄─────────────────── Pago    (via id_carrito)
Carrito   ◄─────────────────── Envio   (via id_carrito)
Pago      ◄─────────────────── Factura (via id_pago)
```
