# ADR-003 — Método de integración con el proveedor de pagos externo

**Estado:** Aceptada  
**Fecha:** 2026-06-03  
**Categoría:** Integración con sistemas externos  
**Pipeline relacionado:** Pipeline 2 — Confirmación de Pago, Facturación y Alta de Envío

---

## 1. Contexto

El proceso de pago de Fragancio Elegancio delega el cobro a un proveedor externo (Stripe o MercadoPago). El sistema propio no procesa tarjetas de crédito directamente — el comprador es redirigido a la interfaz del proveedor para completar el pago.

El problema es: **¿cómo se entera el sistema de que el pago fue aprobado o rechazado?**

Una vez que el comprador completa (o abandona) el flujo de pago en el proveedor externo, el sistema necesita actualizar el estado de la `OrdenCompra`, generar la `Factura` y crear el registro de `Envio`. Este es el nodo crítico que conecta el sistema de pagos con el resto de la lógica de negocio.

Motivadores que definen los requisitos:
- **Desacoplamiento:** el procesamiento del pago no debe bloquear la respuesta al comprador ni al servidor.
- **Confiabilidad:** el evento de "pago aprobado" no debe perderse aunque el servidor tenga una caída momentánea.
- **Seguridad:** el sistema no puede aceptar notificaciones falsas — alguien podría simular una confirmación de pago para obtener una orden sin pagar.
- **Idempotencia:** si el proveedor envía el mismo evento dos veces (comportamiento normal en webhooks), el sistema no debe generar facturas ni envíos duplicados.
- **Sin polling continuo:** el sistema no debe consultar periódicamente al proveedor — es un antipatrón costoso e ineficiente.

---

## 2. Alternativas consideradas

### Alternativa A: Webhooks con verificación de firma HMAC-SHA256

El proveedor de pagos llama a `POST /api/pagos/webhook` con el resultado del pago. El payload viene firmado con HMAC-SHA256 usando un secreto compartido. El sistema verifica la firma antes de procesar cualquier dato.

- **Ventaja:** Estándar de la industria (Stripe, MercadoPago, PayPal lo usan). Completamente asíncrono — el proveedor llama cuando el pago está resuelto, sin que el sistema esté esperando. La verificación HMAC garantiza que solo el proveedor legítimo puede disparar acciones en el sistema.
- **Desventaja:** El endpoint debe ser accesible públicamente desde internet. Requiere manejar reintentos del proveedor e idempotencia para evitar procesamiento duplicado.

### Alternativa B: Polling periódico a la API del proveedor

Cada N segundos, el sistema consulta la API del proveedor para verificar el estado de los pagos pendientes: `GET /payments/{id}`.

- **Ventaja:** No requiere endpoint público. El sistema controla el timing de la verificación.
- **Desventaja:** Consume recursos constantemente aunque no haya pagos nuevos. Introduce latencia artificial (el tiempo entre que el pago se aprueba y que el sistema lo detecta depende del intervalo de polling). No escala bien con muchos pagos pendientes simultáneos. Los proveedores suelen limitar la cantidad de llamadas a su API (rate limiting).

### Alternativa C: Webhooks con whitelist de IPs del proveedor

Igual que la Alternativa A, pero en lugar de verificar la firma HMAC, se valida que la IP de origen del request esté en la lista de IPs publicadas por el proveedor.

- **Ventaja:** Más simple de implementar — solo se chequea la IP, sin criptografía.
- **Desventaja:** Las IPs del proveedor pueden cambiar sin previo aviso (actualizaciones de infraestructura, migraciones). Requiere mantener la whitelist actualizada. Las IPs también pueden ser falsificadas en ciertos contextos de red. HMAC es significativamente más robusto.

### Alternativa D: Llamada sincrónica al API del proveedor al momento del checkout

En el `POST /api/checkout`, inmediatamente después de crear la orden, el sistema llama síncronamente al API del proveedor para iniciar y confirmar el pago.

- **Ventaja:** Flujo simple y lineal — todo en una sola request.
- **Desventaja:** El tiempo de respuesta del checkout queda atado a la latencia del proveedor de pagos. Si el proveedor tiene una demora, el comprador espera. Si el proveedor falla, el checkout falla. Además, los flujos de pago con tarjeta requieren la interacción del usuario (formularios 3D Secure, autenticación bancaria) que no pueden ejecutarse síncronamente en el servidor.

---

## 3. Decisión

Se usa **webhooks con verificación de firma HMAC-SHA256** (Alternativa A), implementado en `src/app/api/pagos/webhook/route.ts`.

El secreto compartido se configura en la variable de entorno `WEBHOOK_SECRET`. La firma se verifica con `crypto.timingSafeEqual()` para prevenir timing attacks.

---

## 4. Fundamentación

- **Conecta con desacoplamiento:** el webhook llega cuando el pago está resuelto, sin que el servidor esté esperando ni consumiendo recursos. La `OrdenCompra` ya está creada con estado `pendiente` — el webhook solo la actualiza.
- **Conecta con seguridad:** HMAC-SHA256 con `timingSafeEqual` garantiza que un atacante no puede falsificar una confirmación de pago ni descubrir el secreto mediante análisis de timing. La whitelist de IPs fue descartada por ser menos robusta y más frágil operativamente.
- **Conecta con idempotencia:** el handler verifica `pago.estado === "aprobado"` antes de cualquier escritura. Si el webhook llega dos veces, el segundo intento devuelve `PAGO_YA_PROCESADO` 409 sin generar registros duplicados.
- **El polling fue descartado** directamente por el motivador de sin polling continuo y por su ineficiencia a escala.
- **La llamada sincrónica fue descartada** porque los flujos de pago modernos requieren interacción del usuario (3D Secure) que es incompatible con una llamada servidor-a-servidor sincrónica.

---

## 5. Consecuencias

### Positivas
- **El checkout no está bloqueado** por la latencia del proveedor de pagos — el comprador obtiene respuesta inmediata al crear la orden.
- **Seguridad criptográfica** en la verificación de origen — estándar adoptado por los principales proveedores de pago.
- **El sistema reacciona exactamente cuando el pago está resuelto**, sin delay artificial ni consumo continuo de recursos.
- Los proveedores implementan **reintentos automáticos** si el webhook no recibe un 2xx — el sistema no pierde eventos aunque tenga una caída momentánea.

### Negativas / Trade-offs
- **El endpoint `/api/pagos/webhook` debe ser accesible desde internet** — requiere que el entorno de producción tenga una URL pública. En desarrollo local se necesita una herramienta de túnel (ngrok, Stripe CLI) para probar.
- **Procesamiento asíncrono:** hay un delay entre que el comprador aprueba el pago y que el sistema genera la factura y el envío (el tiempo que tarda el proveedor en disparar el webhook, típicamente segundos).
- **Complejidad de manejo de reintentos:** si el webhook falla repetidamente, el proveedor eventualmente deja de reintentar. Requiere monitoreo del endpoint para detectar fallos silenciosos.
- **`WEBHOOK_SECRET` debe rotarse** si hay una brecha de seguridad, y la rotación requiere coordinación con el proveedor.
