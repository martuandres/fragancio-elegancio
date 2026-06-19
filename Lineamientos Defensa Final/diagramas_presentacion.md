# Diagramas para la Presentación — Fragancio Elegancio
### Renderizar con la extensión "Markdown Preview Mermaid Support" en VS Code, o en GitHub

---

## 1. Modelo de Datos — Diagrama E-R completo

> **Cómo usarlo en el slide:** captura esta sección. Resaltar la cadena `Carrito → Pago → Factura` y `Carrito → Envio`.

```mermaid
erDiagram
    COMPRADOR {
        string  legajo        PK
        string  email
        string  nombre
        string  direccion_envio
        string  telefono
    }

    CARRITO {
        int     id_carrito    PK
        string  legajo        FK
        datetime fecha_creada
        string  estado
    }

    CARRITO_PRODUCTO {
        int     id_carrito    FK
        int     id_producto   FK
        int     cantidad
    }

    PAGO {
        int     id_pago       PK
        int     id_carrito    FK "unique"
        string  estado
    }

    FACTURA {
        string  nro_factura   PK
        int     id_pago       FK "unique"
        datetime fecha_emision
        decimal importe_total
    }

    ENVIO {
        int     id_envio      PK
        int     id_carrito    FK "unique"
        string  track_code
        string  estado
    }

    PRODUCTO {
        int     id_producto   PK
        string  marca
        string  nombre
        int     stock
        string  ingrediente
        string  notas_salida
        string  notas_corazon
        string  notas_fondo
    }

    VARIANTE_PRODUCTO {
        int     id_variante   PK
        int     id_producto   FK
        decimal volumen
        decimal precio
        string  concentracion
        int     ranking
    }

    VENDEDOR {
        int     id_vendedor   PK
        string  email
        string  nombre
        decimal saldo
        string  cbu
    }

    PROVEEDOR {
        string  marca         PK
        string  email_contacto
        string  telefono
    }

    CATEGORIA {
        int     id_categoria  PK
        string  criterio
    }

    COMPRADOR            ||--o{ CARRITO             : "tiene"
    CARRITO              ||--o{ CARRITO_PRODUCTO    : "contiene"
    CARRITO              ||--o| PAGO                : "genera"
    CARRITO              ||--o| ENVIO               : "origina"
    PAGO                 ||--o| FACTURA             : "produce"
    PRODUCTO             ||--o{ CARRITO_PRODUCTO    : "aparece en"
    PRODUCTO             ||--o{ VARIANTE_PRODUCTO   : "tiene"
    PRODUCTO             }o--o{ VENDEDOR            : "VendedorProducto"
    PRODUCTO             }o--o{ PROVEEDOR           : "ProveedorProducto"
    PRODUCTO             }o--o{ CATEGORIA           : "ProductoCategoria"
```

---

## 2. Ciclo de compra — vista reducida (para el slide)

> Versión simplificada: solo las entidades del camino crítico. Ideal para el slide 5.

```mermaid
erDiagram
    COMPRADOR {
        string  legajo   PK
        string  nombre
        string  email
    }
    CARRITO {
        int     id_carrito  PK
        string  legajo      FK
        string  estado
    }
    CARRITO_PRODUCTO {
        int     id_carrito  FK
        int     id_producto FK
        int     cantidad
    }
    PRODUCTO {
        int     id_producto PK
        string  nombre
        int     stock
    }
    VARIANTE_PRODUCTO {
        int     id_variante PK
        int     id_producto FK
        decimal precio
        string  concentracion
    }
    PAGO {
        int     id_pago     PK
        int     id_carrito  FK "unique"
        string  estado
    }
    FACTURA {
        string  nro_factura   PK
        int     id_pago       FK "unique"
        decimal importe_total
    }
    ENVIO {
        int     id_envio    PK
        int     id_carrito  FK "unique"
        string  estado
    }

    COMPRADOR         ||--o{ CARRITO            : "1 activo a la vez"
    CARRITO           ||--o{ CARRITO_PRODUCTO   : "ítems"
    CARRITO_PRODUCTO  }o--|| PRODUCTO           : ""
    PRODUCTO          ||--o{ VARIANTE_PRODUCTO  : "precio / volumen"
    CARRITO           ||--o| PAGO               : "único @unique"
    CARRITO           ||--o| ENVIO              : "único @unique"
    PAGO              ||--o| FACTURA            : "único @unique"
```

---

## 3. Flujo de Checkout Atómico (`lib/stock.ts`)

> Para el slide del ADR-1. Muestra que **stock, Pago y estado del Carrito** están dentro de una sola `$transaction`.

```mermaid
sequenceDiagram
    autonumber
    participant C  as Comprador (browser)
    participant CO as POST /api/checkout
    participant TX as prisma.$transaction
    participant DB as PostgreSQL

    C->>CO: POST /api/checkout
    CO->>CO: auth() + role check (comprador)
    CO->>DB: buscar Carrito activo + ítems
    CO->>TX: checkoutAtomico(id_carrito, items)

    loop Por cada ítem
        TX->>DB: SELECT Producto (stock, precio)
        alt stock < cantidad
            TX-->>CO: throw "Stock insuficiente"
            CO-->>C: 409 CHECKOUT_FALLIDO
        end
        TX->>DB: UPDATE stock -= cantidad
    end

    TX->>DB: INSERT Pago(estado="pendiente")
    TX->>DB: UPDATE Carrito(estado="convertido")
    TX-->>CO: { pago, importe_total, restocks }

    CO->>CO: crearPreferenciaMP(items, id_carrito)
    alt MP falla
        CO->>TX: ROLLBACK manual (delete Pago, restore stock, Carrito→activo)
        CO-->>C: 502 MP_ERROR
    end

    CO-->>C: 201 { id_pago, id_carrito, importe_total, init_point }
    C->>C: window.location = init_point (MercadoPago sandbox)

    Note over TX,DB: Todo o nada — si un ítem falla,<br/>ningún stock se decrementa.
```

---

## 4. Flujo de Confirmación de Pago — Doble Path MercadoPago

> Para el slide del ADR-2. Muestra los **dos caminos** y cómo la **idempotencia** evita la factura duplicada.

```mermaid
sequenceDiagram
    autonumber
    participant U   as Usuario (browser)
    participant MP  as MercadoPago
    participant BE  as Back URL /pago/exito
    participant AE  as POST /api/pagos/aprobar-exito
    participant WH  as POST /api/pagos/mercadopago
    participant DB  as PostgreSQL

    U->>MP: Paga en sandbox de MP

    par Path A — Back URL (usuario redirigido)
        MP->>U: redirect → /pago/exito?external_reference={id_carrito}
        U->>BE: GET /pago/exito (page.tsx client)
        BE->>AE: POST /api/pagos/aprobar-exito { id_carrito }
        AE->>DB: SELECT Pago WHERE id_carrito
        alt Pago.estado === "pendiente"
            AE->>DB: $transaction: UPDATE Pago→aprobado,<br/>INSERT Factura, UPSERT Envio
            AE-->>BE: 200 { ok, nro_factura }
        else Pago.estado !== "pendiente"
            AE-->>BE: 200 { ok, detalle: "pago_ya_procesado" }
        end
        BE->>U: Muestra pantalla de éxito + link al pedido
    and Path B — IPN servidor a servidor (casi simultáneo)
        MP->>WH: POST /api/pagos/mercadopago<br/>x-signature: ts=...,v1=<HMAC>
        WH->>WH: verificarFirmaMP() con timingSafeEqual
        WH->>MP: GET /payments/{id} (SDK)
        WH->>DB: SELECT Pago WHERE id_carrito (external_reference)
        alt Pago.estado === "pendiente"
            WH->>DB: $transaction: UPDATE Pago→aprobado,<br/>INSERT Factura, UPSERT Envio
            WH-->>MP: 200 { ok, nro_factura }
        else Pago ya procesado
            WH-->>MP: 200 { ok, detalle: "pago_ya_procesado" }
        end
    end

    Note over AE,WH: La idempotencia (check estado === "pendiente")<br/>garantiza que solo uno de los dos paths<br/>crea la Factura y el Envío.
```

---

## 5. Máquinas de Estado

### 5a. Estado del Carrito

```mermaid
stateDiagram-v2
    [*] --> activo : Comprador inicia sesión / agrega producto

    activo --> convertido : checkoutAtomico() exitoso\n(stock decrementado, Pago creado)
    activo --> abandonado : inactividad (manual / futuro TTL)

    convertido --> cancelado : Pago rechazado por MP\n(stock restaurado)

    note right of convertido
        Pago.estado = pendiente
        → esperando confirmación MP
    end note

    note right of cancelado
        stock restaurado en $transaction
        junto con Pago → rechazado
    end note
```

### 5b. Estado del Pago

```mermaid
stateDiagram-v2
    [*] --> pendiente : INSERT en checkoutAtomico()

    pendiente --> aprobado  : MP confirma (back_url o IPN)\n→ crea Factura + Envio
    pendiente --> rechazado : MP rechaza (back_url o IPN)\n→ restaura stock

    note right of aprobado
        Factura creada con importe_total
        Envio creado con estado "preparando"
    end note
```

### 5c. Estado del Envío

```mermaid
stateDiagram-v2
    [*] --> preparando : UPSERT Envio al confirmar Pago

    preparando --> en_camino  : Vendedor / Admin marca "despachado"\nPATCH /api/envios/[id]
    en_camino  --> entregado  : Vendedor / Admin marca "entregado"\nPATCH /api/envios/[id]

    entregado --> [*]
```

---

## 6. Flujo del Motor de Recomendaciones (Jaccard)

> Para mencionar brevemente en el ADR-3. No es necesario ponerlo en el slide — es material de respaldo para preguntas.

```mermaid
flowchart TD
    A[GET /api/recomendaciones?id_producto=X] --> B[Cargar producto base\nnotas_salida · corazon · fondo · ingrediente]
    B --> C[Cargar todos los productos con stock > 0]
    C --> D{Para cada producto candidato}

    D --> E[Tokenizar notas y ingredientes]
    E --> F["Jaccard ponderado:\ncorazón × 0.40\nsalida × 0.30\nfondo × 0.20\ningrediente × 0.10"]
    F --> G[score = suma ponderada]
    G --> D

    D --> H[Ordenar por score desc]
    H --> I[Devolver top-N productos]

    style F fill:#f0f4ff,stroke:#4f46e5
    note1["O(n) — sin índices externos\nViable hasta ~10k productos"]
```

---

## Notas de uso

- **VS Code**: instalar la extensión *"Markdown Preview Mermaid Support"* (Henning Dieterichs) y abrir con `Ctrl+Shift+V`.
- **Para capturar**: zoom al 100%, modo oscuro/claro según el tema del PowerPoint, `Ctrl+Shift+P` → "screenshot" o usar Snipping Tool.
- **GitHub**: sube el archivo y GitHub renderiza Mermaid directamente en el preview.
- **Exportar como PNG**: herramienta online `mermaid.live` — pegar el bloque de código y descargar SVG/PNG en alta resolución.
