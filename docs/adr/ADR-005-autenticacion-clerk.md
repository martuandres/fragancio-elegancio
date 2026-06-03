# ADR-005 — Proveedor de autenticación y gestión de identidad

**Estado:** Aceptada  
**Fecha:** 2026-06-03  
**Categoría:** Autenticación y seguridad  
**Pipelines relacionados:** Los tres pipelines — todos los endpoints protegidos usan el JWT de Clerk para identificar al usuario y su rol

---

## 1. Contexto

El sistema maneja dos tipos de usuario con permisos radicalmente distintos: **compradores** (pueden agregar al carrito, hacer checkout, ver sus pedidos) y **vendedores** (pueden gestionar su inventario, actualizar el estado de órdenes y envíos). Un comprador no debe poder actuar como vendedor y viceversa.

El problema es implementar autenticación, gestión de sesiones y control de roles de forma segura y sin comprometer el tiempo de desarrollo del equipo.

Motivadores que definen los requisitos:
- **Seguridad robusta desde el inicio:** el sistema maneja dinero y datos personales — no se puede implementar auth casera con riesgo de vulnerabilidades.
- **Roles en el token:** el rol del usuario (`comprador` / `vendedor`) debe estar disponible en cada request sin consultar la base de datos en cada llamada.
- **Sincronización con BD local:** cuando un usuario se registra en el sistema de autenticación, debe crearse automáticamente un registro `Usuario` en PostgreSQL.
- **Integración con Next.js:** el sistema usa Next.js App Router — la solución debe funcionar con middleware de Next.js para proteger rutas antes de que lleguen al handler.
- **Tiempo de implementación:** el equipo es pequeño y el tiempo disponible es limitado.

---

## 2. Alternativas consideradas

### Alternativa A: Clerk

Servicio de autenticación SaaS especializado para Next.js. Provee JWT con `publicMetadata` personalizable (donde se almacena el rol), componentes UI de sign-in/sign-up preconstruidos, webhook `user.created` para sincronización, y middleware nativo para Next.js App Router.

- **Ventaja:** El rol (`comprador` / `vendedor`) se guarda en `publicMetadata` del JWT — disponible en cada request sin query a BD. El webhook `user.created` permite crear el `Usuario` en PostgreSQL automáticamente. Maneja OAuth, email/password, MFA, sesiones y rotación de tokens de forma transparente. Plan gratuito suficiente para la etapa inicial.
- **Desventaja:** Dependencia de un servicio externo — si Clerk tiene una caída, los usuarios no pueden autenticarse. Vendor lock-in: migrar a otro proveedor en el futuro requiere trabajo significativo. Costo a escala (por encima del plan gratuito).

### Alternativa B: NextAuth.js (Auth.js)

Librería open-source de autenticación diseñada para Next.js. Gestiona sesiones con JWT o base de datos, soporta múltiples providers (OAuth, email, etc.).

- **Ventaja:** Open-source, sin dependencia de SaaS, sin costo. Control total sobre el esquema de sesiones.
- **Desventaja:** Los roles no están en el JWT por defecto — hay que extender el schema de sesión manualmente y persistirlos en la BD, lo que agrega complejidad. No provee componentes UI — hay que construir los formularios de login. Más configuración inicial para integrar con Prisma.

### Alternativa C: Implementación custom con JWT

Implementar el sistema de autenticación completo: registro, login, hashing de contraseñas, generación y verificación de JWT, rotación de tokens, gestión de sesiones.

- **Ventaja:** Control total, sin dependencias externas.
- **Desventaja:** Extremadamente riesgoso para un sistema que maneja pagos — implementar auth correctamente requiere expertise específico en seguridad (bcrypt, timing-safe comparisons, CSRF, token rotation, revocation). El tiempo requerido es prohibitivo para el tamaño del equipo y los plazos de la materia. Un error en la implementación puede comprometer datos de usuarios y tarjetas.

### Alternativa D: Auth0 / Okta

Servicios de autenticación enterprise con planes gratuitos limitados.

- **Ventaja:** Maduros, con certificaciones de seguridad (SOC 2, ISO 27001), soporte enterprise.
- **Desventaja:** La integración con Next.js App Router es menos fluida que Clerk — requiere más configuración de middleware. Los roles y claims personalizados en el JWT tienen más fricción de configuración. El plan gratuito de Auth0 es más restrictivo que el de Clerk (7.000 MAU vs. 10.000 MAU de Clerk). La documentación de Clerk para Next.js es significativamente más clara y completa.

---

## 3. Decisión

Se usa **Clerk** (Alternativa A) como proveedor de autenticación y gestión de identidad.

Los roles se almacenan en `publicMetadata` del JWT de Clerk (`{ role: "comprador" | "vendedor" }`). La sincronización con la base de datos se realiza mediante el webhook `user.created` en `src/app/api/auth/webhook/route.ts`. La protección de rutas privadas se gestiona en `src/proxy.ts` (middleware de Next.js 16).

---

## 4. Fundamentación

- **Conecta con roles en el token:** `publicMetadata` de Clerk está incluida en el JWT — cada handler puede verificar el rol con `sessionClaims.publicMetadata.role` sin una query adicional a la base de datos. Esto es crítico para el rendimiento de endpoints frecuentes como `GET /api/carrito`.
- **Conecta con sincronización con BD local:** el webhook `user.created` de Clerk llama a `/api/auth/webhook` automáticamente al registrarse un usuario, creando el `Usuario` en PostgreSQL. Si el webhook no llegó a tiempo, el endpoint `/api/auth/onboarding` crea el `Usuario` como fallback.
- **Conecta con integración Next.js:** Clerk publica y mantiene el paquete `@clerk/nextjs` específicamente diseñado para Next.js App Router, con helpers como `auth()` y middleware preconstruido.
- **Conecta con seguridad robusta:** Clerk maneja bcrypt, CSRF, rotación de tokens, MFA y sessions de forma transparente — el equipo no necesita implementar ninguna de estas piezas.
- **La implementación custom fue descartada** directamente por el riesgo de seguridad y el tiempo requerido.
- **NextAuth.js fue descartado** por la fricción adicional para manejar roles en el JWT y la ausencia de componentes UI preconstruidos.
- **Auth0 fue descartado** por menor integración nativa con Next.js App Router y documentación menos clara para este stack específico.

---

## 5. Consecuencias

### Positivas
- **Roles disponibles sin query a BD** en cada request — mejora el rendimiento de todos los endpoints protegidos.
- **Auth completa desde el día 1** — login, registro, sesiones, OAuth ya funcionan con la configuración mínima.
- **Componentes UI preconstruidos** (`<SignIn />`, `<SignUp />`) — el equipo no desarrolla pantallas de autenticación.
- **Sincronización automática** con PostgreSQL via webhook.

### Negativas / Trade-offs
- **Vendor lock-in:** si en el futuro se quiere migrar de Clerk, hay que reescribir el middleware, los helpers de auth en cada route, y el sistema de roles.
- **Dependencia de disponibilidad externa:** si Clerk tiene una caída, los usuarios no pueden iniciar sesión aunque el resto del sistema esté funcionando. Mitigado parcialmente porque los JWT ya emitidos siguen siendo válidos hasta su expiración.
- **Costo a escala:** el plan gratuito cubre hasta 10.000 usuarios activos mensuales. Superado ese límite, el costo puede ser significativo.
- **`CLERK_SECRET_KEY` y `CLERK_WEBHOOK_SECRET` son secretos críticos** — su exposición compromete todo el sistema de autenticación. Deben rotarse si hay cualquier sospecha de filtración.
