## DIAGRAMA COMPONENTES API
Análisis del Diagrama de Componentes API
1. "Historial de Pedidos" y "Servicio de Entrega de Pedidos" están en el contenedor equivocado
Ambos componentes están agrupados dentro de Servicio Catálogo, pero no tienen ninguna relación con gestionar productos o búsqueda. Son lógica de órdenes y envíos, y conceptualmente pertenecen a Lógica de Negocio (junto con Servicio Carrito, Controlador Checkout, Servicio Envio, etc.).

2. Sign In Controller y Controlador Autorización tienen la misma descripción
Los dos dicen exactamente: "Gestiona el registro, inicio de sesión y validación de roles (comprador/vendedor)."

Son cosas distintas:

Sign In Controller: página/ruta de login y registro (UI-facing)
Controlador Autorización: valida el rol en cada endpoint sensible del API (middleware de permisos)
3. La cadena de relaciones de Lógica de Negocio está en el orden incorrecto
El diagrama modela esto:


Servicio Carrito → Servicio Stock ATOMICIDAD → Servicio Notificación
  → Sistema de Pagos → Controlador Checkout → Servicio Envio → ...
Pero el flujo real (según README sección 6.1) es el inverso en varios puntos:

El Controlador Checkout es el que inicia todo, no el que se llama al final
Servicio Notificación es asíncrono y se dispara después del pago, no antes
Sistema de Pagos no llama al Controlador Checkout — es al revés (checkout redirige a pagos, pagos confirma vía webhook).
Verificación del flujo de compra del README contra los demás diagramas
El flujo que describe el README (sección 6.1) es:

- Como supuestamente hace todo nuestro sistema:
1. Comprador navega catálogo y agrega al carrito
2. Inicia checkout → Controlador Checkout invoca Servicio Stock ATOMICIDAD
3. Stock ATOMICIDAD valida y reserva 5 minutos
4. Si reserva OK → se crea Pago con estado pendiente
5. Sistema redirige al Sistema de Pagos externo
6. Pago confirmado → se genera Factura + Envío (preparando)
7. Servicio Notificación dispara correo (asíncrono, fire-and-forget)
8. Sistema de Envíos recibe pedido y devuelve track_code
9. Comprador consulta Historial de Pedidos

- Contra el DFD de contexto el README es consistente. El DFD muestra:

Marketplace → Sistema de Pagos: Solicitud de pago ✓
MercadoPago → Marketplace: Confirmación/rechazo vía webhook ✓ (esto confirma que el pago llama de vuelta al sistema, no al revés)
Marketplace → Sistema de Envíos: Detalles envío ✓
Sistema de Envíos → Marketplace: Actualización pedido ✓
No hay conflicto lógico.

- Contra el modelo E-R y modelado de datos el README es consistente. El modelo soporta exactamente ese flujo:

Carrito → Pago (0..1), Pago.estado = pendiente/aprobado/rechazado ✓
Pago → Factura (1:1, se genera después de confirmar) ✓
Carrito → Envio (0..1), Envio.estado = preparando ✓
Envio.track_code existe como columna ✓
No hay conflicto lógico.

- Contra el diagrama de contenedores es consistente en lo esencial:

Servicio Carrito → Sistema de Pagos ✓
Servicio Carrito → Fragance DB (Pago + Factura + Envio) ✓
Sistema de Pagos → Notificación → Comprador ✓
Envios DB → Sistema de Envios ✓
La única diferencia es la "Envios DB" separada, que ya identificamos como inconsistencia del contenedor, no del flujo lógico.

Conclusión sobre el punto 3
El README está correcto y es consistente con todos los demás diagramas. El problema es exclusivamente del diagrama de componentes API. La cadena que tiene:


Servicio Stock ATOMICIDAD → Servicio Notificación → Sistema de Pagos → Controlador Checkout → Servicio Envio
contradice tanto el README como el DFD porque:

Controlador Checkout debería ser el punto de entrada, no el final
Servicio Notificación es fire-and-forget post-pago, no un paso previo al pago
Sistema de Pagos → Controlador Checkout está al revés: el webhook de pagos llega al sistema, pero no "llama" al Controlador Checkout como dependencia
La cadena del diagrama de componentes parece haber sido escrita siguiendo el orden cronológico del flujo pero modelada con las flechas invertidas o mal ancladas.


4. Servicio de Entrega de Pedidos aparece duplicado
Está listado como componente dentro de "Servicio Catálogo" y también aparece al final de la cadena de relaciones como destino de Sistema de Envios → Servicio de Entrega de Pedidos. Se referencia dos veces sin aclarar que es el mismo componente.

5. Falta el contenedor "Servicio Usuarios (Clerk)"
El diagrama de contenedores tiene "Servicio Usuarios [Clerk]" como un contenedor propio. El diagrama de componentes no lo lista ni como contenedor ni menciona ningún componente que viva en él. La autenticación de Clerk no tiene representación en este diagrama.

Resumen
Problema	Gravedad
Historial de Pedidos y Servicio de Entrega en contenedor equivocado	Alta — error de agrupación lógica
Cadena de relaciones con orden incorrecto	Alta — representa el flujo al revés
Sign In Controller y Controlador Autorización con descripción idéntica	Media — ambigüedad funcional
Servicio de Entrega duplicado	Baja — confusión en la lectura
Servicio Usuarios (Clerk) ausente	Baja — omisión de un contenedor entero