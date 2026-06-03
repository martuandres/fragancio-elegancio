# Modelado de Datos — Fragancio Elegancio

## Qué es este documento y por qué difiere del modelo E-R

El **modelo E-R** (`modelo-er.md`) describe el modelo conceptual: entidades, atributos propios
y relaciones. No muestra explícitamente cómo se conectan las tablas a nivel de columnas.

Este documento es el **modelado de datos lógico**: muestra cada tabla con todas sus columnas,
incluyendo las claves foráneas (FK) que son las que permiten navegar las relaciones entre tablas.
Por eso algunos atributos aparecen acá pero no en el E-R (por ejemplo, `legajo` en `Carrito`
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
| Columna      | Tipo | Rol            |
|--------------|------|----------------|
| `legajo`     | —    | PK             |
| `saldo`      | —    |                |
| `cbu`        | —    |                |
| `reputacion` | —    |                |
| `id_usuario` | —    | FK → usuario   |

---

### Comprador
| Columna           | Tipo | Rol            |
|-------------------|------|----------------|
| `legajo`          | —    | PK             |
| `direccion_envio` | —    |                |
| `telefono`        | —    |                |
| `id_usuario`      | —    | FK → usuario   |

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
| `marca`         | —    |    |
| `stock`         | —    |                  |
| `ingrediente`   | —    |                  |
| `notas_salida`  | —    |                  |
| `notas_corazon` | —    |                  |
| `notas_fondo`   | —    |                  |

---

### Variante_Producto
| Columna                | Tipo | Rol |
|------------------------|------|-----|
| `id_variante_producto` | —    | PK  |
| `precio`               | —    |     |
| `concentracion`        | —    |     |
| `volumen`              | —    |     |

---

### Proveedor_Producto *(tabla de unión)*
| Columna       | Tipo | Rol                |
|---------------|------|--------------------|
| `marca`       | —    | PK + FK → proveedor |
| `id_producto` | —    | PK + FK → Producto  |

---

### Producto-Variante_Producto *(tabla de unión)*
| Columna                | Tipo | Rol                         |
|------------------------|------|-----------------------------|
| `id_variante_producto` | —    | PK + FK → Variante_Producto |
| `id_producto`          | —    | PK + FK → Producto          |

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
| `legajo`       | —    | FK → Comprador    |

> `legajo` no es un atributo propio del carrito: es la FK que lo conecta con el Comprador dueño del carrito.

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

Comprador ◄─────────────────── Carrito        (via legajo)
proveedor ◄─────────────────── Proveedor_Producto (via marca)
Producto  ◄─────────────────── Proveedor_Producto (via id_producto)
Producto  ◄─────────────────── Producto-Variante_Producto (via id_producto)
Variante_Producto ◄──────────── Producto-Variante_Producto (via id_variante_producto)
Producto  ◄─────────────────── Producto_Categoria (via id_producto)
Categoria ◄─────────────────── Producto_Categoria (via id_categoria)
Producto  ◄─────────────────── Carrito_Producto   (via id_producto)
Carrito   ◄─────────────────── Carrito_Producto   (via id_carrito)
Carrito   ◄─────────────────── Pago    (via id_carrito)
Carrito   ◄─────────────────── Envio   (via id_carrito)
Pago      ◄─────────────────── Factura (via id_pago)
```
