# Modelo Entidad-Relación — Fragancio Elegancio

## Para qué sirve el modelo E-R

El modelo E-R (Entidad-Relación) sirve para **diseñar y visualizar la estructura de una base de datos antes de crearla**. Actúa como un plano visual que traduce las necesidades del negocio a datos organizados, detallando qué información se va a guardar y cómo se relacionan sus elementos.

Es un diagrama **conceptual**: muestra entidades, sus atributos propios y las relaciones entre ellas. No muestra cómo se implementan esas relaciones a nivel de columnas (eso lo hace el modelado de datos en `modelado-datos.md`). Por eso pueden tener diferencias — no son inconsistencias, son niveles de abstracción distintos.

Este documento describe el modelo E-R tal como está definido en el diagrama oficial del proyecto.
Es la fuente de verdad conceptual de la estructura de datos.

---

## Entidades y atributos

### Vendedor *(entidad independiente)*
| Atributo      | Descripción                              |
|---------------|------------------------------------------|
| `id_vendedor` | PK — identificador único del vendedor    |
| `email`       | Email de contacto y autenticación        |
| `nombre`      | Nombre o razón social                    |
| `saldo`       | Saldo acumulado por ventas               |
| `cbu`         | CBU bancario para acreditar ventas       |

### Comprador *(entidad independiente)*
| Atributo          | Descripción                                |
|-------------------|--------------------------------------------|
| `legajo`          | PK — número de legajo del comprador        |
| `email`           | Email de contacto y autenticación          |
| `nombre`          | Nombre completo                            |
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
| `ingrediente`   | Lista de ingredientes                           |
| `notas_salida`  | Notas olfativas de salida (top notes)           |
| `notas_corazon` | Notas de corazón (heart notes)                  |
| `notas_fondo`   | Notas de fondo (base notes)                     |

> **Nota sobre imagen:** `imagen_url` no aparece en este modelo porque el E-R es conceptual y describe reglas de dominio, no detalles de implementación técnica. Una URL a un archivo externo es un detalle de presentación, no una entidad del negocio. `imagen_url` sí aparece en el modelado de datos (`modelado-datos.md`) y en el schema Prisma, que operan al nivel lógico/físico donde las columnas concretas importan.

### Variante_Producto
| Atributo              | Descripción                              |
|-----------------------|------------------------------------------|
| `id_variante_producto`| PK — identificador único de la variante  |
| `precio`              | Precio de esta presentación              |
| `volumen`             | Volumen en ml                            |
| `concentracion`       | Tipo (EDT, EDP, Parfum, Cologne, etc.)   |
| `ranking`             | Orden/ranking de la variante dentro del producto |

> **Nota:** `concentracion` y `ranking` pertenecen a `Variante_Producto`, no a `Producto`. La relación con Producto es 1:N: una variante pertenece a exactamente un producto.

### Categoria
| Atributo      | Descripción                                     |
|---------------|-------------------------------------------------|
| `id_categoria`| PK — identificador único                        |
| `criterio`    | Descripción/tipo de la categoría                |

### Carrito
| Atributo      | Descripción                                        |
|---------------|----------------------------------------------------|
| `id_carrito`  | PK — identificador del carrito/pedido              |
| `estado`      | Estado del carrito                                 |
| `fecha_creada`| Fecha y hora de creación                           |

> **Nota:** en el diagrama el atributo de PK del Carrito se llama `id_carrito`.

### Pago
| Atributo  | Descripción                                |
|-----------|--------------------------------------------|
| `id_pago` | PK — identificador único                   |
| `estado`  | Estado del pago (pendiente/aprobado/etc.)  |

### Factura
| Atributo       | Descripción                              |
|----------------|------------------------------------------|
| `id_pago`      | FK al Pago que la origina                |
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

### Relaciones entre entidades
| Relación                              | Cardinalidad    | Atributos de relación | Descripción                                      |
|---------------------------------------|-----------------|-----------------------|--------------------------------------------------|
| Vendedor **ofrece** Producto  | 0..* a 1..*    | —                     | Un vendedor puede ofrecer cero o más productos; un producto tiene uno o más vendedores  |
| Proveedor **ofrece** Producto | 0..* a 1..*    | —                     | Un proveedor ofrece 0 o más productos y un Producto tiene uno o mas proveedores        |
| Producto **tiene** Variante_Producto  | 1 a 0..*        | —                     | Un producto tiene cero o más variantes; una variante pertenece a exactamente un producto |
| Producto **pertenece** Categoria      | 1..* a 0..*     | —                     | Un producto puede estar en 1 o mas categorías y una categoria puede tener 0 o mas productos |
| Comprador **tiene** Carrito           | 0..* a 1        | —                     | Un comprador puede tener cero o más carritos y un carrito tiene a un comprador    |
| Carrito **tiene** Producto            | 1..* a 0..*     | `cantidad`            | Un carrito contiene uno o más productos y un producto esta contenido en 0 o mas carritos |
| Carrito **necesita** Pago             | 0..1 a 1        | —                     | Un carrito tiene 0 o 1 pago y un pago necesita 1 carrito          |
| Pago **crea** Factura                 | 1 a 1           | —                     | Un pago genera exactamente una factura y una factura es generada por un pago          |
| Carrito **enviado** Envio             | 0..1 a 1        | —                     | Un carrito puede tener 0 o 1 envío asociado y el envio tiene 1 carrito asociado        |

---

## Diagrama de cardinalidades resumido

```
Vendedor  ──0..*── ofrece ──1..*──►
                                    Producto ──1── tiene ──0..*──► Variante_Producto
Proveedor ──0..*── ofrece ──1..*──►     ▲
                    Categoria ──1..*── pertenece ──0..*──┘

Comprador ──1── tiene ──0..*──► Carrito ──tiene (cantidad)──0..*──► Producto
                                    │
                         necesita ──┤ 0..1 ──► Pago ──crea── 1 ──► Factura
                           enviado ─┘ 0..1 ──► Envio
```

---

