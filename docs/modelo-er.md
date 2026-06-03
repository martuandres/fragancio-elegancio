# Modelo Entidad-Relación — Fragancio Elegancio

Este documento describe el modelo E-R tal como está definido en el diagrama oficial del proyecto.
Es la fuente de verdad para la estructura de datos. Donde difiera del README o del schema Prisma,
prevalece este documento.

---

## Entidades y atributos

### Usuario *(base de herencia)*
| Atributo     | Descripción                        |
|--------------|------------------------------------|
| `id_usuario` | PK — identificador único           |
| `nombre`     | Nombre completo                    |
| `email`      | Correo electrónico                 |
| `contraseña` | Contraseña (hash, gestionada por Clerk) |

### Vendedor *(hereda de Usuario vía EsUn)*
| Atributo     | Descripción                              |
|--------------|------------------------------------------|
| `legajo`     | Número de legajo/registro del vendedor   |
| `saldo`      | Saldo acumulado por ventas               |
| `cbu`        | CBU bancario para acreditar ventas       |
| `reputacion` | Puntuación de reputación                 |

### Comprador *(hereda de Usuario vía EsUn)*
| Atributo          | Descripción                                |
|-------------------|--------------------------------------------|
| `legajo`          | Número de legajo/registro del comprador    |
| `direccion_envio` | Dirección predeterminada de envío          |
| `telefono`        | Teléfono de contacto                       |

### Proveedor *(entidad independiente, no es Usuario)*
| Atributo        | Descripción                        |
|-----------------|------------------------------------|
| `marca`         | Nombre de la marca (PK o identificador) |
| `telefono`      | Teléfono de contacto               |
| `email_contacto`| Email de contacto comercial        |

### Producto
| Atributo        | Descripción                                     |
|-----------------|-------------------------------------------------|
| `id_producto`   | PK — identificador único                        |
| `nombre`        | Nombre comercial                                |
| `marca`         | Marca del producto (FK a Proveedor)             |
| `stock`         | Cantidad disponible en inventario               |
| `ingredientes`  | Lista de ingredientes                           |
| `notas_salida`  | Notas olfativas de salida (top notes)           |
| `notas_corazon` | Notas de corazón (heart notes)                  |
| `notas_fondo`   | Notas de fondo (base notes)                     |

### Variante_Producto
| Atributo              | Descripción                              |
|-----------------------|------------------------------------------|
| `id_variante_producto`| PK — identificador único de la variante  |
| `precio`              | Precio de esta presentación              |
| `volumen`             | Volumen en ml                            |
| `concentracion`       | Tipo (EDT, EDP, Parfum, Cologne, etc.)   |

> **Nota:** `concentracion` pertenece a `Variante_Producto`, no a `Producto`.

### Categoria
| Atributo      | Descripción                                     |
|---------------|-------------------------------------------------|
| `id_categoria`| PK — identificador único                        |
| `criterio`    | Descripción/tipo de la categoría                |

### Carrito
| Atributo      | Descripción                                        |
|---------------|----------------------------------------------------|
| `id_pedido`   | PK — identificador del carrito/pedido              |
| `estado`      | Estado del carrito                                 |
| `fecha_creada`| Fecha y hora de creación                           |

> **Nota:** en el diagrama el atributo de PK del Carrito se llama `id_pedido`.

### Pago
| Atributo  | Descripción                                |
|-----------|--------------------------------------------|
| `id_pago` | PK — identificador único                   |
| `estado`  | Estado del pago (pendiente/aprobado/etc.)  |

### Factura
| Atributo       | Descripción                              |
|----------------|------------------------------------------|
| `id_pedido`    | FK al Carrito/pedido que la origina      |
| `nro_factura`  | Número único de factura                  |
| `fecha_emision`| Fecha de emisión                         |
| `importe_total`| Monto total facturado                    |

### Envio
| Atributo    | Descripción                                        |
|-------------|----------------------------------------------------|
| `id_envio`  | PK — identificador único                           |
| `track_code`| Código de seguimiento del proveedor logístico      |
| `estado`    | Estado (preparando / en tránsito / entregado / devuelto) |

---

## Relaciones

### Herencia (EsUn)
| Relación              | Cardinalidad | Descripción                               |
|-----------------------|--------------|-------------------------------------------|
| Usuario **EsUn** Vendedor  | 1:1     | Un usuario puede ser vendedor             |
| Usuario **EsUn** Comprador | 1:1     | Un usuario puede ser comprador            |

### Relaciones entre entidades
| Relación                              | Cardinalidad    | Atributos de relación | Descripción                                      |
|---------------------------------------|-----------------|-----------------------|--------------------------------------------------|
| Proveedor **ofrece** Producto | 0..* a 1..*    | —                     | Un proveedor ofrece 0 o más productos y un Producto tiene uno o mas proveedores        |
| Variante_Producto **tiene** Producto  | 1..* a 1..*     | `ranking`             | Una variante tiene a uno o mas productos; un producto tiene una o mas variantes |
| Producto **pertenece** Categoria      | 1..* a 0..*     | —                     | Un producto puede estar en 1 o mas categorías y una categoria puede tener 0 o mas productos |
| Comprador **tiene** Carrito           | 0..* a 1        | —                     | Un comprador puede tener cero o más carritos y un carrito tiene a un comprador    |
| Carrito **tiene** Producto            | 1..* a 0..*     | `cantidad`            | Un carrito contiene uno o más productos y un producto esta contenido en 0 o mas carritos |
| Carrito **necesita** Pago             | 0..1 a 1        | —                     | Un carrito tiene 0 o 1 pago y un pago necesita 1 carrito          |
| Pago **crea** Factura                 | 1 a 1           | —                     | Un pago genera exactamente una factura y una factura es generada por un pago          |
| Carrito **enviado** Envio             | 0..1 a 1        | —                     | Un carrito puede tener 0 o 1 envío asociado y el envio tiene 1 carrito asociado        |

---

## Diagrama de cardinalidades resumido

```
Usuario ──EsUn──► Vendedor
        └─EsUn──► Comprador

Proveedor ──1..*── ofrece ──0..*──► Variante_Producto
                                            │
                                       1..* │ tiene (ranking)
                                            ▼
Categoria ──1..*── pertenece ──0..*──► Producto

Comprador ──1── tiene ──0..*──► Carrito ──tiene (cantidad)──0..*──► Producto
                                    │
                         necesita ──┤ 0..1 ──► Pago ──crea── 1 ──► Factura
                           enviado ─┘ 0..1 ──► Envio
```

---

## Diferencias con el README / schema Prisma

Estas son las discrepancias detectadas entre el diagrama ER oficial y el README:

| Tema | Diagrama ER (fuente de verdad) | README / schema actual |
|------|-------------------------------|------------------------|
| `Proveedor` | Entidad separada de `Vendedor`, con marca/telefono/email_contacto | Tratado como sinónimo de `Vendedor` |
| `concentracion` | Atributo de `Variante_Producto` | En `Producto` |
| `legajo` en Comprador | Sí existe | No aparece en README |
| `OrdenCompra` | No aparece como entidad explícita; `Carrito` tiene `id_pedido` y se relaciona directo con `Pago` y `Envio` | `OrdenCompra` es una entidad separada |
| PK de `Carrito` | `id_pedido` | `id_carrito` |

Al implementar el schema Prisma, alinear con este documento.
