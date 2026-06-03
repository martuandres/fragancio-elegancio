# ADR-004 — Motor de base de datos para la persistencia del sistema

**Estado:** Aceptada  
**Fecha:** 2026-06-03  
**Categoría:** Persistencia  
**Pipelines relacionados:** Pipeline 2 y Pipeline 3 (escrituras transaccionales); Pipeline 1 (lecturas)

---

## 1. Contexto

El sistema necesita persistir y consultar datos de múltiples entidades fuertemente relacionadas: usuarios (compradores y vendedores), productos con variantes y categorías, carritos, órdenes de compra, pagos, facturas y envíos. Estas entidades tienen relaciones many-to-many (productos ↔ categorías, productos ↔ vendedores, productos ↔ órdenes) y relaciones 1:1 estrictas (orden ↔ pago ↔ factura, orden ↔ envío).

El problema es elegir el motor de base de datos que mejor se ajuste a este modelo de datos y a los requerimientos del sistema.

Motivadores que definen los requisitos:
- **Integridad referencial:** las relaciones entre entidades deben ser garantizadas por la base de datos (e.g., no puede existir un `Envio` sin su `OrdenCompra`).
- **Transacciones ACID:** el checkout atómico (ADR-001) requiere soporte nativo de transacciones con rollback.
- **Modelo de datos relacional:** las entidades tienen esquema fijo y relaciones bien definidas desde el diseño.
- **ORM compatible:** el equipo usa Prisma como capa de acceso a datos — debe existir soporte maduro.
- **Conocimiento del equipo:** el equipo tiene experiencia previa con bases de datos relacionales y SQL.

---

## 2. Alternativas consideradas

### Alternativa A: PostgreSQL con Prisma ORM

Base de datos relacional open-source, con soporte completo de ACID, claves foráneas, índices, y transacciones. Prisma 7 tiene soporte de primera clase para PostgreSQL.

- **Ventaja:** Soporte nativo de transacciones ACID (requerido para el checkout). Claves foráneas garantizan integridad referencial a nivel de motor. Prisma genera el cliente tipado desde `schema.prisma`, eliminando SQL manual. Amplia disponibilidad en proveedores cloud (Supabase, Neon, Railway, AWS RDS).
- **Desventaja:** Esquema rígido — agregar campos requiere migraciones. Escalar horizontalmente (sharding) es más complejo que con bases de datos NoSQL diseñadas para ello.

### Alternativa B: MongoDB (base de datos documental)

Base de datos NoSQL orientada a documentos. Los datos se almacenan como JSON flexible sin esquema fijo.

- **Ventaja:** Esquema flexible — útil si los datos cambian frecuentemente. Escala horizontalmente de forma nativa.
- **Desventaja:** No soporta joins nativos entre colecciones (los `$lookup` de MongoDB son más lentos y menos expresivos que SQL JOINs). Las transacciones multi-documento existen pero son más recientes y menos maduras que en PostgreSQL. Las relaciones many-to-many complejas del modelo de datos (productos ↔ órdenes ↔ categorías) son difíciles de modelar correctamente en documentos. El equipo no tiene experiencia previa con MongoDB.

### Alternativa C: MySQL / MariaDB

Base de datos relacional alternativa, también compatible con Prisma.

- **Ventaja:** Muy conocido, amplia documentación, compatible con Prisma.
- **Desventaja:** PostgreSQL es superior en manejo de tipos de datos avanzados, soporte de JSON nativo, y rendimiento en queries complejas. PostgreSQL es el estándar de facto en el ecosistema de Prisma y Next.js — la mayoría de guías, providers y ejemplos están orientados a él. No hay una ventaja concreta de MySQL sobre PostgreSQL para este caso de uso.

### Alternativa D: Firebase Firestore (base de datos en tiempo real)

Base de datos NoSQL gestionada por Google, con sincronización en tiempo real al cliente.

- **Ventaja:** Sin servidor que administrar. Sincronización en tiempo real ideal para funcionalidades tipo chat o notificaciones live.
- **Desventaja:** No soporta transacciones ACID complejas cross-document. Modelo de precios basado en lecturas/escrituras — puede volverse costoso. No es compatible con Prisma. La sincronización en tiempo real no es un requerimiento del sistema (el marketplace es request-response, no tiempo real).

---

## 3. Decisión

Se usa **PostgreSQL con Prisma ORM** (Alternativa A) como motor de base de datos principal del sistema.

El esquema está definido en `prisma/schema.prisma`. La conexión se configura en `prisma.config.ts` mediante `DATABASE_URL` en las variables de entorno. El cliente Prisma es un singleton en `lib/prisma.ts` para evitar agotamiento de conexiones en desarrollo.

---

## 4. Fundamentación

- **Conecta con integridad referencial:** las claves foráneas declaradas en `schema.prisma` son aplicadas por PostgreSQL a nivel de motor. Es imposible crear un `ProductoOrden` para un `id_producto` que no existe — PostgreSQL lo rechaza antes de que llegue a la capa de aplicación.
- **Conecta con transacciones ACID:** `prisma.$transaction` sobre PostgreSQL provee aislamiento completo. Esta característica es el fundamento del ADR-001 (checkout atómico) — sin transacciones reales, esa estrategia no funciona.
- **Conecta con modelo de datos relacional:** el MCD del sistema tiene múltiples relaciones many-to-many con junction tables explícitas (`CarritoProducto`, `ProductoOrden`, `ProductoCategoria`, `ProveedorProducto`). PostgreSQL y SQL son el modelo natural para este tipo de datos.
- **Conecta con conocimiento del equipo:** no hay curva de aprendizaje — el equipo tiene experiencia SQL previa.
- **MongoDB fue descartado** principalmente por la dificultad de modelar relaciones many-to-many y por la menor madurez de sus transacciones multi-documento.
- **MySQL fue descartado** por no ofrecer ventajas concretas sobre PostgreSQL en este contexto, y por ser menos estándar en el ecosistema Prisma/Next.js.
- **Firestore fue descartado** por incompatibilidad con Prisma y por no soportar transacciones ACID del tipo requerido.

---

## 5. Consecuencias

### Positivas
- **Integridad referencial garantizada por el motor** — los errores de datos incoherentes (e.g., facturas huérfanas) son imposibles a nivel de base de datos.
- **Transacciones ACID** habilitan el checkout atómico sin infraestructura adicional.
- **Prisma genera código TypeScript tipado** desde el schema — los errores de tipo en queries se detectan en compilación, no en runtime.
- **Ecosistema maduro:** Supabase, Neon, Railway y otros proveedores ofrecen PostgreSQL gestionado con planes gratuitos adecuados para la etapa inicial.

### Negativas / Trade-offs
- **Migraciones requeridas ante cambios de schema:** cada vez que se agrega o modifica una tabla/columna, hay que ejecutar `npx prisma migrate dev`. En producción, las migraciones deben planificarse cuidadosamente para no interrumpir el servicio.
- **Esquema rígido:** agregar un campo opcional es simple, pero eliminar o renombrar columnas requiere una migración y puede romper código existente si no se coordina.
- **Escalar horizontalmente es más complejo** que con NoSQL: si el tráfico crece enormemente, particionar la base de datos (sharding) requiere estrategias específicas (Citus, pg_partman) que añaden complejidad operativa.
- **Connection pooling necesario en serverless:** en entornos como Vercel (funciones serverless), cada instancia abre conexiones a PostgreSQL. Sin un pooler (PgBouncer, Supabase pooler), se agota el límite de conexiones. Gestionado por el singleton en `lib/prisma.ts` en desarrollo, pero requiere configuración explícita en producción.
